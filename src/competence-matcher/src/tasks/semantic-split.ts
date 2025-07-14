import { ollama } from '../utils/ollama';
import { config } from '../config';
import { SEMANTIC_SPLITTER as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';
import { EmbeddingTask } from '../utils/types';

const { splittingModel, splittingSymbol, ollamaBatchSize } = config;

const MIN_TEXT_LENGTH = 60; // Minimum length of text to consider for splitting (I noticed that text inputs that are too short often lead to errors in the splitting process - and since they are so small, they can be embedded directly without splitting)

// async function ollamaChat(messages: Array<{ role: string; content: string }>) {
//   const res = await fetch(`${ollamaPath}/api/chat`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       model: config.ollamaSplittingModel,
//       messages,
//       stream: false,
//     }),
//   });
//   if (!res.ok) {
//     const t = await res.text();
//     throw new Error(`Ollama REST chat failed: ${res.status} ${t}`);
//   }
//   const data = (await res.json()) as { message: { content: string } };
//   return data.message.content as string;
// }

// export async function splitSemantically(tasks: EmbeddingTask[]): Promise<EmbeddingTask[]> {
//   const splittedTasks: EmbeddingTask[] = [];

//   // First, for each task, decide whether it needs splitting (filteredMessages)
//   // or can be passed through as‐is.
//   const toSplit: { task: EmbeddingTask; messages: Message[] }[] = [];
//   for (const task of tasks) {
//     const messages: Message[] = [...intructPrompt, { role: 'user', content: task.text }];

//     // Filter out too‐short or empty
//     const filtered = messages.filter(({ content }) => {
//       const c = content.replace(/\s+/g, ' ').trim();
//       return c.length > MIN_TEXT_LENGTH;
//     });

//     if (filtered.length === 0) {
//       // no splitting needed
//       splittedTasks.push({ ...task, text: task.text });
//     } else {
//       toSplit.push({ task, messages: filtered });
//     }
//   }

//   // Now process in batches of size ollamaBatchSize
//   for (let i = 0; i < toSplit.length; i += ollamaBatchSize) {
//     const batch = toSplit.slice(i, i + ollamaBatchSize);

//     // Kick off all requests in this batch in parallel
//     const promises = batch.map(async ({ task, messages }) => {
//       try {
//         const response = await ollamaChat(messages);
//         const parts = response
//           .replace(/\s+/g, ' ')
//           .trim()
//           .split(splittingSymbol)
//           .map((p: string) => p.trim())
//           .filter((p: string) => p.length > 0);

//         if (parts.length === 0) {
//           // fallback to original text if splitting yields nothing
//           splittedTasks.push({ ...task, text: task.text });
//         } else {
//           for (const part of parts) {
//             splittedTasks.push({ ...task, text: part });
//           }
//         }
//       } catch (err) {
//         console.error('Error during semantic splitting:', err);
//         // in case of error, include the original
//         splittedTasks.push({ ...task, text: task.text });
//       }
//     });

//     // Wait for this batch to finish before launching the next
//     await Promise.all(promises);
//   }

//   return splittedTasks;
// }

// _______________________________________________

export async function splitSemantically(tasks: EmbeddingTask[]): Promise<EmbeddingTask[]> {
  const splittedTasks: EmbeddingTask[] = [];
  const toSplit: { task: EmbeddingTask; messages: Message[] }[] = [];

  for (const task of tasks) {
    const messages: Message[] = [
      ...intructPrompt,
      {
        role: 'user',
        content: task.text,
      },
    ];

    // Filter out empty, whitespace-only and too short messages
    const filteredMessages = messages.filter((message) => {
      const content = message.content
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove potential occurences of splittingSymbol in upper and lower case
        .replace(new RegExp(splittingSymbol, 'gi'), ' ')
        // Trim leading and trailing whitespace
        .trim();
      return content !== '' && content.length > MIN_TEXT_LENGTH;
    });

    if (filteredMessages.length === 0) {
      splittedTasks.push({ ...task, text: task.text });
    } else {
      toSplit.push({ task, messages: filteredMessages });
    }
  }

  // Process in batches
  for (let i = 0; i < toSplit.length; i += ollamaBatchSize) {
    const batch = toSplit.slice(i, i + ollamaBatchSize);

    const promises = batch.map(async ({ task, messages }) => {
      try {
        const response = await ollama.chat({
          model: splittingModel,
          messages,
        });
        const parts = response.message.content
          .split(splittingSymbol)
          .map((part: string) => part.trim())
          .filter((part: string) => part !== '');

        if (parts.length === 0) {
          splittedTasks.push({ ...task, text: task.text });
        } else {
          for (const part of parts) {
            splittedTasks.push({ ...task, text: part });
          }
        }
      } catch (error) {
        console.error('Error during semantic splitting:', error);
        splittedTasks.push({ ...task, text: task.text });
      }
    });

    await Promise.all(promises);
  }

  return splittedTasks;
}
