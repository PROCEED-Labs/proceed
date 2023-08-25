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
   * Checks if a specific version of a process exists
   *
   *
   * @param {String} definitionId name of the file the definition of the process is stored in
   * @param {Number} version the specific version of the process to check
   * @returns {Boolean} - indicates if the version exists or not
   */
  async isProcessVersionExisting(definitionId, version) {
    const processInfo = JSON.parse(await data.read(`processes.json/${definitionId}`));
    return !!(processInfo && processInfo[version]);
  },

  /**
   * Returns true if the process valid is valid and complete
   * e.g. there are definitions for all imported processes and html for all user tasks
   *
   * @param {String} definitionId the id of the process definitions to check
   * @param {Number} version the version to validate
   * @param {String} [expectedProcessId] the processId that is expected for this specific process (checked when used as an import)
   * @returns {Boolean} - indicates if the process is valid and can be executed
   */
  async isProcessVersionValid(definitionId, version, expectedProcessId) {
    const processInfo = JSON.parse(await data.read(`processes.json/${definitionId}`));

    if (!processInfo || !processInfo[version]) {
      return false;
    }

    const versionInfo = processInfo[version];

    if (expectedProcessId && expectedProcessId !== versionInfo.processId) {
      return false;
    }

    //check if the version was already validated, yes? => just return true
    if (versionInfo.validated) {
      return true;
    }

    // get the requirements for the version
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
      version: importVersion,
      processId: importProcessId,
    } of requirements.imports) {
      if (!(await this.isProcessVersionValid(importDefinitionId, importVersion, importProcessId)))
        return false;
    }

    // set flag in the process file that the validity check was done and succesful
    versionInfo.validated = true;
    processInfo[version] = versionInfo;
    await data.write(`processes.json/${definitionId}`, JSON.stringify(processInfo));

    return true;
  },

  /**
   * Saves the definition of a process version under the definitionid and version id in the given bpmn
   *
   * @param {String} bpmn the process definition
   * @throws Will throw if the bpmn contains either no definitionId or no version information
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

    if (!versionInfo || !versionInfo.version) {
      throw new Error('The bpmn does not contain valid version information!');
    }

    const { version } = versionInfo;

    // save version info into the processes list
    let processInfo = JSON.parse(await data.read(`processes.json/${bpmnDefinitionId}`));
    // make sure to keep information about other existing versions
    if (!processInfo) {
      processInfo = {};
    }
    // save version specific information (needs gives information about the required process fragments)
    processInfo[version] = {
      deploymentDate: Date.now(),
      needs: await getRequiredProcessFragments(bpmnObj),
      validated: false,
      processId: processIds[0],
    };
    // write process information back into the file
    await data.write(`processes.json/${bpmnDefinitionId}`, JSON.stringify(processInfo));

    // save the bpmn
    await data.writeProcessVersionBpmn(bpmnDefinitionId, version, bpmn);

    await publishDeployedVersionInfo(bpmnDefinitionId, version, bpmn);

    return {
      definitionId: bpmnDefinitionId,
      version,
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
   * Returns the bpmn of a specific process version
   *
   * @param {string} definitionId
   * @param {number} version the version we want to get the bpmn of
   * @returns {string} the bpmn of the specific process version
   */
  async getProcessVersion(definitionId, version) {
    if (!(await this.isProcessVersionExisting(definitionId, version))) {
      throw new Error(
        `Process version (${version}) for the process with the given definitionId (${definitionId}) does not exist!`,
      );
    }

    return await data.readProcessVersionBpmn(definitionId, version);
  },

  /**
   * Gets the BPMNs for all version of a process
   *
   * @param {String} definitionId
   * @returns {Array<{ version: string, bpmn: string }>} - the process definitions of every version of the process
   */
  async getProcess(definitionId) {
    const processInfo = await data.read(`processes.json/${definitionId}`);

    if (!processInfo) {
      throw new Error('Process with given definitionId does not exist!');
    }

    const versions = Object.keys(processInfo);

    const versionBpmn = [];

    for (const version of versions) {
      versionBpmn.push({
        version,
        bpmn: await data.readProcessVersionBpmn(definitionId, version),
      });
    }
  },

  /**
   * Information about an imported process
   * @typedef {{ definitionId: string, processId: string, version: number }} ImportInformation
   */

  /**
   * The dependencies of a process version
   * @typedef {{ html: string[], images: string[], imports: ImportInformation[]}} VersionDependencies
   */

  /**
   * Information about a specific version of a process
   * @typedef {{ bpmn: string, deploymentDate: number, definitionName: string, deploymentMethod: string, needs: VersionDependencies, version: number, versionName: string, versionDescription: string }} VersionInfo
   */

  /**
   * Gets the definition and additional information for a specific version of a process
   *
   * @param {String} processDefinitionId
   * @param {Number} version
   * @returns {VersionInfo} the information about the version
   */
  async getProcessVersionInfo(processDefinitionId, version) {
    const processInfo = JSON.parse(await data.read(`processes.json/${processDefinitionId}`));

    if (!processInfo || !processInfo[version]) {
      throw new Error(
        `Process version ${version} does not exist for the process (id: ${processDefinitionId}).`,
      );
    }

    const versionInfo = processInfo[version];

    const deploymentDate = versionInfo.deploymentDate;

    const bpmn = await data.readProcessVersionBpmn(processDefinitionId, version);

    if (!bpmn) {
      throw new Error(
        `There exists no BPMN for the process (id: ${processDefinitionId}) with version ${version}.`,
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
      version: bpmnVersionInfo.version,
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
      async (version) => await this.getProcessVersionInfo(processDefinitionId, version),
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
      // add the dependency to every process version that depends on the user task
      Object.values(processInfo).forEach((version) => {
        if (version.needs.html.includes(fileName)) {
          // if the version has a dependency on the user task
          // add all the image dependencies that are not already referenced in the needs array of the version
          imageDependencies.forEach((imageFileName) => {
            if (!version.needs.images.includes(imageFileName)) {
              version.needs.images.push(imageFileName);
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
