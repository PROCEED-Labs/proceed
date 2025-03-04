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
      White: '#ffffff',

      Yellow: '#f1c40f',
      'Light Orange': '#f39c12',
      Orange: '#e67e22',
      'Dark Orange': '#d35400',
      'Light Red': '#e74c3c',
      Red: '#c0392b',

      'Light Teal': '#1abc9c',
      Teal: '#16a085',
      'Light Green': '#2ecc71',
      Green: '#27ae60',
      'Light Blue': '#3498db',
      Blue: '#2980b9',
      'Light Purple': '#9b59b6',
      Purple: '#8e44ad',

      'Lighter Grey': '#bdc3c7',
      'Light Grey': '#95a5a6',
      Grey: '#7f8c8d',
      'Dark Grey': '#34495e',
      Black: '#000000',

      'Pastel Red': '#ffadad',
      'Pastel Orange': '#ffd6a5',
      'Pastel Yellow': '#fdffb6',
      'Pastel Green': '#caffbf',
      'Pastel Teal': '#9bf6ff',
      'Pastel Blue': '#a0c4ff',
      'Pastel Purple': '#bdb2ff',
      'Pastel Pink': '#ffc6ff',
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
          color: newColor === 'Black' || newColor === 'Dark Grey' ? 'white' : 'black',
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
