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
  getProcessImage,
  getProcessImageFileNames,
  saveProcessImage,
  deleteProcessImage,
} from '../../shared-electron-server/data/process.js';
import express from 'express';
import { isAllowed } from '../iam/middleware/authorization.ts';
import logger from '../../shared-electron-server/logging.js';
import Ability from '../iam/authorization/abilityHelper';
import { v4 } from 'uuid';
import { toCaslResource } from '../iam/authorization/caslAbility';

const processRouter = express.Router();

function toExternalFormat(processMetaData) {
  const newFormat = { ...processMetaData };
  newFormat.definitionId = processMetaData.id;
  newFormat.definitionName = processMetaData.name;
  delete newFormat.id;
  delete newFormat.name;
  return newFormat;
}

processRouter.get('/', isAllowed('view', 'Process'), async (req, res) => {
  let { noBpmn } = req.query;

  const processes = getProcesses();

  /** @type {Ability} */
  const userAbility = req.userAbility;

  try {
    const userProcessesPromise = await Promise.allSettled(
      userAbility
        .filter('view', 'Process', processes)
        .map(async (process) =>
          noBpmn === 'true' ? process : { ...process, bpmn: await getProcessBpmn(process.id) },
        ),
    );

    const userProcesses = userProcessesPromise
      .filter((promise) => promise.status === 'fulfilled')
      .map((promise) => toExternalFormat(promise.value));

    return res.status(200).json(userProcesses);
  } catch (err) {
    res.status(500).send('Failed to get process info');
  }
});

processRouter.post('/', isAllowed('create', 'Process'), async (req, res) => {
  const { body } = req;

  if (typeof body !== 'object') {
    res.status(400).send('Expected { bpmn: ... } as body!');
    return;
  }

  body.owner = (req.session && req.session.userId) || '';

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('create', toCaslResource('Process', body)))
    return res.status(403).send('Forbidden.');

  const { bpmn } = body;

  try {
    const process = await addProcess(body);
    if (typeof process === 'object') {
      res.status(201).json(toExternalFormat({ ...process, bpmn }));
    } else {
      // a process with this id does already exist
      res.status(303).location(`/process/${process}`).send();
    }

    return;
  } catch (err) {
    logger.debug(`Error on POST request to /process: ${err}`);
    res.status(500).send('Failed to create the process due an internal error');
  }
});

processRouter.use('/:definitionId', async (req, res, next) => {
  req.definitionsId = req.params.definitionId;
  req.process = getProcesses().find((process) => {
    return process.id === req.params.definitionId;
  });
  next();
});

processRouter.get('/:definitionId', isAllowed('view', 'Process'), async (req, res) => {
  const { process, definitionsId } = req;

  if (!process) {
    res.status(404).send(`Process with id ${definitionsId} could not be found!`);
    return;
  }

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('view', toCaslResource('Process', process)))
    return res.status(403).send('Forbidden.');

  try {
    const bpmn = await getProcessBpmn(definitionsId);
    res.status(200).json(toExternalFormat({ ...process, bpmn }));
  } catch (err) {
    res.status(400).send(err.message);
  }
});

const allowedInPutBodyInsteadOfBpmn = ['definitionName', 'description'];
processRouter.put('/:definitionId', isAllowed('update', 'Process'), async (req, res) => {
  const { process, definitionsId, body } = req;

  if (!process) {
    res.status(404).send('Process to update does not exist!');
    return;
  }

  if (typeof body !== 'object') {
    res.status(400).send('Expected { bpmn: ... } as body!');
    return;
  }

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('update', toCaslResource('Process', process)))
    return res.status(403).send('Forbidden.');

  let { bpmn } = body;

  if (
    typeof bpmn === 'string' &&
    bpmn !== '' &&
    allowedInPutBodyInsteadOfBpmn.some((key) => Object.keys(body).includes(key))
  ) {
    const oldBpmn = await getProcessBpmn(definitionsId);
    const dataInOldBpmn = await getProcessInfo(oldBpmn);
    const dataInNewBpmn = await getProcessInfo(bpmn);

    if ('definitionName' in body) {
      if (dataInNewBpmn.name !== dataInOldBpmn.name)
        return res
          .status(400)
          .send(
            'Key "definitionName" of process being updated in the request body and in the BPMN.',
          );

      bpmn = await setDefinitionsName(bpmn, body['definitionName']);
      delete body['definitionName'];
    }

    if ('description' in body) {
      if (dataInNewBpmn.description !== dataInOldBpmn.description)
        return res
          .status(400)
          .send('Key "description" of process being updated in the request body and in the BPMN.');

      bpmn = await addDocumentation(bpmn, body['description']);
      delete body['description'];
    }

    body.bpmn = bpmn;
  }

  try {
    const newProcessInfo = await updateProcess(definitionsId, body);
    bpmn = bpmn || (await getProcessBpmn(definitionsId));
    res.status(200).json(toExternalFormat({ ...newProcessInfo, bpmn }));
    return;
  } catch (err) {
    res.status(400).send(err.message);
  }
});

processRouter.delete('/:definitionId', isAllowed('delete', 'Process'), async (req, res) => {
  const { process, definitionsId } = req;

  if (process) {
    await removeProcess(definitionsId);
  }

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('delete', toCaslResource('Process', process)))
    return res.status(403).send('Forbidden.');

  res.status(200).end();
  return;
});

processRouter.get('/:definitionId/versions', isAllowed('view', 'Process'), async (req, res) => {
  const { process, definitionsId } = req;

  if (!process) {
    res.status(404).send(`Process with id ${definitionsId} could not be found!`);
    return;
  }

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('view', toCaslResource('Process', process)))
    return res.status(403).send('Forbidden.');

  if (!userAbility.can('view', toCaslResource('Process', req.process)))
    return res.status(403).send('Forbidden.');

  res.status(200).send(process.versions);
});

processRouter.post('/:definitionId/versions', isAllowed('update', 'Process'), async (req, res) => {
  const { definitionsId, body } = req;

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('update', toCaslResource('Process', req.process)))
    return res.status(403).send('Forbidden.');

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
});

processRouter.get(
  '/:definitionId/versions/:version',
  isAllowed('view', 'Process'),
  async (req, res) => {
    const { definitionsId } = req;
    const { version } = req.params;

    /** @type {Ability} */
    const userAbility = req.userAbility;

    if (!userAbility.can('view', toCaslResource('Process', req.process)))
      return res.status(403).send('Forbidden.');

    try {
      res
        .status(200)
        .type('text/plain')
        .end(await getProcessVersionBpmn(definitionsId, version));
    } catch (err) {
      res
        .status(400)
        .end(
          `Unable to get version ${version} for the process (id: ${definitionsId})! Reason: ${err.message}.`,
        );
    }
  },
);

processRouter.use('/:definitionId/images', async (req, res, next) => {
  // early exit if the process doesn't exist
  if (!req.process) {
    res.status(404).send(`Process with id ${req.definitionsId} does not exist!`);
  } else {
    next();
  }
});

processRouter.get('/:definitionId/images', isAllowed('view', 'Process'), async (req, res) => {
  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('view', toCaslResource('Process', req.process)))
    return res.status(403).send('Forbidden.');

  res.status(200).json(await getProcessImageFileNames(req.definitionsId));
});

processRouter.post('/:definitionId/images', isAllowed('view', 'Process'), async (req, res) => {
  const { definitionId } = req.params;

  const { body: image } = req;

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('update', toCaslResource('Process', req.process)))
    return res.status(403).send('Forbidden.');

  const contentType = req.get('Content-Type');
  const imageType = contentType.split('image/').pop();
  const imageFileName = `_image${v4()}.${imageType}`;

  await saveProcessImage(definitionId, imageFileName, image);

  res.status(201).send({ imageFileName });
});

processRouter.use('/:definitionId/images/:imageFileName', async (req, res, next) => {
  req.imageFileName = req.params.imageFileName;
  try {
    // see if there already exists some data for this user task and make it accessible for later steps
    req.image = await getProcessImage(req.definitionsId, req.imageFileName);
  } catch (err) {}
  next();
});

processRouter.get(
  '/:definitionId/images/:imageFileName',
  isAllowed('view', 'Process'),
  async (req, res) => {
    const { definitionId, imageFileName } = req.params;

    /** @type {Ability} */
    const userAbility = req.userAbility;

    if (!userAbility.can('view', toCaslResource('Process', req.process)))
      return res.status(403).send('Forbidden.');

    res.set({ 'Content-Type': 'image/png image/svg+xml image/jpeg' });
    res.status(200).send(req.image);
  },
);

processRouter.put(
  '/:definitionId/images/:imageFileName',
  isAllowed('update', 'Process'),
  async (req, res) => {
    const { definitionId, imageFileName } = req.params;

    const { body: image } = req;

    /** @type {Ability} */
    const userAbility = req.userAbility;

    if (!userAbility.can('update', toCaslResource('Process', req.process)))
      return res.status(403).send('Forbidden.');

    await saveProcessImage(definitionId, imageFileName, image);

    if (!req.image) {
      res.status(201);
    } else {
      res.status(200);
    }

    res.end();
  },
);

processRouter.delete(
  '/:definitionId/images/:imageFileName',
  isAllowed('update', 'Process'),
  async (req, res) => {
    const { definitionId, imageFileName } = req.params;

    /** @type {Ability} */
    const userAbility = req.userAbility;

    if (!userAbility.can('delete', toCaslResource('Process', req.process)))
      return res.status(403).send('Forbidden.');

    if (req.image) {
      await deleteProcessImage(definitionId, imageFileName);
    }

    res.status(200).send();
  },
);

processRouter.use('/:definitionId/user-tasks', async (req, res, next) => {
  // early exit if the process doesn't exist
  if (!req.process) {
    res.status(404).send(`Process with id ${req.definitionsId} does not exist!`);
  } else {
    next();
  }
});

processRouter.get('/:definitionId/user-tasks', isAllowed('view', 'Process'), async (req, res) => {
  let { withHtml } = req.query;

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('view', toCaslResource('Process', req.process)))
    return res.status(403).send('Forbidden.');

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

processRouter.get(
  '/:definitionId/user-tasks/:userTaskFileName',
  isAllowed('view', 'Process'),
  async (req, res) => {
    const { userTaskFileName } = req;

    /** @type {Ability} */
    const userAbility = req.userAbility;

    if (!userAbility.can('view', toCaslResource('Process', req.process)))
      return res.status(403).send('Forbidden.');

    if (req.userTaskHtml) {
      res.status(200).send(req.userTaskHtml);
    } else {
      res.status(404).send(`Found no html for user task filename ${userTaskFileName}`);
    }
  },
);

processRouter.put(
  '/:definitionId/user-tasks/:userTaskFileName',
  isAllowed('update', 'Process'),
  async (req, res) => {
    const { definitionsId, userTaskFileName, userTaskHtml } = req;
    const { body } = req;

    /** @type {Ability} */
    const userAbility = req.userAbility;

    if (!userAbility.can('update', toCaslResource('Process', req.process)))
      return res.status(403).send('Forbidden.');

    await saveProcessUserTask(definitionsId, userTaskFileName, body);

    if (!userTaskHtml) {
      res.status(201);
    } else {
      res.status(200);
    }

    res.end();
  },
);

processRouter.delete(
  '/:definitionId/user-tasks/:userTaskFileName',
  isAllowed('update', 'Process'),
  async (req, res) => {
    const { definitionsId, userTaskFileName, userTaskHtml } = req;

    /** @type {Ability} */
    const userAbility = req.userAbility;

    if (!userAbility.can('update', toCaslResource('Process', req.process)))
      return res.status(403).send('Forbidden.');

    if (userTaskHtml) {
      await deleteProcessUserTask(definitionsId, userTaskFileName);
    }

    res.status(200).send();
  },
);

export default processRouter;
