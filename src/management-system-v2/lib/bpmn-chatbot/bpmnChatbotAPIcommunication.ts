'use server';

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { tools } from './bpmn-chatbot-tools';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function sendToAPI(userPrompt: string, processXml: string) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    tools: [{ functionDeclarations: tools }],
  });
  const finalPrompt =
    '<user>' + userPrompt + '</user> Use the following process as a basis: ' + processXml;
  const result = await model.generateContent(finalPrompt);
  const result_1 = result.response;
  return result_1.functionCalls();
}
