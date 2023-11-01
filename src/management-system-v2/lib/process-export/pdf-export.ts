import { jsPDF } from 'jspdf';
import jsZip from 'jszip';

import { ProcessExportData, ProcessesExportData } from './export-preparation';
import { downloadFile, getSVGFromBPMN } from './util';

/**
 * Returns the width of a line with bold and non-bold text
 *
 * @param pdf a pdf page object
 * @param bold the part of the string that should be bold
 * @param normal the part of the string that should not be bold
 * @returns the width of the string (based on the font size used)
 */
function getLineWidth(pdf: jsPDF, bold: string, normal: string) {
  let lineWidth = pdf.getStringUnitWidth(normal) * pdf.getFontSize();

  pdf.setFont(pdf.getFont().fontName, 'bold');
  lineWidth += pdf.getStringUnitWidth(bold) * pdf.getFontSize();
  pdf.setFont(pdf.getFont().fontName, 'normal');

  return lineWidth;
}

/**
 * Adds a line with bold and non bold text to a pdf page (output format: [bold]: [normal])
 *
 * adds a line break by moving the current position to the given x position and the y position on line down
 *
 * @param pdf a pdf page
 * @param currentPosition the position at which to start writing the line
 * @param bold the bold part of the line
 * @param normal the non-bold part of the line
 */
function addLine(
  pdf: jsPDF,
  currentPosition: { x: number; y: number },
  bold: string,
  normal: string,
) {
  const xStart = currentPosition.x;
  pdf.setFont(pdf.getFont().fontName, 'bold');
  pdf.text(bold, currentPosition.x, currentPosition.y);
  currentPosition.x += getLineWidth(pdf, bold, '');

  pdf.setFont(pdf.getFont().fontName, 'normal');
  pdf.text(normal, currentPosition.x, currentPosition.y);

  currentPosition.y += pdf.getLineHeight();
  currentPosition.x = xStart;
}

/** Start Logo Logic */

const proceedUrl = 'www.proceed-labs.org';
const proceedLogo = fetch('/proceed-labs-logo.svg').then((response) => response.text());

/**
 * Returns the dimensions of the proceed labs logo
 *
 * @param pdf a pdf page object
 * @returns the width and height with which the proceed labs logo should be added to the page
 */
function getProceedLogoDimensions(pdf: jsPDF) {
  const height = 1.3 * pdf.getFontSize();

  const logoAspectRatio = 387 / 34;

  return { height, width: height * logoAspectRatio };
}

/**
 * Returns the dimensions of the combination of the proceed labs logo and the proceed labs url
 *
 * @param pdf a pdf page object
 * @returns the width and height of the proceed labs logo combined with a url to the proceed labs page
 */
function getCompleteLogoDimensions(pdf: jsPDF) {
  const logoDimensions = getProceedLogoDimensions(pdf);

  const urlWidth = getLineWidth(pdf, proceedUrl, '');

  return {
    width: Math.max(logoDimensions.width, urlWidth),
    height: logoDimensions.height + pdf.getLineHeight() + 10,
  };
}

/**
 * Adds a proceed labs logo and proceed labs url to the upper right corner of a page
 *
 * @param pageMargins
 * @param pdf a pdf page object
 */
async function addLogo(pageMargins: { x: number; y: number }, pdf: jsPDF) {
  const logoDimensions = getProceedLogoDimensions(pdf);

  const parser = new DOMParser();
  const svgDOM = parser.parseFromString(await proceedLogo, 'image/svg+xml');

  const offset = {
    // align the logo to the right of the page
    x: pdf.internal.pageSize.getWidth() - logoDimensions.width - pageMargins.x / 2,
    y: pageMargins.y / 2,
  };

  await pdf.svg(svgDOM.children[0], {
    ...offset,
    ...logoDimensions,
  });

  // align the url to the right like the logo (-3 due to the logo having a small amount of white on the right)
  const urlStartPositionX =
    pdf.internal.pageSize.getWidth() - getLineWidth(pdf, proceedUrl, '') - pageMargins.x / 2 - 3;

  addLine(pdf, { x: urlStartPositionX, y: offset.y + logoDimensions.height + 10 }, proceedUrl, '');
}

/** End Logo Logic */

/** Start Meta Data Logic */

/**
 * Returns the size of the meta data string box for a given (sub-)process
 *
 * @param processData the data for the process
 * @param version the version of the process to use
 * @param pdf a pdf page object
 * @param isImport if the process is an import
 * @param subprocessName the name of the subprocess
 * @param subprocessId the id of the subprocess
 * @returns the with and height of the meta date lines
 */
function getMetaDataDimensions(
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  isImport?: boolean,
  subprocessName = '',
  subprocessId = '',
) {
  const dimensions = { width: 0, height: 2 * pdf.getLineHeight() };

  const versionData = processData.versions[version];

  let processNameLineWidth = getLineWidth(
    pdf,
    isImport ? 'Imported Process Name: ' : 'Process Name: ',
    processData.definitionName || processData.definitionId,
  );
  let versionLineWidth = getLineWidth(pdf, 'Version: ', versionData.name || version);

  dimensions.width = Math.max(processNameLineWidth, versionLineWidth);

  // add the size of the subprocess info if the meta data of a subprocess is requested
  if (!!subprocessId) {
    dimensions.height += pdf.getLineHeight();
    let subprocessNameLineWidth = getLineWidth(pdf, 'Subprocess: ', subprocessName || subprocessId);
    dimensions.width = Math.max(dimensions.width, subprocessNameLineWidth);
  }

  return dimensions;
}

/**
 * Adds the meta data for a specific (sub-)process to a pdf page
 *
 * @param yOffset the y position on the page at which to start adding lines
 * @param processData the data for the process
 * @param version the version of the process to use
 * @param pdf a pdf page object
 * @param subprocessId the id of the subprocess
 * @param subprocessName the name of the subprocess
 * @param isImport if the process is an import
 */
function addMetaData(
  yOffset: number,
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  subprocessId?: string,
  subprocessName?: string,
  isImport: boolean = false,
) {
  const versionData = processData.versions[version];

  const dimensions = getMetaDataDimensions(
    processData,
    version,
    pdf,
    isImport,
    subprocessName,
    subprocessId,
  );

  // write the meta info text to the center of the page
  const currentPosition = {
    x: pdf.internal.pageSize.getWidth() / 2 - dimensions.width / 2,
    y: yOffset + pdf.getLineHeight() / 2,
  };

  // generate the lines in the title: (Imported )Process Name, Process Version
  addLine(
    pdf,
    currentPosition,
    isImport ? 'Imported Process Name: ' : 'Process Name: ',
    processData.definitionName || processData.definitionId,
  );
  addLine(pdf, currentPosition, 'Version: ', versionData.name || version);

  // add an aditional title line for a subprocess image
  if (subprocessId) {
    addLine(pdf, currentPosition, 'Subprocess: ', subprocessName || subprocessId);
  }
}

/** End Meta Data Logic */

/** Start Image Logic */

/**
 * Returns the dimensions of the (sub-)processes vector-image
 *
 * @param processData the data for the process
 * @param version the version of the process to use
 * @param subprocessId the id of the subprocess to visualize
 * @returns the width and height of the image
 */
async function getImageDimensions(
  processData: ProcessExportData,
  version: string,
  subprocessId?: string,
) {
  const versionData = processData.versions[version];
  // get the svg so we can display the process as a vector graphic inside the pdf
  const svg = await getSVGFromBPMN(versionData.bpmn, subprocessId);

  return {
    width: parseFloat(svg.split('width="')[1].split('"')[0]),
    height: parseFloat(svg.split('height="')[1].split('"')[0]),
  };
}

/**
 * Adds the vector-image of a specific (sub-)process to a page
 *
 * @param yOffset the y position on the page at which the image should start
 * @param pdf a pdf page object
 * @param processData the data of the process
 * @param version the version of the process to use
 * @param subprocessId the id of the subprocess to visualize
 */
async function addImage(
  yOffset: number,
  pdf: jsPDF,
  processData: ProcessExportData,
  version: string,
  subprocessId?: string,
) {
  const versionData = processData.versions[version];
  // get the svg so we can display the process as a vector graphic inside the pdf
  const svg = await getSVGFromBPMN(versionData.bpmn, subprocessId);
  const parser = new DOMParser();
  let svgDOM = parser.parseFromString(svg, 'image/svg+xml');

  const size = await getImageDimensions(processData, version, subprocessId);

  await pdf.svg(svgDOM.children[0], {
    // center the image on the page
    x: pdf.internal.pageSize.getWidth() / 2 - size.width / 2,
    y: yOffset,
    ...size,
  });
}

/** End Image Logic */

/**
 * Executes the logic that adds the page for a specific process version/collapsed subprocess
 *
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param pdf the pdf to add a page to
 * @param isImport if the data to be added is part of an imported process
 * @param withTitles if process information should be added as text to the process page
 * @param subprocessId if a specific collapsed subprocess should be added this is the id of the subprocess element
 * @param subprocessName the name of the collapsed subprocess to be added
 */
async function addPDFPage(
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  withTitles: boolean,
  isImport = false,
  subprocessId?: string,
  subprocessName?: string,
) {
  const pageMargins = { x: 10, y: 10 };
  const logoSize = getCompleteLogoDimensions(pdf);
  const imageSize = await getImageDimensions(processData, version, subprocessId);
  let titleSize = { width: 0, height: 0 };

  if (withTitles) {
    titleSize = getMetaDataDimensions(
      processData,
      version,
      pdf,
      isImport,
      subprocessName,
      subprocessId,
    );
  }

  const pageSize = {
    width: pageMargins.x + Math.max(imageSize.width, titleSize.width, logoSize.width),
    height: pageMargins.y + imageSize.height + titleSize.height + logoSize.height,
  };

  // adding a new page, second parameter orientation: p - portrait, l - landscape
  pdf.addPage([pageSize.width, pageSize.height], pageSize.height > pageSize.width ? 'p' : 'l');

  let yOffset = pageMargins.y / 2;

  await addLogo(pageMargins, pdf);

  yOffset += logoSize.height;

  if (withTitles) {
    addMetaData(yOffset, processData, version, pdf, subprocessId, subprocessName, isImport);

    yOffset += titleSize.height;
  }

  await addImage(yOffset, pdf, processData, version, subprocessId);
}

/**
 * Allows to recursively add versions of a process and its imports to the pdf
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param pdf the pdf to add a page to
 * @param withTitles if process information should be added as text to the process page
 * @param isImport if the version is of an import
 */
async function handleProcessVersionPdfExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  withTitles: boolean,
  isImport = false,
) {
  // add the main process (version) data
  await addPDFPage(processData, version, pdf, withTitles, isImport);

  const versionData = processData.versions[version];
  // add all collapsed subprocesses (if requested)
  for (const { id: subprocessId, name: subprocessName } of versionData.subprocesses) {
    await addPDFPage(processData, version, pdf, withTitles, isImport, subprocessId, subprocessName);
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
        withTitles,
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
 * @param withTitles if process information should be added as text to the process page
 * @param zip a zip archive this pdf should be added to in case multiple processes should be exported
 */
async function pdfExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  withTitles: boolean,
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
    await handleProcessVersionPdfExport(processesData, processData, version, pdf, withTitles);
  }

  if (zip) {
    zip.file(`${processData.definitionName}.pdf`, await pdf.output('blob'));
  } else {
    downloadFile(`${processData.definitionName}.pdf`, await pdf.output('blob'));
  }
}

export default pdfExport;
