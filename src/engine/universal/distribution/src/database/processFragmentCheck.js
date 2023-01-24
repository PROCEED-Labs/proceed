const {
  getDeploymentMethod,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
  getElementMachineMapping,
  getAllBpmnFlowElements,
  getMetaDataFromElement,
} = require('@proceed/bpmn-helper');

const { information } = require('@proceed/machine');

// define fast-xml-parser as a direct dependency of the distribution module
const fastParser = require('fast-xml-parser');

/**
 * Returns information about required process fragments (e.g. html, imported processes)
 *
 * Will throw if a task that should reference some fragment doesn't or when the reference is malformed
 *
 * @param {Object} bpmnObj the bpmn-moddle process representation
 * @returns {{ html: string[], imports: Array<{ definitionId: string, processId: string, version: number }> }} information about required process fragments
 */
async function getRequiredProcessFragments(bpmnObj) {
  const deployMethod = await getDeploymentMethod(bpmnObj);

  let requiredFragmentInfo = { html: [], imports: [], images: [] };

  const flowElements = await getAllBpmnFlowElements(bpmnObj);
  const flowNodes = flowElements.filter((node) => node.$type !== 'bpmn:SequenceFlow');

  // for static deployment filter which information we actually need to know on this machine
  // for dynamic deployment we expect to know all information
  if (deployMethod === 'static') {
    const taskToMachineMapping = await getElementMachineMapping(bpmnObj);

    const { id, ip } = await information.getMachineInformation(['id', 'ip']);

    // create array of tasks that are executed on this machine
    const locallyExecuted = Object.entries(taskToMachineMapping).reduce(
      (prev, [taskId, machineInfo]) => {
        const newArr = [...prev];

        if (machineInfo.machineId) {
          if (machineInfo.machineId === id) {
            newArr.push(flowNodes.find((flowNode) => flowNode.id === taskId));
          }
        } else if (machineInfo.machineAddress) {
          const address = machineInfo.machineAddress.replace(
            /\[?((?:(?:\d|\w)|:|\.)*)\]?:(\d*)/g,
            '$1+$2'
          );
          const [machineIp] = address.split('+');
          if (machineIp === ip) {
            newArr.push(flowNodes.find((flowNode) => flowNode.id === taskId));
          }
        } else {
          throw new Error(
            `No usable information about the machine the task ${taskId} is supposed to be executed on.`
          );
        }

        return newArr;
      },
      []
    );

    requiredFragmentInfo.html = getUserTasksToKnow(locallyExecuted);
    requiredFragmentInfo.imports = getImportsToKnow(bpmnObj, locallyExecuted);
    requiredFragmentInfo.images = getFlowElementImagesToKnow(locallyExecuted);
  } else {
    requiredFragmentInfo.html = getUserTasksToKnow(flowNodes);
    requiredFragmentInfo.imports = getImportsToKnow(bpmnObj, flowNodes);
    requiredFragmentInfo.images = getFlowElementImagesToKnow(flowNodes);
  }

  return requiredFragmentInfo;
}

/**
 * Returns the required html data for all UserTasks inside the given list
 *
 * Will throw if a user task contains no information about its execution
 *
 * @param {Array} flowNodesToKnow the list of flowNodes that might be executed on this machine
 * @returns {string[]} an array containing information about all html files needed for the process
 */
function getUserTasksToKnow(flowNodesToKnow) {
  return flowNodesToKnow.reduce((curr, flowNode) => {
    // user tasks that use 5thIndustry don't need html
    if (flowNode.$type === 'bpmn:UserTask' && flowNode.implementation !== '5thIndustry') {
      const { fileName } = flowNode;

      // we can't execute a process
      if (!fileName) {
        throw new Error(
          `User Task ${fileName.name || flowNode.id} is missing information about the html to use`
        );
      }
      // prevent duplicate references to the same filename
      if (!curr.includes(fileName)) {
        curr.push(fileName);
      }
    }

    return curr;
  }, []);
}

/**
 * Returns the required import information for all callActivities in the given list of flowNodes
 *
 * Will throw if a callActivity is missing import information
 *
 * @param {Object} bpmnObj the bpmn-moddle process representation
 * @param {Array} flowNodesToKnow the list of flowNodes that might be executed on this machine
 * @returns {Array<{ definitionId: string, processId: string, version: number }>} an Array containing the information for all callActivities
 */
function getImportsToKnow(bpmnObj, flowNodesToKnow) {
  return flowNodesToKnow.reduce((curr, flowNode) => {
    if (flowNode.$type === 'bpmn:CallActivity') {
      const importInfo = getTargetDefinitionsAndProcessIdForCallActivityByObject(
        bpmnObj,
        flowNode.id
      );
      curr.push(importInfo);
    }

    return curr;
  }, []);
}

/**
 * Returns the required image data for all elements inside the given list
 *
 * @param {Array} flowNodesToKnow the list of flowNodes that might be executed on this machine
 * @returns {string[]} an array containing information about all image files needed for the process
 */
function getFlowElementImagesToKnow(flowNodesToKnow) {
  const imagesToKnow = flowNodesToKnow.reduce((curr, flowNode) => {
    const metaData = getMetaDataFromElement(flowNode);

    if (metaData.overviewImage) {
      curr.push(metaData.overviewImage.split('/').pop());
    }

    return curr;
  }, []);
  // prevent duplicates
  return [...new Set(imagesToKnow)];
}

/**
 * Returns the required externally stored image data for all image elements inside the given html
 *
 * @param {string} html the html file that might reference externally stored images
 * @returns {string[]} an array containing information about all image files needed for the process
 */
function getHTMLImagesToKnow(html) {
  try {
    let { body } = fastParser.parse(html, {
      attributeNamePrefix: '',
      attrNodeName: '_attributes',
      ignoreNameSpace: true,
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseNodeValue: true,
      arrayMode: true,
    }).html[0];

    /**
     * Get all image elements contained in the html (will recursively search through the html elements)
     *
     * @param {Array} elementArray an array containing the child elements of an html elements (ex. [{ div: [...], img: [...] }, { span: [...], a: [...] }, ...])
     * @returns {Array} an array containing all occurences of (nested) img elements inside the first given element array
     */
    function getNestedImages(elementArray) {
      let imgElements = [];

      elementArray.forEach((el) => {
        Object.keys(el).forEach((entry) => {
          // if the entry is a list of image elements add them to the output
          if (entry === 'img') {
            imgElements = imgElements.concat(el[entry]);
          }
          // if the entry is another html element search for img elements inside it
          if (Array.isArray(el[entry])) {
            imgElements = imgElements.concat(getNestedImages(el[entry]));
          }
        });
      });

      return imgElements;
    }

    // get the referenced images that have to be sent seperately by the user and stored locally on the engine
    const seperatelyStored = getNestedImages(body)
      .map((img) => img._attributes.src)
      .filter((src) => src.startsWith('/resources/process/'))
      .map((src) => src.split('/').pop());
    // remove duplicates
    return [...new Set(seperatelyStored)];
  } catch (err) {
    throw new Error('Unable to parse the image information from the given html');
  }
}

module.exports = {
  getRequiredProcessFragments,
  getHTMLImagesToKnow,
};
