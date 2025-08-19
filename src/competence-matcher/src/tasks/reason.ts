import { ollama } from '../utils/ollama';
import { config } from '../config';
import { MATCH_REASON as intructPrompt } from '../utils/prompts';
import type { Message } from 'ollama';
import { Match } from '../utils/types';
import { ReasoningError, OllamaConnectionError } from '../utils/errors';
import { logError } from '../middleware/logging';

const { reasonModel, verbose } = config;

export async function addReason<T extends Match>(matches: T[], targetText: string): Promise<T[]> {
  if (matches.length === 0) {
    return matches; // No matches to reason about
  }

  if (verbose) {
    console.log(
      `[Reasoning] Adding reasons for ${matches.length} matches using model: ${reasonModel}`,
    );
  }

  const reasonMatches: T[] = await Promise.all(
    matches.map(async (match, index) => {
      const messages: Message[] = [
        ...intructPrompt,
        {
          role: 'user',
          content: `Task: ${targetText}\nCompetence: ${match.text}\nSimilarity Score: ${match.distance}`,
        },
      ];

      try {
        const response = await ollama.chat({
          model: reasonModel,
          messages: messages,
        });

        // Extract the reason from the response
        const reason = response.message.content.trim();

        if (verbose) {
          console.log(`[Reasoning] Generated reason for match ${index + 1}/${matches.length}`);
        }

        return {
          ...match,
          reason, // Add the reason to the match
        };
      } catch (error) {
        const reasoningError = new ReasoningError(
          1, // Single match reasoning failure
          error instanceof Error ? error : new Error(String(error)),
        );

        logError(reasoningError, 'reasoning_single_match_failure', undefined, {
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

  if (verbose) {
    const successfulReasons = reasonMatches.filter(
      (match) => 'reason' in match && match.reason,
    ).length;
    console.log(
      `[Reasoning] Completed: ${successfulReasons}/${matches.length} matches received reasons`,
    );
  }

  return reasonMatches;
}
