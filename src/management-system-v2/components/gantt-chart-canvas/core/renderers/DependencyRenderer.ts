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
} from '../constants';

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
   * Render all dependencies between elements
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
    // Create element lookup map for quick access and index map for positions
    // For elements, we need to handle potential duplicates properly
    const elementsByIndex = new Map<number, GanttElementType>();
    elements.forEach((el, index) => {
      elementsByIndex.set(index, el);
    });

    // Create a set of highlighted dependency IDs for quick lookup
    const highlightedIds = new Set(
      highlightedDependencies?.map((dep) => `${dep.sourceId}-${dep.targetId}`) || [],
    );

    // Separate dependencies into normal and highlighted arrays for proper z-ordering
    const normalDeps: typeof dependencies = [];
    const highlightedDeps: typeof dependencies = [];

    dependencies.forEach((dep) => {
      if (highlightedIds.has(`${dep.sourceId}-${dep.targetId}`)) {
        highlightedDeps.push(dep);
      } else {
        normalDeps.push(dep);
      }
    });

    // Render normal dependencies first (behind highlighted ones)
    const renderDependency = (dep: (typeof dependencies)[0], isHighlighted: boolean) => {
      // Find the actual elements by their IDs in the elements array
      let fromElement: GanttElementType | undefined;
      let toElement: GanttElementType | undefined;
      let fromIndex = -1;
      let toIndex = -1;

      // Search through all elements to find the matching source and target
      // In every-occurrence mode, dependencies should use unique instance IDs
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

      if (!fromElement || !toElement || fromIndex === -1 || toIndex === -1) return;

      // Check if either element is visible
      const fromVisible = fromIndex >= visibleRowStart && fromIndex <= visibleRowEnd;
      const toVisible = toIndex >= visibleRowStart && toIndex <= visibleRowEnd;

      if (!fromVisible && !toVisible) return;

      // Calculate connection points for ghost dependencies
      let fromPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'end', fromIndex);
      let toPoint = this.getElementConnectionPoint(toElement, timeMatrix, 'start', toIndex);

      // For ghost dependencies, adjust connection points to ghost occurrences
      if (dep.isGhost && dep.sourceInstanceId && dep.targetInstanceId) {
        // Find the specific ghost occurrence for source
        const sourceGhost = fromElement.ghostOccurrences?.find(
          (ghost) => ghost.instanceId === dep.sourceInstanceId,
        );
        if (sourceGhost) {
          if (fromElement.type === 'milestone') {
            // For ghost milestones, position arrow to originate from the right side of the diamond
            const milestoneX = timeMatrix.transformPoint(sourceGhost.start);
            fromPoint = { x: milestoneX + MILESTONE_SIZE / 2, y: fromPoint.y };
          } else {
            // For tasks, use end of ghost occurrence
            const endTime = sourceGhost.end || sourceGhost.start;
            fromPoint = { x: timeMatrix.transformPoint(endTime), y: fromPoint.y };
          }
        }

        // Find the specific ghost occurrence for target
        const targetGhost = toElement.ghostOccurrences?.find(
          (ghost) => ghost.instanceId === dep.targetInstanceId,
        );
        if (targetGhost) {
          if (toElement.type === 'milestone') {
            // For ghost milestones, position arrow to go into the left side of the diamond
            const milestoneX = timeMatrix.transformPoint(targetGhost.start);
            toPoint = { x: milestoneX - MILESTONE_SIZE / 2, y: toPoint.y };
          } else {
            toPoint = { x: timeMatrix.transformPoint(targetGhost.start), y: toPoint.y };
          }
        }
      }

      // Skip if points are outside visible area
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

      // Check if this is a self-loop (dependency from element to itself)
      const isSelfLoop =
        dep.sourceId === dep.targetId ||
        (fromElement.id === toElement.id &&
          !!fromElement.instanceNumber &&
          !!toElement.instanceNumber);

      // Draw the dependency arrow using the dependency's type
      this.drawDependencyArrow(
        context,
        fromPoint,
        toPoint,
        dep.type,
        isHighlighted,
        elements,
        elementsByIndex,
        timeMatrix,
        curvedDependencies,
        isSelfLoop,
        dep.isGhost,
      );
    };

    // Render normal dependencies first
    normalDeps.forEach((dep) => renderDependency(dep, false));

    // Render highlighted dependencies last (on top)
    highlightedDeps.forEach((dep) => renderDependency(dep, true));
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
          // For milestones with ranges
          const startX = timeMatrix.transformPoint(milestone.start);
          const endX = timeMatrix.transformPoint(milestone.end!);
          const centerX = (startX + endX) / 2;

          if (side === 'start') {
            // Incoming arrows go to the milestone diamond at center
            return { x: centerX - MILESTONE_SIZE / 2, y };
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
    from: { x: number; y: number },
    to: { x: number; y: number },
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

    // Early exit for very large row ranges to avoid performance issues
    if (maxRow - minRow > 20) {
      return false; // Skip collision detection for very long dependencies
    }

    // Check all elements to see if any fall on the affected rows and within the X range
    for (const [elementIndex, element] of elementsByIndex) {
      if (elementIndex < minRow || elementIndex > maxRow) {
        continue; // Not on any affected row
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
        return true; // Would intersect with this element
      }
    }

    return false;
  }

  /**
   * Draw a dependency arrow between two points
   */
  private drawDependencyArrow(
    context: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    type: DependencyType,
    isHighlighted: boolean = false,
    elements?: GanttElementType[],
    elementsByIndex?: Map<number, GanttElementType>,
    timeMatrix?: TimeMatrix,
    curvedDependencies: boolean = false,
    isSelfLoop: boolean = false,
    isGhost: boolean = false,
  ): void {
    // Calculate adjusted endpoint to stop before arrow head
    const arrowOffset = DEPENDENCY_ARROW_SIZE * 0.8; // Stop line slightly before arrow tip
    const lineEndPoint = { x: to.x - arrowOffset, y: to.y };

    // Save current context state
    context.save();

    // Set line style for dependencies based on highlight status and ghost status
    // Use fixed line widths that look good on all screen densities
    if (isHighlighted) {
      context.strokeStyle = '#000000'; // Black color for highlighted dependencies
      context.lineWidth = 2.5; // Thicker lines for highlighted dependencies
      context.globalAlpha = isGhost ? 0.75 : 1.0; // Reduce opacity for ghost dependencies
    } else {
      context.strokeStyle = DEPENDENCY_LINE_COLOR;
      context.lineWidth = 1.5; // Thinner lines for normal dependencies
      context.globalAlpha = isGhost ? 0.75 : 1.0; // Reduce opacity for ghost dependencies
    }
    context.setLineDash([]);

    // Set line join and cap based on curved dependencies setting
    if (curvedDependencies) {
      context.lineJoin = 'round';
      context.lineCap = 'round';
    } else {
      context.lineJoin = 'miter';
      context.lineCap = 'butt';
    }

    context.beginPath();

    // Flag to skip main stroke if we draw individual segments
    let skipMainStroke = false;

    // Draw based on dependency type
    switch (type) {
      case DependencyType.FINISH_TO_START:
      default:
        // Check if we need to route around elements
        const hasInsufficientSpace = lineEndPoint.x <= from.x + 20;
        const hasCollision = this.wouldIntersectElements(
          from,
          lineEndPoint,
          elements,
          elementsByIndex,
          timeMatrix,
        );
        const needsRouting = hasInsufficientSpace || hasCollision || isSelfLoop;

        if (!needsRouting) {
          // Direct path with proper corners using grid snapping
          context.moveTo(from.x, from.y);

          // Always ensure minimal distance from source before going vertical
          let adjustedFromX = this.snapToVerticalGrid(from.x + this.MIN_SOURCE_DISTANCE, from.x);

          // Ensure minimum distance from source is always respected
          if (adjustedFromX - from.x < this.MIN_SOURCE_DISTANCE) {
            const minRequiredX = from.x + this.MIN_SOURCE_DISTANCE;
            // Find next grid line in the source-based grid
            const offset = from.x % this.VERTICAL_GRID_SPACING;
            adjustedFromX =
              Math.ceil((minRequiredX - offset) / this.VERTICAL_GRID_SPACING) *
                this.VERTICAL_GRID_SPACING +
              offset;
          }

          // Ensure distance to destination is greater than grid spacing
          const distanceToTarget = Math.abs(lineEndPoint.x - adjustedFromX);
          if (distanceToTarget <= this.VERTICAL_GRID_SPACING) {
            // Move the vertical line further from target to ensure adequate spacing
            if (lineEndPoint.x > adjustedFromX) {
              // Target is to the right, move vertical line left
              const offset = from.x % this.VERTICAL_GRID_SPACING;
              adjustedFromX = adjustedFromX - this.VERTICAL_GRID_SPACING;
              // But don't go below minimum source distance
              if (adjustedFromX - from.x < this.MIN_SOURCE_DISTANCE) {
                adjustedFromX =
                  Math.ceil(
                    (from.x + this.MIN_SOURCE_DISTANCE - offset) / this.VERTICAL_GRID_SPACING,
                  ) *
                    this.VERTICAL_GRID_SPACING +
                  offset;
              }
            } else {
              // Target is to the left, move vertical line right
              adjustedFromX = adjustedFromX + this.VERTICAL_GRID_SPACING;
            }
          }

          // Always use the same routing logic, just add curves if enabled
          const radius = 5;

          if (curvedDependencies && Math.abs(lineEndPoint.y - from.y) > 5) {
            // Curved version: shorten lines by radius and add curves

            // Calculate directions
            const goingRight = adjustedFromX > from.x;
            const goingDown = lineEndPoint.y > from.y;
            const finalGoingRight = lineEndPoint.x > adjustedFromX;

            // First horizontal line (shortened)
            context.lineTo(adjustedFromX - (goingRight ? radius : -radius), from.y);

            // First curve (horizontal to vertical)
            context.quadraticCurveTo(
              adjustedFromX,
              from.y,
              adjustedFromX,
              from.y + (goingDown ? radius : -radius),
            );

            // Vertical line (shortened on both ends)
            context.lineTo(adjustedFromX, lineEndPoint.y - (goingDown ? radius : -radius));

            // Second curve (vertical to horizontal)
            context.quadraticCurveTo(
              adjustedFromX,
              lineEndPoint.y,
              adjustedFromX + (finalGoingRight ? radius : -radius),
              lineEndPoint.y,
            );

            // Final horizontal line
            context.lineTo(lineEndPoint.x, lineEndPoint.y);
          } else {
            // Straight lines (original behavior)
            context.lineTo(adjustedFromX, from.y);

            if (Math.abs(lineEndPoint.y - from.y) > 5) {
              // Different rows - go vertical immediately, then to target
              context.lineTo(adjustedFromX, lineEndPoint.y);
            }

            context.lineTo(lineEndPoint.x, lineEndPoint.y);
          }
        } else {
          // Need to route around

          if (isSelfLoop) {
            // Special routing for self-loops - use same height logic as regular dependencies
            const loopY = from.y - ROW_HEIGHT / 2; // Same as regular dependency routing between rows

            // Use grid snapping for consistent spacing (same as regular dependencies)
            let adjustedFromX = this.snapToVerticalGrid(from.x + this.MIN_SOURCE_DISTANCE, from.x);

            // Ensure minimum distance from source is always respected
            if (adjustedFromX - from.x < this.MIN_SOURCE_DISTANCE) {
              const minRequiredX = from.x + this.MIN_SOURCE_DISTANCE;
              const offset = from.x % this.VERTICAL_GRID_SPACING;
              adjustedFromX =
                Math.ceil((minRequiredX - offset) / this.VERTICAL_GRID_SPACING) *
                  this.VERTICAL_GRID_SPACING +
                offset;
            }

            // For the target side, use similar grid snapping
            let adjustedToX = this.snapToVerticalGrid(
              lineEndPoint.x - this.MIN_TARGET_DISTANCE,
              from.x,
            );
            if (lineEndPoint.x - adjustedToX < this.MIN_TARGET_DISTANCE) {
              const maxAllowedX = lineEndPoint.x - this.MIN_TARGET_DISTANCE;
              const offset = from.x % this.VERTICAL_GRID_SPACING;
              adjustedToX =
                Math.floor((maxAllowedX - offset) / this.VERTICAL_GRID_SPACING) *
                  this.VERTICAL_GRID_SPACING +
                offset;
            }

            context.moveTo(from.x, from.y);

            if (curvedDependencies) {
              const radius = 5;

              // Calculate directions using same logic as regular dependencies
              const goingRight1 = adjustedFromX > from.x;
              const goingUp = loopY < from.y; // Always true for self-loops (going up)
              const goingRight2 = adjustedToX > adjustedFromX;
              const goingDown = lineEndPoint.y > loopY; // Always true for self-loops (coming back down)
              const finalGoingRight = lineEndPoint.x > adjustedToX;

              // First horizontal line (shortened)
              context.lineTo(adjustedFromX - (goingRight1 ? radius : -radius), from.y);

              // First curve: horizontal to vertical
              context.quadraticCurveTo(
                adjustedFromX,
                from.y,
                adjustedFromX,
                from.y + (goingUp ? -radius : radius),
              );

              // Vertical line going up (shortened)
              context.lineTo(adjustedFromX, loopY + (goingUp ? radius : -radius));

              // Second curve: vertical to horizontal
              context.quadraticCurveTo(
                adjustedFromX,
                loopY,
                adjustedFromX + (goingRight2 ? radius : -radius),
                loopY,
              );

              // Horizontal line above element (shortened)
              context.lineTo(adjustedToX - (goingRight2 ? radius : -radius), loopY);

              // Third curve: horizontal to vertical
              context.quadraticCurveTo(
                adjustedToX,
                loopY,
                adjustedToX,
                loopY + (goingDown ? radius : -radius),
              );

              // Vertical line going down (shortened)
              context.lineTo(adjustedToX, lineEndPoint.y - (goingDown ? radius : -radius));

              // Fourth curve: vertical to horizontal
              context.quadraticCurveTo(
                adjustedToX,
                lineEndPoint.y,
                adjustedToX + (finalGoingRight ? radius : -radius),
                lineEndPoint.y,
              );

              // Final horizontal line to target
              context.lineTo(lineEndPoint.x, lineEndPoint.y);
            } else {
              // Straight lines for self-loop with grid snapping
              context.lineTo(adjustedFromX, from.y);
              context.lineTo(adjustedFromX, loopY);
              context.lineTo(adjustedToX, loopY);
              context.lineTo(adjustedToX, lineEndPoint.y);
              context.lineTo(lineEndPoint.x, lineEndPoint.y);
            }
          } else {
            // Normal routing for other cases
            context.moveTo(from.x, from.y);

            // Always ensure minimal distance from source before going vertical (source-based grid)
            let adjustedFromX = this.snapToVerticalGrid(from.x + this.MIN_SOURCE_DISTANCE, from.x);

            // Ensure minimum distance from source is always respected
            if (adjustedFromX - from.x < this.MIN_SOURCE_DISTANCE) {
              const minRequiredX = from.x + this.MIN_SOURCE_DISTANCE;
              // Find next grid line in the source-based grid
              const offset = from.x % this.VERTICAL_GRID_SPACING;
              adjustedFromX =
                Math.ceil((minRequiredX - offset) / this.VERTICAL_GRID_SPACING) *
                  this.VERTICAL_GRID_SPACING +
                offset;
            }

            // For routing, find a point near the target using source-based grid
            let adjustedToX = this.snapToVerticalGrid(
              lineEndPoint.x - this.MIN_TARGET_DISTANCE,
              from.x,
            );
            if (lineEndPoint.x - adjustedToX < this.MIN_TARGET_DISTANCE) {
              const maxAllowedX = lineEndPoint.x - this.MIN_TARGET_DISTANCE;
              const offset = from.x % this.VERTICAL_GRID_SPACING;
              adjustedToX =
                Math.floor((maxAllowedX - offset) / this.VERTICAL_GRID_SPACING) *
                  this.VERTICAL_GRID_SPACING +
                offset;
            }

            // Ensure distance from last vertical line to destination is greater than grid spacing
            const distanceToTarget = Math.abs(lineEndPoint.x - adjustedToX);
            if (distanceToTarget <= this.VERTICAL_GRID_SPACING) {
              // Move the vertical line further from target
              if (lineEndPoint.x > adjustedToX) {
                // Target is to the right, move vertical line left
                adjustedToX = adjustedToX - this.VERTICAL_GRID_SPACING;
              } else {
                // Target is to the left, move vertical line right
                adjustedToX = adjustedToX + this.VERTICAL_GRID_SPACING;
              }
            }

            context.lineTo(adjustedFromX, from.y);

            // Route between elements, but avoid going through intermediate rows
            let routeY: number;
            const fromRow = Math.round(from.y / ROW_HEIGHT);
            const toRow = Math.round(lineEndPoint.y / ROW_HEIGHT);
            const rowDifference = Math.abs(toRow - fromRow);

            if (rowDifference <= 1) {
              // Adjacent rows or same row - use midpoint
              routeY = (from.y + lineEndPoint.y) / 2;
            } else {
              // Multiple rows between - route between rows closer to source
              if (from.y < lineEndPoint.y) {
                // Going down - route between source row and next row
                routeY = from.y + ROW_HEIGHT / 2;
              } else {
                // Going up - route between source row and previous row
                routeY = from.y - ROW_HEIGHT / 2;
              }
            }

            // Draw the path - go vertical as early as possible
            if (curvedDependencies) {
              // Simplified curved routing - draw each segment individually for proper curves
              const radius = 5;

              // Calculate directions
              const goingRight = adjustedFromX > from.x;
              const goingDown = routeY > from.y;
              const finalGoingRight = adjustedToX > adjustedFromX;

              // Draw path as individual segments to avoid overshoot
              context.beginPath();
              context.moveTo(from.x, from.y);
              context.lineTo(adjustedFromX - (goingRight ? radius : -radius), from.y);
              context.stroke();

              context.beginPath();
              context.moveTo(adjustedFromX - (goingRight ? radius : -radius), from.y);
              context.quadraticCurveTo(
                adjustedFromX,
                from.y,
                adjustedFromX,
                from.y + (goingDown ? radius : -radius),
              );
              context.stroke();

              context.beginPath();
              context.moveTo(adjustedFromX, from.y + (goingDown ? radius : -radius));
              context.lineTo(adjustedFromX, routeY - (goingDown ? radius : -radius));
              context.stroke();

              context.beginPath();
              context.moveTo(adjustedFromX, routeY - (goingDown ? radius : -radius));
              context.quadraticCurveTo(
                adjustedFromX,
                routeY,
                adjustedFromX + (finalGoingRight ? radius : -radius),
                routeY,
              );
              context.stroke();

              context.beginPath();
              context.moveTo(adjustedFromX + (finalGoingRight ? radius : -radius), routeY);
              context.lineTo(adjustedToX - (finalGoingRight ? radius : -radius), routeY);
              context.stroke();

              context.beginPath();
              context.moveTo(adjustedToX - (finalGoingRight ? radius : -radius), routeY);
              context.quadraticCurveTo(
                adjustedToX,
                routeY,
                adjustedToX,
                routeY + (lineEndPoint.y > routeY ? radius : -radius),
              );
              context.stroke();

              context.beginPath();
              context.moveTo(adjustedToX, routeY + (lineEndPoint.y > routeY ? radius : -radius));
              context.lineTo(
                adjustedToX,
                lineEndPoint.y - (lineEndPoint.y > routeY ? radius : -radius),
              );
              context.stroke();

              context.beginPath();
              context.moveTo(
                adjustedToX,
                lineEndPoint.y - (lineEndPoint.y > routeY ? radius : -radius),
              );
              context.quadraticCurveTo(
                adjustedToX,
                lineEndPoint.y,
                adjustedToX + (lineEndPoint.x > adjustedToX ? radius : -radius),
                lineEndPoint.y,
              );
              context.stroke();

              context.beginPath();
              context.moveTo(
                adjustedToX + (lineEndPoint.x > adjustedToX ? radius : -radius),
                lineEndPoint.y,
              );
              context.lineTo(lineEndPoint.x, lineEndPoint.y);
              context.stroke();

              skipMainStroke = true;
            } else {
              context.lineTo(adjustedFromX, from.y);
              context.lineTo(adjustedFromX, routeY);
              context.lineTo(adjustedToX, routeY);
              context.lineTo(adjustedToX, lineEndPoint.y);
              context.lineTo(lineEndPoint.x, lineEndPoint.y);
            }
          }
        }
        break;

      case DependencyType.START_TO_START:
        // Both elements start at the same time
        let ssBaseX = Math.min(from.x, lineEndPoint.x) - this.MIN_SOURCE_DISTANCE;
        let ssMinX = this.snapToVerticalGrid(ssBaseX, from.x);

        // Ensure minimum distance from both elements
        const ssTargetX = Math.min(from.x, lineEndPoint.x) - this.MIN_SOURCE_DISTANCE;
        if (Math.min(from.x, lineEndPoint.x) - ssMinX < this.MIN_SOURCE_DISTANCE) {
          ssMinX = Math.floor(ssTargetX / this.VERTICAL_GRID_SPACING) * this.VERTICAL_GRID_SPACING;
        }
        context.moveTo(from.x, from.y);

        if (
          Math.abs(lineEndPoint.y - from.y) > 5 ||
          this.wouldIntersectElements(from, lineEndPoint, elements, elementsByIndex, timeMatrix)
        ) {
          // Different rows or would intersect elements - go vertical immediately
          if (curvedDependencies) {
            const radius = 5;
            const vSpace = Math.abs(lineEndPoint.y - from.y);
            const actualRadius = Math.min(radius, vSpace / 2);

            // Horizontal to corner
            const dirH = ssMinX > from.x ? 1 : -1;
            context.lineTo(ssMinX - actualRadius * dirH, from.y);

            // First corner (horizontal to vertical)
            const dir1 = lineEndPoint.y > from.y ? 1 : -1;
            context.quadraticCurveTo(ssMinX, from.y, ssMinX, from.y + actualRadius * dir1);

            // Vertical line (straight)
            const dir1_ss = lineEndPoint.y > from.y ? 1 : -1;
            context.lineTo(ssMinX, lineEndPoint.y - actualRadius * dir1_ss);

            // Second corner (vertical to horizontal)
            const dir2 = lineEndPoint.x > ssMinX ? 1 : -1;
            context.quadraticCurveTo(
              ssMinX,
              lineEndPoint.y,
              ssMinX + actualRadius * dir2,
              lineEndPoint.y,
            );

            // Final horizontal line
            context.lineTo(lineEndPoint.x, lineEndPoint.y);
          } else {
            context.lineTo(ssMinX, from.y);
            context.lineTo(ssMinX, lineEndPoint.y);
            context.lineTo(lineEndPoint.x, lineEndPoint.y);
          }
        } else {
          // Same row and no intersections - direct connection
          context.lineTo(lineEndPoint.x, lineEndPoint.y);
        }
        break;
    }

    // Only stroke if we haven't already drawn colored segments
    if (typeof skipMainStroke === 'undefined' || !skipMainStroke) {
      context.stroke();
    }

    // Draw arrow head
    this.drawArrowHead(context, to, type, isHighlighted, isGhost);

    // Restore context state
    context.restore();
  }

  /**
   * Draw arrow head at the end point
   */
  private drawArrowHead(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number },
    _type: DependencyType,
    isHighlighted: boolean = false,
    isGhost: boolean = false,
  ): void {
    context.fillStyle = isHighlighted ? '#000000' : DEPENDENCY_LINE_COLOR;
    // The globalAlpha is already set from the main drawing context, so arrow head will inherit the ghost opacity
    context.beginPath();

    // Arrow pointing left (into the element)
    context.moveTo(point.x, point.y);
    context.lineTo(point.x - DEPENDENCY_ARROW_SIZE, point.y - DEPENDENCY_ARROW_SIZE / 2);
    context.lineTo(point.x - DEPENDENCY_ARROW_SIZE, point.y + DEPENDENCY_ARROW_SIZE / 2);
    context.closePath();
    context.fill();
  }
}
