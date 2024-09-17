import {
  getMachines,
  removeMachine,
  addMachine,
  updateMachine,
} from '../../shared-electron-server/data/machines.js';
import { v4 } from 'uuid';
import express from 'express';
import { isAllowed } from '../iam/middleware/authorization';
import Ability from '../iam/authorization/abilityHelper';
import { toCaslResource } from '../iam/authorization/caslAbility';

const machinesRouter = express.Router();

machinesRouter.get('/', isAllowed('view', 'Machine'), async (req, res) => {
  /** @type {Ability} */
  const userAbility = req.userAbility;

  const machines = userAbility.filter('view', 'Machine', getMachines());
  res.status(200).json(machines);
});

machinesRouter.post('/', isAllowed('create', 'Machine'), async (req, res) => {
  const { body } = req;

  if (typeof body !== 'object') {
    res.status(400).send(`Expected JSON data but got ${typeof body}!`);
    return;
  }

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('create', toCaslResource('Machine', body)))
    return res.status(403).send('Forbidden.');

  // we need some kind of identification data like an id, ip+port, hostname
  if (!(body.ip && body.port) && !body.hostname && !body.id) {
    res.status(400).send(`At least one of hostname, network info (ip + port) or id needed!`);
    return;
  }

  if (!body.id) {
    body.id = v4();
  }

  addMachine(body);

  res.status(201).end();
});

// make requested machine directly accessible for requests on this path
machinesRouter.use('/:id', (req, res, next) => {
  req.machineId = req.params.id;
  req.machine = getMachines().find((machine) => machine.id === req.machineId);
  next();
});

machinesRouter.get('/:id', isAllowed('view', 'Machine'), async (req, res) => {
  const { machine, machineId } = req;

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('view', toCaslResource('Machine', machine)))
    return res.status(403).send('Forbidden.');

  if (!machine) {
    res.status(404).send(`No machine with id ${machineId} known!`);
    return;
  }

  res.status(200).json(machine);
});

machinesRouter.delete('/:id', isAllowed('delete', 'Machine'), async (req, res) => {
  const { machine, machineId } = req;

  if (!machine) {
    res.status(200).end();
    return;
  }

  if (!machine.saved) {
    res
      .status(403)
      .send(`The machine is known through the discovery and not stored. It can't be removed!`);
    return;
  }

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('delete', toCaslResource('Machine', machine)))
    return res.status(403).send('Forbidden.');

  removeMachine(machineId);

  res.status(200).end();
});

machinesRouter.put('/:id', isAllowed('update', 'Machine'), async (req, res) => {
  const { machine, machineId, body } = req;

  if (typeof body !== 'object') {
    res.status(400).send('Expected update object as body');
    return;
  }

  if (!machine) {
    res.status(404).send(`No machine with id ${machineId} known!`);
    return;
  }

  if (!machine.saved) {
    res.status(400).send("Machine is not stored and thus can't be changed!");
    return;
  }

  /** @type {Ability} */
  const userAbility = req.userAbility;

  if (!userAbility.can('update', toCaslResource('Machine', machine)))
    return res.status(403).send('Forbidden.');

  // don't allow overwrite of machine info; internally managed variables like saved, discovered and status; the id
  delete body.machine;
  delete body.saved;
  delete body.discovered;
  delete body.status;
  delete body.id;

  try {
    await updateMachine(machineId, body);
    res.status(200).end();
  } catch (err) {
    res.status(400).send(err);
  }
});

export default machinesRouter;
