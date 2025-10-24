'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getAllSpaceCompetences } from '@/lib/data/competences';
import { getUsersInSpace } from '@/lib/data/db/iam/memberships';
import { getAllCompetencesOfUser as getUserCompetences } from '@/lib/data/db/competence';
import { SCORE_THRESHOLDS } from './match-constants';

/* API Configuration */
const API_URL = 'https://ai.raschke.cc/competence-matcher';
const COMPETENCE_LIST_PATH = '/resource-competence-list/jobs';
const MATCH_PATH = '/matching-task-to-resource/jobs';
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 120; // 4 minutes timeout

/* Feature Flags */
const ENABLE_OVERALL_COMPETENCE = false; // Set to true to include combined competence assessment

/* Debug Logging */
const DEBUG = true; // Set to false to disable logs
function debugLog(context: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`[CompetenceMatching:${context}]`, ...args);
  }
}

/* Types */
export type TaskContextData = {
  processName: string;
  processDescription: string;
  taskName: string;
  taskDescription: string;
};

/**
 * Result type that can be either a success or an informational message
 */
export type MatchingResult =
  | {
      success: true;
      data: {
        matchResult: MatchJobResponse;
        competenceListId: string;
      };
    }
  | {
      success: false;
      type: 'info' | 'warning' | 'error';
      title: string;
      message: string;
    };

type JobStatus = 'pending' | 'preprocessing' | 'running' | 'completed' | 'failed';

type CompetenceListJobResponse = {
  jobId?: string;
  status?: JobStatus;
  competenceListId?: string; // Present when job is completed
};

type MatchJobResponse = {
  jobId?: string;
  status?: JobStatus;
  tasks?: Array<{
    taskId: string;
    taskText: string;
  }>;
  resourceRanking?: Array<{
    resourceId: string;
    taskMatchings: Array<{
      taskId: string;
      competenceMatchings: Array<{
        competenceId: string;
        matchings: Array<{
          text: string;
          type: string;
          matchProbability: number;
          alignment: string;
          reason: string;
        }>;
        avgMatchProbability: number;
        avgBestFitMatchProbability: number;
      }>;
      maxMatchProbability: number;
      maxBestFitMatchProbability: number;
    }>;
    avgTaskMatchProbability: number;
    avgBestFitTaskMatchProbability: number;
    contradicting: boolean;
  }>;
};

type APICompetence = {
  competenceId: string;
  name: string;
  description: string;
  externalQualificationNeeded: boolean;
  renewTime: number;
  proficiencyLevel: string;
  qualificationDates: string[];
  lastUsages: string[];
};

type APIResource = {
  resourceId: string;
  competencies: APICompetence[];
};

type APITask = {
  taskId: string;
  name: string;
  description: string;
  executionInstructions: string;
  requiredCompetencies: string[];
};

// The competence list endpoint expects just an array of resources
type CompetenceListBody = APIResource[];

type MatchBody = {
  competenceListId: string;
  tasks: APITask[];
};

/* Transformed Types for UI */
export type CompetenceMatch = {
  competenceId: string;
  competenceName: string;
  competenceDescription: string;
  score: number; // avgMatchProbability as percentage
  bestFitScore: number; // avgBestFitMatchProbability as percentage
  reasons: string[];
  alignment?: 'aligning' | 'neutral' | 'contradicting'; // Worst alignment from matchings
};

export type RankedUser = {
  userId: string;
  userName: string;
  userEmail: string | null;
  score: number; // avgTaskMatchProbability as percentage
  bestFitScore: number; // avgBestFitTaskMatchProbability as percentage
  competenceMatches: CompetenceMatch[];
  contradicting: boolean; // Flag if any competence contradicts the task
};

/* Helper Functions */

/**
 * Formats task context data into the API task format
 * Note: Not exported because 'use server' files require all exports to be async
 */
function formatUserTaskForAPI(taskContext: TaskContextData, taskId: string = '1'): APITask {
  const { processName, processDescription, taskName, taskDescription } = taskContext;

  // Combine all context into a comprehensive description
  const fullDescription = `
Process: ${processName}
${processDescription ? `Process Description: ${processDescription}\n` : ''}
Task: ${taskName}
${taskDescription ? `Task Description: ${taskDescription}` : ''}
  `.trim();

  return {
    taskId,
    name: taskName,
    description: fullDescription,
    executionInstructions: taskDescription || '',
    requiredCompetencies: [],
  };
}

/**
 * Fetches all users with competences in the current space and formats them for the API
 */
export async function fetchUsersWithCompetences(environmentId: string): Promise<APIResource[]> {
  const { activeEnvironment } = await getCurrentEnvironment(environmentId);
  const { spaceId } = activeEnvironment;

  // Get all users in the space
  const users = await getUsersInSpace(spaceId);

  // Get all space competences with user claims
  const spaceCompetences = await getAllSpaceCompetences(environmentId);

  // Build a map of userId -> competences
  const userCompetenceMap = new Map<string, APICompetence[]>();

  // First, add space competences (claimed by users)
  for (const competence of spaceCompetences) {
    // Process each user who claimed this competence
    for (const claim of competence.claimedBy) {
      if (!userCompetenceMap.has(claim.userId)) {
        userCompetenceMap.set(claim.userId, []);
      }

      const renewTimeDays = competence.renewalTimeInterval ?? 365; // Default to 365 days if not specified

      // Combine name and description for better matching
      const combinedDescription = competence.description
        ? `${competence.name}\n${competence.description}`
        : competence.name;

      const apiCompetence: APICompetence = {
        competenceId: competence.id,
        name: competence.name,
        description: combinedDescription,
        externalQualificationNeeded: competence.externalQualificationNeeded,
        renewTime: renewTimeDays,
        proficiencyLevel: claim.proficiency || 'Not specified',
        qualificationDates: claim.qualificationDate ? [claim.qualificationDate.toISOString()] : [],
        lastUsages: claim.lastUsage ? [claim.lastUsage.toISOString()] : [],
      };

      userCompetenceMap.get(claim.userId)!.push(apiCompetence);
    }
  }

  // Second, add user-specific competences for all users
  for (const user of users) {
    const userCompetences = await getUserCompetences(user.id);

    if (userCompetences.length > 0) {
      if (!userCompetenceMap.has(user.id)) {
        userCompetenceMap.set(user.id, []);
      }

      // Get existing competence IDs for this user to avoid duplicates
      const existingCompetenceIds = new Set(
        userCompetenceMap.get(user.id)!.map((c) => c.competenceId),
      );

      for (const userComp of userCompetences) {
        // Skip if this competence is already in the list (e.g., from space competences)
        if (existingCompetenceIds.has(userComp.competence.id)) {
          continue;
        }

        const renewTimeDays = userComp.competence.renewalTimeInterval ?? 365;

        // Combine name and description for better matching
        const combinedDescription = userComp.competence.description
          ? `${userComp.competence.name}\n${userComp.competence.description}`
          : userComp.competence.name;

        const apiCompetence: APICompetence = {
          competenceId: userComp.competence.id,
          name: userComp.competence.name,
          description: combinedDescription,
          externalQualificationNeeded: userComp.competence.externalQualificationNeeded,
          renewTime: renewTimeDays,
          proficiencyLevel: userComp.proficiency || 'Not specified',
          qualificationDates: userComp.qualificationDate
            ? [userComp.qualificationDate.toISOString()]
            : [],
          lastUsages: userComp.lastUsage ? [userComp.lastUsage.toISOString()] : [],
        };

        userCompetenceMap.get(user.id)!.push(apiCompetence);
      }
    }
  }

  // Convert map to array format and optionally add overall competence for each user
  const resources: APIResource[] = Array.from(userCompetenceMap.entries()).map(
    ([userId, competencies]) => {
      // Create an "overall" competence by concatenating all competence descriptions
      // Only if feature flag is enabled
      if (ENABLE_OVERALL_COMPETENCE && competencies.length > 0) {
        const overallDescription = competencies
          .map(
            (c) => `${c.name}:\n${c.description.split('\n').slice(1).join('\n') || c.description}`,
          )
          .join('\n\n---\n\n');

        const overallCompetence: APICompetence = {
          competenceId: `__OVERALL__${userId}`, // Special ID to identify overall competence
          name: 'Overall Competence Profile',
          description: `Combined assessment of all competences:\n\n${overallDescription}`,
          externalQualificationNeeded: false,
          renewTime: 365,
          proficiencyLevel: 'Combined',
          qualificationDates: [],
          lastUsages: [],
        };

        return {
          resourceId: userId,
          competencies: [...competencies, overallCompetence],
        };
      }

      return {
        resourceId: userId,
        competencies,
      };
    },
  );

  return resources;
}

/**
 * Gets all competences (both space and user) for building a lookup map
 * Returns a Map of competenceId -> { name, description }
 */
export async function getAllCompetencesMap(
  environmentId: string,
): Promise<Map<string, { name: string; description: string }>> {
  const { activeEnvironment } = await getCurrentEnvironment(environmentId);
  const { spaceId } = activeEnvironment;

  const competenceMap = new Map<string, { name: string; description: string }>();

  // Add space competences
  const spaceCompetences = await getAllSpaceCompetences(environmentId);
  for (const comp of spaceCompetences) {
    competenceMap.set(comp.id, {
      name: comp.name,
      description: comp.description || '',
    });
  }

  // Add user competences from all users in the space
  const users = await getUsersInSpace(spaceId);
  for (const user of users) {
    const userCompetences = await getUserCompetences(user.id);
    for (const userComp of userCompetences) {
      // Only add if not already present (space competences take precedence)
      if (!competenceMap.has(userComp.competence.id)) {
        competenceMap.set(userComp.competence.id, {
          name: userComp.competence.name,
          description: userComp.competence.description || '',
        });
      }
    }
  }

  return competenceMap;
}

/**
 * Gets the appropriate x-proceed-db-id header value
 */
async function getDbIdHeader(environmentId: string): Promise<string> {
  const { activeEnvironment } = await getCurrentEnvironment(environmentId);

  // Use spaceId for organisations, userId for personal spaces
  if (activeEnvironment.isOrganization) {
    return activeEnvironment.spaceId;
  } else {
    const { userId } = await getCurrentUser();
    return userId;
  }
}

/**
 * Creates headers for API requests
 */
async function createHeaders(environmentId: string): Promise<HeadersInit> {
  const dbId = await getDbIdHeader(environmentId);

  return {
    'Content-Type': 'application/json',
    'x-proceed-db-id': dbId,
  };
}

/**
 * Polls a job until it completes or fails
 * Supports optional progress callback for status updates
 */
async function pollJobStatus<T extends CompetenceListJobResponse | MatchJobResponse>(
  url: string,
  headers: HeadersInit,
  jobType: 'competence list' | 'matching',
  maxAttempts: number = MAX_POLL_ATTEMPTS,
  onProgress?: (status: JobStatus | undefined, attempt: number) => void,
): Promise<{ success: true; data: T } | { success: false; reason: string }> {
  debugLog('pollJobStatus', `Starting poll for ${jobType} at ${url}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      debugLog('pollJobStatus', `Attempt ${attempt + 1}/${maxAttempts} for ${jobType}`);

      const response = await fetch(url, { headers });

      debugLog('pollJobStatus', `Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        debugLog('pollJobStatus', `Network error: ${response.status}`);
        const errorText = await response.text().catch(() => 'No error text');
        debugLog('pollJobStatus', `Error response body:`, errorText);
        return {
          success: false,
          reason: 'network',
        };
      }

      const data: T = await response.json();
      debugLog('pollJobStatus', `Job status: ${data.status}`, data);

      // Notify progress callback if provided
      if (onProgress) {
        onProgress(data.status, attempt + 1);
      }

      // Check for completion based on job type
      if (jobType === 'competence list') {
        const competenceData = data as CompetenceListJobResponse;
        // Job is complete if competenceListId is present
        if (competenceData.competenceListId) {
          debugLog('pollJobStatus', `${jobType} completed successfully!`, data);
          return { success: true, data };
        }
        // Check for explicit failure
        if (competenceData.status === 'failed') {
          debugLog('pollJobStatus', `${jobType} failed`, data);
          return {
            success: false,
            reason: 'server-failure',
          };
        }
      } else if (jobType === 'matching') {
        const matchData = data as MatchJobResponse;
        // Job is complete if resourceRanking is present
        if (matchData.resourceRanking) {
          debugLog('pollJobStatus', `${jobType} completed successfully!`, data);
          return { success: true, data };
        }
        // Check for explicit failure
        if (matchData.status === 'failed') {
          debugLog('pollJobStatus', `${jobType} failed`, data);
          return {
            success: false,
            reason: 'server-failure',
          };
        }
      }

      // Wait before next poll (still processing)
      debugLog('pollJobStatus', `Waiting ${POLL_INTERVAL_MS}ms before next poll...`);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (error) {
      debugLog('pollJobStatus', `Exception during poll:`, error);
      return {
        success: false,
        reason: 'network',
      };
    }
  }

  debugLog('pollJobStatus', `Timeout after ${maxAttempts} attempts`);
  return {
    success: false,
    reason: 'timeout',
  };
}

async function createCompetenceListJob(
  environmentId: string,
  resources: APIResource[],
): Promise<{ success: true; competenceListId: string } | { success: false; reason: string }> {
  try {
    debugLog('createCompetenceListJob', 'Starting competence list job creation');

    const headers = await createHeaders(environmentId);
    debugLog('createCompetenceListJob', 'Headers created:', headers);

    // The API expects just an array of resources
    const body: CompetenceListBody = resources;
    debugLog('createCompetenceListJob', `Sending ${resources.length} resources`);
    debugLog('createCompetenceListJob', 'Body:', body);

    // POST to create job
    const createResponse = await fetch(`${API_URL}${COMPETENCE_LIST_PATH}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    debugLog(
      'createCompetenceListJob',
      `POST response: ${createResponse.status} ${createResponse.statusText}`,
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text().catch(() => 'No error text');
      debugLog('createCompetenceListJob', 'POST failed with body:', errorText);
      return { success: false, reason: 'network' };
    }

    const createData: CompetenceListJobResponse = await createResponse.json();
    debugLog('createCompetenceListJob', 'Job created:', createData);

    // Poll until complete
    const result = await pollJobStatus<CompetenceListJobResponse>(
      `${API_URL}${COMPETENCE_LIST_PATH}/${createData.jobId}`,
      headers,
      'competence list',
      MAX_POLL_ATTEMPTS,
      (status, attempt) => {
        debugLog('createCompetenceListJob', `Status update: ${status} (attempt ${attempt})`);
      },
    );

    if (!result.success) {
      debugLog('createCompetenceListJob', 'Polling failed:', result.reason);
      return { success: false, reason: result.reason };
    }

    if (!result.data.competenceListId) {
      debugLog('createCompetenceListJob', 'No competenceListId in response:', result.data);
      return { success: false, reason: 'server-failure' };
    }

    debugLog('createCompetenceListJob', 'Success! competenceListId:', result.data.competenceListId);
    return { success: true, competenceListId: result.data.competenceListId };
  } catch (error) {
    debugLog('createCompetenceListJob', 'Exception caught:', error);
    return { success: false, reason: 'network' };
  }
}

async function createMatchingJob(
  environmentId: string,
  competenceListId: string,
  task: APITask,
): Promise<{ success: true; result: MatchJobResponse } | { success: false; reason: string }> {
  try {
    debugLog('createMatchingJob', 'Starting matching job with competenceListId:', competenceListId);

    const headers = await createHeaders(environmentId);
    debugLog('createMatchingJob', 'Headers created:', headers);

    const body: MatchBody = {
      competenceListId,
      tasks: [task],
    };
    debugLog('createMatchingJob', 'Request body:', body);

    // POST to create matching job
    const createResponse = await fetch(`${API_URL}${MATCH_PATH}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    debugLog(
      'createMatchingJob',
      `POST response: ${createResponse.status} ${createResponse.statusText}`,
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text().catch(() => 'No error text');
      debugLog('createMatchingJob', 'POST failed with body:', errorText);
      return { success: false, reason: 'network' };
    }

    const createData: MatchJobResponse = await createResponse.json();
    debugLog('createMatchingJob', 'Job created:', createData);

    // Poll until complete
    const result = await pollJobStatus<MatchJobResponse>(
      `${API_URL}${MATCH_PATH}/${createData.jobId}`,
      headers,
      'matching',
      MAX_POLL_ATTEMPTS,
      (status, attempt) => {
        debugLog('createMatchingJob', `Status update: ${status} (attempt ${attempt})`);
      },
    );

    if (!result.success) {
      debugLog('createMatchingJob', 'Polling failed:', result.reason);
      return { success: false, reason: result.reason };
    }

    debugLog('createMatchingJob', 'Success! Match result:', result.data);
    return { success: true, result: result.data };
  } catch (error) {
    debugLog('createMatchingJob', 'Exception caught:', error);
    return { success: false, reason: 'network' };
  }
}

/**
 * Step 1: Create or retrieve competence list
 * Returns the competence list ID for use in step 2
 */
export async function createOrGetCompetenceList(
  environmentId: string,
  taskContext: TaskContextData,
  cachedCompetenceListId?: string,
): Promise<
  | { success: true; competenceListId: string }
  | { success: false; type: 'info' | 'warning' | 'error'; title: string; message: string }
> {
  try {
    debugLog('createOrGetCompetenceList', '=== Step 1: Creating/Getting Competence List ===');

    // Format the task
    const task = formatUserTaskForAPI(taskContext);

    // Get users with competences
    const resources = await fetchUsersWithCompetences(environmentId);
    debugLog('createOrGetCompetenceList', `Fetched ${resources.length} resources`);

    // Check if there are any users with competences
    if (resources.length === 0) {
      return {
        success: false,
        type: 'info',
        title: 'No Competences Available',
        message:
          'There are currently no users in this space who have claimed any competences. To use the matching feature, users need to add competences to their profiles first.',
      };
    }

    // Create or use cached competence list
    if (cachedCompetenceListId) {
      debugLog('createOrGetCompetenceList', 'Using cached competence list ID');
      return { success: true, competenceListId: cachedCompetenceListId };
    }

    debugLog('createOrGetCompetenceList', 'Creating new competence list job');
    const listResult = await createCompetenceListJob(environmentId, resources);

    if (!listResult.success) {
      debugLog('createOrGetCompetenceList', 'Failed:', listResult.reason);
      const error = getUserFriendlyError(listResult.reason, 'competence list');
      if (!error.success) {
        return {
          success: false,
          type: error.type,
          title: error.title,
          message: error.message,
        };
      }
      // Should never reach here due to type guard, but satisfy TypeScript
      throw new Error('Unexpected error state');
    }

    debugLog('createOrGetCompetenceList', 'Success! ID:', listResult.competenceListId);
    return { success: true, competenceListId: listResult.competenceListId };
  } catch (error) {
    debugLog('createOrGetCompetenceList', 'Exception:', error);
    return {
      success: false,
      type: 'error',
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while creating the competence list.',
    };
  }
}

/**
 * Step 2: Run matching with the competence list
 */
export async function runMatching(
  environmentId: string,
  taskContext: TaskContextData,
  competenceListId: string,
): Promise<MatchingResult> {
  try {
    debugLog('runMatching', '=== Step 2: Running Matching ===');
    debugLog('runMatching', 'Competence list ID:', competenceListId);

    const task = formatUserTaskForAPI(taskContext);

    const matchJobResult = await createMatchingJob(environmentId, competenceListId, task);

    if (!matchJobResult.success) {
      debugLog('runMatching', 'Failed:', matchJobResult.reason);
      return getUserFriendlyError(matchJobResult.reason, 'matching');
    }

    debugLog('runMatching', 'Success!');
    return {
      success: true,
      data: {
        matchResult: matchJobResult.result,
        competenceListId,
      },
    };
  } catch (error) {
    debugLog('runMatching', 'Exception:', error);
    return {
      success: false,
      type: 'error',
      title: 'Unexpected Error',
      message: 'An unexpected error occurred during matching.',
    };
  }
}

/**
 * Step 1: Create competence list job
 * Exported separately to allow UI progress updates between steps
 */
export async function createCompetenceList(
  environmentId: string,
): Promise<{ success: true; competenceListId: string } | { success: false; reason: string }> {
  try {
    const resources = await fetchUsersWithCompetences(environmentId);

    if (resources.length === 0) {
      return { success: false, reason: 'no-resources' };
    }

    return await createCompetenceListJob(environmentId, resources);
  } catch (error) {
    console.error('[createCompetenceList] Error:', error);
    return { success: false, reason: 'network' };
  }
}

/**
 * Step 2: Create matching job using a competence list
 * Exported separately to allow UI progress updates between steps
 */
export async function createMatching(
  environmentId: string,
  taskContext: TaskContextData,
  competenceListId: string,
): Promise<{ success: true; result: MatchJobResponse } | { success: false; reason: string }> {
  try {
    const task = formatUserTaskForAPI(taskContext);
    return await createMatchingJob(environmentId, competenceListId, task);
  } catch (error) {
    console.error('[createMatching] Error:', error);
    return { success: false, reason: 'network' };
  }
}

/**
 * Main function to get competence matches for a user task
 * Returns a result that can be either successful with data or a user-friendly message
 *
 * @param environmentId - The environment/space ID
 * @param taskContext - Plain object with task context (processName, taskName, etc.)
 * @param cachedCompetenceListId - Optional cached competence list ID to skip recreation
 */
export async function getCompetenceMatches(
  environmentId: string,
  taskContext: TaskContextData,
  cachedCompetenceListId?: string,
): Promise<MatchingResult> {
  try {
    debugLog('getCompetenceMatches', '=== Starting competence matching ===');
    debugLog('getCompetenceMatches', 'Environment ID:', environmentId);
    debugLog('getCompetenceMatches', 'Task context:', taskContext);
    debugLog('getCompetenceMatches', 'Cached competence list ID:', cachedCompetenceListId);

    // Format the task
    const task = formatUserTaskForAPI(taskContext);
    debugLog('getCompetenceMatches', 'Formatted task for API:', task);

    // Get users with competences
    const resources = await fetchUsersWithCompetences(environmentId);
    debugLog(
      'getCompetenceMatches',
      `Fetched ${resources.length} resources (users with competences)`,
    );
    debugLog('getCompetenceMatches', 'Resources:', resources);

    // Check if there are any users with competences
    if (resources.length === 0) {
      debugLog('getCompetenceMatches', 'No resources found - returning info message');
      return {
        success: false,
        type: 'info',
        title: 'No Competences Available',
        message:
          'There are currently no users in this space who have claimed any competences. To use the matching feature, users need to add competences to their profiles first.',
      };
    }

    // Create or use cached competence list
    let competenceListId: string;

    if (cachedCompetenceListId) {
      debugLog('getCompetenceMatches', 'Using cached competence list ID');
      competenceListId = cachedCompetenceListId;
    } else {
      debugLog('getCompetenceMatches', 'No cache - creating new competence list job');
      const listResult = await createCompetenceListJob(environmentId, resources);

      if (!listResult.success) {
        debugLog('getCompetenceMatches', 'Competence list job failed:', listResult.reason);
        return getUserFriendlyError(listResult.reason, 'competence list');
      }

      competenceListId = listResult.competenceListId;
      debugLog('getCompetenceMatches', 'Competence list created with ID:', competenceListId);
    }

    // Create matching job
    debugLog('getCompetenceMatches', 'Creating matching job...');
    const matchJobResult = await createMatchingJob(environmentId, competenceListId, task);

    if (!matchJobResult.success) {
      debugLog('getCompetenceMatches', 'Matching job failed:', matchJobResult.reason);
      return getUserFriendlyError(matchJobResult.reason, 'matching');
    }

    debugLog('getCompetenceMatches', '=== Matching completed successfully ===');
    debugLog('getCompetenceMatches', 'Final result:', matchJobResult.result);

    return {
      success: true,
      data: {
        matchResult: matchJobResult.result,
        competenceListId,
      },
    };
  } catch (error) {
    debugLog('getCompetenceMatches', 'Exception in getCompetenceMatches:', error);
    return {
      success: false,
      type: 'error',
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while trying to find matches. Please try again later.',
    };
  }
}

function getUserFriendlyError(
  reason: string,
  stage: 'competence list' | 'matching',
): MatchingResult {
  switch (reason) {
    case 'network':
      return {
        success: false,
        type: 'warning',
        title: 'Connection Issue',
        message:
          'Unable to connect to the matching service. Please check your internet connection and try again.',
      };

    case 'timeout':
      return {
        success: false,
        type: 'warning',
        title: 'Request Timed Out',
        message:
          'The matching service is taking longer than expected. This might be due to high server load. Please try again in a few moments.',
      };

    case 'server-failure':
      return {
        success: false,
        type: 'error',
        title: 'Service Error',
        message:
          'The matching service encountered an error while processing your request. Please try again later.',
      };

    default:
      return {
        success: false,
        type: 'error',
        title: 'Unknown Error',
        message: 'An unknown error occurred. Please try again later.',
      };
  }
}

/**
 * Transforms match results and enriches with user information
 */
export async function transformMatchResults(
  matchResult: MatchJobResponse,
  environmentId: string,
  competences: Map<string, { name: string; description: string }>,
): Promise<RankedUser[]> {
  if (!matchResult.resourceRanking || matchResult.resourceRanking.length === 0) {
    return [];
  }

  // Get user information
  const { activeEnvironment } = await getCurrentEnvironment(environmentId);
  const users = await getUsersInSpace(activeEnvironment.spaceId);

  // Create user lookup map
  const userMap = new Map(
    users.map((user) => [
      user.id,
      {
        userName: user.isGuest
          ? 'Guest User'
          : `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.id,
        userEmail: user.isGuest ? null : user.email || null,
      },
    ]),
  );

  // Transform and sort by score
  const rankedUsers: RankedUser[] = matchResult.resourceRanking
    .map((resource) => {
      // Debug: Log the resource object to see actual structure
      // console.log('[transformMatchResults] Processing resource:', {
      //   resourceId: resource.resourceId,
      //   avgTaskMatchProbability: resource.avgTaskMatchProbability,
      //   avgBestFitTaskMatchProbability: resource.avgBestFitTaskMatchProbability,
      //   contradicting: resource.contradicting,
      //   taskMatchings: resource.taskMatchings,
      // });

      const userInfo = userMap.get(resource.resourceId) || {
        userName: resource.resourceId,
        userEmail: null,
      };

      // Get competence matches from first task (we only match one task)
      const taskMatching = resource.taskMatchings[0];
      const competenceMatches: CompetenceMatch[] = taskMatching
        ? taskMatching.competenceMatchings.map((cm) => {
            // Check if this is the overall competence
            const isOverall = cm.competenceId.startsWith('__OVERALL__');

            const competenceInfo = competences.get(cm.competenceId);
            const competenceName = isOverall
              ? 'Overall Competence Profile'
              : competenceInfo?.name || cm.competenceId;
            const competenceDescription = isOverall
              ? 'Combined assessment of all competences together'
              : competenceInfo?.description || '';
            const reasons = cm.matchings.map((m) => m.reason).filter(Boolean);

            // Find worst alignment (contradicting > neutral > aligning)
            const alignments = cm.matchings.map((m) => m.alignment);
            let worstAlignment: 'aligning' | 'neutral' | 'contradicting' | undefined;
            if (alignments.includes('contradicting')) {
              worstAlignment = 'contradicting';
            } else if (alignments.includes('neutral')) {
              worstAlignment = 'neutral';
            } else if (alignments.includes('aligning')) {
              worstAlignment = 'aligning';
            }

            return {
              competenceId: cm.competenceId,
              competenceName,
              competenceDescription,
              score: Math.round(cm.avgMatchProbability * 100),
              bestFitScore: Math.round(cm.avgBestFitMatchProbability * 100),
              reasons,
              alignment: worstAlignment,
            };
          })
        : [];

      const userScore = Math.round(resource.avgTaskMatchProbability * 100);
      const userBestFitScore = Math.round(resource.avgBestFitTaskMatchProbability * 100);

      // console.log('[transformMatchResults] Calculated scores:', {
      //   resourceId: resource.resourceId,
      //   rawAvgTaskMatchProbability: resource.avgTaskMatchProbability,
      //   rawAvgBestFitTaskMatchProbability: resource.avgBestFitTaskMatchProbability,
      //   score: userScore,
      //   bestFitScore: userBestFitScore,
      // });

      return {
        userId: resource.resourceId,
        userName: userInfo.userName,
        userEmail: userInfo.userEmail,
        score: userScore,
        bestFitScore: userBestFitScore,
        competenceMatches: competenceMatches.sort((a, b) => b.score - a.score),
        contradicting: resource.contradicting,
      };
    })
    .sort((a, b) => b.score - a.score); // Sort by score descending

  return rankedUsers;
}
