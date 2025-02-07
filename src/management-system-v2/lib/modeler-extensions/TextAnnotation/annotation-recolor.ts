import PopupMenu, {
  PopupMenuProvider,
  PopupMenuEntry,
} from 'diagram-js/lib/features/popup-menu/PopupMenu';
import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import { Shape } from 'bpmn-js/lib/model/Types';

import { is } from 'bpmn-js/lib/util/ModelUtil';

export default class AnnotationRecolorProvider implements PopupMenuProvider {
  modeling: Modeling;

  static $inject = ['popupMenu', 'modeling'];

  constructor(popupMenu: PopupMenu, modeling: Modeling) {
    popupMenu.registerProvider('annotation-recolor', this);

    this.modeling = modeling;
  }

  getPopupMenuEntries(target: Shape) {
    const { modeling } = this;

    const entries: { [name: string]: PopupMenuEntry } = {};

    const { businessObject } = target;

    /**
     * Colors:
     **/

    const colors = {
      White: 'rgb(255, 255, 255)',
      'Light Yellow': 'rgb(255, 249, 177)',
      Yellow: 'rgb(245, 209, 40)',
      Orange: 'rgb(255, 157, 72)',
      'Light Green': 'rgb(213, 246, 146)',
      Green: 'rgb(201, 223, 86)',
      'Dark Green': 'rgb(147, 210, 117)',
      Cyan: 'rgb(103, 198, 192)',
      'Light Pink': 'rgb(255, 206, 224)',
      Pink: 'rgb(234, 148, 187)',
      Violet: 'rgb(198, 162, 210)',
      Red: 'rgb(240, 147, 157)',
      'Light Blue': 'rgb(166, 204, 245)',
      Blue: 'rgb(108, 216, 250)',
      'Dark Blue': 'rgb(158, 169, 255)',
      Black: 'rgb(0, 0, 0)',
    } as const;

    const switchColor = (newColor: keyof typeof colors) => {
      modeling.updateProperties(target, {
        di: {
          fill: colors[newColor],
          'background-color': colors[newColor],
          'border-color': 'lightgrey',
        },
      });
      if (target.di.label) {
        modeling.updateModdleProperties(target, target.di.label, {
          color: newColor === 'Black' ? 'white' : 'black',
        });
      }
    };

    if (is(businessObject, 'bpmn:TextAnnotation')) {
      for (const color of Object.keys(colors) as Array<keyof typeof colors>) {
        entries[color] = {
          label: color,
          className: '',
          imageHtml: `<div style="width: 20px; height: 20px; background-color: ${colors[color]}"></div>`,
          action: () => switchColor(color),
        };
      }
    }

    return entries;
  }
}
