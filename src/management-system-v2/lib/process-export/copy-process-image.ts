import { getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { message } from 'antd';
import Modeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

/**
 * Adds an image of a process or selected parts of a process to the clipboard
 *
 * @param modeler the modeler to copy the process image from
 */

export async function copyProcessImage(
  modeler: BPMNCanvasRef | Modeler | NavigatedViewer,
): Promise<Boolean> {
  try {
    let bpmnXML;
    let rootElement;
    let subprocessId;
    let selection;

    // Determine the type of modeler and handle accordingly
    if ('getXML' in modeler) {
      bpmnXML = await modeler.getXML();
      rootElement = modeler?.getCanvas().getRootElement().businessObject;
      selection = modeler!.getSelection().get();
    } else {
      const { xml } = await modeler.saveXML({ format: true });
      bpmnXML = xml;
      rootElement = (modeler.get('canvas') as any).getRootElement().businessObject;
      selection = (modeler.get('selection') as any).get();
    }

    // Determine the subprocessId
    subprocessId =
      rootElement.$type === 'bpmn:Process' || rootElement.$type === 'bpmn:Collaboration'
        ? undefined
        : rootElement.id;

    // Get the SVG from the BPMN XML
    const svg = await getSVGFromBPMN(
      bpmnXML!,
      subprocessId,
      selection.map((el: { id: any }) => el.id),
    );

    // Convert the SVG to a PNG and copy it to the clipboard
    const blob = await getPNGFromSVG(svg, 3);
    const data = [new ClipboardItem({ 'image/png': blob })];
    await navigator.clipboard.write(data);
    console.log('Copied to clipboard');
    return true;
  } catch (error) {
    console.error(`Error while copying the diagram: ${error}`);
    return false;
  }
}
