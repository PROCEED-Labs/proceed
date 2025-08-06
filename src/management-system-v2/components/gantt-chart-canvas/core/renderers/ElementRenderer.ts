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
  setHoveredElement(_elementId: string | null): void {
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

    // Check if this is a sub-process or lane header (based on element properties)
    const isSubProcess = (group as any).isSubProcess;
    const isLaneHeader = (group as any).isLaneHeader;

    if (isLaneHeader || isSubProcess) {
      // Render sub-process as filled horizontal bar with downward tabs
      const barHeight = Math.max(4, 2 * this.pixelRatio); // Minimum 3px for visibility on low DPI, scaled for high DPI
      const tabHeight = Math.max(8, 4 * this.pixelRatio); // Minimum 5px for tabs, scaled for high DPI
      const tabWidth = Math.max(6, 3 * this.pixelRatio); // Minimum 4px width for tabs, scaled for high DPI

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
    _collapsedSubProcesses?: Set<string>,
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

      // Lane elements don't need slashing as participant edge lines show boundaries
      const isLaneChild = (element as any).laneId; // Check if element belongs to a lane

      if (isLaneChild || (element as any).isLaneHeader) {
        // Skip - no slashing for lanes or lane children, participant edge lines show boundaries
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

    // Constraint rendering happens in CanvasRenderer before element rendering

    // Note: Collapsed indicators are now rendered in CanvasRenderer before dependencies

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

    ghostOccurrences.forEach((ghost) => {
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

    ghostOccurrences.forEach((ghost) => {
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
   * PUBLIC: Render constraint backgrounds for all elements
   * This should be called BEFORE element rendering to ensure constraints appear as backgrounds
   */
  public renderConstraintBackgrounds(
    context: CanvasRenderingContext2D,
    elements: GanttElementType[],
    timeMatrix: TimeMatrix,
    visibleRowStart: number,
    visibleRowEnd: number,
    collapsedSubProcesses?: Set<string>,
  ): void {
    this.renderAllConstraintPatternsBatch(
      context,
      elements,
      timeMatrix,
      visibleRowStart,
      visibleRowEnd,
      collapsedSubProcesses,
    );
  }

  /**
   * HIGH-PERFORMANCE BATCH CONSTRAINT RENDERING
   * Replaces all individual constraint methods with unified optimized rendering
   * Target: <5ms total vs 500ms+ individual rendering
   */
  private renderAllConstraintPatternsBatch(
    context: CanvasRenderingContext2D,
    elements: GanttElementType[],
    timeMatrix: TimeMatrix,
    visibleRowStart: number,
    visibleRowEnd: number,
    collapsedSubProcesses?: Set<string>,
  ): void {
    // Step 1: Collect all constraint data in one pass
    const constraintData = this.collectAllConstraintData(elements, visibleRowStart, visibleRowEnd);

    // Step 2: Create reusable diagonal pattern (cached after first use)
    const diagonalPattern = this.createDiagonalSlashPattern(context);

    // Step 3: Render all constraints in unified batch operation
    this.renderConstraintsBatch(context, constraintData, timeMatrix, diagonalPattern);

    // Step 4: Render participant edge lines
    this.renderParticipantEdgeLinesBatch(
      context,
      constraintData,
      timeMatrix,
      elements,
      collapsedSubProcesses,
    );
  }

  /**
   * Collect constraint data for all visible elements in single pass
   */
  private collectAllConstraintData(
    elements: GanttElementType[],
    visibleRowStart: number,
    visibleRowEnd: number,
  ): Array<{
    element: GanttElementType;
    rowIndex: number;
    constraintType: 'boundary' | 'subprocess' | 'unified' | 'participant';
    cutoutRegions: Array<{ start: number; end: number }>;
    renderSlashes: boolean;
  }> {
    const constraintData: Array<{
      element: GanttElementType;
      rowIndex: number;
      constraintType: 'boundary' | 'subprocess' | 'unified' | 'participant';
      cutoutRegions: Array<{ start: number; end: number }>;
      renderSlashes: boolean;
    }> = [];

    elements.forEach((element, rowIndex) => {
      // Skip elements outside visible range
      if (rowIndex < visibleRowStart || rowIndex > visibleRowEnd) {
        return;
      }

      const isBoundaryEvent = (element as any).isBoundaryEvent;
      const isSubProcessChild = (element as any).parentSubProcessId;
      const isParticipantHeader = (element as any).isParticipantHeader;
      const isLaneChild = (element as any).laneId;

      // Skip lanes (no slashing)
      if (isLaneChild || (element as any).isLaneHeader) {
        return;
      }

      // Determine constraint type and cutout regions
      const cutoutRegions: Array<{ start: number; end: number }> = [];
      let constraintType: 'boundary' | 'subprocess' | 'unified' | 'participant' = 'subprocess';
      let renderSlashes = false;

      if (isBoundaryEvent && isSubProcessChild) {
        // FIXED: Boundary events have priority - only use attached task cutout
        // The subprocess constraint is irrelevant for boundary event visualization
        constraintType = 'boundary'; // Treat as pure boundary event
        renderSlashes = true;

        // ONLY add boundary event cutout (attached task) - this is what matters for boundary events
        const attachedTask = this.findAttachedTaskForBatch(
          elements,
          (element as any).attachedToId,
          element,
        );
        if (attachedTask && 'start' in attachedTask && 'end' in attachedTask && attachedTask.end) {
          cutoutRegions.push({ start: attachedTask.start, end: attachedTask.end });
        }

        // NOTE: We deliberately do NOT add subprocess cutout here
        // Boundary events should show slashes everywhere except during their attached task,
        // regardless of being inside a subprocess
      } else if (isBoundaryEvent) {
        constraintType = 'boundary';
        renderSlashes = true;

        // Add boundary event cutout (attached task)
        const attachedTask = this.findAttachedTaskForBatch(
          elements,
          (element as any).attachedToId,
          element,
        );
        if (attachedTask && 'start' in attachedTask && 'end' in attachedTask && attachedTask.end) {
          cutoutRegions.push({ start: attachedTask.start, end: attachedTask.end });
        }
      } else if (isSubProcessChild) {
        constraintType = 'subprocess';
        renderSlashes = true;

        // Add subprocess cutout (parent subprocess)
        const parentSubProcess = this.findParentSubProcessForBatch(
          elements,
          (element as any).parentSubProcessId,
          element,
        );
        if (
          parentSubProcess &&
          'start' in parentSubProcess &&
          'end' in parentSubProcess &&
          parentSubProcess.end
        ) {
          cutoutRegions.push({ start: parentSubProcess.start, end: parentSubProcess.end });
        }
      } else if (isParticipantHeader) {
        constraintType = 'participant';
        renderSlashes = false; // Participants only get edge lines, no slashes
      }

      if (renderSlashes || constraintType === 'participant') {
        constraintData.push({
          element,
          rowIndex,
          constraintType,
          cutoutRegions: this.mergeConstraintRegions(cutoutRegions),
          renderSlashes,
        });
      }
    });

    return constraintData;
  }

  /**
   * Create cached diagonal slash pattern
   */
  private static cachedDiagonalPattern: CanvasPattern | null = null;

  private createDiagonalSlashPattern(context: CanvasRenderingContext2D): CanvasPattern | null {
    // Return cached pattern if available
    if (ElementRenderer.cachedDiagonalPattern) {
      return ElementRenderer.cachedDiagonalPattern;
    }

    // Create small pattern canvas (much smaller than previous attempts)
    const patternSize = 16; // Small 16x16 pattern for performance
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = patternSize;
    patternCanvas.height = patternSize;
    const patternContext = patternCanvas.getContext('2d');

    if (!patternContext) return null;

    // Draw diagonal lines in pattern
    patternContext.strokeStyle = 'rgba(120, 120, 120, 0.4)';
    patternContext.lineWidth = 1.5;

    const lineSpacing = 12;
    const lineLength = 8;

    // Draw diagonal lines across pattern
    for (let x = -patternSize; x < patternSize * 2; x += lineSpacing) {
      patternContext.beginPath();
      patternContext.moveTo(x, 0);
      patternContext.lineTo(x + lineLength, lineLength);
      patternContext.stroke();
    }

    // Create pattern and cache it
    const pattern = context.createPattern(patternCanvas, 'repeat');
    ElementRenderer.cachedDiagonalPattern = pattern;
    return pattern;
  }

  /**
   * Render all constraints using optimized line-based approach (more reliable than patterns)
   */
  private renderConstraintsBatch(
    context: CanvasRenderingContext2D,
    constraintData: Array<{
      element: GanttElementType;
      rowIndex: number;
      constraintType: 'boundary' | 'subprocess' | 'unified' | 'participant';
      cutoutRegions: Array<{ start: number; end: number }>;
      renderSlashes: boolean;
    }>,
    timeMatrix: TimeMatrix,
    _diagonalPattern: CanvasPattern | null,
  ): void {
    // Get viewport boundaries once
    const canvasWidth = context.canvas.width / this.pixelRatio;
    const visibleTimeRange = timeMatrix.getVisibleTimeRange(canvasWidth);
    const startX = timeMatrix.transformPoint(visibleTimeRange[0]);
    const endX = timeMatrix.transformPoint(visibleTimeRange[1]);

    // Set up consistent styling for all slash rendering
    context.save();
    context.strokeStyle = 'rgba(120, 120, 120, 0.4)';
    context.lineWidth = 1.5;

    const slashSpacing = 12;
    const slashLength = 8;

    // Process elements that need slash patterns
    const slashElements = constraintData.filter((item) => item.renderSlashes);

    // Calculate slash positions in world coordinates to prevent shifting during pan
    const timeSpacing =
      (visibleTimeRange[1] - visibleTimeRange[0]) * (slashSpacing / (endX - startX));

    // Start from a fixed time grid aligned to prevent shifting
    const gridOriginTime = Math.floor(visibleTimeRange[0] / timeSpacing) * timeSpacing;
    const slashTimes: number[] = [];

    // Generate time-based positions extending beyond viewport for seamless panning
    for (let time = gridOriginTime; time < visibleTimeRange[1] + timeSpacing; time += timeSpacing) {
      slashTimes.push(time);
    }

    // Batch render all slash lines with efficient path building
    context.beginPath();

    for (const item of slashElements) {
      const y = item.rowIndex * ROW_HEIGHT;
      const rowY = y + TASK_PADDING;
      const rowHeight = ROW_HEIGHT - 2 * TASK_PADDING;

      // Render slashes for this row, excluding constraint regions (using time coordinates)
      for (const slashTime of slashTimes) {
        // Convert time to screen coordinates
        const x = timeMatrix.transformPoint(slashTime);

        // Skip if outside visible area
        if (x < startX || x > endX) continue;

        // Check if this slash position is within any constraint region (in time coordinates)
        const inConstraint = item.cutoutRegions.some(
          (region) => slashTime >= region.start && slashTime <= region.end,
        );

        if (!inConstraint) {
          // Calculate slash end time and convert to screen coordinates
          const slashEndTime = slashTime + timeSpacing * (slashLength / slashSpacing);
          const slashEndX = Math.min(timeMatrix.transformPoint(slashEndTime), endX);

          if (slashEndX > x) {
            // Check for constraint boundary intersections (in time coordinates)
            let finalEndTime = slashEndTime;
            for (const region of item.cutoutRegions) {
              if (slashTime < region.start && slashEndTime > region.start) {
                finalEndTime = region.start;
                break;
              }
            }

            const finalEndX = timeMatrix.transformPoint(finalEndTime);
            if (finalEndX > x) {
              const slashProgress = (finalEndX - x) / slashLength;
              const slashEndY = rowY + rowHeight * slashProgress;

              // Add lines to the batch path
              context.moveTo(x, rowY);
              context.lineTo(finalEndX, slashEndY);
            }
          }
        }
      }
    }

    // Render all slash lines in one stroke operation
    context.stroke();

    // Render vertical constraint lines in batch
    context.strokeStyle = 'rgba(80, 80, 80, 0.6)';
    context.lineWidth = 1;
    context.setLineDash([3, 2]);
    context.beginPath();

    for (const item of slashElements) {
      const y = item.rowIndex * ROW_HEIGHT;
      const rowY = y + TASK_PADDING;
      const rowHeight = ROW_HEIGHT - 2 * TASK_PADDING;

      for (const region of item.cutoutRegions) {
        const regionStartX = timeMatrix.transformPoint(region.start);
        const regionEndX = timeMatrix.transformPoint(region.end);

        // Left line
        if (regionStartX >= startX && regionStartX <= endX) {
          context.moveTo(regionStartX, rowY);
          context.lineTo(regionStartX, rowY + rowHeight);
        }

        // Right line
        if (regionEndX >= startX && regionEndX <= endX) {
          context.moveTo(regionEndX, rowY);
          context.lineTo(regionEndX, rowY + rowHeight);
        }
      }
    }

    // Render all vertical lines in one stroke operation
    context.stroke();
    context.setLineDash([]); // Reset line dash

    context.restore();
  }

  /**
   * Render participant edge lines in batch
   */
  private renderParticipantEdgeLinesBatch(
    context: CanvasRenderingContext2D,
    constraintData: Array<{
      element: GanttElementType;
      rowIndex: number;
      constraintType: 'boundary' | 'subprocess' | 'unified' | 'participant';
      cutoutRegions: Array<{ start: number; end: number }>;
      renderSlashes: boolean;
    }>,
    timeMatrix: TimeMatrix,
    allElements: GanttElementType[],
    collapsedSubProcesses?: Set<string>,
  ): void {
    const participantElements = constraintData.filter(
      (item) => item.constraintType === 'participant',
    );

    for (const item of participantElements) {
      // Use existing participant edge line rendering (already optimized)
      this.renderParticipantEdgeLines(
        context,
        item.rowIndex,
        timeMatrix,
        allElements,
        item.element,
        collapsedSubProcesses,
      );
    }
  }

  /**
   * Optimized task/subprocess finding for batch operations
   */
  private findAttachedTaskForBatch(
    elements: GanttElementType[],
    attachedToId: string | undefined,
    boundaryEvent: GanttElementType,
  ): GanttElementType | undefined {
    if (!attachedToId) return undefined;
    return this.findAttachedTask(elements, attachedToId, boundaryEvent);
  }

  private findParentSubProcessForBatch(
    elements: GanttElementType[],
    parentSubProcessId: string | undefined,
    childElement: GanttElementType,
  ): GanttElementType | undefined {
    if (!parentSubProcessId) return undefined;
    return this.findParentSubProcess(elements, parentSubProcessId, childElement);
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
   * Render vertical dashed lines at participant edges spanning all child rows
   * Respects collapsed sub-processes and only spans visible rows
   */
  private renderParticipantEdgeLines(
    context: CanvasRenderingContext2D,
    rowIndex: number,
    timeMatrix: TimeMatrix,
    allElements: GanttElementType[],
    participantElement: GanttElementType,
    collapsedSubProcesses?: Set<string>,
  ): void {
    // Get participant time bounds
    const participantStart = participantElement.start;
    const participantEnd =
      'end' in participantElement && participantElement.end !== undefined
        ? participantElement.end
        : participantElement.start;

    // Convert to screen coordinates
    const participantStartX = timeMatrix.transformPoint(participantStart);
    const participantEndX = timeMatrix.transformPoint(participantEnd);

    // Count only visible child rows respecting collapsed sub-processes
    const childIds = (participantElement as any).childIds || [];
    let totalChildRows = 0;

    // Helper function to count visible children recursively
    const countVisibleChildren = (elementId: string): number => {
      const element = allElements.find((el) => el.id === elementId);
      if (!element) {
        return 0; // If element not found in rendered elements, don't count it
      }

      // CRITICAL FIX: Don't count empty lane headers as visible rows
      // Empty lane headers shouldn't contribute to participant line length
      if ((element as any).isLaneHeader && ((element as any).childIds || []).length === 0) {
        return 0;
      }

      let count = 1; // Count the element itself

      // If this is a collapsed sub-process, don't count its children
      if (
        element.type === 'group' &&
        (element as any).isSubProcess &&
        collapsedSubProcesses?.has(elementId)
      ) {
        return count; // Only count the sub-process header, not its children
      }

      // Count visible children recursively - only those that exist in allElements
      const elementChildIds = (element as any).childIds || [];
      elementChildIds.forEach((childId: string) => {
        const childElement = allElements.find((el) => el.id === childId);
        if (childElement) {
          count += countVisibleChildren(childId);
        }
      });

      return count;
    };

    // Count all visible children - but only count each element once
    // Build a set of all nested child IDs to avoid double counting
    const allNestedChildIds = new Set<string>();

    childIds.forEach((childId: string) => {
      const element = allElements.find((el) => el.id === childId);
      if (element && element.type === 'group' && (element as any).childIds) {
        // Collect all nested children of this group
        const collectNestedChildren = (groupElement: any) => {
          const groupChildIds = groupElement.childIds || [];
          groupChildIds.forEach((nestedChildId: string) => {
            allNestedChildIds.add(nestedChildId);
            const nestedElement = allElements.find((el) => el.id === nestedChildId);
            if (
              nestedElement &&
              nestedElement.type === 'group' &&
              (nestedElement as any).childIds
            ) {
              collectNestedChildren(nestedElement);
            }
          });
        };
        collectNestedChildren(element);
      }
    });

    // Only count direct children that are not nested within other children
    childIds.forEach((childId: string) => {
      if (!allNestedChildIds.has(childId)) {
        totalChildRows += countVisibleChildren(childId);
      }
    });

    // If no children found, just draw for one row
    if (totalChildRows === 0) {
      totalChildRows = 1;
    }

    context.save();

    // Set up dashed line style - lime green
    context.strokeStyle = '#32CD32';
    context.lineWidth = 2;
    context.setLineDash([4, 3]);

    const lineStartY = (rowIndex + 1) * ROW_HEIGHT; // Start after participant header
    const lineEndY = lineStartY + totalChildRows * ROW_HEIGHT; // Span all child rows

    // Draw vertical line at participant START
    context.beginPath();
    context.moveTo(participantStartX, lineStartY);
    context.lineTo(participantStartX, lineEndY);
    context.stroke();

    // Draw vertical line at participant END
    context.beginPath();
    context.moveTo(participantEndX, lineStartY);
    context.lineTo(participantEndX, lineEndY);
    context.stroke();

    context.restore();
  }
}
