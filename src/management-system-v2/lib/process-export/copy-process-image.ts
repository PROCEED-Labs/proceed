import { downloadFile, getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import Modeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import type ViewerType from 'bpmn-js/lib/Viewer';
const BPMNViewer: Promise<typeof ViewerType> =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/Viewer').then((mod) => mod.default)
    : (null as any);

async function getPNG(modeler: BPMNCanvasRef | Modeler | NavigatedViewer | ViewerType) {
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
  modeler: BPMNCanvasRef | Modeler | NavigatedViewer | ViewerType,
) {
  try {
    // Check if clipboard writing is supported
    if (navigator.clipboard && 'write' in navigator.clipboard && window.ClipboardItem) {
      // this is necessary to avoid permission error in safari: can't call await before clipboard.write
      // https://stackoverflow.com/questions/66312944/javascript-clipboard-api-write-does-not-work-in-safari
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': await getPNG(modeler) })]);
      return 'Copied to clipboard';
    } else {
      // Fallback: Download the image
      const blob = await getPNG(modeler);
      downloadFile('process.png', blob);
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

export async function shareProcessImage(
  modeler: BPMNCanvasRef | Modeler | NavigatedViewer | ViewerType,
) {
  const nav = navigator as Navigator;
  if ('canShare' in nav) {
    try {
      await nav.share({
        files: [new File([await getPNG(modeler)], 'diagram.png', { type: 'image/png' })],
      });
    } catch (err: any) {
      return false;
    }
  } else {
    console.log('Webshare api not supported');
    return await copyProcessImage(modeler);
  }
}

export async function shareProcessImageFromXml(xml: string) {
  const Viewer = await BPMNViewer;
  const viewer = new Viewer();
  await viewer.importXML(xml);

  const ret = await shareProcessImage(viewer);

  viewer.destroy();

  return ret;
}
