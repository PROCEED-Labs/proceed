import { getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';
import { message } from 'antd';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';

/**
 * Adds an image of a process or selected parts of a process to the clipboard
 *
 * @param modeler the modeler to copy the process image from
 */

export async function copyProcessImage_(modeler: any) {
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

export async function copyProcessImage(modeler: BPMNCanvasRef | null) {
  let xml = await modeler?.getXML();
  // get the currently visible layer
  const rootElement = modeler?.getCanvas().getRootElement().businessObject;
  const subprocessId =
    rootElement.$type === 'bpmn:Process' || rootElement.$type === 'bpmn:Collaboration'
      ? undefined
      : rootElement.id;

  // get the selected elements
  let selection: any[] = modeler!.getSelection().get();
  // get the png and copy it to the clipboard
  const svg = await getSVGFromBPMN(
    xml!,
    subprocessId,
    selection.map((el) => el.id),
  );
  const blob = await getPNGFromSVG(svg, 3);
  try {
    const data = [new ClipboardItem({ 'image/png': blob })];
    await navigator.clipboard.write(data).then(() => {
      console.log('Copied to clipboard');
    });
  } catch (error) {
    console.error(`Error while copying the diagram`);
  }
}
