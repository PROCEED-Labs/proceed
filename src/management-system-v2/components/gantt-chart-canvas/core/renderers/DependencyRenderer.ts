/**
 * DependencyRenderer.ts
 * 
 * Handles rendering of dependency arrows between Gantt chart elements.
 * Implements efficient arrow drawing with proper positioning and styling.
 */

import { TimeMatrix } from '../TimeMatrix';
import { GanttElementType, GanttDependency } from '../../types';
import { 
  ROW_HEIGHT,
  DEPENDENCY_ARROW_SIZE,
  DEPENDENCY_LINE_COLOR,
  MILESTONE_SIZE,
  ELEMENT_MIN_WIDTH
} from '../constants';

export class DependencyRenderer {
  private pixelRatio: number = 1;
  
  constructor(pixelRatio: number = 1) {
    this.pixelRatio = pixelRatio;
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
    highlightedDependencies?: GanttDependency[]
  ): void {
    // Create element lookup map for quick access and index map for positions
    const elementMap = new Map<string, GanttElementType>();
    const indexMap = new Map<string, number>();
    
    elements.forEach((el, index) => {
      elementMap.set(el.id, el);
      indexMap.set(el.id, index);
    });
    
    // Create a set of highlighted dependency IDs for quick lookup
    const highlightedIds = new Set(
      highlightedDependencies?.map(dep => `${dep.sourceId}-${dep.targetId}`) || []
    );
    
    // Separate dependencies into normal and highlighted arrays for proper z-ordering
    const normalDeps: typeof dependencies = [];
    const highlightedDeps: typeof dependencies = [];
    
    dependencies.forEach(dep => {
      if (highlightedIds.has(`${dep.sourceId}-${dep.targetId}`)) {
        highlightedDeps.push(dep);
      } else {
        normalDeps.push(dep);
      }
    });
    
    // Render normal dependencies first (behind highlighted ones)
    const renderDependency = (dep: typeof dependencies[0], isHighlighted: boolean) => {
      const fromElement = elementMap.get(dep.sourceId);
      const toElement = elementMap.get(dep.targetId);
      
      if (!fromElement || !toElement) return;
      
      // Get row indices from the index map
      const fromIndex = indexMap.get(dep.sourceId) ?? -1;
      const toIndex = indexMap.get(dep.targetId) ?? -1;
      
      if (fromIndex === -1 || toIndex === -1) return;
      
      // Check if either element is visible
      const fromVisible = fromIndex >= visibleRowStart && fromIndex <= visibleRowEnd;
      const toVisible = toIndex >= visibleRowStart && toIndex <= visibleRowEnd;
      
      if (!fromVisible && !toVisible) return;
      
      // Calculate connection points
      const fromPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'end', fromIndex);
      const toPoint = this.getElementConnectionPoint(toElement, timeMatrix, 'start', toIndex);
      
      // Skip if points are outside visible area
      const canvasWidth = context.canvas.width / this.pixelRatio;
      if ((fromPoint.x < 0 && toPoint.x < 0) || 
          (fromPoint.x > canvasWidth && toPoint.x > canvasWidth)) {
        return;
      }
      
      // Use absolute row positions
      fromPoint.y = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      toPoint.y = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      
      // Draw the dependency arrow
      this.drawDependencyArrow(context, fromPoint, toPoint, 'finish-to-start', isHighlighted);
    };
    
    // Render normal dependencies first
    normalDeps.forEach(dep => renderDependency(dep, false));
    
    // Render highlighted dependencies last (on top)
    highlightedDeps.forEach(dep => renderDependency(dep, true));
  }
  
  /**
   * Get connection point for an element
   */
  private getElementConnectionPoint(
    element: GanttElementType,
    timeMatrix: TimeMatrix,
    side: 'start' | 'end',
    elementIndex: number
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
        const milestone = element as GanttElementType & { type: 'milestone'; start: number; end?: number };
        const hasRange = milestone.end && milestone.end !== milestone.start;
        
        if (hasRange) {
          // For milestones with ranges
          const startX = timeMatrix.transformPoint(milestone.start);
          const endX = timeMatrix.transformPoint(milestone.end);
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
            y 
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
   * Draw a dependency arrow between two points
   */
  private drawDependencyArrow(
    context: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    type: string,
    isHighlighted: boolean = false
  ): void {
    // Calculate adjusted endpoint to stop before arrow head
    const arrowOffset = DEPENDENCY_ARROW_SIZE * 0.8; // Stop line slightly before arrow tip
    const lineEndPoint = { x: to.x - arrowOffset, y: to.y };
    
    // Save current context state
    context.save();
    
    // Set line style for dependencies based on highlight status
    if (isHighlighted) {
      context.strokeStyle = '#000000'; // Black color for highlighted dependencies
      context.lineWidth = 2.5 * this.pixelRatio; // Thicker lines for highlighted dependencies
    } else {
      context.strokeStyle = DEPENDENCY_LINE_COLOR;
      context.lineWidth = 1.5 * this.pixelRatio; // Thinner lines for normal dependencies
    }
    context.setLineDash([]);
    
    // Set line join to round for smoother corners
    context.lineJoin = 'round';
    context.lineCap = 'round';
    
    context.beginPath();
    
    // Draw based on dependency type
    switch (type) {
      case 'finish-to-start':
      default:
        // Standard finish-to-start arrow with improved routing
        if (lineEndPoint.x > from.x + 20) {
          // Direct path with proper corners
          const cornerOffset = 15;
          context.moveTo(from.x, from.y);
          context.lineTo(from.x + cornerOffset, from.y);
          
          if (Math.abs(lineEndPoint.y - from.y) > 5) {
            // Different rows - create a nice S-curve
            const midY = from.y + (lineEndPoint.y - from.y) / 2;
            context.lineTo(from.x + cornerOffset, midY);
            context.lineTo(lineEndPoint.x - cornerOffset, midY);
            context.lineTo(lineEndPoint.x - cornerOffset, lineEndPoint.y);
          } else {
            // Same row - straight horizontal
            context.lineTo(lineEndPoint.x - cornerOffset, from.y);
          }
          
          context.lineTo(lineEndPoint.x, lineEndPoint.y);
        } else {
          // Need to route around - create a clean rectangular path
          // Always route above the target element for better visibility
          const verticalOffset = 15;
          const horizontalOffset = 15;
          
          context.moveTo(from.x, from.y);
          context.lineTo(from.x + horizontalOffset, from.y);
          
          // Route above the target element
          const routeY = lineEndPoint.y - verticalOffset;
          
          if (lineEndPoint.y > from.y) {
            // Target is below source - go down first, then across
            context.lineTo(from.x + horizontalOffset, routeY);
            context.lineTo(lineEndPoint.x - horizontalOffset, routeY);
            context.lineTo(lineEndPoint.x - horizontalOffset, lineEndPoint.y);
          } else if (lineEndPoint.y < from.y) {
            // Target is above source - go up to routing level
            context.lineTo(from.x + horizontalOffset, routeY);
            context.lineTo(lineEndPoint.x - horizontalOffset, routeY);
            context.lineTo(lineEndPoint.x - horizontalOffset, lineEndPoint.y);
          } else {
            // Same row - route slightly above
            context.lineTo(from.x + horizontalOffset, from.y - verticalOffset);
            context.lineTo(lineEndPoint.x - horizontalOffset, lineEndPoint.y - verticalOffset);
            context.lineTo(lineEndPoint.x - horizontalOffset, lineEndPoint.y);
          }
          
          context.lineTo(lineEndPoint.x, lineEndPoint.y);
        }
        break;
        
      case 'start-to-start':
        // Both elements start at the same time
        const ssMinX = Math.min(from.x, lineEndPoint.x) - 15;
        context.moveTo(from.x, from.y);
        context.lineTo(ssMinX, from.y);
        context.lineTo(ssMinX, lineEndPoint.y);
        context.lineTo(lineEndPoint.x, lineEndPoint.y);
        break;
        
      case 'finish-to-finish':
        // Both elements finish at the same time
        const ffMaxX = Math.max(from.x, lineEndPoint.x) + 15;
        context.moveTo(from.x, from.y);
        context.lineTo(ffMaxX, from.y);
        context.lineTo(ffMaxX, lineEndPoint.y);
        context.lineTo(lineEndPoint.x, lineEndPoint.y);
        break;
        
      case 'start-to-finish':
        // Start of one to finish of another (rare)
        context.moveTo(from.x, from.y);
        context.lineTo(from.x - 10, from.y);
        context.lineTo(from.x - 10, lineEndPoint.y);
        context.lineTo(lineEndPoint.x, lineEndPoint.y);
        break;
    }
    
    context.stroke();
    
    // Draw arrow head
    this.drawArrowHead(context, to, type, isHighlighted);
    
    // Restore context state
    context.restore();
  }
  
  /**
   * Draw arrow head at the end point
   */
  private drawArrowHead(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number },
    type: string,
    isHighlighted: boolean = false
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