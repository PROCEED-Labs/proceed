import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';
import BpmnAutoResizeProvider from 'bpmn-js/lib/features/auto-resize/BpmnAutoResizeProvider.js';

/**
 * This module is used to prevent collapsed subprocesses from being resized when a nested expanded subprocess is resized during collaborative editing
 */
class ProceedAutoResizeProvider extends RuleProvider {
  constructor(eventBus) {
    super(eventBus);

    this.addRule('element.autoResize', 10000, this.canResize);
  }

  canResize(context) {
    if (
      context.target.type === 'bpmn:SubProcess' &&
      (context.target.isExpanded === false || context.target.collapsed)
    )
      return false;

    return BpmnAutoResizeProvider.prototype.canResize(context.element, context.target);
  }
}

ProceedAutoResizeProvider.$inject = ['eventBus', 'modeling'];

export default {
  __init__: ['proceedAutoResizeProvider'],
  proceedAutoResizeProvider: ['type', ProceedAutoResizeProvider],
};
