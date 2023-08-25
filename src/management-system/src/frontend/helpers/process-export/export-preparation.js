import { processInterface } from '@/frontend/backend-api/index.js';
import { flattenSubprocesses } from '@/shared-frontend-backend/helpers/process-hierarchy.js';
import { getSubprocessContent } from '@proceed/bpmn-helper';
import { getProcessHierarchy } from '@/shared-frontend-backend/helpers/process-hierarchy.js';
import { asyncForEach } from '../../../shared-frontend-backend/helpers/javascriptHelpers';
/**
 * @param {Object} process
 * @returns - Returns xml for a process from the store
 */
export async function getXmlByProcess(process) {
  if (!process.id || !process.name) {
    console.warn('Try to retrieve xml for invalid process: ', process);
    return null;
  }
  const bpmn = (await processInterface.getProcess(process.id)).bpmn;
  return bpmn;
}

/**
 * @param {Object} process
 * @returns - Returns usertasks for a process from the store
 */
export async function getUserTasksByProcess(process) {
  if (!process.id || !process.name) {
    console.warn('Try to retrieve user tasks for invalid process: ', process);
    return null;
  }
  const userTasks = await processInterface.getUserTasksHTML(process.id);
  return userTasks;
}

/**
 * @param {Object} process
 * @returns - Returns images for a process from the store
 */
export async function getImagesByProcess(process) {
  if (!process.id || !process.name) {
    console.warn('Try to retrieve images for invalid process: ', process);
    return null;
  }
  const images = await processInterface.getImages(process.id);
  await asyncForEach(Object.keys(images), async (imageFileName) => {
    let image = images[imageFileName];
    if (typeof image === 'string') {
      const blob = await fetch(image).then((res) => res.blob());
      const file = new File([blob], { type: blob.type });
      image = file;
    }
    images[imageFileName] = image;
  });
  return images;
}

export function getCleanedUpName(name) {
  return name
    .replace(/[`@^()_={}[\]|;!=&/\\#,+()$~%.'":*?<>{}]/g, '')
    .trim()
    .replace(/[ ]/g, '_')
    .replace(/-$/, '');
}

/**
 * Retrieve every subprocess and subprocesses of call activities for the
 * processes to export and their meta information, bpmn, user tasks and images
 *
 * @param {Object[]} allProcesses all known processes to search for referenced call activities
 * @param {Object[]} processesToExport - all processes that need to be exported
 * @param {Object} options - export format
 */
export async function prepareProcesses(allProcesses, processesToExport, options) {
  const fullInfoPromises = processesToExport.map(async (process) => {
    const augmentedProcess = {
      ...process,
      bpmn: await getXmlByProcess(process),
    };
    if (options.additionalParam.format === 'withArtefacts') {
      augmentedProcess.userTasks = await getUserTasksByProcess(process);
      augmentedProcess.images = await getImagesByProcess(process);
    }

    if (options.additionalParam.includeCallActivityProcess) {
      // get all callactivities, optionally also add collapsed subprocesses
      augmentedProcess.callActivities = await getAllSubprocesses(
        allProcesses,
        augmentedProcess,
        [],
        options.additionalParam.format === 'withArtefacts',
        options.additionalParam.includeCollapsedSubprocess,
      );
    } else if (options.additionalParam.includeCollapsedSubprocess) {
      // only get all collapsed subprocesses
      augmentedProcess.collapsedSubprocesses = await getAllCollapsedSubprocesses(augmentedProcess);
    }

    return augmentedProcess;
  });

  processesToExport = await Promise.all(fullInfoPromises);

  // export callActivities seperately from their calling processes but only once
  // (might be marked for export too or used by multiple exported processes)
  if (options.format === 'bpmn' && options.additionalParam.includeCallActivityProcess) {
    processesToExport = processesToExport.reduce((acc, process) => {
      // adds the process if it isn't there already
      function addIfUnknown(p) {
        if (!acc.some((accP) => accP.id === p.id)) {
          acc.push(p);
        }
      }

      addIfUnknown(process);

      // add every call activity that isn't marked for export yet
      if (process.callActivities && Array.isArray(process.callActivities)) {
        process.callActivities.forEach((callActivity) => {
          addIfUnknown(callActivity);
        });
      }

      return acc;
    }, []);
  }

  return processesToExport;
}

/**
 * Creates a set of all called processes inside a process and their called processeses recursively
 *
 * additionally adds the collapsed subprocesses of a process as an attribute to the respective process
 *
 * @param {Object[]} allProcesses all known processes to search for referenced call activities
 * @param {Object} currentProcess current selected process of the hierarchy
 * @param {Object[]} includedProcesses container containing all (nested) call activities
 * @param {Boolean} [addArtefacts] if we want to get the user tasks and images of the called processes
 * @param {Boolean} includeCollapsed - signal if also collapsed subprocesses should be retrieved
 */
export async function getAllSubprocesses(
  allProcesses,
  currentProcess,
  includedProcesses,
  addArtefacts,
  includeCollapsed,
) {
  currentProcess.subprocesses = await getProcessHierarchy(currentProcess.bpmn);

  if (!Array.isArray(currentProcess.subprocesses) || currentProcess.subprocesses.length === 0) {
    return includedProcesses;
  }

  const flatSubprocesses = flattenSubprocesses(currentProcess);

  if (includeCollapsed) {
    currentProcess.collapsedSubprocesses = await getAllCollapsedSubprocesses(currentProcess);
  }

  const callActivities = flatSubprocesses.filter((subprocess) => subprocess.isCallActivity);

  // recursively iterate through all callActivities and add the ones that contain a called process
  for (const { calledProcessId } of callActivities) {
    if (calledProcessId) {
      let callActivityProcess = allProcesses.find((pro) => pro.id === calledProcessId);
      if (callActivityProcess) {
        // to prevent updating the original process object
        callActivityProcess = { ...callActivityProcess };

        callActivityProcess.bpmn = await getXmlByProcess(callActivityProcess);
        if (addArtefacts) {
          callActivityProcess.userTasks = await getUserTasksByProcess(callActivityProcess);
          callActivityProcess.images = await getImagesByProcess(callActivityProcess);
        }
        // check if process was in recursive loop before
        if (!includedProcesses.some((process) => process.id === callActivityProcess.id)) {
          includedProcesses.push(callActivityProcess);
          includedProcesses = await getAllSubprocesses(
            allProcesses,
            callActivityProcess,
            includedProcesses,
            addArtefacts,
            includeCollapsed,
          );
        }
      }
    }
  }

  return includedProcesses;
}

/**
 * Returns content of all collapsed subprocesses for given process
 * @param {Object} process current selected process of the hierarchy
 */
export async function getAllCollapsedSubprocesses(process) {
  const flatSubprocesses = flattenSubprocesses(process);

  const collapsedSubprocesses = flatSubprocesses
    // get only collapsed subprocesses
    .filter((subprocess) => !subprocess.isCallActivity && !subprocess.isExpanded)
    // add bpmn
    .map(async (subprocess) => ({
      ...subprocess,
      bpmn: await getSubprocessContent(process.bpmn, subprocess.elementId),
    }));

  return Promise.all(collapsedSubprocesses);
}
