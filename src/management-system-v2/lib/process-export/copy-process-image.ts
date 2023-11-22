import { toBpmnObject, toBpmnXml } from '@proceed/bpmn-helper';

import { getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';

/**
 * Adds an image of a process or selected parts of a process to the clipboard
 *
 * @param modeler the modeler to copy the process image from
 */
export async function copyProcessImage(modeler: any) {
  let { xml } = await modeler.saveXML({ format: true });

  // get the currently visible layer
  const rootElement = (modeler.get('canvas') as any).getRootElement().businessObject;
  const subprocessId =
    rootElement.$type === 'bpmn:Process' || rootElement.$type === 'bpmn:Collaboration'
      ? undefined
      : rootElement.id;

  // get the selected elements
  let selection: any[] = (modeler.get('selection') as any).get();
  // get the png and copy it to the clipboard
  const svg = await getSVGFromBPMN(
    xml!,
    subprocessId,
    selection.map((el) => el.id),
  );
  const blob = await getPNGFromSVG(svg, 3);
  const data = [new ClipboardItem({ 'image/png': blob })];
  navigator.clipboard.write(data).then(() => {
    console.log('Copied to clipboard');
  });
}
