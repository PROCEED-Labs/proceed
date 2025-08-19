import { ollama } from '../utils/ollama';
import { config } from '../config';
import { SEMANTIC_SPLITTER as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';
import { EmbeddingTask } from '../utils/types';
import { SemanticSplittingError, OllamaConnectionError } from '../utils/errors';
import { logError } from '../middleware/logging';

const {
  splittingModel,
  splittingSymbol,
  ollamaBatchSize,
  splittingLength: MIN_TEXT_LENGTH,
  verbose,
} = config;

export async function splitSemantically(tasks: EmbeddingTask[]): Promise<EmbeddingTask[]> {
  const splittedTasks: EmbeddingTask[] = [];
  const toSplit: { task: EmbeddingTask; messages: Message[] }[] = [];

  if (verbose) {
    console.log(`[Semantic Split] Processing ${tasks.length} tasks`);
  }

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

    if (filteredMessages.length === 0 || MIN_TEXT_LENGTH === 0) {
      splittedTasks.push({ ...task, text: task.text });
    } else {
      toSplit.push({ task, messages: filteredMessages });
    }
  }

  if (verbose) {
    console.log(`[Semantic Split] ${toSplit.length} tasks require splitting`);
  }

  // Process in batches
  for (let i = 0; i < toSplit.length; i += ollamaBatchSize) {
    const batch = toSplit.slice(i, i + ollamaBatchSize);

    if (verbose) {
      console.log(
        `[Semantic Split] Processing batch ${Math.floor(i / ollamaBatchSize) + 1}/${Math.ceil(toSplit.length / ollamaBatchSize)} (${batch.length} tasks)`,
      );
    }

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
          if (verbose) {
            console.warn(
              `[Semantic Split] No valid parts found for task ${task.listId}/${task.resourceId}/${task.competenceId}, using original text`,
            );
          }
          splittedTasks.push({ ...task, text: task.text });
        } else {
          if (verbose) {
            console.log(
              `[Semantic Split] Split task ${task.listId}/${task.resourceId}/${task.competenceId} into ${parts.length} parts`,
            );
          }
          for (const part of parts) {
            splittedTasks.push({ ...task, text: part });
          }
        }
      } catch (error) {
        const semanticError = new SemanticSplittingError(
          task.text.length,
          error instanceof Error ? error : new Error(String(error)),
        );

        logError(semanticError, 'semantic_splitting_task_failure', undefined, {
          taskId: `${task.listId}/${task.resourceId}/${task.competenceId}`,
          textLength: task.text.length,
          splittingModel,
        });

        // Fallback to original text
        splittedTasks.push({ ...task, text: task.text });
      }
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      // This shouldn't happen since we catch errors in individual promises,
      // but just in case there's an unexpected Promise.all failure
      logError(
        new SemanticSplittingError(
          batch.length,
          error instanceof Error ? error : new Error(String(error)),
        ),
        'semantic_splitting_batch_failure',
        undefined,
        { batchSize: batch.length, batchIndex: Math.floor(i / ollamaBatchSize) },
      );
    }
  }

  if (verbose) {
    console.log(
      `[Semantic Split] Completed: ${tasks.length} input tasks → ${splittedTasks.length} output tasks`,
    );
  }

  return splittedTasks;
}
