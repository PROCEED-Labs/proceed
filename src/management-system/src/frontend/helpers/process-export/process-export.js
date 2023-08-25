import jsPDF from 'jspdf';
import JSZip from 'jszip';
import Viewer from 'bpmn-js/lib/Viewer';

import { getExporterName, getExporterVersion } from '@proceed/bpmn-helper';
import {
  getCleanedUpName,
  prepareProcesses,
} from '@/frontend/helpers/process-export/export-preparation.js';

import { v4 } from 'uuid';

let viewerElement;

/**
 *  Export selected processes to the selected format or a zip if we export multiple files.
 *
 * @param {Object[]} allProcesses all known processes to search for referenced call activities
 * @param {Object[]} selectedProcesses - all processes that were selected for export
 * @param {Object} selectedOption - selected export options
 */
export async function exportSelectedProcesses(allProcesses, selectedProcesses, selectedOption) {
  // create name for the export file
  let fileName = 'PROCEED';
  if (selectedProcesses.length === 1) {
    const [{ name }] = selectedProcesses;
    fileName = `${fileName}_${getCleanedUpName(name)}`;
  } else {
    fileName = `${fileName}_Multiple-Processes`;
  }

  // deep copy to prevent updating the original process objects
  selectedProcesses = JSON.parse(JSON.stringify(selectedProcesses));
  const processesToExport = await prepareProcesses(allProcesses, selectedProcesses, selectedOption);

  // create the files to export
  const { exportFile, exportFormat } = await getExportFile(processesToExport, selectedOption);

  // gives hint which kind of files are exported when exporting a zip file
  const fileNameSuffix = exportFormat !== selectedOption.format ? `_${selectedOption.format}` : '';

  //Download single file
  triggerExport(`${fileName}${fileNameSuffix}.${exportFormat}`, exportFile);
}

/**
 * Checks if we have to export more than one file which means we have to use a zip file
 *
 * @param {Object[]} processesToExport the process(es) we want to export
 * @param {Object} options the export options (e.g. which file format to export to)
 * @returns {Boolean} if the export has to be in form of a zip
 */
function needZipExport(processesToExport, options) {
  // we have to use a zip file to export more than one process
  if (processesToExport.length > 1) {
    return true;
  } else if (options.format === 'pdf') {
    // the pdf contains all the information needed for one process
    return false;
  }

  const [exportProcess] = processesToExport;
  // we need to use a zip if we want to export user tasks along with the process bpmn
  if (exportProcess.userTasks && Object.keys(exportProcess.userTasks).length) {
    return true;
  }
  // we need to use a zip if we want to export images along with the process bpmn
  if (exportProcess.images && Object.keys(exportProcess.images).length) {
    return true;
  }
  // we don't import callActivities and subprocesses into the directory of the process containing them on a bpmn export
  // call activities are imported into their own directory and should lead to the first check being true
  if (options.format !== 'bpmn') {
    // we need to use a zip if we want to export subprocesses info along with the process info
    if (exportProcess.callActivities && exportProcess.callActivities.length) {
      return true;
    }
    if (exportProcess.collapsedSubprocesses && exportProcess.collapsedSubprocesses.length) {
      return true;
    }
  }

  return false;
}

/**
 * Creates the file we want to export
 *
 * @param {Object[]} processesToExport the processes we want to export and their information
 * @param {Object} options the selected export options
 * @returns {Promise.<Object>} the file to export
 */
async function getExportFile(processesToExport, options) {
  //Creating temporary element for BPMN Viewer
  viewerElement = document.createElement('div');

  //Assiging process id to temp element and append to DOM
  viewerElement.id = 'canvas_' + v4();
  document.body.appendChild(viewerElement);

  //Initiate BPMN Viewer
  let viewer = new Viewer({ container: '#' + viewerElement.id });

  let exportFile;
  let exportFormat;
  if (needZipExport(processesToExport, options)) {
    exportFormat = 'zip';
    exportFile = await getExportZip(processesToExport, viewer, options);
  } else {
    // export single file in the selected format
    exportFormat = options.format;
    exportFile = await getProcessFile(processesToExport[0], viewer, options);
  }

  //remove temporary viewer element from DOM
  document.body.removeChild(viewerElement);

  return { exportFile, exportFormat };
}

/**
 * Creates the zip file containing all the files we want from the export
 *
 * @param {Object[]} processesToExport the processes we want to export
 * @param {Object} viewer a bpmn-io viewer
 * @param {Object} options the selected export options
 * @returns {Promise.<Object>} the zip file to export
 */
async function getExportZip(processesToExport, viewer, options) {
  const zip = new JSZip();

  // add directory for every process
  for (process of processesToExport) {
    await createProcessContainer(process, viewer, options, zip);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Creates a pdf in case of pdf export or a zip directory in case we export multiple non pdf files
 *
 * will add the pdf to the given optionally given zip
 *
 * @param {Object} process the process to export
 * @param {Object} viewer the bpmn-js process viewer
 * @param {Object} options the selected export options
 * @param {Object} [zip] the zip we want to create the container in in case of multi process export
 * @returns {Promise.<Object>} either a zip directory or a pdf file
 */
async function createProcessContainer(process, viewer, options, zip) {
  // create a valid name for the directory the process is stored in
  const processFolderName = getCleanedUpName(process.name);

  let container;
  // create a pdf file or a zip directory
  if (options.format === 'pdf') {
    // initialize Pdf Object
    const pdf = new jsPDF({
      orientation: 'l',
      unit: 'mm',
      format: 'a4',
      compressPdf: true,
    });

    //Delete Default Page from Pdf
    pdf.deletePage(1);

    container = pdf;
  } else if (zip) {
    // create a directory for the process
    container = zip.folder(processFolderName);
  } else {
    throw new Error('Unallowed use of createProcessContainer!');
  }

  // add the main process file
  await addFile(container, process, viewer, options);

  await addAdditionalContent(container, process, viewer, options);

  // create the final pdf file
  if (options.format === 'pdf') {
    container = container.output('blob');

    // add the pdf to the optional zip
    if (zip) {
      zip.file(`${processFolderName}.pdf`, container);
    }
  }

  return container;
}

/**
 * Adds a file to the given pdf/zip directory
 *
 * @param {Object} container either a pdf file or a zip directory
 * @param {Object} process the process we want to create a file of
 * @param {Object} viewer the viewer to get image data from
 * @param {Object} options the selected export options
 */
async function addFile(container, process, viewer, options) {
  let file = await getProcessFile(process, viewer, options, container);

  const fileName = getCleanedUpName(process.name || process.elementId);

  if (options.format !== 'pdf') {
    addZipFile(container, fileName, file, options);
  }
}

/**
 * Adds optional content to the pdf/directory (e.g. User Tasks or Images for bpmn export or called processes for image exports)
 *
 * @param {Object} container a pdf or zip directory
 * @param {*} process
 * @param {*} viewer
 * @param {*} options
 */
async function addAdditionalContent(container, process, viewer, options) {
  if (options.format === 'bpmn') {
    createUserTasks(container, process);
    createImages(container, process);
  } else {
    // create image files for all subprocesses and callActivities
    if (process.collapsedSubprocesses && Array.isArray(process.collapsedSubprocesses)) {
      for (const subprocess of process.collapsedSubprocesses) {
        await addFile(container, subprocess, viewer, options);
      }
    }
    if (process.callActivities && Array.isArray(process.callActivities)) {
      for (const callActivity of process.callActivities) {
        await addFile(container, callActivity, viewer, options);
        await addAdditionalContent(container, callActivity, viewer, options);
      }
    }
  }
}

/**
 * Adds a file to the given directory inside the zip
 *
 * @param {Object} processFolder the directory the file will be added to
 * @param {Object} fileName the name to be used for the zip file
 * @param {Object} file the content of the new zip file
 * @param {Object} options the selected export options
 */
function addZipFile(processFolder, fileName, file, options) {
  // tells jszip that the given file is base64 encoded (needed for png)
  let fileOptions =
    options.format === 'png'
      ? {
          base64: true,
        }
      : {};
  // create the file and add it to the directory
  processFolder.file(`${fileName}.${options.format}`, file, fileOptions);
}

/**
 * Creates a single file for a process
 *
 * @param {Object} process the process from which we want to create the file
 * @param {Object} viewer a bpmn-js viewer
 * @param {Object} options the selected export options
 * @param {Boolean}  [container] pdf or zip directory the file will be added to
 * @returns {Promise.<Object|String>} the file or string with the process information
 */
async function getProcessFile(process, viewer, options, container) {
  // Import the process into the viewer to allow image creation
  await viewer.importXML(process.bpmn);

  switch (options.format) {
    case 'bpmn':
      if (!container) {
        return new Blob([process.bpmn], {
          type: 'application/bpmn+xml',
        });
      } else {
        return process.bpmn;
      }
    case 'svg':
      return getSVG(viewer, container);
    case 'png':
      return await getPNG(viewer, container, options.additionalParam.resolution);
    default:
      // either add to existing pdf or initialize pdf
      if (container) {
        return await addToPDF(container, viewer, process, options);
      } else {
        return await createProcessContainer(process, viewer, options);
      }
  }
}

/**
 * create PDF with Properties and Values
 *
 * @param {Object} pdf the pdf we want to add to
 * @param {String} imageURI
 * @param {Object} process the process we add the image for
 * @param {Boolean} isHeadingRequested if the images in the pdf should be anotated
 * @param {String} svgWidth
 * @param {String} svgHeight
 */
export function setPdfPropsAndValues(
  pdf,
  imageURI,
  process,
  isHeadingRequested,
  svgWidth,
  svgHeight,
) {
  const { name, elementId, description = '', departments = [] } = process;
  let keywords = 'BPMN';

  // adding a new page, second parameter orientation: p - portrait, l - landscape
  pdf.addPage([svgWidth, svgHeight], svgHeight > svgWidth ? 'p' : 'l');

  //Getting PDF Documents width and height
  const pdfWidth = pdf.internal.pageSize.getWidth() - 10;
  const pdfHeight = pdf.internal.pageSize.getHeight() - 10;

  //Setting pdf font size
  pdf.setFontSize(20);

  //Adding Header to the Pdf
  if (isHeadingRequested) {
    let type = 'Process';
    if (process.elementId) {
      type = 'Subprocess';
    }
    pdf.text(10, 10, `${type}: ${name || elementId} \n`);
  }

  if (Array.isArray(departments)) {
    const departmentsString = departments.map((d) => d.name).join(', ');
    keywords =
      `${departmentsString != '' ? departmentsString : departments.join(', ')}, ` + keywords;
  }

  //Adding Meta Information to the PDF
  pdf.setProperties({
    title: `${name}`,
    subject: `${description}`,
    keywords: keywords,
    creator: `${getExporterName()} v${getExporterVersion()}`,
  });

  /**
   * Adding image to pdf document
   * If isHeadingRequested is true then assign value to 'y-axis'
   */
  pdf.addImage(
    imageURI,
    'PNG',
    5,
    isHeadingRequested ? 10 : 0,
    pdfWidth,
    pdfHeight,
    undefined,
    'FAST',
  );
}

/**
 * Adds an image of a (sub)process to the given pdf
 *
 * @param {Object} pdf the pdf file to write to
 * @param {Object} viewer the bpmn-js viewer to get the image data from
 * @param {Object} process the (sub)process we want to create the pdf data from
 * @param {Object} options the selected export options
 * @returns {Promise.<Object>} the updated pdf file
 */
export async function addToPDF(pdf, viewer, process, options) {
  let { resolution } = options.additionalParam;
  // create the image
  let uri = await getPNG(viewer, false, resolution);

  const isHeadingRequested = options.format ? true : false;

  // get image dimensions
  let svg = await getSVG(viewer, true);
  let width = parseFloat(svg.split('width="')[1].split('"')[0]);
  let height = 20 + parseFloat(svg.split('height="')[1].split('"')[0]);
  // relevant for the server: if pdf.addImage throws an error, try again with minimum resolution
  try {
    setPdfPropsAndValues(pdf, uri, process, isHeadingRequested, width, height);
  } catch (err) {
    if (resolution !== 1) {
      const pageCount = pdf.internal.getNumberOfPages();
      pdf.deletePage(pageCount);
      options.resolution -= 1;
      return await addToPDF(pdf, viewer, process, options);
    }
  }

  return pdf;
}

/**
 * Creates a SVG from the modeler content
 *
 * @param {Object} viewer the bpmn-js viewer to get the data from
 * @param {Boolean} isMultiDownload if the SVG will be added to some kind of container file
 */
export async function getSVG(viewer, isMultiDownload) {
  let svgBlob;
  let svgFile;
  try {
    const { svg } = await viewer.saveSVG();
    //Combining SVG and its content type
    svgBlob = new Blob([svg], {
      type: 'image/svg+xml',
    });
    svgFile = svg;
  } catch (err) {
    console.debug(err);
  }

  return isMultiDownload ? svgFile : svgBlob;
}

/**
 * Creates a png from the process in the viewer
 *
 * @param {Object} viewer the bpmn-js viewer to get the image from
 * @param {Boolean} isMultiDownload if the png will be added to some kind of containing file
 * @param {Number} resolution
 * @returns {Promise.<String>} the png data
 */
export function getPNG(viewer, isMultiDownload, resolution) {
  let uri;
  const DATA_URL_REGEX = /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;
  return new Promise(async (resolve, reject) => {
    let svg = await getSVG(viewer, true);

    //Getting width and height from BPMN SVG
    let width = svg.split('width="')[1].split('"')[0];
    let height = svg.split('height="')[1].split('"')[0];

    //Initiating Image Element
    let image = new Image(width, height);

    //Combining SVG and its content type
    let svgString = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });

    //Creating Canvas out of SVG
    let canvas = document.createElement('canvas');

    image.onload = () => {
      for (let scale = resolution; scale >= 1; scale -= 1) {
        try {
          canvas.width = scale * image.width;
          canvas.height = scale * image.height;
          //Creating 2D Canvas
          let ctx = canvas.getContext('2d');
          //prevent from bluring the pixels
          ctx.imageSmoothingEnabled = false;

          ctx.scale(scale, scale);

          //Drawing Image on Canvas
          ctx.drawImage(image, 0, 0, width, height);

          //Getting URI for Image in PNG **Default = PNG
          uri = canvas.toDataURL('image/png');
          if (DATA_URL_REGEX.test(uri)) {
            const headerlessImage = uri.replace('data:image/png;base64,', '');
            resolve(isMultiDownload ? headerlessImage : uri);
            break;
          }

          //Release Object URL, so browser dont keep reference
          URL.revokeObjectURL(uri);
        } catch (err) {}
      }
    };
    //Takes BLOB, File and Media Source and returns object url
    image.src = URL.createObjectURL(svgString);
  });
}

/**
 * Creates user task directory and files in zip
 *
 * @param {Object} processFolder the directory in the zip to write to
 */
export function createUserTasks(processFolder, process) {
  const { userTasks } = process;

  if (!userTasks) {
    return;
  }

  const userTaskIds = Object.keys(userTasks);
  //Combining Process with its supporting files
  if (userTaskIds.length > 0) {
    //If its multi download then attach files to its specific folder else direct to zipObject
    const userTaskFolder = processFolder.folder('user-tasks');

    //Combining Process with its supporting files
    for (const userTaskId of userTaskIds) {
      userTaskFolder.file(`${userTaskId}.html`, userTasks[userTaskId]);
    }
  }
}

/**
 * Creates image directory and files in zip
 *
 * @param {Object} processFolder the directory in the zip to write to
 */
export function createImages(processFolder, process) {
  const { images } = process;

  if (!images) {
    return;
  }

  const imageFileNames = Object.keys(images);
  //Combining Process with its supporting files
  if (imageFileNames.length > 0) {
    //If its multi download then attach files to its specific folder else direct to zipObject
    const imagesFolder = processFolder.folder('images');

    //Combining Process with its supporting files
    for (const imageFileName of imageFileNames) {
      imagesFolder.file(`${imageFileName}`, images[imageFileName]);
    }
  }
}

/**
 * Handles the export of the created file
 *
 * @param {String} fileName name used to download file
 * @param {String|Object} objectContent content, either as Blob or objectURL DOMString
 */
export async function triggerExport(fileName, objectContent) {
  // check if objectContent is an objectURL
  // otherwise create a blob, for the following reason: https://stackoverflow.com/questions/16761927/aw-snap-when-data-uri-is-too-large

  const objectURL =
    typeof objectContent === 'string'
      ? URL.createObjectURL(await fetch(objectContent).then((res) => res.blob()))
      : URL.createObjectURL(objectContent);

  // Creating Anchor Element to trigger download feature
  const aLink = document.createElement('a');

  // Setting anchor tag properties
  aLink.style.display = 'none';
  aLink.download = fileName;
  aLink.href = objectURL;

  // Setting anchor tag to DOM
  document.body.appendChild(aLink);
  aLink.click();
  document.body.removeChild(aLink);

  // Release Object URL, so browser dont keep reference
  URL.revokeObjectURL(objectURL);
}
