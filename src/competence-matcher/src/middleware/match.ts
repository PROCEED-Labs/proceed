import { Request, Response, NextFunction } from 'express';
import { PATHS } from '../server';
import { getDB } from '../utils/db';
import workerManager from '../worker/worker-manager';
import {
  CompetenceInput,
  GroupedMatchResults,
  MatchingJob,
  MatchingTask,
  ResourceListInput,
  ResourceRanking,
  TaskOverview,
} from '../utils/types';
import { handleCreateResourceList } from './resource';
import {
  ValidationError,
  ResourceNotFoundError,
  DatabaseError,
  CompetenceMatcherError,
} from '../utils/errors';
import { logError } from './logging';

export function matchCompetenceList(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).requestId;

  try {
    let listId: string | undefined;
    let list: ResourceListInput | undefined;
    let taskInput: MatchingTask[] | undefined;
    const db = getDB(req.dbName!);

    /**--------------------------------------------
     * Input Validation
     *---------------------------------------------*/
    if ('competenceList' in req.body) {
      // Handle case where competenceList is provided
      const { competenceList, tasks } = req.body as {
        competenceList: ResourceListInput;
        tasks: MatchingTask[];
      };
      list = competenceList;
      taskInput = tasks;
    } else if ('competenceListId' in req.body) {
      // Handle case where competenceListId is provided
      const { competenceListId, tasks } = req.body as {
        competenceListId: string;
        tasks: MatchingTask[];
      };
      listId = competenceListId;
      taskInput = tasks;
    }

    // Validate input presence
    if (!listId && !list) {
      throw new ValidationError(
        'Either competenceListId or competenceList must be provided',
        'competenceListId|competenceList',
        { competenceListId: listId, competenceList: list },
        requestId,
      );
    }

    // Validate tasks input
    if (!taskInput || !Array.isArray(taskInput) || taskInput.length === 0) {
      throw new ValidationError(
        'Must provide a non-empty array of tasks for matching',
        'tasks',
        taskInput,
        requestId,
      );
    }

    // Validate competenceListId format
    if (listId && typeof listId !== 'string') {
      throw new ValidationError(
        'Must be a valid UUID string',
        'competenceListId',
        listId,
        requestId,
      );
    }

    // Validate competenceList structure
    if (
      list &&
      (!Array.isArray(list) ||
        !list.every(
          (entry) => typeof entry === 'object' && !Array.isArray(entry) && entry !== null,
        ))
    ) {
      throw new ValidationError(
        'Must be an array of ResourceInput objects',
        'competenceList',
        list,
        requestId,
      );
    }

    /**--------------------------------------------
     * Case existing competenceListId was passed
     *---------------------------------------------*/
    if (listId) {
      let competenceLists: string[];

      try {
        // Check if the competence list exists
        competenceLists = db.getAvailableResourceLists();
      } catch (error) {
        throw new DatabaseError(
          'getAvailableResourceLists',
          error instanceof Error ? error : new Error(String(error)),
          requestId,
        );
      }

      if (!competenceLists.includes(listId)) {
        throw new ResourceNotFoundError('Competence list', listId, requestId);
      }

      let jobId: string;
      try {
        jobId = db.createJob(listId);
      } catch (error) {
        throw new DatabaseError(
          'createJob',
          error instanceof Error ? error : new Error(String(error)),
          requestId,
        );
      }

      const job: MatchingJob = {
        jobId,
        dbName: req.dbName!,
        listId,
        resourceId: undefined, // For now, we don't support matching against a single resource
        tasks: taskInput.map((task) => {
          return {
            taskId: task.taskId,
            name: task.name,
            description: task.description,
            executionInstructions: task.executionInstructions,
            requiredCompetencies: (task.requiredCompetencies ?? []).map((competence) =>
              typeof competence === 'string'
                ? (competence as string)
                : ({
                    competenceId: competence.competenceId,
                    name: competence.name,
                    description: competence.description,
                    externalQualificationNeeded: competence.externalQualificationNeeded,
                    renewTime: competence.renewTime,
                    proficiencyLevel: competence.proficiencyLevel,
                    qualificationDates: competence.qualificationDates,
                    lastUsages: competence.lastUsages,
                  } as CompetenceInput),
            ) as string[] | CompetenceInput[],
          };
        }),
      };

      try {
        workerManager.enqueue(job, 'matcher');
      } catch (error) {
        throw new CompetenceMatcherError(
          `Failed to enqueue matching job: ${error instanceof Error ? error.message : String(error)}`,
          'job_enqueue',
          500,
          requestId,
          { jobId, listId },
        );
      }

      // Respond with jobId in location header
      res
        .setHeader('Location', `${PATHS.match}/jobs/${jobId}`)
        // Accepted response
        .status(202)
        .json({ jobId, status: 'pending' });
      return;
    }

    /**--------------------------------------------
     * Case new Competence-List was passed
     *---------------------------------------------*/
    let matchingJobId: string;
    try {
      // Create a new competence list
      matchingJobId = db.createJob();
    } catch (error) {
      throw new DatabaseError(
        'createJob',
        error instanceof Error ? error : new Error(String(error)),
        requestId,
      );
    }

    if (list) {
      try {
        db.updateJobStatus(matchingJobId, 'preprocessing');
      } catch (error) {
        throw new DatabaseError(
          'updateJobStatus',
          error instanceof Error ? error : new Error(String(error)),
          requestId,
        );
      }

      handleCreateResourceList(req.dbName!, list, (job, code, jobId) => {
        try {
          // Embedding fails -> no matching possible (i.e. fail the matching job)
          if (code !== 0) {
            try {
              db.updateJobStatus(matchingJobId, 'failed');
            } catch (error) {
              logError(
                new DatabaseError(
                  'updateJobStatus',
                  error instanceof Error ? error : new Error(String(error)),
                  requestId,
                ),
                'inline_job_failure_update',
                requestId,
              );
            }
            return;
          }

          try {
            db.updateJobStatus(matchingJobId, 'pending');
          } catch (error) {
            logError(
              new DatabaseError(
                'updateJobStatus',
                error instanceof Error ? error : new Error(String(error)),
                requestId,
              ),
              'inline_job_pending_update',
              requestId,
            );
            return;
          }

          // Retrieve the competence list ID
          const { referenceId: listId } = db.getJob(jobId);

          // Create the matching job
          const matchingJob: MatchingJob = {
            jobId: matchingJobId,
            dbName: req.dbName!,
            listId,
            resourceId: undefined, // For now, we don't support matching against a single resource
            tasks: taskInput!.map((task) => {
              return {
                taskId: task.taskId,
                name: task.name,
                description: task.description,
                executionInstructions: task.executionInstructions,
                requiredCompetencies: (task.requiredCompetencies ?? []).map((competence) =>
                  typeof competence === 'string'
                    ? (competence as string)
                    : ({
                        competenceId: competence.competenceId,
                        name: competence.name,
                        description: competence.description,
                        externalQualificationNeeded: competence.externalQualificationNeeded,
                        renewTime: competence.renewTime,
                        proficiencyLevel: competence.proficiencyLevel,
                        qualificationDates: competence.qualificationDates,
                        lastUsages: competence.lastUsages,
                      } as CompetenceInput),
                ) as string[] | CompetenceInput[],
              };
            }),
          };

          // Enqueue the matching job
          workerManager.enqueue(matchingJob, 'matcher');
        } catch (error) {
          try {
            db.updateJobStatus(matchingJobId, 'failed');
          } catch (dbError) {
            logError(
              new DatabaseError(
                'updateJobStatus',
                dbError instanceof Error ? dbError : new Error(String(dbError)),
                requestId,
              ),
              'inline_job_error_update',
              requestId,
            );
          }

          logError(
            new CompetenceMatcherError(
              `Failed to create inline matching job: ${error instanceof Error ? error.message : String(error)}`,
              'inline_job_creation',
              500,
              requestId,
              { matchingJobId },
            ),
            'inline_job_creation',
            requestId,
          );
        }
      });

      res
        .setHeader('Location', `${PATHS.match}/jobs/${matchingJobId}`)
        .status(202)
        .json({ jobId: matchingJobId, status: 'pending' });
    }
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}

export function getMatchJobResults(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).requestId;

  try {
    // Get jobId from path
    const { jobId } = req.params;
    // Get sorter from query params
    const requestedSorter = req.query.rankBy as string | undefined;
    const sorter = requestedSorter == 'bestFit' ? 'bestFit' : 'avgFit'; // Default to avgFit

    if (!jobId) {
      throw new ValidationError(
        'Job ID is required in the request path',
        'jobId',
        jobId,
        requestId,
      );
    }

    let db;
    try {
      db = getDB(req.dbName!);
    } catch (error) {
      throw new DatabaseError(
        'getDB',
        error instanceof Error ? error : new Error(String(error)),
        requestId,
      );
    }

    // Check if job exists
    let job;
    try {
      job = db.getJob(jobId);
    } catch (error) {
      throw new DatabaseError(
        'getJob',
        error instanceof Error ? error : new Error(String(error)),
        requestId,
      );
    }

    if (!job) {
      throw new ResourceNotFoundError('Job', jobId, requestId);
    }

    // Job can be pending, preprocessing, running, completed, or failed
    switch (job.status) {
      case 'pending':
      case 'running':
      case 'preprocessing':
        res.status(202).json({
          jobId,
          status: job.status,
        });
        return;
      case 'failed':
        throw new CompetenceMatcherError(
          `Job with ID '${jobId}' has failed during processing`,
          'job_execution_failed',
          500,
          requestId,
          { jobId, jobStatus: job.status },
        );
      case 'completed':
        // Proceed to return results below
        break;
      default:
        throw new CompetenceMatcherError(
          `Job with ID '${jobId}' has unexpected status: ${job.status}`,
          'unexpected_job_status',
          500,
          requestId,
          { jobId, jobStatus: job.status },
        );
    }

    // Return match results
    let results;
    try {
      results = db.getMatchResults(jobId);
    } catch (error) {
      throw new DatabaseError(
        'getMatchResults',
        error instanceof Error ? error : new Error(String(error)),
        requestId,
      );
    }

    const tasks: TaskOverview = results.reduce((acc, result) => {
      const { taskId, taskText } = result;
      // Check if task already exists in the overview
      if (!acc.some((task) => task.taskId === taskId)) {
        acc.push({ taskId, taskText });
      }
      return acc;
    }, [] as TaskOverview);

    // Get the structure of the results
    let groupedResults: ResourceRanking = results.reduce((acc, result) => {
      const { taskId, competenceId, resourceId, distance, text, type, alignment, reason } = result;

      // resourceId
      let resourceGroup = acc.find((group) => group.resourceId === resourceId);
      if (!resourceGroup) {
        resourceGroup = {
          resourceId,
          taskMatchings: [],
          avgTaskMatchProbability: 0,
          avgBestFitTaskMatchProbability: 0,
          contradicting: false,
        };
        acc.push(resourceGroup);
      }
      // taskMatchings
      let taskMatches = resourceGroup.taskMatchings.find((task) => task.taskId === taskId);
      if (!taskMatches) {
        taskMatches = {
          taskId,
          competenceMatchings: [],
          maxMatchProbability: 0,
          maxBestFitMatchProbability: 0,
        };
        resourceGroup.taskMatchings.push(taskMatches);
      }

      // competenceMatchings
      let competenceMatches = taskMatches.competenceMatchings.find(
        (competence) => competence.competenceId === competenceId,
      );
      if (!competenceMatches) {
        competenceMatches = {
          competenceId,
          matchings: [],
          avgMatchProbability: 0,
          avgBestFitMatchProbability: 0,
        };
        taskMatches.competenceMatchings.push(competenceMatches);
      }

      // Add the match to competenceMatches
      competenceMatches.matchings.push({
        text,
        type: type as 'name' | 'description' | 'proficiencyLevel',
        matchProbability: distance,
        alignment: alignment as 'contradicting' | 'neutral' | 'aligning',
        reason: reason || undefined,
      });

      return acc;
    }, [] as ResourceRanking);

    // Aggregate and sort
    groupedResults = groupedResults
      .map((resourceGroup) => {
        const {
          resourceId,
          taskMatchings,
          avgTaskMatchProbability,
          avgBestFitTaskMatchProbability,
        } = resourceGroup;

        const newTaskMatchings = taskMatchings.map((taskGroup) => {
          const { taskId, competenceMatchings, maxMatchProbability, maxBestFitMatchProbability } =
            taskGroup;

          const newCompetenceMatchings = competenceMatchings.map((competenceGroup) => {
            const { competenceId, matchings, avgMatchProbability, avgBestFitMatchProbability } =
              competenceGroup;

            // Calculate average match probability for this competence (i.e. avg over all parts of this competence)
            const totalMatchProbability = matchings.reduce(
              (sum, match) => sum + match.matchProbability,
              0,
            );

            let numberOfBestFits = 0;
            const totalBestFitMatchProbability = matchings.reduce((sum, match) => {
              if (match.alignment === 'aligning') {
                numberOfBestFits++;
                return sum + match.matchProbability;
              }
              return sum;
            }, 0);

            // Return sorted
            return {
              competenceId,
              matchings: matchings.sort((a, b) => b.matchProbability - a.matchProbability),
              avgMatchProbability: totalMatchProbability / matchings.length,
              avgBestFitMatchProbability:
                numberOfBestFits > 0 ? totalBestFitMatchProbability / numberOfBestFits : 0, // If no best fit, set to 0
            };
          });

          // Return sorted
          return {
            taskId,
            competenceMatchings: newCompetenceMatchings.sort((a, b) => {
              const key =
                sorter === 'bestFit' ? 'avgBestFitMatchProbability' : 'avgMatchProbability';
              return b[key] - a[key];
            }),
            maxMatchProbability: Math.max(
              ...newCompetenceMatchings.map((c) => c.avgMatchProbability),
            ),
            maxBestFitMatchProbability: Math.max(
              ...newCompetenceMatchings.map((c) => c.avgBestFitMatchProbability),
            ),
          };
        });

        // Calculate average task match probability for this resource
        const totalTaskMatchProbability = newTaskMatchings.reduce(
          (sum, task) => sum + task.maxMatchProbability,
          0,
        );
        const totalBestFitTaskMatchProbability = newTaskMatchings.reduce(
          (sum, task) => sum + task.maxBestFitMatchProbability,
          0,
        );

        // Return sorted
        return {
          resourceId,
          taskMatchings: newTaskMatchings.sort((a, b) => {
            const key = sorter === 'bestFit' ? 'maxBestFitMatchProbability' : 'maxMatchProbability';
            return b[key] - a[key];
          }),
          avgTaskMatchProbability: totalTaskMatchProbability / newTaskMatchings.length,
          avgBestFitTaskMatchProbability:
            totalBestFitTaskMatchProbability / newTaskMatchings.length || 0, // If no best fit, set to 0
          contradicting: newTaskMatchings.some((task) =>
            task.competenceMatchings.some((competence) =>
              competence.matchings.some((match) => match.alignment === 'contradicting'),
            ),
          ),
        };
      })
      .sort((a, b) => {
        const key =
          sorter === 'bestFit' ? 'avgBestFitTaskMatchProbability' : 'avgTaskMatchProbability';

        // Sort in two levels: Contradicting, key
        // First not contradicting resources, then contradicting ones
        // Case one is contradicting, the other is not
        if (a.contradicting !== b.contradicting) {
          return a.contradicting ? 1 : -1; // Non-contradicting first
        }
        // Both are contradicting or both are not
        // Sort by the key
        return b[key] - a[key];
      });

    const load: GroupedMatchResults = {
      tasks,
      resourceRanking: groupedResults,
    };

    res.status(200).json(load);
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}
