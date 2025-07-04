import ollama from 'ollama';
import { config } from '../config';
import { SEMANTIC_SPLITTER as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';

const { ollamaPath, ollamaModel, splittingSymbol } = config;

export async function splitSemantically(tasks: EmbeddingTask[]): Promise<EmbeddingTask[]> {
  const splittedTasks: EmbeddingTask[] = [];

  for (const task of tasks) {
    const messages: Message[] = [
      ...intructPrompt,
      {
        role: 'user',
        content: task.text,
      },
    ];

    try {
      const response = await ollama.chat({
        model: ollamaModel,
        messages,
        // TODO: use custom url
      });

      // Split @ splittingSymbol
      const parts = response.message.content.split(splittingSymbol).map((part) => part.trim());

      console.log(response);

      parts.forEach((part) => {
        if (part !== '') {
          splittedTasks.push({
            ...task,
            text: part,
          });
        }
      });
    } catch (error) {
      console.error('Error during semantic splitting:', error);
      // Skip the splitting for this task
      splittedTasks.push(task);
      continue;
    }
  }

  return splittedTasks;
}
