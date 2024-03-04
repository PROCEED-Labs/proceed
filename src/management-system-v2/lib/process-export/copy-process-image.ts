import { getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import Modeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

async function getRootElementAndSelection(modeler: BPMNCanvasRef | Modeler | NavigatedViewer) {
  let rootElement;
  let selection;

  if ('getXML' in modeler) {
    rootElement = modeler?.getCanvas().getRootElement().businessObject;
    selection = modeler!.getSelection().get();
  } else {
    rootElement = (modeler.get('canvas') as any).getRootElement().businessObject;
    selection = (modeler.get('selection') as any).get();
  }

  const subprocessId =
    rootElement.$type === 'bpmn:Process' || rootElement.$type === 'bpmn:Collaboration'
      ? undefined
      : rootElement.id;

  return { rootElement, subprocessId, selection };
}

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

    if ('getXML' in modeler) {
      bpmnXML = await modeler.getXML();
    } else {
      const { xml } = await modeler.saveXML({ format: true });
      bpmnXML = xml;
    }

    const { subprocessId, selection } = await getRootElementAndSelection(modeler);

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

/**
 * Share an image of a process or selected parts of a process using webshare api
 *
 * @param modeler the modeler to copy the process image from
 */

export async function shareProcessImage(modeler: BPMNCanvasRef) {
  let xml = await modeler.getXML();

  const { subprocessId, selection } = await getRootElementAndSelection(modeler);

  const svg = await getSVGFromBPMN(
    xml!,
    subprocessId,
    selection.map((el: { id: any }) => el.id),
  );
  const blob = await getPNGFromSVG(svg, 3);

  const nav = navigator as Navigator;

  if ('canShare' in nav) {
    try {
      await nav.share({
        files: [new File([blob], 'diagram.png', { type: 'image/png' })],
      });
    } catch (err: any) {
      if (!err.toString().includes('AbortError')) {
        console.log('error occurred while sharing... ', err);
      }
    }
  } else {
    console.log('Webshare api not supported');
  }
}
