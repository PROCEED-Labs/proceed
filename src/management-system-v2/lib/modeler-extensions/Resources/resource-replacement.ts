import { assign } from 'min-dash';
import { ModuleDeclaration } from 'bpmn-js/lib/BaseViewer';
import PopupMenu from 'diagram-js/lib/features/popup-menu';
import BpmnReplace from 'bpmn-js/lib/features/replace';

// TODO: correct typing instead of any
class ResourceReplacementProvider {
  translate: any;
  modeling: any;

  constructor(popupmenu: any, translate: any, modeling: any) {
    popupmenu.registerProvider('bpmn-replace', this);

    this.translate = translate;
    this.modeling = modeling;
  }

  getPopupMenuEntries(element: any) {
    const { translate, modeling } = this;

    return function (entries: any) {
      console.log(element);
      return entries;
    };
  }
}

ResourceReplacementProvider.$inject = ['popupMenu', 'translate', 'modeling'];

export default {
  __init__: ['resourceReplacementProvider'],
  __depends__: [PopupMenu, BpmnReplace] satisfies ModuleDeclaration[],
  resourceReplacementProvider: ['type', ResourceReplacementProvider],
};
