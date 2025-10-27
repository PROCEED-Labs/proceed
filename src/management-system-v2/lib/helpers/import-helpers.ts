import {
  getAllBpmnFlowElements,
  getAllUserTaskFileNamesAndUserTaskIdsMapping,
  getElementsByTagName,
  getMetaDataFromElement,
  getScriptTaskFileNameMapping,
  getStartFormFileNameMapping,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import { truthyFilter } from '../typescript-utils';

type ImportedArtefacts = {
  startForm: string[];
  images: string[];
  userTasks: string[];
  scriptTasks: string[];
};

export type ArtefactValidationResult = {
  isValid: boolean;
  missingArtefacts?: {
    startForm?: string[];
    userTasks: string[];
    scriptTasks: string[];
    images: string[];
  };
  error?: string;
};

export async function checkIfAllReferencedArtefactsAreProvided(
  bpmn: string | object,
  importedArtefacts: ImportedArtefacts,
): Promise<ArtefactValidationResult> {
  try {
    // Collect all referenced artifact filenames from the BPMN
    const referencedArtefacts: ImportedArtefacts = {
      startForm: [],
      images: [],
      userTasks: [],
      scriptTasks: [],
    };

    referencedArtefacts.startForm = Object.values(await getStartFormFileNameMapping(bpmn)).filter(
      truthyFilter,
    );

    const versionUserTasks = Object.keys(await getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn));

    referencedArtefacts.userTasks = versionUserTasks;

    const versionScripts = Object.values(await getScriptTaskFileNameMapping(bpmn))
      .map(({ fileName }) => fileName)
      .filter(truthyFilter);

    referencedArtefacts.scriptTasks = versionScripts;

    const flowElements = await getAllBpmnFlowElements(bpmn);

    // add process overview image associated with the root <Process> element as well
    const rootProcessElement = getElementsByTagName(
      typeof bpmn !== 'string' ? bpmn : await toBpmnObject(bpmn),
      'bpmn:Process',
    )[0];

    flowElements.push(rootProcessElement);

    flowElements.forEach((flowElement) => {
      const metaData = getMetaDataFromElement(flowElement);
      if (metaData.overviewImage) {
        referencedArtefacts.images.push(metaData.overviewImage);
      }
    });

    const missingStartForms: string[] = referencedArtefacts.startForm.flatMap((form) => {
      return [`${form}.json`, `${form}.html`].filter(
        (file) => !importedArtefacts.startForm?.includes(file),
      );
    });

    // Check if all referenced artifacts are provided in the imported artifacts
    const missingUserTasks: string[] = referencedArtefacts.userTasks.flatMap((task) => {
      return [`${task}.json`, `${task}.html`].filter(
        (file) => !importedArtefacts.userTasks.includes(file),
      );
    });

    // Check missing script tasks (expecting .js + .xml OR .js + .ts)
    const missingScriptTasks: string[] = referencedArtefacts.scriptTasks.flatMap((task) => {
      const jsFile = `${task}.js`;
      const xmlFile = `${task}.xml`;
      const tsFile = `${task}.ts`;

      const hasJs = importedArtefacts.scriptTasks.includes(jsFile);
      const hasXml = importedArtefacts.scriptTasks.includes(xmlFile);
      const hasTs = importedArtefacts.scriptTasks.includes(tsFile);

      // Determine if a valid pair exists
      const isXmlPairValid = hasJs && hasXml;
      const isTsPairValid = hasJs && hasTs;

      const missingFilesForTask: string[] = [];

      if (!isXmlPairValid && !isTsPairValid) {
        if (!hasJs) {
          missingFilesForTask.push(jsFile);
          // If JS is missing AND neither XML nor TS is present,
          if (!hasXml && !hasTs) {
            missingFilesForTask.push(xmlFile);
            missingFilesForTask.push(tsFile);
          }
        } else {
          // If JS is present, but no valid pair exists,
          // then both XML Or TS must be missing.
          missingFilesForTask.push(xmlFile);
          missingFilesForTask.push(tsFile);
        }
      }

      return missingFilesForTask;
    });

    const missingImages = referencedArtefacts.images.filter(
      (image) => !importedArtefacts.images.includes(image.split('/').pop()!),
    );

    const allArtefactsProvided =
      missingStartForms.length === 0 &&
      missingUserTasks.length === 0 &&
      missingScriptTasks.length === 0 &&
      missingImages.length === 0;

    if (allArtefactsProvided) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        missingArtefacts: {
          startForm: missingStartForms,
          userTasks: missingUserTasks,
          scriptTasks: missingScriptTasks,
          images: missingImages,
        },
        error: 'Missing required artifacts. Please include all referenced artifacts in the import.',
      };
    }
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to validate artifacts: ${err.message || 'Unknown error'}`,
    };
  }
}
