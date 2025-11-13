const { network } = require('@proceed/system');
const db = require('../database/db');
const APIError = require('./ApiError');

/**
 * @param {*} path = /process
 */
module.exports = (path) => {
  // retrieve image from resources-path
  network.get(`${path}/process/:definitionId/images/:fileName`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const { fileName } = req.params;

    const image = await db.getImage(definitionId, fileName);
    if (!image) {
      throw new APIError(404, 'Image with given ID does not exist!');
    }

    return {
      statusCode: 200,
      mimeType: 'image/png image/svg+xml image/jpeg',
      response: image,
    };
  });

  network.put(`${path}/process/:definitionId/images/:fileName`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const { fileName } = req.params;
    const { body } = req;

    const image = Buffer.from(body.data);
    await db.saveImage(definitionId, fileName, image);

    return {
      statusCode: 200,
      mimeType: 'text',
      response: '',
    };
  });

  network.get(`${path}/process/:definitionId/images/`, { cors: true }, async (req) => {
    const { definitionId } = req.params;

    const imageFileNames = await db.getImages(definitionId);

    return JSON.stringify(imageFileNames);
  });

  network.get(
    `${path}/process/:definitionId/instance/:instanceId/files/:fileName`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId, fileName } = req.params;

      const file = await db.getInstanceFile(definitionId, instanceId, fileName);

      return {
        statusCode: 200,
        mimeType: 'image/png image/svg+xml image/jpeg',
        response: file,
      };
    },
  );

  network.put(
    `${path}/process/:definitionId/instance/:instanceId/file/:fileName`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId, fileName } = req.params;
      const { mimeType } = req.query;
      const { body } = req;

      const file = Buffer.from(body);

      const path = await db.saveInstanceFile(definitionId, instanceId, fileName, mimeType, file);

      return {
        statusCode: 200,
        mimeType: 'text',
        response: path,
      };
    },
  );

  network.get(
    `${path}/process/:definitionId/instance/:instanceId/file/:fileName`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId, fileName } = req.params;

      const { mimeType, data } = await db.getInstanceFile(definitionId, instanceId, fileName);

      return {
        statusCode: 200,
        mimeType,
        response: data,
      };
    },
  );
};
