import {
  getProcesses,
  getProcessBpmn,
  addProcess,
  updateProcess,
  removeProcess,
  getProcessUserTasks,
  getProcessUserTaskHtml,
  getProcessUserTasksHtml,
  saveProcessUserTask,
  deleteProcessUserTask,
  addProcessVersion,
  getProcessVersionBpmn,
  getProcessImages,
  getProcessImage,
} from '../../shared-electron-server/data/process.js';
import express from 'express';
import { isAllowed } from '../iam/middleware/authorization.js';
import {
  PERMISSION_VIEW,
  PERMISSION_CREATE,
  PERMISSION_UPDATE,
  PERMISSION_DELETE,
  PERMISSION_MANAGE,
} from '../../../shared-frontend-backend/constants/index.js';
import { config } from '../iam/utils/config.js';
import { ensureOpaSync } from '../iam/opa/opa-client.js';
import logger from '../../shared-electron-server/logging.js';

const processRouter = express.Router();

function toExternalFormat(processMetaData) {
  const newFormat = { ...processMetaData };
  newFormat.definitionId = processMetaData.id;
  newFormat.definitionName = processMetaData.name;
  delete newFormat.id;
  delete newFormat.name;
  return newFormat;
}

processRouter.use(
  '/',
  isAllowed(PERMISSION_VIEW, 'Process', { filter: true }),
  async (req, res, next) => {
    if (config.useAuthorization) {
      req.processes = req.filter.map((process) => toExternalFormat(process));
    } else {
      req.processes = getProcesses().map((process) => toExternalFormat(process));
    }
    next();
  }
);

processRouter.get('/', async (req, res) => {
  let { noBpmn } = req.query;

  try {
    const processes = await Promise.all(
      req.processes.map(async (process) => {
        if (noBpmn === 'true') {
          return process;
        } else {
          const bpmn = await getProcessBpmn(process.definitionId);
          return { ...process, bpmn };
        }
      })
    );

    if (processes.length) {
      return res.status(200).json(processes);
    } else {
      return res.status(204).end();
    }
  } catch (err) {
    res.status(500).send('Failed to get process info');
  }
});

processRouter.post(
  '/',
  isAllowed([PERMISSION_CREATE, PERMISSION_MANAGE], 'Process'),
  async (req, res) => {
    const { body } = req;

    if (typeof body !== 'object') {
      res.status(400).send('Expected { bpmn: ... } as body!');
      return;
    }

    const { bpmn } = body;

    try {
      const process = await addProcess(body);
      if (typeof process === 'object') {
        res.status(201).json(toExternalFormat({ ...process, bpmn }));
        await ensureOpaSync(`processes/${process.id}`, undefined, process);
      } else {
        // a process with this id does already exist
        res.status(303).location(`/process/${process}`).send();
      }

      return;
    } catch (err) {
      logger.debug(`Error on POST request to /process: ${err}`);
      res.status(500).send('Failed to create the process due an internal error');
    }
  }
);

processRouter.use('/:definitionId', async (req, res, next) => {
  req.definitionsId = req.params.definitionId;
  // use processes from earlier middleware to allow filtering in one place
  req.process = req.processes.find((p) => p.definitionId === req.definitionsId);
  next();
});

processRouter.get('/:definitionId', async (req, res) => {
  const { process, definitionsId } = req;

  if (!process) {
    res.status(404).send(`Process with id ${definitionsId} could not be found!`);
    return;
  }

  try {
    const bpmn = await getProcessBpmn(definitionsId);
    res.status(200).json({ ...process, bpmn });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

processRouter.put(
  '/:definitionId',
  isAllowed([PERMISSION_UPDATE, PERMISSION_MANAGE], 'Process'),
  async (req, res) => {
    const { process, definitionsId, body } = req;

    if (!process) {
      res.status(404).send('Process to update does not exist!');
      return;
    }

    if (typeof body !== 'object') {
      res.status(400).send('Expected { bpmn: ... } as body!');
      return;
    }

    let { bpmn } = body;

    try {
      const newProcessInfo = await updateProcess(definitionsId, body);
      bpmn = bpmn || (await getProcessBpmn(definitionsId));
      res.status(200).json(toExternalFormat({ ...newProcessInfo, bpmn }));
      await ensureOpaSync(`processes/${definitionsId}`, undefined, newProcessInfo);
      return;
    } catch (err) {
      res.status(400).send(err.message);
    }
  }
);

processRouter.delete(
  '/:definitionId',
  isAllowed([PERMISSION_DELETE, PERMISSION_MANAGE], 'Process'),
  async (req, res) => {
    const { process, definitionsId } = req;

    if (process) {
      await removeProcess(definitionsId);
    }

    res.status(200).end();
    await ensureOpaSync(`processes/${definitionsId}`, 'DELETE');
    return;
  }
);

processRouter.get('/:definitionId/versions', async (req, res) => {
  const { process, definitionsId } = req;
  if (!process) {
    res.status(404).send(`Process with id ${definitionsId} could not be found!`);
    return;
  }

  res.status(200).send(req.process.versions);
});

processRouter.post(
  '/:definitionId/versions',
  isAllowed([PERMISSION_UPDATE, PERMISSION_MANAGE], 'Process'),
  async (req, res) => {
    const { definitionsId, body } = req;

    if (typeof body !== 'object' || !body.bpmn) {
      res.status(400).send('Expected { bpmn: ... } as body!');
      return;
    }

    let { bpmn } = body;

    try {
      await addProcessVersion(definitionsId, bpmn);
    } catch (err) {
      res.status(400).send(`Unable to add process version. Reason: ${err.message}`);
      return;
    }

    res.status(201).send();
  }
);

processRouter.get('/:definitionId/versions/:version', async (req, res) => {
  const { definitionsId } = req;
  const { version } = req.params;

  try {
    res.status(200).send(await getProcessVersionBpmn(definitionsId, version));
  } catch (err) {
    res
      .status(400)
      .send(
        `Unable to get version ${version} for the process (id: ${definitionsId})! Reason: ${err.message}.`
      );
  }
});

processRouter.use('/:definitionId/images', async (req, res, next) => {
  // early exit if the process doesn't exist
  if (!req.process) {
    res.status(404).send(`Process with id ${req.definitionsId} does not exist!`);
  } else {
    next();
  }
});

processRouter.get('/:definitionId/images', async (req, res) => {
  res.status(200).json(await getProcessImages(req.definitionsId));
});

processRouter.get('/:definitionId/images/:imageFileName', async (req, res) => {
  const { definitionId, imageFileName } = req.params;

  const image = await getProcessImage(definitionId, imageFileName);
  res.set({ 'Content-Type': 'image/png image/svg+xml image/jpeg' });
  res.status(200).send(image);
});

processRouter.use('/:definitionId/user-tasks', async (req, res, next) => {
  // early exit if the process doesn't exist
  if (!req.process) {
    res.status(404).send(`Process with id ${req.definitionsId} does not exist!`);
  } else {
    next();
  }
});

processRouter.get('/:definitionId/user-tasks', async (req, res) => {
  let { withHtml } = req.query;

  if (withHtml === 'true') {
    res.status(200).json(await getProcessUserTasksHtml(req.definitionsId));
  } else {
    res.status(200).json(await getProcessUserTasks(req.definitionsId));
  }
});

processRouter.use('/:definitionId/user-tasks/:userTaskFileName', async (req, res, next) => {
  req.userTaskFileName = req.params.userTaskFileName;
  try {
    // see if there already exists some data for this user task and make it accessible for later steps
    req.userTaskHtml = await getProcessUserTaskHtml(req.definitionsId, req.userTaskFileName);
  } catch (err) {}
  next();
});

processRouter.get('/:definitionId/user-tasks/:userTaskFileName', async (req, res) => {
  const { userTaskFileName } = req;

  if (req.userTaskHtml) {
    res.status(200).send(req.userTaskHtml);
  } else {
    res.status(404).send(`Found no html for user task filename ${userTaskFileName}`);
  }
});

processRouter.put(
  '/:definitionId/user-tasks/:userTaskFileName',
  isAllowed([PERMISSION_UPDATE, PERMISSION_MANAGE], 'Process'),
  async (req, res) => {
    const { definitionsId, userTaskFileName, userTaskHtml } = req;
    const { body } = req;

    await saveProcessUserTask(definitionsId, userTaskFileName, body);

    if (!userTaskHtml) {
      res.status(201);
    } else {
      res.status(200);
    }

    res.end();
  }
);

processRouter.delete(
  '/:definitionId/user-tasks/:userTaskFileName',
  isAllowed([PERMISSION_UPDATE, PERMISSION_MANAGE], 'Process'),
  async (req, res) => {
    const { definitionsId, userTaskFileName, userTaskHtml } = req;

    if (userTaskHtml) {
      await deleteProcessUserTask(definitionsId, userTaskFileName);
    }

    res.status(200).send();
  }
);

export default processRouter;
