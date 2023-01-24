import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExpanded, isEventSubProcess } from 'bpmn-js/lib/util/DiUtil';
import store from '@/frontend/main.js';
import { assign } from 'min-dash';

var REPLACE_WITH_COLLAPSED = 'replace-with-collapsed-subprocess',
  REPLACE_WITH_EXPANDED = 'replace-with-expanded-subprocess',
  REPLACE_WITH_CONDITIONAL_START = 'replace-with-conditional-start',
  REPLACE_WITH_MESSAGE_START = 'replace-with-message-start',
  REPLACE_WITH_TIMER_START = 'replace-with-timer-start',
  REPLACE_WITH_SIGNAL_START = 'replace-with-signal-start';

function CustomPopupMenuProvider(popupMenu, bpmnReplace, translate) {
  popupMenu.registerProvider('bpmn-replace', this);

  this._bpmnReplace = bpmnReplace;
  this._translate = translate;
}

CustomPopupMenuProvider.$inject = ['popupMenu', 'bpmnReplace', 'translate'];

/**
 * Get all entries from original bpmn-js provider minus the ones that allow to model
 * expanded subprocess.
 */
CustomPopupMenuProvider.prototype.getPopupMenuEntries = function (element) {
  var bpmnReplace = this._bpmnReplace,
    translate = this._translate,
    collapseSubProcess = {
      'collapse-subprocess': {
        className: 'bpmn-icon-subprocess-collapsed',
        label: translate('Collapse (not reversible)'),
        action: function () {
          bpmnReplace.replaceElement(element, {
            type: 'bpmn:SubProcess',
            isExpanded: false,
          });
        },
      },
    };

  return function (entries) {
    delete entries[REPLACE_WITH_EXPANDED];

    if (element.type === 'bpmn:StartEvent') {
      // prevent selection of some elements if the current process in the editor is a subprocess
      if (store.getters['processEditorStore/subprocessId']) {
        delete entries[REPLACE_WITH_CONDITIONAL_START];
        delete entries[REPLACE_WITH_MESSAGE_START];
        delete entries[REPLACE_WITH_TIMER_START];
        delete entries[REPLACE_WITH_SIGNAL_START];
      }

      return entries;
    }

    if (isSubProcess(element) && isExpanded(element)) {
      delete entries[REPLACE_WITH_COLLAPSED];
      return assign(entries, collapseSubProcess);
    }

    return entries;
  };
};

function isSubProcess(element) {
  return (
    is(element, 'bpmn:SubProcess') &&
    !is(element, 'bpmn:Transaction') &&
    !isEventSubProcess(element)
  );
}

export default {
  __depends__: ['popupMenu', 'bpmnReplace'],
  __init__: ['CustomPopupMenuProvider'],
  CustomPopupMenuProvider: ['type', CustomPopupMenuProvider],
};
