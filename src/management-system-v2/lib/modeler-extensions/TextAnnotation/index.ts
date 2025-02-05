import AnnotationRenderer from './annotation-renderer';
import AnnotationContextPadProvider from './annotation-context-menu';
import AnnotationRecolor from './annotation-recolor';

/*
 * This module adds a custom visualisation for the default bpmn:TextAnnotation element
 */

// this module is responsible for adding the visualisation for the element to the modeler or viewer
export const CustomAnnotationViewModule = {
  __init__: ['customAnnotationRenderer'],
  customAnnotationRenderer: ['type', AnnotationRenderer],
};

export const CustomAnnotationModelingModule = {
  __init__: ['customAnnotationContextPadProvider', 'customAnnotationRecolor'],
  customAnnotationContextPadProvider: ['type', AnnotationContextPadProvider],
  customAnnotationRecolor: ['type', AnnotationRecolor],
};
