import { Request, Response, NextFunction } from 'express';
import { PATHS } from '../server';
import { getDB } from '../utils/db';
import { createWorker } from '../utils/worker';
import workerManager from '../worker/worker-manager';
import { splitSemantically } from '../tasks/semantic-split';
import { CompetenceInput, EmbeddingJob, EmbeddingTask, ResourceInput } from '../utils/types';

export function getResourceLists(req: Request, res: Response, next: NextFunction): void {
  try {
    const db = getDB(req.dbName!);

    const availableResourceLists = db.getAvailableResourceLists();

    res.status(200).json(availableResourceLists);
  } catch (error) {
    console.error('Error retrieving resource lists:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export function getResourceList(req: Request, res: Response, next: NextFunction): void {
  try {
    const db = getDB(req.dbName!);
    const resourceListId = req.params.resourceListId;

    if (!resourceListId) {
      res.status(400).json({ error: 'Resource list ID is required' });
      return;
    }

    const resourceList = db.getResourceList(resourceListId);

    if (!resourceList) {
      res.status(404).json({ error: 'Resource list not found' });
      return;
    }

    res.status(200).json(resourceList);
  } catch (error) {
    console.error('Error retrieving resource list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export function createResourceList(req: Request, res: Response, next: NextFunction): void {
  // Check if the request body contains the necessary data
  let resourceIds: string[] = [];
  let competences: CompetenceInput /* resourceIndex */[] /* competenceIndex */[] = [];
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'Invalid request body. Expected an array of resources.' });
    }
    req.body.forEach(({ resourceId, competencies }: ResourceInput) => {
      if (!resourceId || typeof resourceId !== 'string') {
        throw new Error('Invalid resourceId in request body');
      }
      if (!Array.isArray(competencies) /* || competencies.length === 0 */) {
        throw new Error('Invalid competencies in request body');
      }
      resourceIds.push(resourceId);
      const checkedCompetences = competencies.map((c: CompetenceInput) => {
        if (!c.competenceId || typeof c.competenceId !== 'string') {
          throw new Error('Invalid competenceId in request body');
        }
        return {
          competenceId: c.competenceId,
          name: c.name,
          description: c.description,
          externalQualificationNeeded: c.externalQualificationNeeded,
          renewTime: c.renewTime,
          proficiencyLevel: c.proficiencyLevel,
          qualificationDates: c.qualificationDates,
          lastUsages: c.lastUsages,
        };
      });

      competences.push(checkedCompetences);
    });
  } catch (error) {
    console.error('Error processing request body:', error);
    res.status(400).json({ error: 'Invalid request body format' });
    return;
  }
  /* ------------------------- */
  let listId: string;
  let jobId: string;
  try {
    const db = getDB(req.dbName!);
    // TODO: Should we blindly trust that client only send integrity data? -> Maybe add a check for id duplicates?
    db.atomicStep(() => {
      // ResourceList
      listId = db.createResourceList();
      // Resources
      resourceIds.forEach((resourceId) => {
        db.addResource(listId, resourceId);
      });
      // Competences
      competences.forEach((competenceArray, resourceIndex) => {
        competenceArray.forEach((competence) => {
          db.addCompetence(listId, resourceIds[resourceIndex], competence);
        });
      });
      // Embeddings is offloaded to worker -> Just create a job
      jobId = db.createJob(listId);
    });
  } catch (error) {
    console.error('Error adding resource list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }

  // Start Embedding Worker
  const descriptionEmbeddingInput = competences
    .map((competenceArray, resourceIndex) => {
      return competenceArray.map((competence) => {
        return {
          listId: listId!,
          resourceId: resourceIds[resourceIndex],
          competenceId: competence.competenceId,
          text: competence.description,
          type: 'description',
        };
      });
    })
    .flat() as EmbeddingTask[];

  // This is a workaround to avoid the worker crashing silently
  // Preferably the splitting should be done in the worker
  // For now it is just done asynchronously here
  splitSemantically(descriptionEmbeddingInput)
    .then((tasks) => {
      // console.log(tasks);
      const job: EmbeddingJob = {
        jobId: jobId!,
        dbName: req.dbName!,
        tasks,
      };
      workerManager.enqueue(job, 'embedder');
    })
    .catch((err) => {
      console.error('Error splitting semantically:', err);
      // Do embedding without splitting in case of error
      const job: EmbeddingJob = {
        jobId: jobId!,
        dbName: req.dbName!,
        tasks: descriptionEmbeddingInput,
      };
      workerManager.enqueue(job, 'embedder');
    });
  // const job: EmbeddingJob = {
  //   jobId: jobId!,
  //   dbName: req.dbName!,
  //   tasks: descriptionEmbeddingInput,
  // };
  // workerManager.enqueue(job, 'embedder');

  // Respond with jobid in location header
  res
    .setHeader('Location', `${PATHS.resource}/jobs/${jobId!}`)
    // Rspond with accepted status and jobId
    .status(202)
    .json({ jobId: jobId!, status: 'pending' });
}

export function getJobStatus(req: Request, res: Response) {
  try {
    const db = getDB(req.dbName!);
    const job = db.getJob(req.params.jobId);

    switch (job.status) {
      case 'pending':
        res.status(202).json({ jobId: job.jobId, status: job.status });
        return;
      case 'running':
        res.status(202).json({ jobId: job.jobId, status: job.status });
        return;
      case 'completed':
        res
          .status(201)
          .setHeader('Location', `${PATHS.resource}/${job.referenceId}`)
          .json({ jobId: job.jobId, status: job.status, competenceListId: job.referenceId });
        return;
      case 'failed':
        res.status(500).json({ jobId: job.jobId, status: job.status });
        return;
      default:
        res.status(500).json({ error: 'Internal Server Error' });
        return;
    }
  } catch (err) {
    // console.error(err);
    res.status(404).json({ error: 'Job not found' });
  }
}
