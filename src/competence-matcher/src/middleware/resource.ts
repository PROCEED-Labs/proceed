import { Request, Response, NextFunction } from 'express';
import { PATHS } from '../server';
import { getDB } from '../utils/db';
import workerManager from '../worker/worker-manager';
import { splitSemantically } from '../tasks/semantic-split';
import { CompetenceInput, EmbeddingJob, EmbeddingTask, ResourceInput } from '../utils/types';
import {
  ValidationError,
  ResourceNotFoundError,
  DatabaseError,
  CompetenceMatcherError,
} from '../utils/errors';
import { logError } from './logging';

export function getResourceLists(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).requestId;

  try {
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

    let availableResourceLists;
    try {
      availableResourceLists = db.getAvailableResourceLists();
    } catch (error) {
      throw new DatabaseError(
        'getAvailableResourceLists',
        error instanceof Error ? error : new Error(String(error)),
        requestId,
      );
    }

    res.status(200).json(availableResourceLists);
  } catch (error) {
    next(error);
  }
}

export function getResourceList(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).requestId;

  try {
    const resourceListId = req.params.resourceListId;

    if (!resourceListId) {
      throw new ValidationError(
        'Resource list ID is required in the request parameters',
        'resourceListId',
        resourceListId,
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

    let resourceList;
    try {
      resourceList = db.getResourceList(resourceListId);
    } catch (error) {
      throw new ResourceNotFoundError('Resource list', resourceListId, requestId);
    }

    res.status(200).json(resourceList);
  } catch (error) {
    next(error);
  }
}

// Helper function to handle the creation logic
export async function handleCreateResourceList(
  dbName: string,
  resources: ResourceInput[],
  onWorkerExit?: (job: any, code: number, jobId: string) => void,
): Promise<{ jobId: string; status: string }> {
  let resourceIds: string[] = [];
  let competences: CompetenceInput[][] = [];

  // Validate and extract data
  resources.forEach(({ resourceId, competencies }: ResourceInput) => {
    if (!resourceId || typeof resourceId !== 'string') {
      throw new Error('Invalid resourceId in request body');
    }
    if (!Array.isArray(competencies)) {
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

  // Create a new resource list in the database
  let listId: string;
  let jobId: string;
  const db = getDB(dbName);
  db.atomicStep(() => {
    listId = db.createResourceList();
    resourceIds.forEach((resourceId) => {
      db.addResource(listId, resourceId);
    });
    competences.forEach((competenceArray, resourceIndex) => {
      competenceArray.forEach((competence) => {
        db.addCompetence(listId, resourceIds[resourceIndex], competence);
      });
    });
    jobId = db.createJob(listId);
  });

  // Prepare embedding tasks
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

  // Workaround for now
  // Ideally, the worker should handle the splitting as well
  db.updateJobStatus(jobId!, 'preprocessing');
  let job: EmbeddingJob | undefined;

  splitSemantically(descriptionEmbeddingInput)
    .then((tasks) => {
      job = {
        jobId: jobId!,
        dbName: dbName,
        tasks,
      };
    })
    .catch((err) => {
      console.error('Error splitting semantically:', err);
      job = {
        jobId: jobId!,
        dbName: dbName,
        tasks: descriptionEmbeddingInput,
      };
    })
    .finally(() => {
      db.updateJobStatus(jobId!, 'pending');
      workerManager.enqueue(job!, 'embedder', {
        onExit: (job: any, code: number) => onWorkerExit?.(job, code, jobId!),
      });
    });

  return { jobId: jobId!, status: 'pending' };
}

export function createResourceList(req: Request, res: Response, next: NextFunction): void {
  if (!Array.isArray(req.body) || req.body.length === 0) {
    res.status(400).json({ error: 'Invalid request body. Expected an array of resources.' });
    return;
  }
  try {
    handleCreateResourceList(req.dbName!, req.body)
      .then(({ jobId, status }) => {
        res
          .setHeader('Location', `${PATHS.resource}/jobs/${jobId}`)
          .status(202)
          .json({ jobId, status });
      })
      .catch((error) => {
        console.error('Error adding resource list:', error);
        res.status(400).json({ error: error.message || 'Invalid request body format' });
      });
  } catch (error) {
    console.error('Error processing request body:', error);
    res.status(400).json({ error: 'Invalid request body format' });
  }
}

export function getJobStatus(req: Request, res: Response) {
  try {
    const db = getDB(req.dbName!);
    const job = db.getJob(req.params.jobId);

    switch (job.status) {
      case 'pending':
      case 'preprocessing':
      case 'running':
        res.status(202).json({ jobId: job.jobId, status: job.status }); // both strings
        return;
      case 'completed':
        res
          .status(201)
          .setHeader('Location', `${PATHS.resource}/${job.referenceId}`)
          .json({ jobId: job.jobId, status: job.status, competenceListId: job.referenceId });
        return;
      case 'failed':
        res.status(500).json({ jobId: job.jobId, status: job.status }); //both strings
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
