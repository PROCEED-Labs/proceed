const { data } = require('@proceed/system');
const {
  toBpmnObject,
  getDefinitionsName,
  getDefinitionsId,
  getDefinitionsVersionInformation,
  getDeploymentMethod,
  getProcessIds,
} = require('@proceed/bpmn-helper');

const { getRequiredProcessFragments, getHTMLImagesToKnow } = require('./processFragmentCheck');

const { publishDeployedVersionInfo } = require('./publishDeploymentUtils');

module.exports = {
  /**
   * Checks if the file with process information exists
   *
   * @param {String} definitionId name of the file the definition of the process is stored in
   * @returns {Boolean} - indicates if the file exists or not
   */
  async isProcessExisting(definitionId) {
    const processInfo = await data.read(`processes.json/${definitionId}`);
    return !!processInfo;
  },

  /**
   * Checks if a specific versionId of a process exists
   *
   *
   * @param {String} definitionId name of the file the definition of the process is stored in
   * @param {Number} versionId the specific versionId of the process to check
   * @returns {Boolean} - indicates if the versionId exists or not
   */
  async isProcessVersionExisting(definitionId, versionId) {
    const processInfo = JSON.parse(await data.read(`processes.json/${definitionId}`));
    return !!(processInfo && processInfo[versionId]);
  },

  /**
   * Returns true if the process valid is valid and complete
   * e.g. there are definitions for all imported processes and html for all user tasks
   *
   * @param {String} definitionId the id of the process definitions to check
   * @param {Number} versionId the versionId to validate
   * @param {String} [expectedProcessId] the processId that is expected for this specific process (checked when used as an import)
   * @returns {Boolean} - indicates if the process is valid and can be executed
   */
  async isProcessVersionValid(definitionId, versionId, expectedProcessId) {
    const processInfo = JSON.parse(await data.read(`processes.json/${definitionId}`));

    if (!processInfo || !processInfo[versionId]) {
      return false;
    }

    const versionInfo = processInfo[versionId];

    if (expectedProcessId && expectedProcessId !== versionInfo.processId) {
      return false;
    }

    //check if the versionId was already validated, yes? => just return true
    if (versionInfo.validated) {
      return true;
    }

    // get the requirements for the versionId
    const requirements = versionInfo.needs;

    // get all known user task files for the process
    const knownUserTaskFiles = ((await data.getAllUserTasks(definitionId)) || []).map(
      (fileName) => fileName.split('.html')[0],
    );

    // check if html data is missing
    if (!requirements.html.every((fileName) => knownUserTaskFiles.includes(fileName))) {
      return false;
    }

    // get all images stored for the process
    const knownImages = (await data.readImages(definitionId)) || [];

    // check if image files are missing
    if (!requirements.images.every((fileName) => knownImages.includes(fileName))) {
      return false;
    }

    // recursively check if all imported process versions exist and are valid themselves
    for (const {
      definitionId: importDefinitionId,
      versionId: importVersion,
      processId: importProcessId,
    } of requirements.imports) {
      if (!(await this.isProcessVersionValid(importDefinitionId, importVersion, importProcessId)))
        return false;
    }

    // set flag in the process file that the validity check was done and succesful
    versionInfo.validated = true;
    processInfo[versionId] = versionInfo;
    await data.write(`processes.json/${definitionId}`, JSON.stringify(processInfo));

    return true;
  },

  /**
   * Saves the definition of a process versionId under the definitionid and versionId id in the given bpmn
   *
   * @param {String} bpmn the process definition
   * @throws Will throw if the bpmn contains either no definitionId or no versionId information
   */
  async saveProcessVersionDefinition(bpmn) {
    const bpmnObj = await toBpmnObject(bpmn);
    const processIds = await getProcessIds(bpmnObj);

    const bpmnDefinitionId = await getDefinitionsId(bpmnObj);

    if (!bpmnDefinitionId) {
      throw new Error(`The bpmn does not contain a definitions id!`);
    }

    if (processIds.length > 1) {
      throw new Error('Only process definitions containing one process allowed!');
    }

    const versionInfo = await getDefinitionsVersionInformation(bpmnObj);

    if (!versionInfo || !versionInfo.versionId) {
      throw new Error('The bpmn does not contain valid versionId information!');
    }

    const { versionId } = versionInfo;

    // save versionId info into the processes list
    let processInfo = JSON.parse(await data.read(`processes.json/${bpmnDefinitionId}`));
    // make sure to keep information about other existing versions
    if (!processInfo) {
      processInfo = {};
    }
    // save versionId specific information (needs gives information about the required process fragments)
    processInfo[versionId] = {
      deploymentDate: Date.now(),
      needs: await getRequiredProcessFragments(bpmnObj),
      validated: false,
      processId: processIds[0],
    };
    // write process information back into the file
    await data.write(`processes.json/${bpmnDefinitionId}`, JSON.stringify(processInfo));

    // save the bpmn
    await data.writeProcessVersionBpmn(bpmnDefinitionId, versionId, bpmn);

    await publishDeployedVersionInfo(bpmnDefinitionId, versionId, bpmn);

    return {
      definitionId: bpmnDefinitionId,
      versionId,
      bpmn,
    };
  },

  /**
   * Get the definitionId of all processes on the machine
   *
   * @returns {string[]} - the definition ids of all processes on this machine
   */
  async getAllProcesses() {
    const processes = await data.read('processes.json');

    return processes ? Object.keys(processes) : [];
  },

  /**
   * Returns the bpmn of a specific process versionId
   *
   * @param {string} definitionId
   * @param {number} versionId the versionId we want to get the bpmn of
   * @returns {string} the bpmn of the specific process versionId
   */
  async getProcessVersion(definitionId, versionId) {
    if (!(await this.isProcessVersionExisting(definitionId, versionId))) {
      throw new Error(
        `Process versionId (${versionId}) for the process with the given definitionId (${definitionId}) does not exist!`,
      );
    }

    return await data.readProcessVersionBpmn(definitionId, versionId);
  },

  /**
   * Gets the BPMNs for all versionId of a process
   *
   * @param {String} definitionId
   * @returns {Array<{ versionId: string, bpmn: string }>} - the process definitions of every versionId of the process
   */
  async getProcess(definitionId) {
    const processInfo = await data.read(`processes.json/${definitionId}`);

    if (!processInfo) {
      throw new Error('Process with given definitionId does not exist!');
    }

    const versions = Object.keys(processInfo);

    const versionBpmn = [];

    for (const versionId of versions) {
      versionBpmn.push({
        versionId,
        bpmn: await data.readProcessVersionBpmn(definitionId, versionId),
      });
    }
  },

  /**
   * Information about an imported process
   * @typedef {{ definitionId: string, processId: string, versionId: number }} ImportInformation
   */

  /**
   * The dependencies of a process versionId
   * @typedef {{ html: string[], images: string[], imports: ImportInformation[]}} VersionDependencies
   */

  /**
   * Information about a specific versionId of a process
   * @typedef {{ bpmn: string, deploymentDate: number, definitionName: string, deploymentMethod: string, needs: VersionDependencies, versionId: number, versionName: string, versionDescription: string }} VersionInfo
   */

  /**
   * Gets the definition and additional information for a specific versionId of a process
   *
   * @param {String} processDefinitionId
   * @param {Number} versionId
   * @returns {VersionInfo} the information about the versionId
   */
  async getProcessVersionInfo(processDefinitionId, versionId) {
    const processInfo = JSON.parse(await data.read(`processes.json/${processDefinitionId}`));

    if (!processInfo || !processInfo[versionId]) {
      throw new Error(
        `Process versionId ${versionId} does not exist for the process (id: ${processDefinitionId}).`,
      );
    }

    const versionInfo = processInfo[versionId];

    const deploymentDate = versionInfo.deploymentDate;

    const bpmn = await data.readProcessVersionBpmn(processDefinitionId, versionId);

    if (!bpmn) {
      throw new Error(
        `There exists no BPMN for the process (id: ${processDefinitionId}) with versionId ${versionId}.`,
      );
    }

    const definitionName = await getDefinitionsName(bpmn);
    const deploymentMethod = await getDeploymentMethod(bpmn);
    const bpmnVersionInfo = await getDefinitionsVersionInformation(bpmn);

    return {
      bpmn,
      deploymentDate,
      definitionName,
      deploymentMethod,
      needs: versionInfo.needs,
      versionId: bpmnVersionInfo.versionId,
      versionName: bpmnVersionInfo.name,
      versionDescription: bpmnVersionInfo.description,
      basedOnVersion: bpmnVersionInfo.versionBasedOn,
    };
  },

  /**
   * Information about a process
   * @typedef {{ definitionId: string, versions: VersionInfo[] }} ProcessInfo
   */

  /**
   * Gets the definition and additional information (e.g. date of deployment, id, name, method of deployment) for all versions of a process
   *
   * @param {String} processDefinitionId
   * @returns {ProcessInfo} the information about the process
   */
  async getProcessInfo(processDefinitionId) {
    const processInfo = JSON.parse(await data.read(`processes.json/${processDefinitionId}`));

    if (!processInfo) {
      throw new Error('Process with given definitionId does not exist!');
    }

    const infoPromises = Object.keys(processInfo).map(
      async (versionId) => await this.getProcessVersionInfo(processDefinitionId, versionId),
    );

    const versions = await Promise.all(infoPromises);

    return { definitionId: processDefinitionId, versions };
  },

  /**
   * Removes the information stored about a process
   *
   * @param {String} definitionId
   */
  async deleteProcess(definitionId) {
    await data.delete(`processes.json/${definitionId}`);
    await data.delete(definitionId);
  },

  /**
   * Saves the Image in a specific process stored in the file with the given definitionId
   *
   * @param {String} definitionId
   * @param {String} fileName the fileName as given in the proceed:fileName attribute of the user task
   * @param {String} image
   */
  async saveImage(definitionId, fileName, image) {
    if (!(await this.isProcessExisting(definitionId))) {
      throw new Error('Process with given ID does not exist!');
    }

    if (!image) {
      throw new Error('Image must not be empty!');
    }

    await data.writeImage(definitionId, fileName, image);
  },

  /**
   * Gets image in the process stored under the given definitionId
   *
   * @param {String} definitionId
   * @param {String} fileName the fileName for the image
   */
  async getImage(definitionId, fileName) {
    const image = await data.readImage(definitionId, fileName);

    if (!image) {
      throw new Error("No image found. Either the process or the image doesn't seem to exist.");
    }

    return image;
  },

  /**
   * Gets all image fileNames in the process stored under the given definitionId
   *
   * @param {String} definitionId
   */
  async getImages(definitionId) {
    const images = await data.readImages(definitionId);

    if (!images) {
      throw new Error("No images found. Either the process or the images don't seem to exist.");
    }

    return images;
  },

  /**
   * Saves the HTML for a specific user task in a specific process stored in the file with the given definitionId
   *
   * @param {String} definitionId
   * @param {String} fileName the fileName as given in the proceed:fileName attribute of the user task
   * @param {String} html
   */
  async saveHTMLString(definitionId, fileName, html) {
    const processInfo = JSON.parse(await data.read(`processes.json/${definitionId}`));
    if (!processInfo) {
      throw new Error('Process with given ID does not exist!');
    }

    // check if there are images in the html that are stored seperately
    const imageDependencies = getHTMLImagesToKnow(html);

    if (imageDependencies.length) {
      // add the dependency to every process versionId that depends on the user task
      Object.values(processInfo).forEach((versionId) => {
        if (versionId.needs.html.includes(fileName)) {
          // if the versionId has a dependency on the user task
          // add all the image dependencies that are not already referenced in the needs array of the versionId
          imageDependencies.forEach((imageFileName) => {
            if (!versionId.needs.images.includes(imageFileName)) {
              versionId.needs.images.push(imageFileName);
            }
          });
        }
      });
      await data.write(`processes.json/${definitionId}`, JSON.stringify(processInfo));
    }

    if (!html) {
      throw new Error('HTML content must not be empty!');
    }

    await data.writeUserTaskHTML(definitionId, fileName, html);
  },

  /**
   * Gets the html for a specific user task in the process stored under the given definitionId
   *
   * @param {String} definitionId
   * @param {String} fileName the fileName as given in the proceed:fileName attribute of the user task
   */
  async getHTML(definitionId, fileName) {
    const html = await data.readUserTaskHTML(definitionId, fileName);
    if (!html) {
      throw new Error("No HTML found. Either the process or the html doesn't seem to exist.");
    }

    return html;
  },

  /**
   * Get the fileNames for all the user task data given for the process stored under the given definitionId
   *
   * @param {String} definitionId
   * @returns {Array} - array containing the ids for all user tasks
   */
  async getAllUserTasks(definitionId) {
    if (!(await this.isProcessExisting(definitionId))) {
      throw new Error('Process with given ID does not exist!');
    }

    return ((await data.getAllUserTasks(definitionId)) || []).map((fileName) => {
      const [fileNameWithoutType] = fileName.split('.html');
      return fileNameWithoutType;
    });
  },

  /**
   * Stores the instance information for process instances that ended to make them available even after restarting the engine
   *
   * @param {String} definitionId
   * @param {String} instanceInfo
   */
  async archiveInstance(definitionId, instanceId, instanceInfo) {
    data.write(`${definitionId}/instance.json/${instanceId}`, JSON.stringify(instanceInfo));
  },

  /**
   * Deletes an archived instance from engine
   *
   * @param {String} definitionId
   * @param {String} instanceId
   */
  async deleteArchivedInstance(definitionId, instanceId) {
    data.delete(`${definitionId}/instance.json/${instanceId}`);
  },

  async getArchivedInstances(definitionId) {
    if (!(await this.isProcessExisting(definitionId))) {
      throw new Error('Process with given ID does not exist!');
    }

    const instances = await data.read(`${definitionId}/instance.json`);

    if (!instances) return {};

    Object.keys(instances).forEach((instanceId) => {
      instances[instanceId] = JSON.parse(instances[instanceId]);
    });

    return instances;
  },
};
