import { getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import Modeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

async function getPNG(modeler: BPMNCanvasRef | Modeler | NavigatedViewer) {
  let bpmnXML;
  let rootElement;
  let selection;

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

  const subprocessId =
    rootElement.$type === 'bpmn:Process' || rootElement.$type === 'bpmn:Collaboration'
      ? undefined
      : rootElement.id;

  // Get the SVG from the BPMN XML
  const svg = await getSVGFromBPMN(
    bpmnXML!,
    subprocessId,
    selection.map((el: { id: any }) => el.id),
  );

  // Convert the SVG to a PNG
  const blob = await getPNGFromSVG(svg, 3);

  return blob;
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
    // Check if clipboard writing is supported
    if (navigator.clipboard && 'write' in navigator.clipboard) {
      // this is necessary to avoid permission error in safari: can't call await before clipboard.write
      // https://stackoverflow.com/questions/66312944/javascript-clipboard-api-write-does-not-work-in-safari
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': getPNG(modeler) })]);
      console.log('Copied to clipboard');
      return true;
    } else {
      // Fallback: Download the image
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await getPNG(modeler));
      a.download = 'process.png';
      a.click();
      return false;
    }
  } catch (error) {
    throw new Error(`${error}`);
  }
}

/**
 * Share an image of a process or selected parts of a process using webshare api
 *
 * @param modeler the modeler to copy the process image from
 */

export async function shareProcessImage(modeler: BPMNCanvasRef) {
  const blob = await getPNG(modeler);

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
    await copyProcessImage(modeler);
  }
}
