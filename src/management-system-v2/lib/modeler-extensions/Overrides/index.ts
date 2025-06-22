import CustomDirectEditing from './direct-editing';
import LabelEditingProvider from './label-editing-provider';

import InteractionEventsModule from 'diagram-js/lib/features/interaction-events';

/*
 * This module adds overrides to default bpmn-js functionality
 */

// this is responsible for adding the overrides that can affect both viewer and modeler
export const ViewOverrideModule = {};

// this is responsible for adding the overrides that can only affect the modeler
export const ModelingOverrideModule = {
  directEditing: ['type', CustomDirectEditing],
  labelEditingProvider: ['type', LabelEditingProvider],
};
