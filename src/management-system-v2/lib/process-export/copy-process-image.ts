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
  // remove connections where the source or target or both are not selected
  selection = selection.filter((el) => {
    if (!el.source && !el.target) return true;
    return selection.includes(el.source) && selection.includes(el.target);
  });

  // if something is selected only copy the selection
  if (selection.length) {
    const bpmnObj: any = await toBpmnObject(xml!);
    // find the correct plane (either the root process/collaboration or a subprocess)
    const plane = bpmnObj.diagrams.find(
      (el: any) => el.plane.bpmnElement.id === rootElement.id,
    ).plane;
    // remove the visualisation of the elements that are not selected
    plane.planeElement = plane.planeElement.filter((diEl: any) =>
      selection.some((el: any) => el.id === diEl.bpmnElement.id),
    );
    xml = await toBpmnXml(bpmnObj);
  }

  // get the png and copy it to the clipboard
  const svg = await getSVGFromBPMN(xml!, subprocessId);
  const blob = await getPNGFromSVG(svg);
  const data = [new ClipboardItem({ 'image/png': blob })];
  navigator.clipboard.write(data).then(() => {
    console.log('Copied to clipboard');
  });
}
