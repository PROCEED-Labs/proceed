import { getSVGFromBPMN } from './util';
import { getPNGFromSVG } from './image-export';
import { message } from 'antd';
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

  if (navigator?.share) {
    try {
      await navigator.share({
        files: [new File([blob], 'diagram.png', { type: 'image/png' })],
      });
    } catch (err: any) {
      if (!err.toString().includes('AbortError')) {
        throw new Error('Error: ', { cause: err });
      }
    }
  } else {
    message.error('Web share api not supported, Image copied to clipboard');
    const data = [new ClipboardItem({ 'image/png': blob })];
    navigator.clipboard.write(data).then(() => {
      console.log('Copied to clipboard');
    });
  }
}
