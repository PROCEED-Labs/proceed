import { ollama } from '../utils/ollama';
import { config } from '../config';
import { SEMANTIC_SPLITTER as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';
import { EmbeddingTask } from '../utils/types';
import { SemanticSplittingError, OllamaConnectionError } from '../utils/errors';
import { getLogger } from '../utils/logger';

const {
  splittingModel,
  splittingSymbol,
  ollamaBatchSize,
  splittingLength: MIN_TEXT_LENGTH,
} = config;

function getLoggerInstance() {
  return getLogger();
}

export async function splitSemantically(tasks: EmbeddingTask[]): Promise<EmbeddingTask[]> {
  const logger = getLoggerInstance();
  const splittedTasks: EmbeddingTask[] = [];
  const toSplit: { task: EmbeddingTask; messages: Message[] }[] = [];

  logger.debug('system', `Processing ${tasks.length} tasks for semantic splitting`, {
    taskCount: tasks.length,
    minTextLength: MIN_TEXT_LENGTH,
  });

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

  logger.debug('system', `[Semantic Split] ${toSplit.length} tasks require splitting`);

  // Process in batches
  for (let i = 0; i < toSplit.length; i += ollamaBatchSize) {
    const batch = toSplit.slice(i, i + ollamaBatchSize);

    logger.debug(
      'system',
      `[Semantic Split] Processing batch ${Math.floor(i / ollamaBatchSize) + 1}/${Math.ceil(toSplit.length / ollamaBatchSize)} (${batch.length} tasks)`,
    );

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
          logger.warn(
            'system',
            `[Semantic Split] No valid parts found for task ${task.listId}/${task.resourceId}/${task.competenceId}, using original text`,
          );
          splittedTasks.push({ ...task, text: task.text });
        } else {
          logger.debug(
            'system',
            `[Semantic Split] Split task ${task.listId}/${task.resourceId}/${task.competenceId} into ${parts.length} parts`,
          );
          for (const part of parts) {
            splittedTasks.push({ ...task, text: part });
          }
        }
      } catch (error) {
        const semanticError = new SemanticSplittingError(
          task.text.length,
          error instanceof Error ? error : new Error(String(error)),
        );

        logger.error('system', 'Semantic splitting error', semanticError, {
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
      logger.error(
        'system',
        'Semantic splitting error',
        new SemanticSplittingError(
          batch.length,
          error instanceof Error ? error : new Error(String(error)),
        ),
        { batchSize: batch.length, batchIndex: Math.floor(i / ollamaBatchSize) },
      );
    }
  }

  logger.debug(
    'system',
    `[Semantic Split] Completed: ${tasks.length} input tasks → ${splittedTasks.length} output tasks`,
  );

  return splittedTasks;
}
