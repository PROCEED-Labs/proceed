import express from 'express';
import { isAllowed } from '../iam/middleware/authorization';
import { changeBackendConfig, getBackendConfig } from '../../shared-electron-server/data/config';

const settingsRouter = express.Router();

settingsRouter.get('/', isAllowed('view', 'Setting'), (_, res) => {
  res.status(200).json(getBackendConfig());
});

settingsRouter.put('/', isAllowed(['update', 'create', 'delete'], 'Setting'), (req, res) => {
  changeBackendConfig(req.body);
  res.status(200).json();
});

export default settingsRouter;
