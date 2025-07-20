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
} from '../utils/types';
import { handleCreateResourceList } from './resource';

export function matchCompetenceList(req: Request, res: Response, next: NextFunction): void {
  try {
    let listId: string;
    let list: ResourceListInput;
    let taskInput: MatchingTask[];
    const db = getDB(req.dbName!);

    /**--------------------------------------------
     * Checks
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

    if (!listId! && !list!) {
      res.status(400).json({
        error: 'Either competenceListId or competenceList must be provided.',
      });
      return;
    }

    if (!taskInput! || !Array.isArray(taskInput) || taskInput?.length === 0) {
      res.status(400).json({
        error: 'An array of tasks must be provided for matching.',
      });
      return;
    }

    if (listId! && !(typeof listId === 'string')) {
      res.status(400).json({
        error: 'competenceListId must be an UUIDStrings.',
      });
      return;
    } else if (
      list! &&
      (!Array.isArray(list) ||
        !list.every(
          (entry) => typeof entry === 'object' && !Array.isArray(entry) && entry !== null,
        ))
    ) {
      res.status(400).json({
        error: 'competenceList must be an array of ResourceInput objects.',
      });
      return;
    }

    /**--------------------------------------------
     * Case existing competenceListId was passed
     *---------------------------------------------*/
    if (listId!) {
      // Check if the competence list exists
      const competenceLists = db.getAvailableResourceLists();
      if (!competenceLists.includes(listId)) {
        res.status(404).json({
          error: `Competence list with ID ${listId} not found.`,
        });
        return;
      }

      const jobId = db.createJob(listId);
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

      workerManager.enqueue(job, 'matcher');

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
    // Create a new competence list
    const matchingJobId = db.createJob();
    if (list!) {
      db.updateJobStatus(matchingJobId, 'preprocessing');
      handleCreateResourceList(req.dbName!, list, (job, code, jobId) => {
        try {
          // Embedding fails -> no matching possible (i.e. fail the matching job)
          if (code !== 0) {
            db.updateJobStatus(matchingJobId, 'failed');
            return;
          }
          db.updateJobStatus(matchingJobId, 'pending');

          // Retrieve the competence list ID
          const { referenceId: listId } = db.getJob(jobId);
          // Create the matching job
          const matchingJob: MatchingJob = {
            jobId: matchingJobId,
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
          // Enqueue the matching job
          workerManager.enqueue(matchingJob, 'matcher');
        } catch (error) {
          db.updateJobStatus(matchingJobId, 'failed');
          console.error('Error creating (inline) matching job:', error);
        }
      });

      res
        .setHeader('Location', `${PATHS.match}/jobs/${matchingJobId}`)
        .status(202)
        .json({ jobId: matchingJobId, status: 'pending' });
    }
  } catch (error) {
    console.error('Error matching:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export function getMatchJobResults(req: Request, res: Response, next: NextFunction): void {
  const { jobId } = req.params;
  const db = getDB(req.dbName!);

  // Check if job exists
  const job = db.getJob(jobId);
  if (!job) {
    res.status(404).json({ error: `Job with ID ${jobId} not found.` });
    return;
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
      res.status(500).json({
        error: `Job with ID ${jobId} failed.`,
      });
      return;
    case 'completed':
      // Proceed to return results below
      break;
    default:
      console.error(`Unexpected job status: ${job.status} for jobId: ${jobId}`);
      res.status(500).json({
        error: `Job with ID ${jobId} failed.`,
      });
      return;
  }

  // Return match results
  const results = db.getMatchResults(jobId);

  // Get the structure of the results
  let groupedResults: GroupedMatchResults = results.reduce((acc, result) => {
    const { taskId, taskText, competenceId, resourceId, distance, text, type, reason } = result;

    // resourceId
    let resourceGroup = acc.find((group) => group.resourceId === resourceId);
    if (!resourceGroup) {
      resourceGroup = { resourceId, taskMatchings: [], avgTaskMatchProbability: 0 };
      acc.push(resourceGroup);
    }
    // taskMatchings
    let taskMatches = resourceGroup.taskMatchings.find((task) => task.taskId === taskId);
    if (!taskMatches) {
      taskMatches = {
        taskId,
        taskText,
        competenceMatchings: [],
        maxMatchProbability: 0,
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
      };
      taskMatches.competenceMatchings.push(competenceMatches);
    }

    // Add the match to competenceMatches
    competenceMatches.matchings.push({
      text,
      type: type as 'name' | 'description' | 'proficiencyLevel',
      matchProbability: distance,
      reason: reason || undefined,
    });

    return acc;
  }, [] as GroupedMatchResults);

  // Aggregate and sort
  groupedResults = groupedResults
    .map((resourceGroup) => {
      const { resourceId, taskMatchings, avgTaskMatchProbability } = resourceGroup;

      const newTaskMatchings = taskMatchings.map((taskGroup) => {
        const { taskId, taskText, competenceMatchings, maxMatchProbability } = taskGroup;

        const newCompetenceMatchings = competenceMatchings.map((competenceGroup) => {
          const { competenceId, matchings, avgMatchProbability } = competenceGroup;

          // Calculate average match probability for this competence (i.e. avg over all parts of this competence)
          const totalMatchProbability = matchings.reduce(
            (sum, match) => sum + match.matchProbability,
            0,
          );

          // Return sorted
          return {
            competenceId,
            matchings: matchings.sort((a, b) => b.matchProbability - a.matchProbability),
            avgMatchProbability: totalMatchProbability / matchings.length,
          };
        });

        // Return sorted
        return {
          taskId,
          taskText,
          competenceMatchings: newCompetenceMatchings.sort(
            (a, b) => b.avgMatchProbability - a.avgMatchProbability,
          ),
          maxMatchProbability: Math.max(
            ...newCompetenceMatchings.map((c) => c.avgMatchProbability),
          ),
        };
      });

      // Calculate average task match probability for this resource
      const totalTaskMatchProbability = newTaskMatchings.reduce(
        (sum, task) => sum + task.maxMatchProbability,
        0,
      );

      // Return sorted
      return {
        resourceId,
        taskMatchings: newTaskMatchings.sort(
          (a, b) => b.maxMatchProbability - a.maxMatchProbability,
        ),
        avgTaskMatchProbability: totalTaskMatchProbability / newTaskMatchings.length,
      };
    })
    .sort((a, b) => b.avgTaskMatchProbability - a.avgTaskMatchProbability);

  res.status(200).json(groupedResults);
}
