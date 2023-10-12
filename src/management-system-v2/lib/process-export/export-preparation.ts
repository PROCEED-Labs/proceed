import {
  fetchProcessVersionBpmn,
  fetchProcess,
  fetchProcessUserTaskHTML,
} from '../process-queries';

const { getAllUserTaskFileNamesAndUserTaskIdsMapping } = require('@proceed/bpmn-helper');

export type ProcessExportOptions = {
  type: 'bpmn' | 'svg' | 'pdf';
  artefacts: boolean; // if artefacts like images or user task html should be included in the export
};

export type ExportProcessInfo = { definitionId: string; processVersion?: number | string }[];

export type ProcessExportData = {
  definitionId: string;
  definitionName: string;
  versions: {
    [version: string]: {
      bpmn: string;
      artefactsToExport: {
        userTaskFiles: string[];
      };
    };
  };
  userTasks: {
    filename: string;
    html: string;
  }[];
}[];

/**
 * Used to get the bpmn of a specific process version
 *
 * @param definitionId
 * @param processVersion
 */
async function getVersionBpmn(definitionId: string, processVersion?: string | number) {
  const bpmn = await fetchProcessVersionBpmn(definitionId, processVersion);

  if (!bpmn) {
    throw new Error(
      `Failed to get the bpmn for a version (${processVersion}) of a process (definitionId: ${definitionId})`,
    );
  }

  return bpmn;
}

type ExportMap = {
  [definitionId: string]: {
    definitionName: string;
    versions: {
      [version: string]: {
        bpmn: string;
        artefactsToExport: {
          userTaskFiles: string[];
        };
      };
    };
    userTasks: {
      filename: string;
      html: string;
    }[];
  };
};

export async function prepareExport(options: ProcessExportOptions, processes: ExportProcessInfo) {
  if (!processes.length) {
    throw new Error('Tried exporting without specifying the processes to export!');
  }

  const exportData: ExportMap = {};
  // get the bpmn for all processes and their versions to export
  for (const { definitionId, processVersion } of processes) {
    const process = await fetchProcess(definitionId);

    if (!process) {
      throw new Error(
        `Failed to get process info (definitionId: ${definitionId}) during process export`,
      );
    }

    const versionName = processVersion ? `${processVersion}` : 'latest';

    exportData[definitionId] = {
      definitionName: process.definitionName,
      versions: {
        [versionName]: {
          bpmn: await getVersionBpmn(definitionId, processVersion),
          artefactsToExport: {
            userTaskFiles: [],
          },
        },
      },
      userTasks: [],
    };

    if (options.artefacts) {
      const allRequiredUserTaskFiles: Set<string> = new Set();

      // determine the user task files that are need per version and across all versions
      for (const [version, { bpmn }] of Object.entries(exportData[definitionId].versions)) {
        const versionUserTasks = Object.keys(
          await getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn),
        );
        exportData[definitionId].versions[version].artefactsToExport.userTaskFiles =
          versionUserTasks;

        for (const filename of versionUserTasks) allRequiredUserTaskFiles.add(filename);
      }

      // fetch the required user tasks files from the backend
      for (const filename of allRequiredUserTaskFiles) {
        const html = await fetchProcessUserTaskHTML(definitionId, filename);

        if (!html) {
          throw new Error(
            `Failed to get the html for a user task (filename: ${filename}) of a process (definitionId: ${definitionId})`,
          );
        }

        exportData[definitionId].userTasks.push({ filename, html });
      }
    }
  }

  return Object.entries(exportData).map(([definitionId, data]) => ({ ...data, definitionId }));
}
