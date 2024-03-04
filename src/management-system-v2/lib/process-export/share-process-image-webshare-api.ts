import { getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';

/**
 * share an image of a process or selected parts of a process using webshare api
 *
 * @param modeler the modeler to share the process image from
 */
export async function shareProcessImage(modeler: BPMNCanvasRef) {
  let xml = await modeler.getXML();

  // get the currently visible layer
  const rootElement = modeler.getCanvas().getRootElement().businessObject;
  const subprocessId =
    rootElement.$type === 'bpmn:Process' || rootElement.$type === 'bpmn:Collaboration'
      ? undefined
      : rootElement.id;

  // get the selected elements
  let selection: any[] = modeler.getSelection().get();
  // get the png and copy it to the clipboard
  const svg = await getSVGFromBPMN(
    xml!,
    subprocessId,
    selection.map((el) => el.id),
  );
  const blob = await getPNGFromSVG(svg, 3);

  // Type assertion for navigator
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
