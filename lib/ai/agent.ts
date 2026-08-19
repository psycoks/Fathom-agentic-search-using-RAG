import { generateText, streamText } from "ai";
import type { ChatMessage, SourceItem } from "@/types";
import { availableProviders, modelFor, modelIdFor, NoProviderConfiguredError } from "./provider";
import {
  DECOMPOSE_SYSTEM_PROMPT,
  buildDecomposePrompt,
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisPrompt,
} from "./prompts";

/** Step 1: turn the user's question into 1-4 concrete search queries. */
export async function decomposeQuery(
  query: string,
  history: ChatMessage[]
): Promise<string[]> {
  const providers = availableProviders();
  if (providers.length === 0) throw new NoProviderConfiguredError();

  // A cheap, easily-retried non-streaming call — safe to fall back across
  // every configured provider if the first one errors.
  for (const provider of providers) {
    try {
      const { text } = await generateText({
        model: modelFor(provider),
        system: DECOMPOSE_SYSTEM_PROMPT,
        prompt: buildDecomposePrompt(query, history),
      });
      return parseQueries(text, query);
    } catch (err) {
      if (provider === providers[providers.length - 1]) throw err;
      // else: try the next configured provider
    }
  }
  return [query];
}

function parseQueries(raw: string, fallbackQuery: string): string[] {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { queries?: unknown };
    if (Array.isArray(parsed.queries)) {
      const queries = parsed.queries
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .slice(0, 4);
      if (queries.length > 0) return queries;
    }
  } catch {
    // fall through to fallback below — the LLM didn't return valid JSON
  }
  return [fallbackQuery];
}

interface SynthesizeInput {
  query: string;
  history: ChatMessage[];
  sources: SourceItem[];
}

/**
 * Step 3: stream the final cited answer. Automatically retries with the
 * next configured provider if a provider fails *before* it has emitted any
 * text — once tokens have started reaching the user we can't cleanly swap
 * providers mid-sentence, so at that point we let the error propagate.
 */
export async function* synthesizeWithFallback(
  input: SynthesizeInput
): AsyncGenerator<{ text: string } | { providerUsed: string; modelUsed: string }, void, unknown> {
  const providers = availableProviders();
  if (providers.length === 0) throw new NoProviderConfiguredError();

  const historyMessages = input.history.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let lastError: unknown;

  for (const provider of providers) {
    let emittedAny = false;
    try {
      const model = modelFor(provider);
      const result = streamText({
        model,
        system: SYNTHESIS_SYSTEM_PROMPT,
        messages: [
          ...historyMessages,
          { role: "user" as const, content: buildSynthesisPrompt(input.query, input.sources) },
        ],
      });

      for await (const delta of result.textStream) {
        if (!emittedAny) {
          emittedAny = true;
          yield { providerUsed: provider, modelUsed: modelIdFor(provider) };
        }
        yield { text: delta };
      }
      return; // success — stream finished cleanly
    } catch (err) {
      lastError = err;
      if (emittedAny) throw err; // already streaming, can't switch providers now
      // otherwise: silently try the next provider
    }
  }
  throw lastError ?? new Error("All configured LLM providers failed.");
}
