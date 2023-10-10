import { v4 } from 'uuid';
import { jsPDF } from 'jspdf';
import jsZip from 'jszip';
import 'svg2pdf.js';

const { getAllUserTaskFileNamesAndUserTaskIdsMapping } = require('@proceed/bpmn-helper');

import {
  fetchProcessVersionBpmn,
  fetchProcess,
  fetchProcessUserTaskHTML,
} from '../process-queries';

export type ProcessExportOptions = {
  type: 'bpmn' | 'svg' | 'pdf';
  artefacts: boolean; // if artefacts like images or user task html should be included in the export
};

type ExportProcessInfo = { definitionId: string; processVersion?: number | string }[];

export class ProcessesExporter {
  processCache: {
    [definitionId: string]: {
      definitionName: string;
      versions: {
        [version: string]: string;
      };
    };
  };

  options: ProcessExportOptions;
  processes: ExportProcessInfo;

  // if the export will contain multiple files; determined by the number of processes to export, options like artefact export and imports/subprocess export (which can still be a single file in case of pdf export)
  needsZip: boolean;

  constructor(options: ProcessExportOptions, processes: ExportProcessInfo) {
    this.processCache = {};
    this.options = options;
    this.processes = processes;

    this.needsZip = processes.length > 1 || options.artefacts;
  }

  /**
   * Used to get the process information required for an export
   *
   * caches data to avoid refetching when a process is for example both directly exported and exported as an import of another process
   *
   * @param definitionId
   * @param processVersion
   */
  private async getProcessData(definitionId: string, processVersion?: string | number) {
    if (!this.processCache[definitionId]) {
      const process = await fetchProcess(definitionId);

      if (!process) {
        throw new Error(
          `Failed to get process info (definitionId: ${definitionId}) during process export`,
        );
      }

      this.processCache[definitionId] = {
        definitionName: process.definitionName,
        versions: {},
      };
    }

    const versionName = processVersion ? `${processVersion}` : 'current';

    if (!this.processCache[definitionId].versions[versionName]) {
      const versionBpmn = await fetchProcessVersionBpmn(definitionId, processVersion);

      if (!versionBpmn) {
        throw new Error(
          `Failed to get the bpmn for a version (${processVersion}) of a process (definitionId: ${definitionId})`,
        );
      }

      this.processCache[definitionId].versions[versionName] = versionBpmn;
    }

    return {
      definitionName: this.processCache[definitionId].definitionName,
      bpmn: this.processCache[definitionId].versions[versionName],
    };
  }

  /**
   * Returns the user task html data used in the bpmn of a specific version of a process
   *
   * @param definitionId
   * @param processVersion
   */
  private async getProcessUserTasks(definitionId: string, processVersion?: string | number) {
    const { bpmn } = await this.getProcessData(definitionId, processVersion);

    const userTaskFiles = Object.keys(await getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn));

    const userTasks: { [filename: string]: string } = {};

    for (const filename of userTaskFiles) {
      const html = await fetchProcessUserTaskHTML(definitionId, filename);

      if (!html) {
        throw new Error(
          `Failed to get the html for a user task (filename: ${filename}) of a process (definitionId: ${definitionId})`,
        );
      }

      userTasks[filename] = html;
    }

    return userTasks;
  }

  async exportProcesses() {
    if (!this.processes.length) {
      throw new Error('Tried exporting without specifying the processes to export!');
    }

    const zip = this.needsZip ? new jsZip() : undefined;

    for (const { definitionId, processVersion } of this.processes) {
      let dataHandler = this.needsZip ? zip!.file.bind(zip) : this.downloadFile;
      if (this.options.type === 'pdf') {
        // in case of pdf export all data for a process can be put into the single pdf file
        await this.exportPDF(dataHandler, definitionId, processVersion);
      } else {
        // if we export a process in a zip we create a folder so we can group all files for the process
        let folder: jsZip | null = null;
        if (this.needsZip) {
          const { definitionName } = await this.getProcessData(definitionId);
          // TODO: why might the folder function return null?
          folder = zip!.folder(definitionName);
          dataHandler = folder!.file.bind(folder);
        }

        if (this.options.type === 'bpmn') {
          await this.exportBpmn(dataHandler, definitionId, processVersion);

          if (this.options.artefacts) {
            const userTaskFolder = await folder!.folder('user-tasks');
            await this.exportUserTasks(
              userTaskFolder!.file.bind(userTaskFolder),
              definitionId,
              processVersion,
            );
          }
        } else if (this.options.type === 'svg') {
          await this.exportSVG(dataHandler, definitionId, processVersion);
        }
      }
    }

    if (this.needsZip) {
      this.downloadFile(
        'PROCEED_Multiple-Processes_bpmn.zip',
        await zip!.generateAsync({ type: 'blob' }),
      );
    }
  }

  private async exportBpmn(
    dataHandler: (fileName: string, data: Blob) => void,
    definitionId: string,
    processVersion?: string | number,
  ) {
    const process = await this.getProcessData(definitionId, processVersion);

    const bpmnBlob = new Blob([process.bpmn!], { type: 'application/xml' });

    dataHandler(`${process.definitionName}.bpmn`, bpmnBlob);
  }

  private async exportUserTasks(
    dataHandler: (filename: string, data: Blob) => void,
    definitionId: string,
    processVersion?: string | number,
  ) {
    const userTaskData = await this.getProcessUserTasks(definitionId, processVersion);

    for (const [filename, html] of Object.entries(userTaskData)) {
      const htmlBlob = new Blob([html], { type: 'application/html' });
      dataHandler(`${filename}.html`, htmlBlob);
    }
  }

  private async getSVGFromBPMN(bpmn: string) {
    const Viewer = (await import('bpmn-js/lib/Viewer')).default;

    //Creating temporary element for BPMN Viewer
    const viewerElement = document.createElement('div');

    //Assiging process id to temp element and append to DOM
    viewerElement.id = 'canvas_' + v4();
    document.body.appendChild(viewerElement);

    //Create a viewer to transform the bpmn into an svg
    const viewer = new Viewer({ container: '#' + viewerElement.id });
    await viewer.importXML(bpmn);
    const { svg } = await viewer.saveSVG();

    return svg;
  }

  private async exportSVG(
    dataHandler: (fileName: string, data: Blob) => void,
    processId: string,
    processVersion?: string | number,
  ) {
    const process = await this.getProcessData(processId, processVersion);

    const svg = await this.getSVGFromBPMN(process.bpmn!);

    const svgBlob = new Blob([svg], {
      type: 'image/svg+xml',
    });

    dataHandler(`${process.definitionName}.svg`, svgBlob);
  }

  private async exportPDF(
    dataHandler: (fileName: string, data: Blob) => void,
    processId: string,
    processVersion?: string | number,
  ) {
    const process = await this.getProcessData(processId, processVersion);

    const svg = await this.getSVGFromBPMN(process.bpmn!);

    const parser = new DOMParser();
    const svgDOM = parser.parseFromString(svg, 'image/svg+xml');

    const doc = new jsPDF({
      unit: 'pt', // needed due to a bug in jsPDF: https://github.com/yWorks/svg2pdf.js/issues/245#issuecomment-1671624250
      format: 'a4',
      orientation: 'landscape',
    });

    doc.deletePage(1);

    // get image dimensions
    let svgWidth = parseFloat(svg.split('width="')[1].split('"')[0]);
    let svgHeight = 20 + parseFloat(svg.split('height="')[1].split('"')[0]);

    // adding a new page, second parameter orientation: p - portrait, l - landscape
    doc.addPage([svgWidth, svgHeight], svgHeight > svgWidth ? 'p' : 'l');

    //Getting PDF Documents width and height
    const pageWidth = doc.internal.pageSize.getWidth() - 10;
    const pageHeight = doc.internal.pageSize.getHeight() - 10;

    //Setting pdf font size
    doc.setFontSize(15);

    //Adding Header to the Pdf
    // TODO: make sure that the text fits both in landscape as well as in portrait mode
    doc.text(`Process: ${process.definitionName} \n`, 10, 15);

    await doc.svg(svgDOM.children[0], {
      x: 0,
      y: 10,
      width: pageWidth,
      height: pageHeight,
    });

    dataHandler(`${process.definitionName}.pdf`, await doc.output('blob'));
  }

  private downloadFile(filename: string, data: Blob) {
    const objectURL = URL.createObjectURL(data);

    // Creating Anchor Element to trigger download feature
    const aLink = document.createElement('a');

    // Setting anchor tag properties
    aLink.style.display = 'none';
    aLink.download = filename;
    aLink.href = objectURL;

    // Setting anchor tag to DOM
    document.body.appendChild(aLink);
    aLink.click();
    document.body.removeChild(aLink);

    // Release Object URL, so the browser doesn't keep the reference
    URL.revokeObjectURL(objectURL);
  }
}
