import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { InstanceInfo } from '@/lib/engines/deployment';

import type { Element } from 'bpmn-js/lib/model/Types';
import type { Connection } from 'diagram-js/lib/util/Elements';

type TokenInfo = InstanceInfo['tokens'][number];

function getTokenPosition(token: TokenInfo, bpmnViewer: BPMNCanvasRef) {
  let targetFlowElement: Element | Connection | undefined = bpmnViewer.getElement(
    token.currentFlowElementId,
  );

  let top = 0;
  let right = 0;
  let left = 0;

  if (!targetFlowElement) return { top, right, left, targetElementId: token.currentFlowElementId };

  // if the flow node is still in state ready and the token came from an incoming flow then show the token on that flow instead
  if (
    (token.currentFlowNodeState === 'READY' || targetFlowElement.type.includes('Gateway')) &&
    targetFlowElement.incoming &&
    targetFlowElement.incoming.some((flow) => flow.id === token.previousFlowElementId)
  ) {
    targetFlowElement = targetFlowElement.incoming.find(
      (flow) => flow.id === token.previousFlowElementId,
    );
  }

  if (!targetFlowElement) return { top, right, left, targetElementId: token.currentFlowElementId };

  if (targetFlowElement.type === 'bpmn:SequenceFlow') {
    const { waypoints } = targetFlowElement as Connection;

    // calculate the upper right corner of the element in diagram coordinates
    let minY = Infinity,
      maxX = -Infinity;

    waypoints.forEach((waypoint) => {
      minY = waypoint.y < minY ? waypoint.y : minY;
      maxX = waypoint.x > maxX ? waypoint.x : maxX;
    });

    // calculate the offset from the upper right corner to the arrow
    const lastWaypoint = waypoints[waypoints.length - 1];

    const arrowOffsetX = maxX - lastWaypoint.x;
    const arrowOffsetY = lastWaypoint.y - minY;

    // use the offset to relatively position the token on the arrow (the static values are the radius of the token)
    const centerArrowPositionRelativeY = arrowOffsetY - 10;
    const centerArrowPositionRelativeX = arrowOffsetX + 10;

    // calculate from where we are reaching the target element (top, left, right, bottom)
    const secondLastWaypoint = waypoints[waypoints.length - 2];

    let directionX = lastWaypoint.x - secondLastWaypoint.x;
    directionX = !directionX ? 1 : directionX / Math.abs(directionX);

    let directionY = lastWaypoint.y - secondLastWaypoint.y;
    directionY = !directionY ? 1 : directionY / Math.abs(directionY);

    // position the token in a way that makes sense for the direction the sequence flow is coming from (avoid the token being display in the target element)
    top = centerArrowPositionRelativeY - directionY * 17.5;
    right = centerArrowPositionRelativeX + directionX * 17.5;
  } else {
    top = -10;

    if (
      token.currentFlowNodeState === 'READY' ||
      token.state === 'ADDED' ||
      token.state === 'MOVED'
    ) {
      left = -20;
    } else {
      right = 0;
    }
  }

  return { top, right, left, targetElementId: targetFlowElement.id };
}

function isPausingToken(token: TokenInfo, instance: InstanceInfo) {
  return instance?.instanceState.includes('PAUSING') && token.state === 'RUNNING';
}

function getTokenTooltip(token: InstanceInfo['tokens'][number], instance: InstanceInfo) {
  if (isPausingToken(token, instance)) {
    return 'Token is in state RUNNING, switching to PAUSE state after current task is finished';
  }

  switch (token.state) {
    case 'ERROR-SEMANTIC':
    case 'ERROR-TECHNICAL':
    case 'ERROR-CONSTRAINT-UNFULFILLED':
    case 'SKIPPED':
    case 'ABORTED':
    case 'FAILED':
    case 'TERMINATED':
      return token.state;
  }

  if (instance?.instanceState[0] === 'STOPPED') {
    return 'STOPPED';
  }

  return token.state;
}

function getTokenColor(token: TokenInfo, instance: InstanceInfo) {
  if (isPausingToken(token, instance)) {
    return 'yellow';
  }

  switch (token.state) {
    case 'ERROR-SEMANTIC':
    case 'ERROR-TECHNICAL':
    case 'ERROR-INTERRUPTED':
    case 'ERROR-CONSTRAINT-UNFULFILLED':
      return 'red';
    case 'SKIPPED':
      return 'white';
    case 'ABORTED':
    case 'FAILED':
    case 'TERMINATED':
      return 'black';
  }

  if (instance?.instanceState[0] === 'STOPPED') {
    return 'black';
  }

  switch (token.state) {
    case 'READY':
    case 'ENDED':
      return 'green';
    case 'MOVED':
    case 'REMOVED':
    case 'ADDED':
    case 'PAUSED':
    case 'DEPLOYMENT-WAITING':
      return 'yellow';
  }

  switch (token.currentFlowNodeState) {
    case 'READY':
    case 'ACTIVE':
      return 'green';
  }

  return 'white';
}

export function addToken(token: TokenInfo, instance: InstanceInfo, bpmnViewer: BPMNCanvasRef) {
  const tokenColor: string = getTokenColor(token, instance);
  const tokenTooltip = getTokenTooltip(token, instance);

  const position = getTokenPosition(token, bpmnViewer);

  const overlayHandler = bpmnViewer.getOverlays();

  return overlayHandler.add(position.targetElementId, {
    position,
    html: `
            <div
              class="instance-token"
              id="${token.tokenId}"
              draggable="true"
              title="${tokenTooltip}"
              style="
                background-color: ${tokenColor};
                width: 20px;
                height: 20px;
                border-radius: 100%;
                border: 1px solid black;
              "
            >
            </div>`,
  });
}
