/**
 * DependencyRenderer.ts
 *
 * Handles rendering of dependency arrows between Gantt chart elements.
 * Implements efficient arrow drawing with proper positioning and styling.
 */

import { TimeMatrix } from '../TimeMatrix';
import { GanttElementType, GanttDependency, DependencyType } from '../../types';
import {
  ROW_HEIGHT,
  DEPENDENCY_ARROW_SIZE,
  DEPENDENCY_LINE_COLOR,
  MILESTONE_SIZE,
  ELEMENT_MIN_WIDTH,
  MIN_ARROW_TIP_DISTANCE,
} from '../constants';

// Core data structures
interface Point {
  x: number;
  y: number;
}

interface PathSegment {
  from: Point;
  to: Point;
  type: 'horizontal' | 'vertical';
}

interface RoutingConstraints {
  minSourceDistance: number;
  minTargetDistance: number;
  gridSpacing: number;
  elements: GanttElementType[];
  elementsByIndex: Map<number, GanttElementType>;
  timeMatrix: TimeMatrix;
}

interface RoutingContext {
  isSelfLoop: boolean;
  isGhost: boolean;
  hasCollision: boolean;
  needsRouting: boolean;
  isVeryShort: boolean;
  constraints: RoutingConstraints;
}

interface RenderStyle {
  curved: boolean;
  radius: number;
  color: string;
  width: number;
  opacity: number;
}

// Routing strategy interface
interface RoutingStrategy {
  calculatePath(from: Point, to: Point, context: RoutingContext): PathSegment[];
}

type RouteType = 'direct' | 'complex' | 'selfLoop';

export class DependencyRenderer {
  private pixelRatio: number = 1;
  private readonly VERTICAL_GRID_SPACING = 20; // Snap vertical lines to 20px grid
  private readonly MIN_SOURCE_DISTANCE = 20; // Minimum distance from source element
  private readonly MIN_TARGET_DISTANCE = 10; // Minimum distance before target element

  constructor(pixelRatio: number = 1) {
    this.pixelRatio = pixelRatio;
  }

  /**
   * Snap X coordinate to vertical grid based on source element position
   */
  private snapToVerticalGrid(x: number, sourceX: number): number {
    // Create a grid that starts from the source element position
    const offset = sourceX % this.VERTICAL_GRID_SPACING;
    const gridX = x - offset;
    return Math.round(gridX / this.VERTICAL_GRID_SPACING) * this.VERTICAL_GRID_SPACING + offset;
  }

  /**
   * Filter out main instance self-loops when ghost dependencies exist
   */
  private filterMainInstanceSelfLoops(
    deps: GanttDependency[],
    allDeps: GanttDependency[],
  ): GanttDependency[] {
    return deps.filter((dep) => {
      // Check if this is a main instance self-loop (not a ghost dependency)
      const isMainInstanceSelfLoop = dep.sourceId === dep.targetId && !dep.isGhost;

      if (isMainInstanceSelfLoop) {
        // Check if there are ghost dependencies for this element
        const hasGhostDependencies = allDeps.some(
          (otherDep) => otherDep.sourceId === dep.sourceId && otherDep.isGhost,
        );

        if (hasGhostDependencies) {
          return false; // Filter out this dependency
        }
      }

      return true; // Keep this dependency
    });
  }

  /**
   * Snap coordinate with minimum distance enforcement
   */
  private snapWithMinDistance(x: number, sourceX: number, minDistance: number): number {
    let adjustedX = this.snapToVerticalGrid(x, sourceX);

    // Ensure minimum distance from source is always respected
    if (Math.abs(adjustedX - sourceX) < minDistance) {
      const minRequiredX = sourceX + (x > sourceX ? minDistance : -minDistance);
      // Find next grid line in the source-based grid
      const offset = sourceX % this.VERTICAL_GRID_SPACING;
      const direction = x > sourceX ? 1 : -1;
      adjustedX =
        Math.ceil((minRequiredX - offset) / this.VERTICAL_GRID_SPACING) *
          this.VERTICAL_GRID_SPACING +
        offset;
    }

    return adjustedX;
  }

  /**
   * Draw a curved corner transition
   */
  private drawCurvedCorner(
    context: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    radius: number,
  ): void {
    const goingRight = toX > fromX;
    const goingDown = toY > fromY;

    // Shorten the line before the curve
    const lineEndX = fromX + (goingRight ? radius : -radius);
    context.lineTo(lineEndX, fromY);

    // Draw the curve
    context.quadraticCurveTo(toX, fromY, toX, fromY + (goingDown ? radius : -radius));
  }

  /**
   * Find a ghost occurrence by instance ID
   */
  private findGhostOccurrence(element: GanttElementType, instanceId: string): any | undefined {
    return element.ghostOccurrences?.find((ghost) => ghost.instanceId === instanceId);
  }

  /**
   * Calculate connection point for a ghost dependency
   */
  private calculateGhostConnectionPoint(
    element: GanttElementType,
    ghost: any,
    side: 'source' | 'target',
    timeMatrix: TimeMatrix,
    elementIndex: number,
  ): { x: number; y: number } {
    const y = elementIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    if (element.type === 'milestone') {
      const startX = timeMatrix.transformPoint(ghost.start);
      const endX = ghost.end ? timeMatrix.transformPoint(ghost.end) : startX;
      const hasRange = ghost.end && ghost.end !== ghost.start;

      if (hasRange) {
        // For milestones with ranges (e.g., events with duration)
        if (side === 'source') {
          // Outgoing arrows originate from the end of the range
          return { x: endX, y };
        } else {
          // Incoming arrows (target) should point to the start of the duration
          return { x: startX, y };
        }
      } else {
        // For point milestones (no range)
        const milestoneX = startX;
        return {
          x: side === 'source' ? milestoneX + MILESTONE_SIZE / 2 : milestoneX - MILESTONE_SIZE / 2,
          y,
        };
      }
    } else {
      // Tasks and groups: account for minimum width adjustment like regular elements
      const startX = timeMatrix.transformPoint(ghost.start);
      const endX = timeMatrix.transformPoint(ghost.end || ghost.start);
      const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);

      if (side === 'source') {
        // Connection from the right side of the element
        return { x: startX + width, y };
      } else {
        // Connection to the left side of the element
        return { x: startX, y };
      }
    }
  }

  /**
   * Check if ghost dependency should bypass collision detection
   */
  private shouldBypassGhostCollision(
    dep: any,
    from: { x: number; y: number },
    lineEndPoint: { x: number; y: number },
  ): boolean {
    return dep && dep.isGhost && Math.abs(lineEndPoint.y - from.y) <= 5;
  }

  // Routing strategy implementations
  private directRoutingStrategy: RoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      const { minSourceDistance } = context.constraints;

      // For very short same-row dependencies, use direct line (but not for ghost dependencies)
      const sameRow = Math.abs(to.y - from.y) <= 5;
      const totalDistance = Math.abs(to.x - from.x);
      if (context.isVeryShort && sameRow && !context.isGhost) {
        return [{ from, to, type: 'horizontal' }];
      }

      // For direct routing, we can go in either direction
      const needsToGoLeft = to.x < from.x;
      const targetX = needsToGoLeft ? from.x - minSourceDistance : from.x + minSourceDistance;
      const vLineX = this.snapWithMinDistance(targetX, from.x, minSourceDistance);

      // Simple L-shaped path
      return [
        { from, to: { x: vLineX, y: from.y }, type: 'horizontal' },
        { from: { x: vLineX, y: from.y }, to: { x: vLineX, y: to.y }, type: 'vertical' },
        { from: { x: vLineX, y: to.y }, to, type: 'horizontal' },
      ];
    },
  };

  private complexRoutingStrategy: RoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      const { minSourceDistance, minTargetDistance, gridSpacing } = context.constraints;

      // For complex routing (around obstacles), always go right first from source
      // This makes visual sense since elements emit from their end (right side)
      const sourceTargetX = from.x + minSourceDistance;
      const vLineFromX = this.snapWithMinDistance(sourceTargetX, from.x, minSourceDistance);

      // Calculate target vertical line position
      let vLineToX = this.snapToVerticalGrid(to.x - minTargetDistance, from.x);
      if (to.x - vLineToX < minTargetDistance) {
        const maxAllowedX = to.x - minTargetDistance;
        const offset = from.x % gridSpacing;
        vLineToX = Math.floor((maxAllowedX - offset) / gridSpacing) * gridSpacing + offset;
      }

      // Ensure adequate spacing between vertical lines
      const distanceToTarget = Math.abs(to.x - vLineToX);
      if (distanceToTarget <= gridSpacing) {
        if (to.x > vLineToX) {
          vLineToX = vLineToX - gridSpacing;
        } else {
          vLineToX = vLineToX + gridSpacing;
        }
      }

      // Calculate intermediate routing Y position
      const fromRow = Math.round(from.y / ROW_HEIGHT);
      const toRow = Math.round(to.y / ROW_HEIGHT);
      const rowDifference = Math.abs(toRow - fromRow);

      let routeY: number;
      if (rowDifference <= 1) {
        routeY = (from.y + to.y) / 2;
      } else {
        routeY = from.y < to.y ? from.y + ROW_HEIGHT / 2 : from.y - ROW_HEIGHT / 2;
      }

      // Multi-segment path that routes around obstacles
      return [
        { from, to: { x: vLineFromX, y: from.y }, type: 'horizontal' },
        { from: { x: vLineFromX, y: from.y }, to: { x: vLineFromX, y: routeY }, type: 'vertical' },
        { from: { x: vLineFromX, y: routeY }, to: { x: vLineToX, y: routeY }, type: 'horizontal' },
        { from: { x: vLineToX, y: routeY }, to: { x: vLineToX, y: to.y }, type: 'vertical' },
        { from: { x: vLineToX, y: to.y }, to, type: 'horizontal' },
      ];
    },
  };

  private selfLoopRoutingStrategy: RoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      const { minSourceDistance, minTargetDistance } = context.constraints;
      const loopY = from.y - ROW_HEIGHT / 2;

      const vLineFromX = this.snapWithMinDistance(
        from.x + minSourceDistance,
        from.x,
        minSourceDistance,
      );

      let vLineToX = this.snapToVerticalGrid(to.x - minTargetDistance, from.x);
      if (to.x - vLineToX < minTargetDistance) {
        const maxAllowedX = to.x - minTargetDistance;
        const offset = from.x % this.VERTICAL_GRID_SPACING;
        vLineToX =
          Math.floor((maxAllowedX - offset) / this.VERTICAL_GRID_SPACING) *
            this.VERTICAL_GRID_SPACING +
          offset;
      }

      // Self-loop path that goes up and around
      return [
        { from, to: { x: vLineFromX, y: from.y }, type: 'horizontal' },
        { from: { x: vLineFromX, y: from.y }, to: { x: vLineFromX, y: loopY }, type: 'vertical' },
        { from: { x: vLineFromX, y: loopY }, to: { x: vLineToX, y: loopY }, type: 'horizontal' },
        { from: { x: vLineToX, y: loopY }, to: { x: vLineToX, y: to.y }, type: 'vertical' },
        { from: { x: vLineToX, y: to.y }, to, type: 'horizontal' },
      ];
    },
  };

  private routeDependency(from: Point, to: Point, context: RoutingContext): PathSegment[] {
    if (context.isSelfLoop) {
      return this.selfLoopRoutingStrategy.calculatePath(from, to, context);
    } else if (context.needsRouting) {
      return this.complexRoutingStrategy.calculatePath(from, to, context);
    } else {
      return this.directRoutingStrategy.calculatePath(from, to, context);
    }
  }

  private renderPath(
    context: CanvasRenderingContext2D,
    segments: PathSegment[],
    style: RenderStyle,
    arrowTarget: Point,
    showArrowTip: boolean = true,
  ): void {
    // Set style
    context.strokeStyle = style.color;
    context.lineWidth = style.width;
    context.globalAlpha = style.opacity;
    context.setLineDash([]);

    if (style.curved) {
      context.lineJoin = 'round';
      context.lineCap = 'round';
    } else {
      context.lineJoin = 'miter';
      context.lineCap = 'butt';
    }

    context.beginPath();

    if (segments.length === 0) return;

    // Always start from the exact connection point (no gap)
    context.moveTo(segments[0].from.x, segments[0].from.y);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      if (style.curved && nextSegment && this.isCorner(segment, nextSegment)) {
        // For the first segment, we need to draw from element edge to curve start
        if (i === 0) {
          const dir1 = this.getSegmentDirection(segment);
          const curveStart = {
            x: segment.to.x - dir1.x * style.radius,
            y: segment.to.y - dir1.y * style.radius,
          };
          context.lineTo(curveStart.x, curveStart.y);

          const dir2 = this.getSegmentDirection(nextSegment);
          const curveEnd = {
            x: segment.to.x + dir2.x * style.radius,
            y: segment.to.y + dir2.y * style.radius,
          };
          context.quadraticCurveTo(segment.to.x, segment.to.y, curveEnd.x, curveEnd.y);
        } else {
          this.renderCurvedCorner(context, segment, nextSegment, style.radius);
        }
      } else {
        // For the last segment, account for arrow head only if arrow tip will be shown
        if (i === segments.length - 1) {
          if (showArrowTip) {
            const totalDistance = Math.abs(segment.to.x - segment.from.x);
            const arrowOffset =
              totalDistance < 30
                ? Math.min(DEPENDENCY_ARROW_SIZE * 0.5, totalDistance * 0.3)
                : DEPENDENCY_ARROW_SIZE * 0.8;
            const lineEndX = segment.to.x - arrowOffset;
            context.lineTo(lineEndX, segment.to.y);
          } else {
            // No arrow tip, draw line all the way to target
            context.lineTo(segment.to.x, segment.to.y);
          }
        } else {
          // For non-final segments in curved mode, adjust endpoint if there's a curve coming
          if (style.curved && nextSegment && this.isCorner(segment, nextSegment)) {
            continue;
          } else {
            context.lineTo(segment.to.x, segment.to.y);
          }
        }
      }
    }

    context.stroke();
  }

  private isCorner(current: PathSegment, next: PathSegment): boolean {
    return current.type !== next.type;
  }

  private renderCurvedCorner(
    context: CanvasRenderingContext2D,
    current: PathSegment,
    next: PathSegment,
    radius: number,
  ): void {
    const corner = current.to;
    const dir1 = this.getSegmentDirection(current);
    const dir2 = this.getSegmentDirection(next);

    // Stop current line before corner
    const curveStart = {
      x: corner.x - dir1.x * radius,
      y: corner.y - dir1.y * radius,
    };
    context.lineTo(curveStart.x, curveStart.y);

    // Draw curve to next segment start
    const curveEnd = {
      x: corner.x + dir2.x * radius,
      y: corner.y + dir2.y * radius,
    };
    context.quadraticCurveTo(corner.x, corner.y, curveEnd.x, curveEnd.y);
  }

  private getSegmentDirection(segment: PathSegment): Point {
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
  }

  /**
   * Render all dependencies between elements (new unified approach)
   */
  renderDependencies(
    context: CanvasRenderingContext2D,
    dependencies: GanttDependency[],
    elements: GanttElementType[],
    timeMatrix: TimeMatrix,
    visibleRowStart: number,
    visibleRowEnd: number,
    highlightedDependencies?: GanttDependency[],
    curvedDependencies: boolean = false,
  ): void {
    // Create element lookup maps
    const elementsByIndex = new Map<number, GanttElementType>();
    elements.forEach((el, index) => elementsByIndex.set(index, el));

    const highlightedIds = new Set(
      highlightedDependencies?.map((dep) => `${dep.sourceId}-${dep.targetId}`) || [],
    );

    // Separate into normal and highlighted dependencies
    const normalDeps = dependencies.filter(
      (dep) => !highlightedIds.has(`${dep.sourceId}-${dep.targetId}`),
    );
    const highlightedDeps = dependencies.filter((dep) =>
      highlightedIds.has(`${dep.sourceId}-${dep.targetId}`),
    );

    // Filter out main instance self-loops if ghost dependencies exist
    const filteredNormalDeps = this.filterMainInstanceSelfLoops(normalDeps, dependencies);
    const filteredHighlightedDeps = this.filterMainInstanceSelfLoops(highlightedDeps, dependencies);

    // Render normal dependencies first, then highlighted on top
    [...filteredNormalDeps, ...filteredHighlightedDeps].forEach((dep, index) => {
      const isHighlighted = index >= filteredNormalDeps.length;
      this.renderSingleDependency(
        context,
        dep,
        elements,
        elementsByIndex,
        timeMatrix,
        visibleRowStart,
        visibleRowEnd,
        curvedDependencies,
        isHighlighted,
      );
    });
  }

  /**
   * Render a single dependency using the new unified approach
   */
  private renderSingleDependency(
    context: CanvasRenderingContext2D,
    dep: GanttDependency,
    elements: GanttElementType[],
    elementsByIndex: Map<number, GanttElementType>,
    timeMatrix: TimeMatrix,
    visibleRowStart: number,
    visibleRowEnd: number,
    curvedDependencies: boolean,
    isHighlighted: boolean,
  ): void {
    // Find elements by ID
    const { fromElement, toElement, fromIndex, toIndex } = this.findDependencyElements(
      dep,
      elements,
    );
    if (!fromElement || !toElement || fromIndex === -1 || toIndex === -1) return;

    // Check visibility
    const fromVisible = fromIndex >= visibleRowStart && fromIndex <= visibleRowEnd;
    const toVisible = toIndex >= visibleRowStart && toIndex <= visibleRowEnd;
    if (!fromVisible && !toVisible) return;

    // Calculate connection points
    let fromPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'end', fromIndex);
    let toPoint = this.getElementConnectionPoint(toElement, timeMatrix, 'start', toIndex);

    // Adjust for ghost dependencies
    if (dep.isGhost && dep.sourceInstanceId && dep.targetInstanceId) {
      const sourceGhost = this.findGhostOccurrence(fromElement, dep.sourceInstanceId);
      if (sourceGhost) {
        const originalFromPoint = { ...fromPoint };
        fromPoint = this.calculateGhostConnectionPoint(
          fromElement,
          sourceGhost,
          'source',
          timeMatrix,
          fromIndex,
        );
      }

      const targetGhost = this.findGhostOccurrence(toElement, dep.targetInstanceId);
      if (targetGhost) {
        const originalToPoint = { ...toPoint };
        toPoint = this.calculateGhostConnectionPoint(
          toElement,
          targetGhost,
          'target',
          timeMatrix,
          toIndex,
        );
      }
    }

    // Skip if outside visible canvas area
    const canvasWidth = context.canvas.width / this.pixelRatio;
    if (
      (fromPoint.x < 0 && toPoint.x < 0) ||
      (fromPoint.x > canvasWidth && toPoint.x > canvasWidth)
    ) {
      return;
    }

    // Use absolute row positions
    fromPoint.y = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    toPoint.y = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Calculate distance for arrow tip logic
    const totalDistance = Math.abs(toPoint.x - fromPoint.x);
    const isSameRow = Math.abs(toPoint.y - fromPoint.y) <= 5;

    // Skip rendering ghost dependencies that are problematic when elements overlap
    if (dep.isGhost) {
      // For same-row dependencies, skip if they would cause visual artifacts
      if (isSameRow) {
        // Skip if target is at or left of source (negative dependency)
        if (toPoint.x <= fromPoint.x) {
          return;
        }

        // Skip if distance is too small and causes visual artifacts when overlapping
        if (totalDistance < 5) {
          return;
        }
      }
      // Different-row dependencies should always render, even with overlapping elements
    }

    // Build routing context
    const context_routing = this.buildRoutingContext(
      dep,
      fromPoint,
      toPoint,
      elements,
      elementsByIndex,
      timeMatrix,
    );

    // Calculate path using new routing system
    const segments = this.routeDependency(fromPoint, toPoint, context_routing);

    // Draw arrow head - hide for very short ghost dependencies on same row
    const shouldShowArrowTip = !(
      dep.isGhost &&
      isSameRow &&
      totalDistance < MIN_ARROW_TIP_DISTANCE
    );

    // Create render style
    const style: RenderStyle = {
      curved: curvedDependencies,
      radius: 5,
      color: isHighlighted ? '#000000' : DEPENDENCY_LINE_COLOR,
      width: isHighlighted ? 2.5 : 1.5,
      opacity: dep.isGhost ? 0.75 : 1.0,
    };

    // Save context state
    context.save();

    // Render the path
    this.renderPath(context, segments, style, toPoint, shouldShowArrowTip);
    if (shouldShowArrowTip) {
      this.drawArrowHead(context, toPoint, isHighlighted);
    }

    // Restore context state
    context.restore();
  }

  private findDependencyElements(dep: GanttDependency, elements: GanttElementType[]) {
    let fromElement: GanttElementType | undefined;
    let toElement: GanttElementType | undefined;
    let fromIndex = -1;
    let toIndex = -1;

    elements.forEach((el, index) => {
      if (el.id === dep.sourceId && fromIndex === -1) {
        fromElement = el;
        fromIndex = index;
      }
      if (el.id === dep.targetId && toIndex === -1) {
        toElement = el;
        toIndex = index;
      }
    });

    return { fromElement, toElement, fromIndex, toIndex };
  }

  private buildRoutingContext(
    dep: GanttDependency,
    fromPoint: Point,
    toPoint: Point,
    elements: GanttElementType[],
    elementsByIndex: Map<number, GanttElementType>,
    timeMatrix: TimeMatrix,
  ): RoutingContext {
    const totalDistance = Math.abs(toPoint.x - fromPoint.x);
    const isVeryShort = totalDistance < 30;
    const isSelfLoop = dep.sourceId === dep.targetId && fromPoint.x >= toPoint.x && !dep.isGhost;

    // Check for insufficient space and collisions
    // For ghost dependencies on same row, don't enforce minimum space requirements
    const isSameRow = Math.abs(toPoint.y - fromPoint.y) <= 5;
    const hasInsufficientSpace = dep.isGhost && isSameRow ? false : toPoint.x <= fromPoint.x + 20;
    let hasCollision = this.wouldIntersectElements(
      fromPoint,
      toPoint,
      elements,
      elementsByIndex,
      timeMatrix,
    );

    // Override collision detection for ghost dependencies on same row
    if (this.shouldBypassGhostCollision(dep, fromPoint, toPoint)) {
      hasCollision = false;
    }

    // For different-row ghost dependencies, always use complex routing for cleaner lines
    const needsComplexRouting = Boolean(dep.isGhost) && !isSameRow;
    const needsRouting = Boolean(hasInsufficientSpace || hasCollision || isSelfLoop || needsComplexRouting);

    return {
      isSelfLoop,
      isGhost: dep.isGhost || false,
      hasCollision,
      needsRouting,
      isVeryShort,
      constraints: {
        minSourceDistance: dep.isGhost && isSameRow ? 0 : this.MIN_SOURCE_DISTANCE,
        minTargetDistance: dep.isGhost && isSameRow ? 0 : this.MIN_TARGET_DISTANCE,
        gridSpacing: this.VERTICAL_GRID_SPACING,
        elements,
        elementsByIndex,
        timeMatrix,
      },
    };
  }

  /**
   * Get connection point for an element
   */
  private getElementConnectionPoint(
    element: GanttElementType,
    timeMatrix: TimeMatrix,
    side: 'start' | 'end',
    elementIndex: number,
  ): { x: number; y: number } {
    const y = elementIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    switch (element.type) {
      case 'task': {
        const task = element as GanttElementType & { type: 'task'; start: number; end: number };
        if (side === 'start') {
          return { x: timeMatrix.transformPoint(task.start), y };
        } else {
          // For end position, account for minimum width adjustment
          const startX = timeMatrix.transformPoint(task.start);
          const endX = timeMatrix.transformPoint(task.end);
          const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);
          // Return the visual end position (same calculation as in ElementRenderer)
          return { x: startX + width, y };
        }
      }

      case 'milestone': {
        const milestone = element as GanttElementType & {
          type: 'milestone';
          start: number;
          end?: number;
        };
        const hasRange = milestone.end && milestone.end !== milestone.start;

        if (hasRange) {
          // For milestones with ranges (e.g., events with duration)
          const startX = timeMatrix.transformPoint(milestone.start);
          const endX = timeMatrix.transformPoint(milestone.end!);

          if (side === 'start') {
            // Incoming arrows should point to the start of the duration
            return { x: startX, y };
          } else {
            // Outgoing arrows originate from the end of the range
            return { x: endX, y };
          }
        } else {
          // For point milestones (no range)
          const milestoneX = timeMatrix.transformPoint(milestone.start);
          return {
            x: side === 'start' ? milestoneX - MILESTONE_SIZE / 2 : milestoneX + MILESTONE_SIZE / 2,
            y,
          };
        }
      }

      case 'group': {
        const group = element as GanttElementType & { type: 'group'; start: number; end: number };
        if (side === 'start') {
          return { x: timeMatrix.transformPoint(group.start), y };
        } else {
          // For end position, account for minimum width adjustment
          const startX = timeMatrix.transformPoint(group.start);
          const endX = timeMatrix.transformPoint(group.end);
          const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);
          // Return the visual end position (same calculation as in ElementRenderer)
          return { x: startX + width, y };
        }
      }

      default:
        return { x: 0, y };
    }
  }

  /**
   * Check if a horizontal line would intersect with any elements between source and target
   */
  private wouldIntersectElements(
    from: Point,
    to: Point,
    elements?: GanttElementType[],
    elementsByIndex?: Map<number, GanttElementType>,
    timeMatrix?: TimeMatrix,
  ): boolean {
    if (!elements || !elementsByIndex || !timeMatrix) {
      return false;
    }

    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);

    // Calculate which rows the dependency line passes through
    const fromRow = Math.round(from.y / ROW_HEIGHT);
    const toRow = Math.round(to.y / ROW_HEIGHT);
    const minRow = Math.min(fromRow, toRow);
    const maxRow = Math.max(fromRow, toRow);

    if (maxRow - minRow > 20) {
      return false; // Skip collision detection for very long dependencies
    }

    // Check all elements to see if any fall on the affected rows and within the X range
    for (const [elementIndex, element] of elementsByIndex) {
      if (elementIndex < minRow || elementIndex > maxRow) {
        continue;
      }

      // Get element position and boundaries
      let elementMinX: number;
      let elementMaxX: number;

      if (element.type === 'milestone') {
        // For milestones, calculate position the same way as the renderer
        const startX = timeMatrix.transformPoint(element.start);
        const endX = element.end ? timeMatrix.transformPoint(element.end) : startX;
        const hasRange = element.end && element.end !== element.start;

        // Calculate milestone center position (same logic as ElementRenderer)
        const milestoneX = hasRange ? (startX + endX) / 2 : startX;

        // The diamond extends ±MILESTONE_SIZE/2 from the center
        elementMinX = milestoneX - MILESTONE_SIZE / 2;
        elementMaxX = milestoneX + MILESTONE_SIZE / 2;
      } else {
        // For tasks and groups
        const elementStart = timeMatrix.transformPoint(element.start);
        const elementEnd = timeMatrix.transformPoint(element.end || element.start);
        const adjustedEnd = Math.max(elementEnd, elementStart + ELEMENT_MIN_WIDTH);
        elementMinX = Math.min(elementStart, adjustedEnd);
        elementMaxX = Math.max(elementStart, adjustedEnd);
      }

      // Add some padding to avoid elements
      const padding = 5;
      if (elementMaxX + padding > minX && elementMinX - padding < maxX) {
        return true;
      }
    }

    return false;
  }

  /**
   * Draw arrow head at the end point
   */
  private drawArrowHead(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number },
    isHighlighted: boolean = false,
  ): void {
    context.fillStyle = isHighlighted ? '#000000' : DEPENDENCY_LINE_COLOR;
    context.beginPath();

    // Arrow pointing left (into the element)
    context.moveTo(point.x, point.y);
    context.lineTo(point.x - DEPENDENCY_ARROW_SIZE, point.y - DEPENDENCY_ARROW_SIZE / 2);
    context.lineTo(point.x - DEPENDENCY_ARROW_SIZE, point.y + DEPENDENCY_ARROW_SIZE / 2);
    context.closePath();
    context.fill();
  }
}
