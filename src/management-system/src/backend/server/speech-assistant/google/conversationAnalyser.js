import { conversation } from '@assistant/conversation';

const conversationAnalyser = conversation();
conversationAnalyser.handle('', (conv) => {});

export default conversationAnalyser;
