import { ollama } from '../utils/ollama';
import { config } from '../config';
import { MATCH_REASON as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';
import { Match } from '../utils/types';
import { ReasoningError, OllamaConnectionError } from '../utils/errors';
import { getLogger } from '../utils/logger';

const { reasonModel } = config;

export async function addReason<T extends Match & { alignment: string }>(
  matches: T[],
  targetText: string,
): Promise<T[]> {
  if (matches.length === 0) {
    return matches; // No matches to reason about
  }

  const logger = getLogger();

  logger.debug('model', `Adding reasoning to ${matches.length} matches`, {
    targetTextLength: targetText.length,
    reasonModel,
  });

  const reasonMatches: T[] = await Promise.all(
    matches.map(async (match, index) => {
      const messages: Message[] = [
        ...intructPrompt,
        {
          role: 'user',
          content: `Task: ${targetText}\nCompetence: ${match.text}\nSimilarity Score: ${match.distance}\nAlignment: ${match.alignment}`,
        },
      ];
      try {
        const response = await ollama.chat({
          model: reasonModel,
          messages: messages,
        });

        // Extract the reason from the response
        const reason = response.message.content.trim();

        logger.debug('model', `Generated reasoning for match ${index + 1}/${matches.length}`, {
          matchText: match.text.substring(0, 50) + (match.text.length > 50 ? '...' : ''),
          reasonLength: reason.length,
        });

        return {
          ...match,
          reason, // Add the reason to the match
        };
      } catch (error) {
        const reasoningError = new ReasoningError(
          1, // Single match reasoning failure
          error instanceof Error ? error : new Error(String(error)),
        );

        logger.error('model', 'Failed to generate reasoning for match', reasoningError, {
          matchIndex: index,
          totalMatches: matches.length,
          targetTextLength: targetText.length,
          matchText: match.text.substring(0, 100) + (match.text.length > 100 ? '...' : ''),
          similarity: match.distance,
          reasonModel,
        });

        // If there's an error, just keep the original match without a reason
        return match;
      }
    }),
  );

  const successfulReasons = reasonMatches.filter(
    (match) => 'reason' in match && match.reason,
  ).length;

  logger.debug(
    'model',
    `Reasoning completed: ${successfulReasons}/${matches.length} matches received reasons`,
    {
      successfulReasons,
      totalMatches: matches.length,
      reasonModel,
    },
  );

  return reasonMatches;
}
