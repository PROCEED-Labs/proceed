// implemented following this tutorial: https://github.com/bpmn-io/bpmn-js-example-custom-controls
import { assign } from 'min-dash';

class PlaceholderProvider {
  constructor(popupMenu, translate, modeling) {
    popupMenu.registerProvider('bpmn-replace', this);

    this.translate = translate;
    this.modeling = modeling;
  }

  getPopupMenuEntries(element) {
    const { translate, modeling } = this;

    return function (entries) {
      if (element.type === 'bpmn:Task' && !element.businessObject.placeholder) {
        return assign(entries, {
          'replace.placeholder': {
            className: 'proceed-placeholder',
            label: translate('Placeholder'),
            action: function () {
              modeling.updateProperties(element, {
                placeholder: true,
              });
            },
          },
        });
      }

      return entries;
    };
  }
}

PlaceholderProvider.$inject = ['popupMenu', 'translate', 'modeling'];

export default {
  __init__: ['placeholderProvider'],
  __depends__: ['popupMenu', 'bpmnReplace'],
  placeholderProvider: ['type', PlaceholderProvider],
};
