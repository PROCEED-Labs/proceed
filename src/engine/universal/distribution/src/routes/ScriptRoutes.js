const { network } = require('@proceed/system');
const db = require('../database/db');
const APIError = require('./ApiError');

/**
 * @param {*} path = /process
 */
module.exports = (path) => {
  network.put(`${path}/:definitionId/script-tasks/:fileName`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const { fileName } = req.params;
    const { body } = req;
    const { script } = body;

    await db.saveScriptString(definitionId, fileName, script);

    return {
      statusCode: 200,
      mimeType: 'text/javascript',
      response: script,
    };
  });

  network.get(`${path}/:definitionId/script-tasks/:fileName`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const { fileName } = req.params;

    const script = await db.getScript(definitionId, fileName);
    if (!script) {
      throw new APIError(404, 'Script file with given ID does not exist!');
    }
    return {
      statusCode: 200,
      mimeType: 'text/javascript',
      response: script,
    };
  });

  network.get(`${path}/:definitionId/script-tasks`, { cors: true }, async (req) => {
    const { definitionId } = req.params;

    const scripts = await db.getAllScripts(definitionId);

    return JSON.stringify(scripts);
  });
};
