import logger from '../shared-electron-server/logging.js';
import * as backendProcesses from '../shared-electron-server/data/process.js';
import {
  updateProcess,
  saveScriptTaskJS,
  saveUserTaskHTML,
  saveImage,
} from '../shared-electron-server/data/fileHandling.js';
import eventHandler from '../../frontend/backend-api/event-system/EventHandler.js';

let modelingClientId;
let modelingClient;

export function setupProcessRequestHandlers(addListener, broadcast, sendCommand, io) {
  addListener('register_modeling_client', async (socket, id) => {
    logger.debug('Registered modeling client');
    modelingClient = socket;
    modelingClientId = socket.handshake.auth.connectionId;
    socket.emit('register_modeling_client', id);
  });

  addListener('data_get_processes', async (socket, id) => {
    logger.debug(`Request for stored processes.`);
    const processes = backendProcesses.getProcesses();
    socket.emit('data_get_processes', id, processes);
  });

  addListener('data_getBPMN', async (socket, id, processDefinitionsId) => {
    logger.debug(`Request for bpmn for process with id ${processDefinitionsId}.`);
    socket.emit('data_getBPMN', id, await backendProcesses.getProcessBpmn(processDefinitionsId));
  });

  eventHandler.on('processAdded', ({ process }) => {
    // TODO: push added processes only to the modeling client, Future: maybe push to users that are members of a group the process was added to
    logger.debug(`Broadcasting the addition of a new process.`);
    modelingClient.emit('process_added', process);
    // broadcast('process_added', process);
  });

  const processViewNameSpace = io.of(/^\/process\/(\w|-)*\/view$/);

  // make sure that access to a namespace is valid (process exists/ // TODO: socket has authorization)
  processViewNameSpace.use((socket, next) => {
    const namespaceName = socket.nsp.name;

    const [_, processDefinitionsId] = namespaceName.slice(1).split('/');

    try {
      backendProcesses.checkIfProcessExists(processDefinitionsId);
      // allow access to namespace
      next();
    } catch (err) {
      next(err);
    }
  });

  processViewNameSpace.on('connection', (socket) => {
    const namespaceName = socket.nsp.name;
    const [_, processDefinitionsId] = namespaceName.slice(1).split('/');
    logger.debug(`Client registered for updates for process with id: ${processDefinitionsId}.`);

    socket.on('data_observe_modeling', () => {
      logger.debug(
        `Client wants to observe the editing of the process with id ${processDefinitionsId}.`
      );
      socket.join(`modeling`);
    });

    socket.on('data_stop_observing_modeling', () => {
      logger.debug(
        `Client stopped observing the editing of the process with id ${processDefinitionsId}.`
      );
      socket.leave(`modeling`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Client unregistered from updates for process with id: ${processDefinitionsId}`);
    });
  });

  eventHandler.on('processRemoved', ({ processDefinitionsId }) => {
    logger.debug('Broadcasting the removal of a process.');
    io.of(`/process/${processDefinitionsId}/view`).emit('process_removed', processDefinitionsId);
  });

  eventHandler.on('processUpdated', ({ oldId, updatedInfo }) => {
    logger.debug('Broadcasting the update of a process.');
    io.of(`/process/${oldId}/view`).emit('process_updated', oldId, updatedInfo);
  });

  eventHandler.on('backend_processXmlChanged', ({ definitionsId, newXml }) => {
    io.of(`/process/${definitionsId}/view`)
      .to('modeling')
      .emit('process_xml_changed', definitionsId, newXml);
  });

  eventHandler.on(
    'backend_processTaskHtmlChanged',
    ({ processDefinitionsId, userTaskFileName, html }) => {
      io.of(`/process/${processDefinitionsId}/view`)
        .to('modeling')
        .emit('user_task_html_changed', userTaskFileName, html);
    }
  );

  eventHandler.on(
    'backend_processImageChanged',
    ({ processDefinitionsId, imageFileName, image }) => {
      io.of(`/process/${processDefinitionsId}/view`)
        .to('modeling')
        .emit('image_changed', imageFileName, image);
    }
  );

  const processEditNameSpace = io.of(/^\/process\/(\w|-)*\/edit$/);

  // make sure that access to a namespace is valid (process exists/ // TODO: socket has authorization)
  processEditNameSpace.use((socket, next) => {
    const namespaceName = socket.nsp.name;

    const [_, processDefinitionsId] = namespaceName.slice(1).split('/');

    try {
      backendProcesses.checkIfProcessExists(processDefinitionsId);
      // allow access to namespace
      next();
    } catch (err) {
      next(err);
    }
  });

  processEditNameSpace.on('connection', (socket) => {
    const namespaceName = socket.nsp.name;
    const { connectionId } = socket.handshake.auth;

    const [_, processDefinitionsId] = namespaceName.slice(1).split('/');
    logger.debug(`Client registered for editing of process with id: ${processDefinitionsId}.`);

    socket.on('data_edit_process', () => {
      logger.debug(
        `Client wants to observe the editing of the process with id ${processDefinitionsId}.`
      );
      backendProcesses.blockProcess(socket.id, processDefinitionsId);
    });

    socket.on('data_stop_editing_process', () => {
      logger.debug(
        `Client stopped observing the editing of the process with id ${processDefinitionsId}.`
      );
      backendProcesses.unblockProcess(socket.id, processDefinitionsId);
    });

    socket.on('disconnect', () => {
      logger.debug(`Client unregistered from editing process with id: ${processDefinitionsId}`);
      // prevent errors from unregistering when the process was deleted
      try {
        backendProcesses.unblockProcess(socket.id, processDefinitionsId);
      } catch (err) {}
    });

    socket.on('data_updateProcess', async (bpmn, processChanges) => {
      logger.debug(`Request to update bpmn for process with id ${processDefinitionsId}.`);
      await updateProcess(processDefinitionsId, bpmn);

      const view = io.of(`/process/${processDefinitionsId}/view`);

      // iterate over all socket in view namespace to find the one matching the client the event came from
      const [socketId] = Array.from(view.sockets).find(
        ([_, socket]) => socket.handshake.auth.connectionId === connectionId
      );

      view // send event to sockets in view namespace
        .except('modeling') // but only the ones NOT in the modeling room
        .except(socketId) // and not to the client where the event originated
        .emit('process_xml_updated', processDefinitionsId, bpmn);

      // always update last edited, and update actual meta changes if there are some
      backendProcesses.updateProcessMetaData(processDefinitionsId, processChanges);
    });

    socket.on('data_process_meta_update', async (metaDataChanges, ack) => {
      await backendProcesses.updateProcessMetaData(processDefinitionsId, metaDataChanges);
      ack();
    });

    socket.on('data_blockTask', (taskId) => {
      logger.debug(
        `Request to lock the task with id ${taskId} in process with id ${processDefinitionsId}.`
      );
      backendProcesses.blockTask(socket.id, processDefinitionsId, taskId);
    });

    socket.on('data_unblockTask', (taskId) => {
      logger.debug(
        `Request to unlock the task with id ${taskId} in process with id ${processDefinitionsId}.`
      );
      backendProcesses.unblockTask(socket.id, processDefinitionsId, taskId);
    });

    /**
     * Allows cross broadcasting into modeling room in process view namespace
     *
     * @param {String} event the event that shall be broadcasted
     * @param  {...any} data the data to send
     */
    function broadcastToModeling(event, ...data) {
      const view = io.of(`/process/${processDefinitionsId}/view`);

      // iterate over all socket in view namespace to find the one matching the client the event came from
      const [socketId] = Array.from(view.sockets).find(
        ([_, socket]) => socket.handshake.auth.connectionId === connectionId
      );

      view // send event to sockets in view namespace
        .to('modeling') // but only the ones in the modeling room
        .except(socketId) // and not to the client where the event originated
        .emit(event, ...data);
    }

    socket.on('bpmn_modeler_event', async (type, context) => {
      logger.debug(
        `Request to broadcast modeler event for process with id ${processDefinitionsId}.`
      );

      broadcastToModeling('bpmn_modeler_event_broadcast', type, context);
    });

    /**
     * Allows cross broadcasting into view namespace
     *
     * @param {String} event the event that shall be broadcasted
     * @param  {...any} data the data to send
     */
    function broadcastToView(event, ...data) {
      const view = io.of(`/process/${processDefinitionsId}/view`);

      // iterate over all socket in view namespace to find the one matching the client the event came from
      const [socketId] = Array.from(view.sockets).find(
        ([_, socket]) => socket.handshake.auth.connectionId === connectionId
      );

      view // send event to sockets in view namespace
        .except(socketId) // but not to the client where the event originated
        .emit(event, ...data);
    }

    socket.on('data_saveUserTaskHTML', async (taskId, html) => {
      logger.debug(
        `Request to save html for user task with id ${taskId} in process with id ${processDefinitionsId}.`
      );
      await saveUserTaskHTML(processDefinitionsId, taskId, html);

      broadcastToView('user_task_html_changed', taskId, html);
    });

    socket.on('data_deleteUserTaskHTML', async (taskId) => {
      logger.debug(
        `Request to delete html of user task with id ${taskId} in process with id ${processDefinitionsId}.`
      );
      await backendProcesses.deleteProcessUserTask(processDefinitionsId, taskId);
      broadcastToView('user_task_html_changed', taskId);
    });

    socket.on('data_saveImage', async (imageFileName, image, callback) => {
      logger.debug(`Request to save image in process with id ${processDefinitionsId}.`);
      await backendProcesses.saveProcessImage(processDefinitionsId, imageFileName, image);
      callback();
      broadcastToView('image_changed', imageFileName, image);
    });

    socket.on('data_saveScriptTaskJS', async (taskId, js) => {
      logger.debug(
        `Request to save the JS for the script task with id ${taskId} in process with id ${processDefinitionsId}.`
      );
      await saveScriptTaskJS(processDefinitionsId, taskId, js);
    });

    socket.on('script_changed_event', async (elId, elType, script, change) => {
      logger.debug(
        `Request to broadcast a script changed event for element with id ${elId} in process with id ${processDefinitionsId}.`
      );
      broadcastToModeling('script_changed_event_broadcast', elId, elType, script, change);
    });

    socket.on('data_updateConstraints', async (elementId, constraints) => {
      logger.debug(
        `Request to broadcast update of constraints for element with id ${elementId} in process with id ${processDefinitionsId}.`
      );
      broadcastToModeling('element_constraints_changed', elementId, constraints);
    });
  });
}
