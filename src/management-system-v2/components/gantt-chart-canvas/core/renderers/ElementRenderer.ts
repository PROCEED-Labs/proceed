/**
 * ElementRenderer.ts
 *
 * Handles rendering of Gantt chart elements (tasks, milestones, groups).
 * Implements optimized rendering strategies for different element types.
 */

import { TimeMatrix } from '../TimeMatrix';
import { GanttElementType } from '../../types';
import { drawRoundedRect, drawText } from '../renderUtils';
import {
  ROW_HEIGHT,
  TASK_PADDING,
  MILESTONE_SIZE,
  TASK_DEFAULT_COLOR,
  MILESTONE_DEFAULT_COLOR,
  GROUP_DEFAULT_COLOR,
  HOVER_OPACITY,
  ELEMENT_MIN_WIDTH,
} from '../constants';
import { darken, hexToRgba } from '../../utils/colorUtils';

export class ElementRenderer {
  private pixelRatio: number = 1;
  private showLoopIcons: boolean = true;

  constructor(pixelRatio: number = 1, showLoopIcons: boolean = true) {
    this.pixelRatio = pixelRatio;
    this.showLoopIcons = showLoopIcons;
  }

  /**
   * Update element renderer configuration
   */
  updateConfig(config: { showLoopIcons?: boolean }) {
    if (config.showLoopIcons !== undefined) {
      this.showLoopIcons = config.showLoopIcons;
    }
  }

  /**
   * Set the hovered element ID (compatibility method)
   */
  setHoveredElement(elementId: string | null): void {
    // Not implemented in this renderer version
  }

  /**
   * Render a task bar element
   */
  renderTask(
    context: CanvasRenderingContext2D,
    task: GanttElementType & { type: 'task'; start: number; end: number },
    rowIndex: number,
    timeMatrix: TimeMatrix,
    isHovered: boolean = false,
  ): void {
    // Check for invalid timestamps
    const validStart = task.start && task.start > 0;
    const validEnd = task.end && task.end > 0;
    const hasTimestampIssue = !validStart || !validEnd;

    // For elements with invalid timestamps, use fixed positions
    let startX: number, endX: number, width: number;

    if (hasTimestampIssue) {
      // For invalid timestamps, position at a fixed point
      const viewportWidth = context.canvas.width / this.pixelRatio;
      startX = viewportWidth * 0.15;
      width = viewportWidth * 0.2;
      endX = startX + width;
    } else {
      // Normal calculation for valid timestamps
      startX = timeMatrix.transformPoint(task.start);
      endX = timeMatrix.transformPoint(task.end);
      width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);
      endX = startX + width;
    }

    // Use absolute row position
    const y = rowIndex * ROW_HEIGHT + TASK_PADDING;
    const height = ROW_HEIGHT - TASK_PADDING * 2;

    // Skip if main element AND all ghost occurrences are outside visible area
    const canvasWidth = context.canvas.width / this.pixelRatio;
    const mainElementVisible = !(endX < 0 || startX > canvasWidth);
    const ghostsVisible =
      task.ghostOccurrences && task.ghostOccurrences.length > 0
        ? this.areAnyGhostOccurrencesVisible(task.ghostOccurrences, timeMatrix, canvasWidth)
        : false;

    if (!mainElementVisible && !ghostsVisible) {
      return;
    }

    // Draw main task bar
    const color = task.color || TASK_DEFAULT_COLOR;

    // Save context state for clipping
    context.save();

    // Set up clipping region to prevent drawing outside the task's actual bounds
    context.beginPath();
    context.rect(
      Math.max(0, startX), // Clip left edge to canvas
      y,
      Math.min(width, context.canvas.width / this.pixelRatio - startX), // Clip right edge to canvas
      height,
    );
    context.clip();

    // Draw the task bar at its actual position (not clipped position)
    drawRoundedRect(
      context,
      Math.floor(startX),
      Math.floor(y),
      Math.ceil(width),
      Math.ceil(height),
      0, // No rounding for tasks
      {
        fillStyle: isHovered ? darken(color, 10) : color,
        globalAlpha: isHovered ? HOVER_OPACITY : 1,
      },
    );

    // Restore context to remove clipping
    context.restore();

    // Draw task label if there's enough space - use original element width, not clipped
    if (width > 20 && task.name) {
      // Create label with instance number if applicable
      let label = task.name;
      if (task.instanceNumber && task.totalInstances && task.totalInstances > 1) {
        label += ` #${task.instanceNumber}`;
      }
      if (this.showLoopIcons) {
        if (task.isLoopCut) {
          label += ' ✕';
        } else if (task.isLoop) {
          label += ' ↻';
        }
      }

      this.drawLabel(
        context,
        label,
        startX + 4, // Use original startX, not clippedStartX
        y + height / 2,
        width - 8, // Use original width, not clippedWidth
        '#ffffff',
      );
    }

    // Render ghost occurrences if present
    if (task.ghostOccurrences && task.ghostOccurrences.length > 0) {
      // Pass main element bounds to avoid covering text
      const mainElementBounds = {
        startX: startX,
        endX: startX + width,
        textStartX: startX + 4,
        textEndX: startX + width - 4,
        hasText: width > 20 && !!task.name,
      };
      this.renderGhostOccurrences(
        context,
        task.ghostOccurrences,
        rowIndex,
        timeMatrix,
        color,
        mainElementBounds,
      );
    }

    context.globalAlpha = 1;
  }

  /**
   * Render a milestone element
   */
  renderMilestone(
    context: CanvasRenderingContext2D,
    milestone: GanttElementType & { type: 'milestone'; start: number; end?: number },
    rowIndex: number,
    timeMatrix: TimeMatrix,
    isHovered: boolean = false,
  ): void {
    const startX = timeMatrix.transformPoint(milestone.start);
    const endX = milestone.end ? timeMatrix.transformPoint(milestone.end) : startX;
    // For boundary events, always treat as point milestone (no range display)
    const hasRange = milestone.isBoundaryEvent
      ? false
      : milestone.end && milestone.end !== milestone.start;

    // Calculate milestone position - centered if there's a range, otherwise at start
    const milestoneX = hasRange ? (startX + endX) / 2 : startX;

    // Skip if main milestone AND all ghost occurrences are outside visible area
    const canvasWidth = context.canvas.width / this.pixelRatio;
    const mainMilestoneVisible = !(endX < -MILESTONE_SIZE || startX > canvasWidth + MILESTONE_SIZE);
    const ghostsVisible =
      milestone.ghostOccurrences && milestone.ghostOccurrences.length > 0
        ? this.areAnyGhostMilestonesVisible(milestone.ghostOccurrences, timeMatrix, canvasWidth)
        : false;

    if (!mainMilestoneVisible && !ghostsVisible) {
      return;
    }

    // Use absolute row position
    const y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    const color = milestone.color || MILESTONE_DEFAULT_COLOR;

    // If there's a range, only draw it if the visual width is sufficient
    if (hasRange) {
      const rangeWidth = endX - startX;
      const minimumRangeWidth = MILESTONE_SIZE * 1.5; // Milestone size + 50%

      // Only render the range visual if it's wide enough
      if (rangeWidth > minimumRangeWidth) {
        context.save();

        // Create clipping region for the range area
        const rangeHeight = ROW_HEIGHT - 8;
        const rangeY = y - rangeHeight / 2;

        context.beginPath();
        context.rect(startX, rangeY, rangeWidth, rangeHeight);
        context.clip();

        // Draw slanted lines pattern
        context.strokeStyle = hexToRgba(color, 0.15);
        context.lineWidth = 1;
        const lineSpacing = 6;

        // Draw diagonal lines at 45 degree angle
        for (let i = startX - rangeHeight; i < endX + rangeHeight; i += lineSpacing) {
          context.beginPath();
          context.moveTo(i, rangeY);
          context.lineTo(i + rangeHeight, rangeY + rangeHeight);
          context.stroke();
        }

        context.restore();

        // Draw brackets at the ends
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.globalAlpha = isHovered ? HOVER_OPACITY : 1;

        const bracketSize = 6;

        // Left bracket
        context.beginPath();
        context.moveTo(startX + bracketSize, rangeY);
        context.lineTo(startX, rangeY);
        context.lineTo(startX, rangeY + rangeHeight);
        context.lineTo(startX + bracketSize, rangeY + rangeHeight);
        context.stroke();

        // Right bracket
        context.beginPath();
        context.moveTo(endX - bracketSize, rangeY);
        context.lineTo(endX, rangeY);
        context.lineTo(endX, rangeY + rangeHeight);
        context.lineTo(endX - bracketSize, rangeY + rangeHeight);
        context.stroke();
      }
    }

    // Draw diamond shape at the milestone position
    context.fillStyle = isHovered ? darken(color, 10) : color;
    context.globalAlpha = isHovered ? HOVER_OPACITY : 1;

    context.beginPath();
    context.moveTo(milestoneX, y - MILESTONE_SIZE / 2);
    context.lineTo(milestoneX + MILESTONE_SIZE / 2, y);
    context.lineTo(milestoneX, y + MILESTONE_SIZE / 2);
    context.lineTo(milestoneX - MILESTONE_SIZE / 2, y);
    context.closePath();
    context.fill();

    // Draw milestone label
    if (milestone.name) {
      // Create label with instance number if applicable
      let label = milestone.name;
      if (milestone.instanceNumber && milestone.totalInstances && milestone.totalInstances > 1) {
        label += ` #${milestone.instanceNumber}`;
      }
      if (this.showLoopIcons) {
        if (milestone.isLoopCut) {
          label += ' ✕';
        } else if (milestone.isLoop) {
          label += ' ↻';
        }
      }

      this.drawLabelWithBackground(
        context,
        label,
        milestoneX + MILESTONE_SIZE / 2 + 4,
        y,
        200,
        '#333333',
      );
    }

    // Render ghost occurrences if present
    if (milestone.ghostOccurrences && milestone.ghostOccurrences.length > 0) {
      this.renderGhostMilestones(context, milestone.ghostOccurrences, rowIndex, timeMatrix, color);
    }

    context.globalAlpha = 1;
  }

  /**
   * Render a group element
   */
  renderGroup(
    context: CanvasRenderingContext2D,
    group: GanttElementType & { type: 'group'; start: number; end: number },
    rowIndex: number,
    timeMatrix: TimeMatrix,
    isHovered: boolean = false,
  ): void {
    const startX = timeMatrix.transformPoint(group.start);
    const endX = timeMatrix.transformPoint(group.end);
    const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);

    // Skip if completely outside visible area
    if (endX < 0 || startX > context.canvas.width / this.pixelRatio) {
      return;
    }

    // Use absolute row position
    const y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2; // Center vertically
    const height = ROW_HEIGHT - 4;

    const color = group.color || GROUP_DEFAULT_COLOR;
    context.strokeStyle = isHovered ? darken(color, 10) : color;
    context.lineWidth = 2 * this.pixelRatio;
    context.globalAlpha = isHovered ? HOVER_OPACITY : 1;

    // Check if this is a sub-process (based on element properties)
    const isSubProcess = (group as any).isSubProcess;

    if (isSubProcess) {
      // Render sub-process as filled horizontal bar with downward tabs
      const barHeight = 2 * this.pixelRatio; // 2px for main horizontal bar
      const tabHeight = 4 * this.pixelRatio; // 4px for downward pointed tabs (steeper)
      const tabWidth = 3 * this.pixelRatio; // 3px width of the tab base (narrower for steeper angle)

      // Position slightly above center
      const offsetFromCenter = -1 * this.pixelRatio; // Move up 6px from center
      const barTop = y + offsetFromCenter;
      const barBottom = barTop + barHeight;
      const tabTipY = barBottom + tabHeight; // Point of the tab

      context.fillStyle = isHovered ? darken(color, 10) : color;

      // Draw the filled shape as one continuous path
      context.beginPath();

      // Start from top-left
      context.moveTo(startX, barTop);
      // Top edge of main bar
      context.lineTo(endX, barTop);
      // Right edge down to bar bottom
      context.lineTo(endX, barBottom);
      // Right tab - straight outside edge down
      context.lineTo(endX, tabTipY);
      // Right tab - angled inside edge back up
      context.lineTo(endX - tabWidth, barBottom);
      // Bottom edge of main bar (right to left)
      context.lineTo(startX + tabWidth, barBottom);
      // Left tab - angled inside edge down
      context.lineTo(startX, tabTipY);
      // Left tab - straight outside edge back up
      context.lineTo(startX, barBottom);
      // Left edge back to start
      context.lineTo(startX, barTop);

      context.fill();

      // Draw sub-process label
      if (width > 50 && group.name) {
        // Create label with instance number if applicable
        let label = group.name;
        if (group.instanceNumber && group.totalInstances && group.totalInstances > 1) {
          label += ` #${group.instanceNumber}`;
        }
        if (this.showLoopIcons) {
          if (group.isLoopCut) {
            label += ' ✕';
          } else if (group.isLoop) {
            label += ' ↻';
          }
        }

        this.drawLabelWithBackground(
          context,
          label,
          startX + width / 2,
          barTop - 4, // Position above the bar
          width - 20,
          '#333333',
          'center',
          'bottom',
          true, // bold
        );
      }
    } else {
      // Regular group rendering with brackets (for non-sub-processes)
      context.beginPath();

      // Left bracket
      const leftBracketX = startX;
      const rightBracketX = startX + width;
      const bracketY = y - height / 2 + 2;
      const bracketHeight = height - 4;

      // Only draw visible parts of brackets
      if (leftBracketX >= -5 && leftBracketX <= context.canvas.width / this.pixelRatio) {
        context.moveTo(leftBracketX + 5, bracketY);
        context.lineTo(leftBracketX, bracketY);
        context.lineTo(leftBracketX, bracketY + bracketHeight);
        context.lineTo(leftBracketX + 5, bracketY + bracketHeight);
      }

      // Right bracket
      if (rightBracketX >= 0 && rightBracketX <= context.canvas.width / this.pixelRatio + 5) {
        context.moveTo(rightBracketX - 5, bracketY);
        context.lineTo(rightBracketX, bracketY);
        context.lineTo(rightBracketX, bracketY + bracketHeight);
        context.lineTo(rightBracketX - 5, bracketY + bracketHeight);
      }

      context.stroke();

      // Draw group label - use original width, not clipped
      if (width > 30 && group.name) {
        // Create label with instance number if applicable
        let label = group.name;
        if (group.instanceNumber && group.totalInstances && group.totalInstances > 1) {
          label += ` #${group.instanceNumber}`;
        }
        if (this.showLoopIcons) {
          if (group.isLoopCut) {
            label += ' ✕';
          } else if (group.isLoop) {
            label += ' ↻';
          }
        }

        this.drawLabel(
          context,
          label,
          startX + width / 2, // Use original startX and width, not clipped
          bracketY + 2,
          width - 10, // Use original width, not clippedWidth
          color,
          'center',
          'top',
          true, // bold
        );
      }
    }

    context.globalAlpha = 1;
  }

  /**
   * Render all visible elements
   */
  renderElements(
    context: CanvasRenderingContext2D,
    elements: GanttElementType[],
    timeMatrix: TimeMatrix,
    visibleRowStart: number,
    visibleRowEnd: number,
    hoveredElementId?: string,
  ): { visibleElements: GanttElementType[] } {
    // Track which elements are actually visible
    const visibleElements: GanttElementType[] = [];

    // Render all elements that fall within the visible row range
    // Always use the element's position in the original array as its row index
    elements.forEach((element, rowIndex) => {
      // Skip elements outside the visible row range
      if (rowIndex < visibleRowStart || rowIndex > visibleRowEnd) {
        return;
      }

      // Add to visible elements list
      visibleElements.push(element);

      // Render row background pattern for constrained elements
      const isBoundaryEvent = (element as any).isBoundaryEvent;
      const isSubProcessChild = (element as any).parentSubProcessId;

      if (isBoundaryEvent && isSubProcessChild) {
        // Element is both boundary event AND sub-process child - render unified pattern
        this.renderConstrainedElementRowBackground(
          context,
          rowIndex,
          timeMatrix,
          elements,
          element,
          true,
          true,
        );
      } else if (isBoundaryEvent) {
        // Only boundary event
        this.renderBoundaryEventRowBackground(context, rowIndex, timeMatrix, elements, element);
      } else if (isSubProcessChild) {
        // Only sub-process child
        this.renderSubProcessChildRowBackground(context, rowIndex, timeMatrix, elements, element);
      }

      // Render based on element type
      switch (element.type) {
        case 'group':
          this.renderGroup(
            context,
            element as GanttElementType & { type: 'group'; start: number; end: number },
            rowIndex,
            timeMatrix,
            element.id === hoveredElementId,
          );
          break;

        case 'task':
          this.renderTask(
            context,
            element as GanttElementType & { type: 'task'; start: number; end: number },
            rowIndex,
            timeMatrix,
            element.id === hoveredElementId,
          );
          break;

        case 'milestone':
          this.renderMilestone(
            context,
            element as GanttElementType & { type: 'milestone'; start: number; end?: number },
            rowIndex,
            timeMatrix,
            element.id === hoveredElementId,
          );
          break;
      }
    });

    return { visibleElements };
  }

  /**
   * Draw text with ellipsis if it's too long
   */
  private drawLabel(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    color: string,
    textAlign: CanvasTextAlign = 'left',
    textBaseline: CanvasTextBaseline = 'middle',
    bold: boolean = false,
  ): void {
    // Dynamic font sizing based on device pixel ratio
    // The issue: Mac scaled displays report pixelRatio=2 but render larger than expected
    let fontSize = 12;

    // Much more aggressive reduction for high-DPI displays
    if (this.pixelRatio >= 2) {
      fontSize = 6.5; // Very small for Retina displays
    } else if (this.pixelRatio > 1.5) {
      fontSize = 9;
    } else if (this.pixelRatio > 1) {
      fontSize = 10.5;
    }

    const fontFamily =
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

    context.save();
    context.scale(this.pixelRatio, this.pixelRatio);

    drawText(context, text, x / this.pixelRatio, y / this.pixelRatio, maxWidth / this.pixelRatio, {
      font: `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`,
      fillStyle: color,
      textAlign,
      textBaseline,
    });

    context.restore();
  }

  /**
   * Draw text with a semi-transparent background for better readability
   */
  private drawLabelWithBackground(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    color: string,
    textAlign: CanvasTextAlign = 'left',
    textBaseline: CanvasTextBaseline = 'middle',
    bold: boolean = false,
  ): void {
    // Dynamic font sizing based on device pixel ratio
    let fontSize = 12;

    if (this.pixelRatio >= 2) {
      fontSize = 6.5;
    } else if (this.pixelRatio > 1.5) {
      fontSize = 9;
    } else if (this.pixelRatio > 1) {
      fontSize = 10.5;
    }

    const fontFamily =
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

    context.save();
    context.scale(this.pixelRatio, this.pixelRatio);

    // Set font for text measurement
    context.font = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
    context.textAlign = textAlign;
    context.textBaseline = textBaseline;

    // Calculate actual text dimensions
    const scaledX = x / this.pixelRatio;
    const scaledY = y / this.pixelRatio;
    const scaledMaxWidth = maxWidth / this.pixelRatio;

    // Measure the text that will actually be drawn (with ellipsis if needed)
    const displayText = scaledMaxWidth
      ? this.measureTextWithEllipsis(context, text, scaledMaxWidth)
      : text;
    const textMetrics = context.measureText(displayText);
    const textWidth = textMetrics.width;
    const textHeight = fontSize; // Approximate text height

    // Calculate background rectangle position based on text alignment
    let bgX = scaledX;
    if (textAlign === 'center') {
      bgX = scaledX - textWidth / 2;
    } else if (textAlign === 'right') {
      bgX = scaledX - textWidth;
    }

    let bgY = scaledY;
    if (textBaseline === 'middle') {
      bgY = scaledY - textHeight / 2;
    } else if (textBaseline === 'bottom') {
      bgY = scaledY - textHeight;
    }

    // Add padding around text
    const padding = 2;
    bgX -= padding;
    bgY -= padding;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;

    // Draw semi-transparent background
    context.fillStyle = 'rgba(255, 255, 255, 0.65)';
    context.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Draw the text
    context.fillStyle = color;
    context.fillText(displayText, scaledX, scaledY);

    context.restore();
  }

  /**
   * Measure text with ellipsis (similar to the utility function but adapted for use here)
   */
  private measureTextWithEllipsis(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string {
    const fullWidth = context.measureText(text).width;
    if (fullWidth <= maxWidth) return text;

    const ellipsis = '...';
    const ellipsisWidth = context.measureText(ellipsis).width;

    // Binary search for optimal text length
    let left = 0;
    let right = text.length;
    let result = '';

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const truncated = text.substring(0, mid) + ellipsis;
      const width = context.measureText(truncated).width;

      if (width <= maxWidth) {
        result = truncated;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result || ellipsis;
  }

  /**
   * Check if any ghost occurrences are visible
   */
  private areAnyGhostOccurrencesVisible(
    ghostOccurrences: Array<{ start: number; end?: number }>,
    timeMatrix: TimeMatrix,
    canvasWidth: number,
  ): boolean {
    return ghostOccurrences.some((ghost) => {
      const ghostStartX = timeMatrix.transformPoint(ghost.start);
      const ghostEndX = timeMatrix.transformPoint(ghost.end || ghost.start);
      const ghostWidth = Math.max(ghostEndX - ghostStartX, ELEMENT_MIN_WIDTH);
      return !(ghostStartX + ghostWidth < 0 || ghostStartX > canvasWidth);
    });
  }

  /**
   * Render ghost occurrences for task elements
   */
  private renderGhostOccurrences(
    context: CanvasRenderingContext2D,
    ghostOccurrences: Array<{ start: number; end?: number }>,
    rowIndex: number,
    timeMatrix: TimeMatrix,
    color: string,
    mainElementBounds?: {
      startX: number;
      endX: number;
      textStartX: number;
      textEndX: number;
      hasText: boolean;
    },
  ): void {
    const y = rowIndex * ROW_HEIGHT + TASK_PADDING;
    const height = ROW_HEIGHT - TASK_PADDING * 2;

    context.save();
    context.globalAlpha = 0.75; // Ghost opacity

    ghostOccurrences.forEach((ghost, index) => {
      const ghostStartX = timeMatrix.transformPoint(ghost.start);
      const ghostEndX = timeMatrix.transformPoint(ghost.end || ghost.start);
      const ghostWidth = Math.max(ghostEndX - ghostStartX, ELEMENT_MIN_WIDTH);

      // Skip if completely outside visible area
      if (ghostStartX + ghostWidth < 0 || ghostStartX > context.canvas.width / this.pixelRatio) {
        return;
      }

      // Check if ghost overlaps with main element's text area
      if (mainElementBounds && mainElementBounds.hasText) {
        const ghostStart = ghostStartX;
        const ghostEnd = ghostStartX + ghostWidth;
        const textStart = mainElementBounds.textStartX;
        const textEnd = mainElementBounds.textEndX;

        // If ghost overlaps with text area, split the rendering
        if (ghostStart < textEnd && ghostEnd > textStart) {
          // Draw left part (before text area)
          if (ghostStart < textStart) {
            const leftWidth = Math.min(textStart - ghostStart, ghostWidth);
            if (leftWidth > 0) {
              context.fillStyle = color;
              context.fillRect(
                Math.floor(ghostStart),
                Math.floor(y),
                Math.ceil(leftWidth),
                Math.ceil(height),
              );
            }
          }

          // Draw right part (after text area)
          if (ghostEnd > textEnd) {
            const rightStart = Math.max(textEnd, ghostStart);
            const rightWidth = ghostEnd - rightStart;
            if (rightWidth > 0) {
              context.fillStyle = color;
              context.fillRect(
                Math.floor(rightStart),
                Math.floor(y),
                Math.ceil(rightWidth),
                Math.ceil(height),
              );
            }
          }

          // Add borders at the actual ghost boundaries (not split boundaries)
          context.strokeStyle = 'black';
          context.globalAlpha = 0.45;
          context.lineWidth = 1;

          // Left border (original ghost start)
          context.beginPath();
          context.moveTo(Math.floor(ghostStart), Math.floor(y));
          context.lineTo(Math.floor(ghostStart), Math.floor(y) + Math.ceil(height));
          context.stroke();

          // Right border (original ghost end)
          context.beginPath();
          context.moveTo(Math.floor(ghostEnd), Math.floor(y));
          context.lineTo(Math.floor(ghostEnd), Math.floor(y) + Math.ceil(height));
          context.stroke();

          context.globalAlpha = 0.75; // Restore ghost opacity
        } else {
          // No overlap with text area, render normally
          context.fillStyle = color;
          context.fillRect(
            Math.floor(ghostStartX),
            Math.floor(y),
            Math.ceil(ghostWidth),
            Math.ceil(height),
          );

          // Add borders
          context.strokeStyle = 'black';
          context.globalAlpha = 0.45;
          context.lineWidth = 1;

          context.beginPath();
          context.moveTo(Math.floor(ghostStartX), Math.floor(y));
          context.lineTo(Math.floor(ghostStartX), Math.floor(y) + Math.ceil(height));
          context.stroke();

          context.beginPath();
          context.moveTo(Math.floor(ghostStartX) + Math.ceil(ghostWidth), Math.floor(y));
          context.lineTo(
            Math.floor(ghostStartX) + Math.ceil(ghostWidth),
            Math.floor(y) + Math.ceil(height),
          );
          context.stroke();

          context.globalAlpha = 0.75; // Restore ghost opacity
        }
      } else {
        // No main element bounds provided or no text, render normally
        context.fillStyle = color;
        context.fillRect(
          Math.floor(ghostStartX),
          Math.floor(y),
          Math.ceil(ghostWidth),
          Math.ceil(height),
        );

        // Add borders
        context.strokeStyle = 'black';
        context.globalAlpha = 0.45;
        context.lineWidth = 1;

        context.beginPath();
        context.moveTo(Math.floor(ghostStartX), Math.floor(y));
        context.lineTo(Math.floor(ghostStartX), Math.floor(y) + Math.ceil(height));
        context.stroke();

        context.beginPath();
        context.moveTo(Math.floor(ghostStartX) + Math.ceil(ghostWidth), Math.floor(y));
        context.lineTo(
          Math.floor(ghostStartX) + Math.ceil(ghostWidth),
          Math.floor(y) + Math.ceil(height),
        );
        context.stroke();

        context.globalAlpha = 0.75; // Restore ghost opacity
      }
    });

    context.restore();
  }

  /**
   * Check if any ghost milestones are visible
   */
  private areAnyGhostMilestonesVisible(
    ghostOccurrences: Array<{ start: number; end?: number }>,
    timeMatrix: TimeMatrix,
    canvasWidth: number,
  ): boolean {
    return ghostOccurrences.some((ghost) => {
      const startX = timeMatrix.transformPoint(ghost.start);
      const endX = ghost.end ? timeMatrix.transformPoint(ghost.end) : startX;
      return !(endX < -MILESTONE_SIZE || startX > canvasWidth + MILESTONE_SIZE);
    });
  }

  /**
   * Render ghost occurrences for milestone elements
   */
  private renderGhostMilestones(
    context: CanvasRenderingContext2D,
    ghostOccurrences: Array<{ start: number; end?: number }>,
    rowIndex: number,
    timeMatrix: TimeMatrix,
    color: string,
  ): void {
    const y = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    context.save();
    context.globalAlpha = 0.75; // Ghost opacity
    context.fillStyle = color;

    ghostOccurrences.forEach((ghost, index) => {
      const startX = timeMatrix.transformPoint(ghost.start);
      const endX = ghost.end ? timeMatrix.transformPoint(ghost.end) : startX;
      const hasRange = ghost.end && ghost.end !== ghost.start;

      // Calculate milestone position - centered if there's a range, otherwise at start
      const milestoneX = hasRange ? (startX + endX) / 2 : startX;

      // Skip if completely outside visible area
      if (
        endX < -MILESTONE_SIZE ||
        startX > context.canvas.width / this.pixelRatio + MILESTONE_SIZE
      ) {
        return;
      }

      // If there's a range, render it with semi-transparent pattern (same as main milestone)
      if (hasRange) {
        const rangeWidth = endX - startX;
        const minimumRangeWidth = MILESTONE_SIZE * 1.5; // Milestone size + 50%

        // Only render the range visual if it's wide enough
        if (rangeWidth > minimumRangeWidth) {
          context.save();

          // Create clipping region for the range area
          const rangeHeight = ROW_HEIGHT - 8;
          const rangeY = y - rangeHeight / 2;

          context.beginPath();
          context.rect(startX, rangeY, rangeWidth, rangeHeight);
          context.clip();

          // Draw slanted lines pattern
          context.strokeStyle = hexToRgba(color, 0.15 * 0.75); // Apply ghost opacity to pattern
          context.lineWidth = 1;
          const lineSpacing = 6;

          // Draw diagonal lines at 45 degree angle
          for (let i = startX - rangeHeight; i < endX + rangeHeight; i += lineSpacing) {
            context.beginPath();
            context.moveTo(i, rangeY);
            context.lineTo(i + rangeHeight, rangeY + rangeHeight);
            context.stroke();
          }

          context.restore();

          // Draw brackets at the ends
          context.strokeStyle = color;
          context.lineWidth = 2;
          context.globalAlpha = 0.75; // Ghost opacity

          const bracketSize = 6;

          // Left bracket
          context.beginPath();
          context.moveTo(startX + bracketSize, rangeY);
          context.lineTo(startX, rangeY);
          context.lineTo(startX, rangeY + rangeHeight);
          context.lineTo(startX + bracketSize, rangeY + rangeHeight);
          context.stroke();

          // Right bracket
          context.beginPath();
          context.moveTo(endX - bracketSize, rangeY);
          context.lineTo(endX, rangeY);
          context.lineTo(endX, rangeY + rangeHeight);
          context.lineTo(endX - bracketSize, rangeY + rangeHeight);
          context.stroke();
        }
      }

      // Draw ghost milestone diamond
      context.fillStyle = color;
      context.globalAlpha = 0.75; // Ensure ghost opacity
      context.beginPath();
      context.moveTo(milestoneX, y - MILESTONE_SIZE / 2);
      context.lineTo(milestoneX + MILESTONE_SIZE / 2, y);
      context.lineTo(milestoneX, y + MILESTONE_SIZE / 2);
      context.lineTo(milestoneX - MILESTONE_SIZE / 2, y);
      context.closePath();
      context.fill();
    });

    context.restore();
  }

  /**
   * Render subtle gray slash pattern for boundary event rows
   * with cutout for the attached task timespan
   */
  private renderBoundaryEventRowBackground(
    context: CanvasRenderingContext2D,
    rowIndex: number,
    timeMatrix: TimeMatrix,
    elements: GanttElementType[],
    boundaryEvent: GanttElementType,
  ): void {
    const y = rowIndex * ROW_HEIGHT;
    const rowY = y + TASK_PADDING;
    const rowHeight = ROW_HEIGHT - 2 * TASK_PADDING;

    // Find the attached task to create a cutout
    const attachedToId = (boundaryEvent as any).attachedToId;
    let attachedTask: GanttElementType | undefined;

    if (attachedToId) {
      // Find the specific task instance that this boundary event is attached to
      // Rather than just finding any task with the base ID, we need to find the task instance
      // whose timespan contains this boundary event
      const candidateTasks = elements.filter(
        (el) => el.id === attachedToId || el.id.startsWith(attachedToId + '_instance_'),
      );

      // If there's only one candidate, use it (single instance case)
      if (candidateTasks.length === 1) {
        attachedTask = candidateTasks[0];
      } else if (candidateTasks.length > 1) {
        // Multiple task instances - find the one whose timespan contains this boundary event
        // Boundary events should be positioned within their attached task's time range
        attachedTask = candidateTasks.find((task) => {
          if (!task.end) return false; // Skip if task has no end time

          const taskStart = task.start;
          const taskEnd = task.end;
          const boundaryStart = boundaryEvent.start;

          // Boundary event should be positioned within or at the task's timespan
          return boundaryStart >= taskStart && boundaryStart <= taskEnd;
        });

        // Fallback to first candidate if no timing match found
        if (!attachedTask) {
          attachedTask = candidateTasks[0];
        }
      }
    }

    // Get viewport boundaries
    const canvasWidth = context.canvas.width / this.pixelRatio;
    const visibleTimeRange = timeMatrix.getVisibleTimeRange(canvasWidth);
    const startX = timeMatrix.transformPoint(visibleTimeRange[0]);
    const endX = timeMatrix.transformPoint(visibleTimeRange[1]);

    context.save();

    // Set up clipping rectangle for clean row boundaries
    context.beginPath();
    context.rect(startX, rowY, endX - startX, rowHeight);
    context.clip();

    // Create the slash pattern
    context.strokeStyle = 'rgba(120, 120, 120, 0.4)'; // More visible gray
    context.lineWidth = 1.5;

    // Create slash pattern across the entire row
    const slashSpacing = 12; // Distance between slashes
    const slashLength = 8; // Length of each slash

    if (
      attachedTask &&
      (attachedTask.type === 'task' || attachedTask.type === 'group') &&
      'start' in attachedTask &&
      'end' in attachedTask
    ) {
      // Calculate attached element boundaries in screen coordinates (task or sub-process)
      const elementStartX = timeMatrix.transformPoint(attachedTask.start);
      const elementEndX = timeMatrix.transformPoint(attachedTask.end);

      // Render slashes before the attached element - clip slashes that would cross boundary
      for (let x = startX; x < elementStartX; x += slashSpacing) {
        const slashEndX = Math.min(x + slashLength, elementStartX); // Clip at boundary
        if (slashEndX > x) {
          // Only draw if there's something to draw
          // Calculate proportional Y coordinate to maintain angle
          const actualLength = slashEndX - x;
          const slashProgress = actualLength / slashLength;
          const slashEndY = rowY + rowHeight * slashProgress;

          context.beginPath();
          context.moveTo(x, rowY);
          context.lineTo(slashEndX, slashEndY);
          context.stroke();
        }
      }

      // Render slashes after the attached element - clip slashes that would extend past viewport
      for (let x = elementEndX; x < endX; x += slashSpacing) {
        const slashEndX = Math.min(x + slashLength, endX); // Clip at viewport boundary
        if (slashEndX > x) {
          // Only draw if there's something to draw
          // Calculate proportional Y coordinate to maintain angle
          const actualLength = slashEndX - x;
          const slashProgress = actualLength / slashLength;
          const slashEndY = rowY + rowHeight * slashProgress;

          context.beginPath();
          context.moveTo(x, rowY);
          context.lineTo(slashEndX, slashEndY);
          context.stroke();
        }
      }

      // Add dashed vertical lines at the edges of the slashed areas
      context.setLineDash([3, 2]); // Short dashes for vertical boundary lines
      context.strokeStyle = 'rgba(80, 80, 80, 0.6)'; // Slightly darker than slashes
      context.lineWidth = 1;

      // Left vertical line (start of attached element, edge of slashed area)
      if (elementStartX >= startX && elementStartX <= endX) {
        context.beginPath();
        context.moveTo(elementStartX, rowY);
        context.lineTo(elementStartX, rowY + rowHeight);
        context.stroke();
      }

      // Right vertical line (end of attached element, edge of slashed area)
      if (elementEndX >= startX && elementEndX <= endX) {
        context.beginPath();
        context.moveTo(elementEndX, rowY);
        context.lineTo(elementEndX, rowY + rowHeight);
        context.stroke();
      }

      context.setLineDash([]); // Reset line dash
    } else {
      // No attached task found, render slashes across entire row - clip at viewport boundary
      for (let x = startX; x < endX; x += slashSpacing) {
        const slashEndX = Math.min(x + slashLength, endX); // Clip at viewport boundary
        if (slashEndX > x) {
          // Only draw if there's something to draw
          // Calculate proportional Y coordinate to maintain angle
          const actualLength = slashEndX - x;
          const slashProgress = actualLength / slashLength;
          const slashEndY = rowY + rowHeight * slashProgress;

          context.beginPath();
          context.moveTo(x, rowY);
          context.lineTo(slashEndX, slashEndY);
          context.stroke();
        }
      }
    }

    context.restore();
  }

  /**
   * Render subtle gray slash pattern for sub-process child element rows
   * with cutout for the parent sub-process timespan
   */
  private renderSubProcessChildRowBackground(
    context: CanvasRenderingContext2D,
    rowIndex: number,
    timeMatrix: TimeMatrix,
    elements: GanttElementType[],
    childElement: GanttElementType,
  ): void {
    const y = rowIndex * ROW_HEIGHT;
    const rowY = y + TASK_PADDING;
    const rowHeight = ROW_HEIGHT - 2 * TASK_PADDING;

    // Find the parent sub-process to create a cutout
    const parentSubProcessId = (childElement as any).parentSubProcessId;
    let parentSubProcess: GanttElementType | undefined;

    if (parentSubProcessId) {
      // Find the specific sub-process instance that this child belongs to
      const candidateSubProcesses = elements.filter(
        (el) =>
          (el.id === parentSubProcessId || el.id.startsWith(parentSubProcessId + '_instance_')) &&
          el.type === 'group',
      );

      // If there's only one candidate, use it (single instance case)
      if (candidateSubProcesses.length === 1) {
        parentSubProcess = candidateSubProcesses[0];
      } else if (candidateSubProcesses.length === 0) {
        // No direct match found - try special handling for nested sub-processes
        if (parentSubProcessId.includes('_subprocess_')) {
          // For nested sub-processes, try to extract the base parent ID
          // parentSubProcessId: Activity_04vzwbt_instance_3_subprocess_Activity_1c6bl41_instance_10
          // should match element: Activity_04vzwbt_instance_3
          const baseParentId = parentSubProcessId.split('_subprocess_')[0];
          const baseMatches = elements.filter(
            (el) => el.id === baseParentId && el.type === 'group',
          );
          if (baseMatches.length > 0) {
            parentSubProcess = baseMatches[0];
          }
        }
      } else if (candidateSubProcesses.length > 1) {
        // Multiple sub-process instances - find the one whose timespan contains this child
        const childStart = childElement.start;
        const childEnd = 'end' in childElement ? childElement.end : childStart;

        parentSubProcess = candidateSubProcesses.find((subProcess) => {
          if (!('end' in subProcess) || !subProcess.end) return false;

          const subProcessStart = subProcess.start;
          const subProcessEnd = subProcess.end;

          // Child should be positioned within the sub-process timespan
          return (
            (childStart >= subProcessStart && childStart <= subProcessEnd) ||
            (childEnd !== undefined && childEnd >= subProcessStart && childEnd <= subProcessEnd) ||
            (childStart <= subProcessStart && childEnd !== undefined && childEnd >= subProcessEnd)
          );
        });

        // Fallback to first candidate if no timing match found
        if (!parentSubProcess) {
          parentSubProcess = candidateSubProcesses[0];
        }
      }
    }

    // Get viewport boundaries
    const canvasWidth = context.canvas.width / this.pixelRatio;
    const visibleTimeRange = timeMatrix.getVisibleTimeRange(canvasWidth);
    const startX = timeMatrix.transformPoint(visibleTimeRange[0]);
    const endX = timeMatrix.transformPoint(visibleTimeRange[1]);

    context.save();

    // Set up clipping rectangle for clean row boundaries
    context.beginPath();
    context.rect(startX, rowY, endX - startX, rowHeight);
    context.clip();

    // Create the slash pattern - aligned with boundary event styling
    context.strokeStyle = 'rgba(120, 120, 120, 0.4)'; // Same as boundary events
    context.lineWidth = 1.5;

    // Create slash pattern across the entire row - aligned with boundary event spacing
    const slashSpacing = 12; // Same as boundary events
    const slashLength = 8; // Same as boundary events

    if (
      parentSubProcess &&
      parentSubProcess.type === 'group' &&
      'start' in parentSubProcess &&
      'end' in parentSubProcess
    ) {
      // Calculate sub-process boundaries in screen coordinates
      const subProcessStartX = timeMatrix.transformPoint(parentSubProcess.start);
      const subProcessEndX = timeMatrix.transformPoint(parentSubProcess.end);

      // Render slashes before the sub-process - clip slashes that would cross boundary
      for (let x = startX; x < subProcessStartX; x += slashSpacing) {
        const slashEndX = Math.min(x + slashLength, subProcessStartX); // Clip at boundary
        if (slashEndX > x) {
          // Only draw if there's something to draw
          // Calculate proportional Y coordinate to maintain angle
          const actualLength = slashEndX - x;
          const slashProgress = actualLength / slashLength;
          const slashEndY = rowY + rowHeight * slashProgress;

          context.beginPath();
          context.moveTo(x, rowY);
          context.lineTo(slashEndX, slashEndY);
          context.stroke();
        }
      }

      // Render slashes after the sub-process - clip slashes that would extend past viewport
      for (let x = subProcessEndX; x < endX; x += slashSpacing) {
        const slashEndX = Math.min(x + slashLength, endX); // Clip at viewport boundary
        if (slashEndX > x) {
          // Only draw if there's something to draw
          // Calculate proportional Y coordinate to maintain angle
          const actualLength = slashEndX - x;
          const slashProgress = actualLength / slashLength;
          const slashEndY = rowY + rowHeight * slashProgress;

          context.beginPath();
          context.moveTo(x, rowY);
          context.lineTo(slashEndX, slashEndY);
          context.stroke();
        }
      }

      // Add dashed vertical lines at the edges of the slashed areas
      context.setLineDash([3, 2]); // Short dashes for vertical boundary lines
      context.strokeStyle = 'rgba(80, 80, 80, 0.6)'; // Slightly darker than slashes
      context.lineWidth = 1;

      // Left vertical line (start of sub-process, edge of slashed area)
      if (subProcessStartX >= startX && subProcessStartX <= endX) {
        context.beginPath();
        context.moveTo(subProcessStartX, rowY);
        context.lineTo(subProcessStartX, rowY + rowHeight);
        context.stroke();
      }

      // Right vertical line (end of sub-process, edge of slashed area)
      if (subProcessEndX >= startX && subProcessEndX <= endX) {
        context.beginPath();
        context.moveTo(subProcessEndX, rowY);
        context.lineTo(subProcessEndX, rowY + rowHeight);
        context.stroke();
      }

      context.setLineDash([]); // Reset line dash
    } else {
      // No parent sub-process found, render slashes across entire row - clip at viewport boundary
      for (let x = startX; x < endX; x += slashSpacing) {
        const slashEndX = Math.min(x + slashLength, endX); // Clip at viewport boundary
        if (slashEndX > x) {
          // Only draw if there's something to draw
          // Calculate proportional Y coordinate to maintain angle
          const actualLength = slashEndX - x;
          const slashProgress = actualLength / slashLength;
          const slashEndY = rowY + rowHeight * slashProgress;

          context.beginPath();
          context.moveTo(x, rowY);
          context.lineTo(slashEndX, slashEndY);
          context.stroke();
        }
      }
    }

    context.restore();
  }

  /**
   * Render row background pattern for elements with multiple constraints
   * (e.g., boundary events that are also sub-process children)
   */
  private renderConstrainedElementRowBackground(
    context: CanvasRenderingContext2D,
    rowIndex: number,
    timeMatrix: TimeMatrix,
    elements: GanttElementType[],
    element: GanttElementType,
    isBoundaryEvent: boolean,
    isSubProcessChild: boolean,
  ): void {
    const y = rowIndex * ROW_HEIGHT;
    const rowY = y + TASK_PADDING;
    const rowHeight = ROW_HEIGHT - 2 * TASK_PADDING;

    // Collect all constraint regions (areas where slashes should NOT appear)
    const constraintRegions: Array<{ start: number; end: number }> = [];

    // Add boundary event constraint (attached task timespan)
    if (isBoundaryEvent) {
      const attachedToId = (element as any).attachedToId;
      if (attachedToId) {
        const attachedTask = this.findAttachedTask(elements, attachedToId, element);
        if (
          attachedTask &&
          (attachedTask.type === 'task' || attachedTask.type === 'group') &&
          'start' in attachedTask &&
          'end' in attachedTask
        ) {
          constraintRegions.push({
            start: attachedTask.start,
            end: attachedTask.end,
          });
        }
      }
    }

    // Add sub-process constraint (parent sub-process timespan)
    if (isSubProcessChild) {
      const parentSubProcessId = (element as any).parentSubProcessId;
      if (parentSubProcessId) {
        const parentSubProcess = this.findParentSubProcess(elements, parentSubProcessId, element);
        if (
          parentSubProcess &&
          'start' in parentSubProcess &&
          'end' in parentSubProcess &&
          parentSubProcess.end !== undefined
        ) {
          constraintRegions.push({
            start: parentSubProcess.start,
            end: parentSubProcess.end,
          });
        }
      }
    }

    // Merge overlapping regions
    const mergedRegions = this.mergeConstraintRegions(constraintRegions);

    // Get viewport boundaries
    const canvasWidth = context.canvas.width / this.pixelRatio;
    const visibleTimeRange = timeMatrix.getVisibleTimeRange(canvasWidth);
    const startX = timeMatrix.transformPoint(visibleTimeRange[0]);
    const endX = timeMatrix.transformPoint(visibleTimeRange[1]);

    context.save();

    // Set up clipping rectangle for clean row boundaries
    context.beginPath();
    context.rect(startX, rowY, endX - startX, rowHeight);
    context.clip();

    // Create the slash pattern - consistent styling
    context.strokeStyle = 'rgba(120, 120, 120, 0.4)';
    context.lineWidth = 1.5;

    // Create slash pattern across the entire row, excluding constraint regions
    const slashSpacing = 12; // Aligned with boundary events
    const slashLength = 8;

    // Render slashes with constraint regions as cutouts
    this.renderSlashesWithConstraints(
      context,
      startX,
      endX,
      rowY,
      rowHeight,
      slashSpacing,
      slashLength,
      mergedRegions,
      timeMatrix,
    );

    // Add dashed vertical lines at the edges of all constraint regions
    context.setLineDash([3, 2]); // Short dashes for vertical boundary lines
    context.strokeStyle = 'rgba(80, 80, 80, 0.6)'; // Slightly darker than slashes
    context.lineWidth = 1;

    mergedRegions.forEach((region) => {
      const regionStartX = timeMatrix.transformPoint(region.start);
      const regionEndX = timeMatrix.transformPoint(region.end);

      // Left vertical line (start of constraint region, edge of slashed area)
      if (regionStartX >= startX && regionStartX <= endX) {
        context.beginPath();
        context.moveTo(regionStartX, rowY);
        context.lineTo(regionStartX, rowY + rowHeight);
        context.stroke();
      }

      // Right vertical line (end of constraint region, edge of slashed area)
      if (regionEndX >= startX && regionEndX <= endX) {
        context.beginPath();
        context.moveTo(regionEndX, rowY);
        context.lineTo(regionEndX, rowY + rowHeight);
        context.stroke();
      }
    });

    context.setLineDash([]); // Reset line dash

    context.restore();
  }

  /**
   * Find the attached task for a boundary event
   */
  private findAttachedTask(
    elements: GanttElementType[],
    attachedToId: string,
    boundaryEvent: GanttElementType,
  ): GanttElementType | undefined {
    const candidateTasks = elements.filter(
      (el) => el.id === attachedToId || el.id.startsWith(attachedToId + '_instance_'),
    );

    if (candidateTasks.length === 1) {
      return candidateTasks[0];
    } else if (candidateTasks.length > 1) {
      return (
        candidateTasks.find((task) => {
          if (!('end' in task) || !task.end) return false;
          const taskStart = task.start;
          const taskEnd = task.end;
          const boundaryStart = boundaryEvent.start;
          return boundaryStart >= taskStart && boundaryStart <= taskEnd;
        }) || candidateTasks[0]
      );
    }
    return undefined;
  }

  /**
   * Find the parent sub-process for a child element
   */
  private findParentSubProcess(
    elements: GanttElementType[],
    parentSubProcessId: string,
    childElement: GanttElementType,
  ): GanttElementType | undefined {
    const candidateSubProcesses = elements.filter(
      (el) =>
        (el.id === parentSubProcessId || el.id.startsWith(parentSubProcessId + '_instance_')) &&
        el.type === 'group',
    );

    if (candidateSubProcesses.length === 1) {
      return candidateSubProcesses[0];
    } else if (candidateSubProcesses.length > 1) {
      const childStart = childElement.start;
      const childEnd = 'end' in childElement ? childElement.end : childStart;

      return (
        candidateSubProcesses.find((subProcess) => {
          if (!('end' in subProcess) || !subProcess.end) return false;
          const subProcessStart = subProcess.start;
          const subProcessEnd = subProcess.end;
          return (
            (childStart >= subProcessStart && childStart <= subProcessEnd) ||
            (childEnd !== undefined && childEnd >= subProcessStart && childEnd <= subProcessEnd) ||
            (childStart <= subProcessStart && childEnd !== undefined && childEnd >= subProcessEnd)
          );
        }) || candidateSubProcesses[0]
      );
    }
    return undefined;
  }

  /**
   * Merge overlapping constraint regions
   */
  private mergeConstraintRegions(
    regions: Array<{ start: number; end: number }>,
  ): Array<{ start: number; end: number }> {
    if (regions.length <= 1) return regions;

    const sorted = [...regions].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = merged[merged.length - 1];

      if (current.start <= previous.end) {
        previous.end = Math.max(previous.end, current.end);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Render slashes with constraint cutouts
   */
  private renderSlashesWithConstraints(
    context: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    rowY: number,
    rowHeight: number,
    slashSpacing: number,
    slashLength: number,
    constraintRegions: Array<{ start: number; end: number }>,
    timeMatrix: TimeMatrix,
  ): void {
    // Convert constraint regions to screen coordinates
    const screenConstraints = constraintRegions.map((region) => ({
      startX: timeMatrix.transformPoint(region.start),
      endX: timeMatrix.transformPoint(region.end),
    }));

    // Render slashes across the entire visible area
    for (let x = startX; x < endX; x += slashSpacing) {
      // Check if this slash position is within any constraint region
      const inConstraint = screenConstraints.some(
        (constraint) => x >= constraint.startX && x < constraint.endX,
      );

      if (!inConstraint && x < endX) {
        // Calculate the actual end point - let canvas clipping handle boundaries
        const slashEndX = x + slashLength;

        // Also check if the end point would be in a constraint
        const endInConstraint = screenConstraints.some(
          (constraint) => slashEndX > constraint.startX && slashEndX <= constraint.endX,
        );

        if (!endInConstraint) {
          // Check if the slash would cross a constraint boundary
          let finalEndX = slashEndX;
          for (const constraint of screenConstraints) {
            if (x < constraint.startX && slashEndX > constraint.startX) {
              finalEndX = constraint.startX;
              break;
            }
          }

          if (finalEndX > x) {
            const slashProgress = (finalEndX - x) / slashLength;
            const slashEndY = rowY + rowHeight * slashProgress;

            context.beginPath();
            context.moveTo(x, rowY);
            context.lineTo(finalEndX, slashEndY);
            context.stroke();
          }
        }
      }
    }
  }
}
