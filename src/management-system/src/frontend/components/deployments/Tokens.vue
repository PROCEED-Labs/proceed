<template>
  <toolbar-group v-if="!hideToolbar">
    <slot name="external-control"></slot>
    <template v-if="!isControlledExternally">
      <tooltip-button v-if="!isEditingTokens" @click="startEditing">
        <template #tooltip-text>Enable Token Changes</template>
        mdi-pencil-lock-outline
      </tooltip-button>
      <tooltip-button v-else @click="stopEditing">
        <template #tooltip-text>Disable Token Changes</template>
        mdi-pencil-outline
      </tooltip-button>
      <tooltip-button v-if="isEditingTokens && hasTokenChanges" @click="applyTokenChanges">
        <template #tooltip-text>Apply Token Changes</template>
        mdi-send-outline
      </tooltip-button>
    </template>
    <tooltip-button v-if="isEditingTokens" draggable="true" @dragstart="newTokenDragStart">
      <template #tooltip-text>Add Token (Drag into Diagram)</template>
      <template #button-content>
        <div class="instance-token"></div>
      </template>
    </tooltip-button>
    <tooltip-button
      v-if="isEditingTokens"
      :disabled="!isDraggingRemovableToken"
      color="error"
      @dragover="tokenDragOver"
      @drop="tokenDropOnDeleteButton"
    >
      <template #tooltip-text>Remove Token (Drop Token here)</template>
      {{ isDraggingRemovableToken ? 'mdi-delete-empty-outline' : 'mdi-delete-outline' }}
    </tooltip-button>
  </toolbar-group>
</template>
<script>
import { deepEquals } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';
import { engineNetworkInterface } from '@/frontend/backend-api/index.js';

import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import { v4 } from 'uuid';

export default {
  components: {
    ToolbarGroup,
    TooltipButton,
  },
  props: {
    viewer: {
      type: Object,
      default: () => null,
    },
    instance: {
      type: Object,
      default: () => null,
    },
    deployment: {
      type: Object,
      default: () => null,
    },
    isControlledExternally: {
      type: Boolean,
      default: false,
    },
    hideToolbar: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      overlays: {},
      draggedToken: null,
      isEditingTokens: false,
      movedTokens: {},
      addedTokens: {},
      removedTokens: {},
      beingDestroyed: false,
      visibleFlowElements: [],
    };
  },
  computed: {
    // overwrite the instane tokens with the local changes for visualisation
    upToDateTokens() {
      let tokens = [...this.instance.tokens];

      if (!tokens) {
        return [];
      }

      // overwrite the information of tokens that are marked for changes
      for (let i = 0; i < tokens.length; ++i) {
        if (this.movedTokens[tokens[i].tokenId]) {
          tokens[i] = {
            ...tokens[i],
            currentFlowElementId: this.movedTokens[tokens[i].tokenId].currentFlowElementId,
            state: 'MOVED',
          };
        }
        if (this.removedTokens[tokens[i].tokenId]) {
          tokens[i] = {
            ...tokens[i],
            state: 'REMOVED',
          };
        }
      }

      // add new tokens to visualisation
      Object.values(this.addedTokens).forEach((token) => tokens.push(token));

      tokens = tokens.map((token) => ({
        ...token,
        color: this.getStatusColor(token),
        tooltip: this.getTooltip(token),
      }));

      tokens = tokens.filter((token) =>
        this.visibleFlowElements.some((flowEl) => flowEl.id === token.currentFlowElementId),
      );

      return tokens;
    },
    // tokens that were dragged from the toolbar are not eligible for removal
    isDraggingRemovableToken() {
      return this.draggedToken && this.draggedToken.tokenId;
    },
    hasTokenChanges() {
      return (
        Object.keys(this.movedTokens).length ||
        Object.keys(this.addedTokens).length ||
        Object.keys(this.removedTokens).length
      );
    },
  },
  methods: {
    resetChanges() {
      this.addedTokens = {};
      this.$emit('addedTokens:changed', this.addedTokens);
      this.removedTokens = {};
      this.$emit('removedTokens:changed', this.removedTokens);
      this.movedTokens = {};
      this.$emit('movedTokens:changed', this.movedTokens);
    },
    startEditing() {
      this.resetChanges();
      this.isEditingTokens = true;
    },
    stopEditing() {
      this.resetChanges();

      if (!this.isControlledExternally) {
        this.isEditingTokens = false;
      }
    },
    // apply the local changes to the instance
    async applyTokenChanges() {
      // remove the temporary ids of the tokens
      const addedTokens = Object.values(this.addedTokens).map((token) => ({
        ...token,
        tokenId: undefined,
      }));

      // send changes to the backend
      await engineNetworkInterface.updateInstanceTokenState(
        this.deployment.definitionId,
        this.instance.processInstanceId,
        {
          addedTokens,
          movedTokens: this.movedTokens,
          removedTokens: this.removedTokens,
        },
      );
      this.stopEditing();
      // trigger update of the instance information in the parent component
      this.$emit('tokensChanged');
    },
    selectToken(event) {
      // find the token the event was triggered on
      const token = this.upToDateTokens.find((token) => token.tokenId === event.target.id);

      if (token) {
        this.$emit('selectionChanged', token);
      }
    },
    // helper function to setup token dragging
    startTokenDrag(event, token) {
      if (!this.isEditingTokens) {
        event.preventDefault();
        return false;
      }

      event.dataTransfer.dropEffect = 'move';
      this.draggedToken = token;
      event.dataTransfer.setData('token', JSON.stringify(token));
    },
    // setup dragging an existing token
    existingTokenDragStart(event) {
      const token = this.upToDateTokens.find((token) => token.tokenId === event.target.id);
      return this.startTokenDrag(event, token);
    },
    // setup dragging a new token
    newTokenDragStart(event) {
      const token = {};
      return this.startTokenDrag(event, token);
    },
    tokenDragEnd(event) {
      this.draggedToken = null;
    },
    tokenDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    // make sure that the token changes are updated in a way that vue can react to
    updateTokenChanges(changeMapName, tokenId, updatedToken) {
      this[changeMapName] = { ...this[changeMapName], [tokenId]: updatedToken };
      this.$emit(`${changeMapName}:changed`, this[changeMapName]);
    },
    // mark token for removal if it is dropped on the remove icon
    async tokenDropOnDeleteButton(event) {
      event.preventDefault();

      const token = JSON.parse(event.dataTransfer.getData('token'));

      if (token) {
        // if the token wasn't added to the instance yet just remove it from the list
        if (this.addedTokens[token.tokenId]) {
          this.updateTokenChanges('addedTokens', token.tokenId, undefined);
          delete this.addedTokens[token.tokenId];
        } else {
          // make sure the token that will be removed is not moved too
          if (this.movedTokens[token.tokenId]) {
            this.updateTokenChanges('movedTokens', token.tokenId, undefined);
            delete this.movedTokens[token.tokenId];
          }

          // mark tokens for removal if they are part of the instance
          this.updateTokenChanges('removedTokens', token.tokenId, token);
        }
      }
    },
    // update a token when it is dropped on a valid element inside the process model
    async tokenDrop(event) {
      event.preventDefault();

      const token = JSON.parse(event.dataTransfer.getData('token'));
      // get the flow element id from the dom
      const flowEl = event.target.parentElement;
      let flowElementId = flowEl.dataset.elementId;

      if (!token.tokenId) {
        // if the token is new create a temporary id and set it to be added
        const temporaryId = `tmp_${v4()}`;
        this.updateTokenChanges('addedTokens', temporaryId, {
          ...token,
          tokenId: temporaryId,
          currentFlowElementId: flowElementId,
          state: 'ADDED',
        });
      } else {
        // if the token was marked to be removed remove it from the removal list
        if (this.removedTokens[token.tokenId]) {
          this.updateTokenChanges('removedTokens', token.tokenId, undefined);
          delete this.removedTokens[token.tokenId];
        }

        if (flowElementId === token.currentFlowElementId) {
          return;
        }

        if (this.movedTokens[token.tokenId]) {
          // check if the token is moved to its original position
          const originalToken = this.instance.tokens.find((t) => t.tokenId === token.tokenId);
          if (originalToken.currentFlowElementId === flowElementId) {
            // see this move as a revert to changing the token
            this.updateTokenChanges('movedTokens', token.tokenId, undefined);
            delete this.movedTokens[token.tokenId];
          } else {
            // if the token was already moved overwrite the information from the previous move
            this.updateTokenChanges('movedTokens', token.tokenId, {
              ...this.movedTokens[token.tokenId],
              currentFlowElementId: flowElementId,
            });
          }
        } else if (this.addedTokens[token.tokenId]) {
          // if the token is new update the flowNode it should be added to
          this.updateTokenChanges('addedTokens', token.tokenId, {
            ...this.addedTokens[token.tokenId],
            currentFlowElementId: flowElementId,
          });
        } else {
          // if the token is neither new nor already set to be moved add it to the move list
          this.updateTokenChanges('movedTokens', token.tokenId, {
            ...token,
            currentFlowElementId: flowElementId,
          });
        }
      }
    },
    /**
     * Returns the flow element the given token is currently placed on
     */
    getCurrentFlowElement(token) {
      if (this.viewer) {
        return this.viewer.get('elementRegistry').get(token.currentFlowElementId);
      }
    },
    isPausingToken(token) {
      return this.instance.instanceState.includes('PAUSING') && token.state === 'RUNNING';
    },
    getStatusColor(token) {
      if (this.isPausingToken(token)) {
        return 'yellow';
      }

      switch (token.state) {
        case 'ERROR-SEMANTIC':
        case 'ERROR-TECHNICAL':
        case 'ERROR-INTERRUPTED':
        case 'ERROR-CONSTRAINT-UNFULFILLED':
          return 'var(--v-error-base)';
        case 'SKIPPED':
          return 'white';
        case 'ABORTED':
        case 'FAILED':
        case 'TERMINATED':
          return 'black';
      }

      if (this.instance.instanceState[0] === 'STOPPED') {
        return 'black';
      }

      switch (token.state) {
        case 'READY':
        case 'ENDED':
          return 'var(--v-success-base)';
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
          return 'var(--v-success-base)';
      }

      return 'white';
    },
    getTooltip(token) {
      if (this.isPausingToken(token)) {
        return 'Token is in state RUNNING, switching to PAUSE state after current task is finished';
      }

      switch (token.state) {
        case 'MOVED':
          return 'This token will be moved if the changes are applied.';
        case 'REMOVED':
          return 'This token will be removed if the changes are applied.';
        case 'ADDED':
          return 'This token will be added if the changes are applied.';
        case 'ERROR-SEMANTIC':
        case 'ERROR-TECHNICAL':
        case 'ERROR-CONSTRAINT-UNFULFILLED':
        case 'SKIPPED':
        case 'ABORTED':
        case 'FAILED':
        case 'TERMINATED':
          return token.state;
      }

      if (this.instance.instanceState[0] === 'STOPPED') {
        return 'STOPPED';
      }

      return token.state;
    },
    getTokenPosition(token) {
      let targetFlowElement = this.getCurrentFlowElement(token);

      let top, right, left;

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

      if (targetFlowElement.type === 'bpmn:SequenceFlow') {
        const { waypoints } = targetFlowElement;

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
    },
    addTokenOverlay(token) {
      // do nothing if the token cannot be found
      if (!this.getCurrentFlowElement(token)) {
        return;
      }

      const overlayHandler = this.viewer.get('overlays');
      if (this.overlays[token.tokenId]) {
        overlayHandler.remove(this.overlays[token.tokenId]);
      }

      // add the token overlay to the visualization
      const { top, right, left, targetElementId } = this.getTokenPosition(token);
      const overlay = overlayHandler.add(targetElementId, {
        position: { top, right, left },
        html: `<div class="instance-token" id="${token.tokenId}" draggable="true" title="${
          token.tooltip
        }" style="background-color: ${token.color}; color: ${
          token.color == 'black' ? 'white' : 'black'
        }"></div>`,
      });
      this.overlays[token.tokenId] = overlay;

      // make tokens draggable
      const element = document.getElementById(token.tokenId);

      if (element) {
        element.addEventListener('dragstart', this.existingTokenDragStart);
        element.addEventListener('dragend', this.tokenDragEnd);
        element.addEventListener('click', this.selectToken);
      }
    },
    isDroppable(element) {
      return !(
        (
          element.type.includes('Association') ||
          element.type.includes('Reference') ||
          element.type.includes('MessageFlow') ||
          element.type === 'bpmn:BoundaryEvent' ||
          element.type === 'bpmn:Process' ||
          element.type === 'bpmn:TextAnnotation' ||
          element.type.includes('Gateway')
        ) // merging behaviour of gateways requires information from which sequence flow the token came => drop on incoming sequence flows
      );
    },
    makeElementsDroppable() {
      const elementRegistry = this.viewer.get('elementRegistry');

      elementRegistry.getAll().forEach((element) => {
        if (this.isDroppable(element)) {
          this.addDroppableHandlers(element.id);
        }
      });
    },
    addDroppableHandlers(elementId) {
      const domEl = document.querySelector(`[data-element-id='${elementId}']`);

      if (domEl) {
        domEl.addEventListener('dragover', this.tokenDragOver);
        domEl.addEventListener('drop', this.tokenDrop);
      }
    },
    resetIsDroppable(element) {
      const domEl = document.querySelector(`[data-element-id='${element.id}']`);

      if (domEl) {
        domEl.removeEventListener('dragover', this.tokenDragOver);
        domEl.removeEventListener('drop', this.tokenDrop);

        if (this.isDroppable(element)) {
          this.addDroppableHandlers(element.id);
        }
      }
    },
  },
  watch: {
    viewer: {
      // reset and recalculate information when the process model changes
      handler() {
        if (this.viewer) {
          this.stopEditing();

          this.makeElementsDroppable();

          // make sure that tokens are not displayed on elements that are not visible themselves
          let filterInvisibleElements = (els) =>
            els.filter((el) => !el.hidden && el.type !== 'bpmn:Process');

          const elementRegistry = this.viewer.get('elementRegistry');
          this.visibleFlowElements = filterInvisibleElements(elementRegistry.getAll());

          const eventBus = this.viewer.get('eventBus');

          eventBus.on('import.done', () => {
            this.visibleFlowElements = filterInvisibleElements(elementRegistry.getAll());

            this.makeElementsDroppable();
            if (!this.beingDestroyed) {
              for (const token of this.upToDateTokens) {
                this.addTokenOverlay(token);
              }
            }
          });

          eventBus.on('selection.changed', () => {
            // always unselect a token when another element in the viewer is selected
            this.$emit('selectionChanged', null);
          });

          // check if an element should be made droppable when it is added
          eventBus.on(
            [
              'commandStack.connection.create.postExecuted',
              'commandStack.shape.create.postExecuted',
              'commandStack.connection.reconnect.postExecuted',
            ],
            ({ context: { shape, connection } }) => {
              this.resetIsDroppable(shape || connection);
              this.visibleFlowElements = filterInvisibleElements(elementRegistry.getAll());
            },
          );

          eventBus.on('commandStack.shape.delete.postExecuted', () => {
            this.visibleFlowElements = filterInvisibleElements(elementRegistry.getAll());
          });

          eventBus.on('commandStack.shape.replace.postExecuted', ({ context: { newShape } }) => {
            // make sure that a token is still shown on an element after it changed its type
            const tokenOnReplacedElement = this.upToDateTokens.find(
              ({ currentFlowElementId }) => currentFlowElementId === newShape.id,
            );
            if (tokenOnReplacedElement) {
              this.addTokenOverlay(tokenOnReplacedElement);
            }
          });
        }
      },
      immediate: true,
    },
    // reset editing when the instance is changed
    instance(newInstance, oldInstance) {
      if (
        !newInstance ||
        (oldInstance && newInstance.processInstanceId !== oldInstance.processInstanceId)
      ) {
        this.stopEditing();
      }
    },
    // recalculate the token visualisation when the token data changes
    upToDateTokens: {
      handler(newTokens, oldTokens) {
        if (!this.viewer) {
          return;
        }

        newTokens = newTokens || [];
        oldTokens = oldTokens || [];

        // calculate which tokens need to be added to or removed from the visualisation
        newTokens = newTokens.reduce((acc, token) => {
          acc[token.tokenId] = token;
          return acc;
        }, {});
        oldTokens = oldTokens.reduce((acc, token) => {
          acc[token.tokenId] = token;
          return acc;
        }, {});

        let tokensToAdd = [];
        let tokensToRemove = [];

        let allTokens = { ...newTokens, ...oldTokens };

        Object.values(allTokens).forEach((token) => {
          if (newTokens[token.tokenId] && oldTokens[token.tokenId]) {
            if (!deepEquals(newTokens[token.tokenId], oldTokens[token.tokenId])) {
              // token changed => should removed and readded
              tokensToAdd.push(newTokens[token.tokenId]);
              tokensToRemove.push(oldTokens[token.tokenId]);
            }
          } else if (newTokens[token.tokenId]) {
            // token was added
            tokensToAdd.push(newTokens[token.tokenId]);
          } else if (oldTokens[token.tokenId]) {
            // token was removed
            tokensToRemove.push(oldTokens[token.tokenId]);
          }
        });

        const overlayHandler = this.viewer.get('overlays');
        // remove tokens from visualisation
        tokensToRemove.forEach(({ tokenId }) => {
          overlayHandler.remove(this.overlays[tokenId]);
          delete this.overlays[tokenId];
        });

        // add tokens to visualisation
        tokensToAdd.forEach((token) => {
          this.addTokenOverlay(token);
        });
      },
      immediate: true,
    },
    isControlledExternally: {
      handler() {
        if (this.isControlledExternally) {
          this.startEditing();
        }
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    this.beingDestroyed = true;
    if (this.viewer) {
      this.viewer.get('overlays').clear();
    }
  },
};
</script>
<style>
.instance-token {
  width: 20px;
  height: 20px;
  background-color: var(--v-success-base);
  border-radius: 100%;
  border: 1px solid black;
  text-align: center;
  font-weight: bold;
}
</style>
