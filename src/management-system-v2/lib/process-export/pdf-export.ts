import { jsPDF } from 'jspdf';
import jsZip from 'jszip';

import { ProcessExportData, ProcessesExportData } from './export-preparation';
import { getProcessFilePathName, downloadFile, getSVGFromBPMN } from './util';

import PDFPagebuilder from './PDFPageBuilder';

const proceedUrl = 'www.proceed-labs.org';
const proceedLogo = fetch(`/proceed-labs-logo.svg`)
  .then((response) => response.text())
  .catch(() => {
    return '';
  });

/**
 * Executes the logic that adds the page for a specific process version/collapsed subprocess
 *
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param pdf the pdf to add a page to
 * @param withMetaData if process information should be added as text to the process page
 * @param useA4 if the process page should have an A4 format (otherwise the size of the process is used to scale the page)
 * @param isImport if the data to be added is part of an imported process
 * @param showOnlySelected if all elements that are not in the selected elements (in processData) should be hidden
 * @param subprocessId if a specific collapsed subprocess should be added this is the id of the subprocess element
 * @param subprocessName the name of the collapsed subprocess to be added
 */
async function addPDFPage(
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  withMetaData: boolean,
  useA4: boolean,
  isImport = false,
  showOnlySelected?: boolean,
  subprocessId?: string,
  subprocessName?: string,
) {
  // create a new page builder
  const pageBuilder = new PDFPagebuilder(pdf, useA4, { top: 5, bottom: 5, left: 5, right: 5 });

  // register the proceed-labs logo
  const logoHeight = 1.3 * pdf.getFontSize();
  const logoAspectRatio = 387 / 34;
  pageBuilder.addVectorImage(
    await proceedLogo,
    'right',
    { height: logoHeight, width: logoHeight * logoAspectRatio },
    { bottom: 10 },
  );
  pageBuilder.addLine(`**${proceedUrl}**`, 'right', { bottom: 5, right: 2 });

  const versionData = processData.versions[version];
  // register meta data text if requested
  if (withMetaData) {
    // generate the lines in the title: (Imported )Process Name, Process Version
    pageBuilder.addLine(
      `**${isImport ? 'Imported Process Name:' : 'Process Name:'}** ${
        processData.definitionName || processData.definitionId
      }`,
      'center',
    );
    pageBuilder.addLine(`**Version:** ${versionData.name || version}`, 'center');

    // add an aditional title line for a subprocess image
    if (subprocessId) {
      pageBuilder.addLine(`**Subprocess:** ${subprocessName || subprocessId}`, 'center');
    }
  }

  // get the svg so we can display the process as a vector graphic inside the pdf
  const processSVG = await getSVGFromBPMN(
    versionData.bpmn,
    subprocessId,
    showOnlySelected ? versionData.selectedElements : undefined,
  );
  // register the image of the process
  pageBuilder.addVectorImage(
    processSVG,
    'center',
    useA4 ? pageBuilder.getRemainingSize() : undefined,
  );
  // let the builder create the page with the registered content
  await pageBuilder.createPage();
}

/**
 * Allows to recursively add versions of a process and its imports to the pdf
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param pdf the pdf to add a page to
 * @param withMetaData if process information should be added as text to the process page
 * @param forceA4 if the pdf pages should always have an A4 page format
 * @param showOnlySelected if all elements that are not in the selected elements (in processData) should be hidden
 * @param isImport if the version is of an import
 */
async function handleProcessVersionPdfExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  withMetaData: boolean,
  forceA4: boolean,
  showOnlySelected?: boolean,
  isImport = false,
) {
  const versionData = processData.versions[version];
  // add the main process (version) (layer with id === undefined) and all collapsed subprocesses
  for (const { id: subprocessId, name: subprocessName } of versionData.layers) {
    await addPDFPage(
      processData,
      version,
      pdf,
      withMetaData,
      forceA4,
      isImport,
      showOnlySelected,
      subprocessId,
      subprocessName,
    );
  }

  // add all imported processes recursively
  for (const { definitionId, processVersion } of versionData.imports) {
    const importData = processesData.find((el) => el.definitionId === definitionId);
    if (importData) {
      await handleProcessVersionPdfExport(
        processesData,
        importData,
        processVersion,
        pdf,
        withMetaData,
        forceA4,
        showOnlySelected,
        true,
      );
    }
  }
}

/**
 * Creates a pdf and adds all the requested information of a specific process (including other processes if there are imports to add)
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process to export
 * @param withMetaData if process information should be added as text to the process page
 * @param forceA4 if the pdf pages should always have an A4 page format
 * @param showOnlySelected if all elements that are not in the selected elements (in processData) should be hidden
 * @param zip a zip archive this pdf should be added to in case multiple processes should be exported
 */
async function pdfExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  withMetaData: boolean,
  forceA4: boolean,
  showOnlySelected?: boolean,
  zip?: jsZip | null,
) {
  // create the pdf file for the process
  const pdf = new jsPDF({
    unit: 'pt', // needed due to a bug in jsPDF: https://github.com/yWorks/svg2pdf.js/issues/245#issuecomment-1671624250
    format: 'a4',
    orientation: 'landscape',
  });
  pdf.deletePage(1);

  //Setting pdf font size
  pdf.setFontSize(11);

  // only export the versions that were explicitly selected for the given process
  const nonImportVersions = Object.entries(processData.versions)
    .filter(([_, { isImport }]) => !isImport)
    .map(([version]) => version);

  for (const version of nonImportVersions) {
    await handleProcessVersionPdfExport(
      processesData,
      processData,
      version,
      pdf,
      withMetaData,
      forceA4,
      showOnlySelected,
    );
  }

  if (zip) {
    zip.file(`${getProcessFilePathName(processData.definitionName)}.pdf`, await pdf.output('blob'));
  } else {
    downloadFile(
      `${getProcessFilePathName(processData.definitionName)}.pdf`,
      await pdf.output('blob'),
    );
  }
}

export default pdfExport;
