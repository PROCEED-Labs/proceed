import {
  getAllBpmnFlowElements,
  getAllUserTaskFileNamesAndUserTaskIdsMapping,
  getBPMNProcessElement,
  getMetaDataFromElement,
  getScriptTaskFileNameMapping,
} from '@proceed/bpmn-helper';
import { truthyFilter } from '../typescript-utils';

type ImportedArtefacts = {
  images: string[];
  userTasks: string[];
  scriptTasks: string[];
};

export type ArtefactValidationResult = {
  isValid: boolean;
  missingArtefacts?: {
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
      images: [],
      userTasks: [],
      scriptTasks: [],
    };
    const versionUserTasks = Object.keys(await getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn));

    for (const filename of versionUserTasks) referencedArtefacts.userTasks.push(filename);

    const versionScripts = Object.values(await getScriptTaskFileNameMapping(bpmn))
      .map(({ fileName }) => fileName)
      .filter(truthyFilter);

    for (const filename of versionScripts) referencedArtefacts.scriptTasks.push(filename);

    const flowElements = await getAllBpmnFlowElements(bpmn);

    // add process overview image associated with the root <Process> element as well
    const rootProcessElement = await getBPMNProcessElement(bpmn);

    flowElements.push(rootProcessElement);

    flowElements.forEach((flowElement) => {
      const metaData = getMetaDataFromElement(flowElement);
      if (metaData.overviewImage) {
        referencedArtefacts.images.push(metaData.overviewImage);
      }
    });

    // Check if all referenced artifacts are provided in the imported artifacts
    const missingUserTasks: string[] = referencedArtefacts.userTasks.flatMap((task) => {
      return [`${task}.json`, `${task}.html`].filter(
        (file) => !importedArtefacts.userTasks.includes(file),
      );
    });

    const missingScriptTasks: string[] = referencedArtefacts.scriptTasks.flatMap((task) => {
      return [`${task}.js`, `${task}.ts`].every(
        (file) => !importedArtefacts.scriptTasks.includes(file),
      )
        ? [`${task}.js`, `${task}.ts`]
        : [];
    });

    const missingImages = referencedArtefacts.images.filter(
      (image) => !importedArtefacts.images.includes(image),
    );

    const allArtefactsProvided =
      missingUserTasks.length === 0 &&
      missingScriptTasks.length === 0 &&
      missingImages.length === 0;

    if (allArtefactsProvided) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        missingArtefacts: {
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
