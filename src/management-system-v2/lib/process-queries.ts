import { useQuery } from '@tanstack/react-query';
import { get } from './fetch-data';

export const useProcessBpmn = (definitionId: string, version?: number | string | null) => {
  return useQuery({
    queryKey: ['process', definitionId, 'bpmn', version],
    queryFn: async () => {
      return await fetchProcessVersionBpmn(definitionId, version);
    },
  });
};

/**
 * Fetches the meta data for a specific process from the backend
 *
 * @param definitionId the id of the process to fetch
 * @returns the process meta data
 */
export const fetchProcess = async (definitionId: string) => {
  const { data } = await get('/process/{definitionId}', {
    params: {
      path: {
        definitionId,
      },
    },
  });

  return data;
};

/**
 * Fetches the bpmn for a process which is either the current editable bpmn of the process or the bpmn of a specific version
 *
 * @param definitionId the id of the process to fetch
 * @param version the version for which the bpmn should be fetched (will fetch the editable bpmn if no version is specified)
 * @returns the process (version) bpmn
 */
export const fetchProcessVersionBpmn = async (
  definitionId: string,
  version?: number | string | null,
) => {
  if (version) {
    const { data } = await get('/process/{definitionId}/versions/{version}', {
      params: {
        path: {
          definitionId,
          version: typeof version === 'number' ? version.toString() : version,
        },
      },
      parseAs: 'text',
    });

    return data;
  } else {
    const { data } = await get('/process/{definitionId}', {
      params: {
        path: {
          definitionId,
        },
      },
    });

    return data?.bpmn;
  }
};

/**
 * Fetches the html data for a specific user task file used in some version of a process
 *
 * @param definitionId
 * @param userTaskFileName
 * @returns the html data (if the user task exists)
 */
export const fetchProcessUserTaskHTML = async (definitionId: string, userTaskFileName: string) => {
  const { data } = await get('/process/{definitionId}/user-tasks/{userTaskFileName}', {
    params: {
      path: {
        definitionId,
        userTaskFileName,
      },
    },
    parseAs: 'text',
  });
  return data;
};

/**
 * Fetches the data of a specific image used in some version of a process or by some user-task used by the process
 *
 * @param definitionId
 * @param imageFileName
 * @returns the image data
 */
export const fetchProcessImageData = async (definitionId: string, imageFileName: string) => {
  const { data } = await get('/process/{definitionId}/images/{imageFileName}', {
    params: {
      path: {
        definitionId,
        imageFileName,
      },
    },
    parseAs: 'blob',
  });
  return data as Blob;
};
