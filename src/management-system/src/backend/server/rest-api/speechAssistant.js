import express from 'express';
import conversationAnalyser from '../speech-assistant/google/conversationAnalyser.js';

const speechAssistantRouter = express.Router();

speechAssistantRouter.post('/google-assistant', conversationAnalyser);

export default speechAssistantRouter;
