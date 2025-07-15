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

  // Job can be pending, running, completed, or failed
  if (job.status === 'pending' || job.status === 'running' || job.status === 'preprocessing') {
    res.status(202).json({
      jobId,
      status: job.status,
    });
    return;
  }
  if (job.status === 'failed') {
    res.status(500).json({
      error: `Job with ID ${jobId} failed.`,
    });
    return;
  }
  if (job.status !== 'completed') {
    // This should not happen, but just in case
    console.error(`Unexpected job status: ${job.status} for jobId: ${jobId}`);
    res.status(500).json({
      error: `Job with ID ${jobId} failed.`,
    });
    return;
  }

  // Return match results
  const results = db.getMatchResults(jobId);
  // Group by taskId and within each taskId by competenceId
  // where matches are sorted by distance ascending
  // and competences are sorted by avgDistance ascending
  const groupedResults: GroupedMatchResults = results.reduce((acc, result) => {
    const { taskId, competenceId, text, type, distance, reason } = result as {
      taskId: string;
      competenceId: string;
      text: string;
      type: 'name' | 'description' | 'proficiencyLevel';
      distance: number;
      reason?: string;
    };

    // Find or create task in accumulator
    let task = acc.find((t) => t.taskId === taskId);
    if (!task) {
      task = { taskId, competences: [] };
      acc.push(task);
    }

    // Find or create competence in task
    let competence = task.competences.find((c) => c.competenceId === competenceId);
    if (!competence) {
      competence = { competenceId, matchings: [], avgMatchProbability: 0 };
      task.competences.push(competence);
    }

    // Add match to competence
    competence.matchings.push({ text, type, matchProbability: distance, reason });

    // Sort matches by matchProbability (distance) in descending order
    competence.matchings.sort((a, b) => b.matchProbability - a.matchProbability);

    // Calculate average match probability for competence
    competence.avgMatchProbability =
      competence.matchings.reduce((sum, match) => sum + match.matchProbability, 0) /
      competence.matchings.length;

    // Sort competences by avgMatchProbability in descending order
    task.competences.sort((a, b) => b.avgMatchProbability - a.avgMatchProbability);

    return acc;
  }, [] as GroupedMatchResults);

  res.status(200).json(groupedResults);
}
