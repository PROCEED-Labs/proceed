const { network } = require('@proceed/system');
const db = require('../database/db');
const APIError = require('./ApiError');

/**
 * @param {*} path = /process
 */
module.exports = (path) => {
  network.put(`${path}/:definitionId/user-tasks/:fileName`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const { fileName } = req.params;
    const { body } = req;
    const { html } = body;

    await db.saveHTMLString(definitionId, fileName, html);

    return {
      statusCode: 200,
      mimeType: 'text/html',
      response: html,
    };
  });

  network.get(`${path}/:definitionId/user-tasks/:fileName`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const { fileName } = req.params;

    const html = await db.getHTML(definitionId, fileName);
    if (!html) {
      throw new APIError(404, 'HTML with given ID does not exist!');
    }
    return {
      statusCode: 200,
      mimeType: 'text/html',
      response: html,
    };
  });

  network.get(`${path}/:definitionId/user-tasks`, { cors: true }, async (req) => {
    const { definitionId } = req.params;

    const html = await db.getAllUserTasks(definitionId);

    return JSON.stringify(html);
  });
};
