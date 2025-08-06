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

    return '';
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
    `${path}/process/:definitionId/instance/:instanceId/files/:fileName`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId, fileName } = req.params;
      const { body } = req;

      console.log('Submitting File');

      const filename = `${fileName}-${instanceId}`;

      console.log(fileName, instanceId, filename);

      const file = Buffer.from(body.data);
      await db.saveInstanceFile(definitionId, instanceId, fileName, file);

      return '';
    },
  );
};
