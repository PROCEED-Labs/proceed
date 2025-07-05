import { ollama } from '../utils/ollama';
import { config } from '../config';
import { SEMANTIC_SPLITTER as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';

const { ollamaSplittingModel, splittingSymbol } = config;

const MIN_TEXT_LENGTH = 60; // Minimum length of text to consider for splitting (I noticed that text inputs that are too short often lead to errors in the splitting process - and since they are so small, they can be embedded directly without splitting)

export async function splitSemantically(tasks: EmbeddingTask[]): Promise<EmbeddingTask[]> {
  const splittedTasks: EmbeddingTask[] = [];
  const promises: Promise<void>[] = [];

  for (const task of tasks) {
    const messages: Message[] = [
      ...intructPrompt,
      {
        role: 'user',
        content: task.text,
      },
    ];

    // Filter out empty, whitespace-only and too short messages
    const filteredMessages: Message[] = [];
    messages.forEach((message) => {
      const content = message.content.replace(/\s+/g, ' ').trim();
      if (content.trim() !== '' && content.length > MIN_TEXT_LENGTH) {
        filteredMessages.push(message);
      } else {
        splittedTasks.push({
          ...task,
          text: message.content,
        });
      }
    });

    if (filteredMessages.length > 0) {
      const promise = ollama
        .chat({
          model: ollamaSplittingModel,
          messages: filteredMessages,
        })
        .then((response) => {
          const parts = response.message.content.split(splittingSymbol).map((part) => part.trim());
          parts.forEach((part) => {
            if (part !== '') {
              splittedTasks.push({
                ...task,
                text: part,
              });
            }
          });
        })
        .catch((error) => {
          console.error('Error during semantic splitting:', error);
          splittedTasks.push(task);
        });

      promises.push(promise);
    }
  }

  await Promise.all(promises);

  return splittedTasks;
}
