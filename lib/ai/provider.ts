import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * Multi-provider model selection.
 *
 * This is the answer to "can I use more than one API key": yes. Set any
 * combination of OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
 * in .env.local and the app will:
 *   1. Use LLM_PROVIDER if you force one explicitly, otherwise
 *   2. Auto-detect the first provider with a key present, in the priority
 *      order below, otherwise
 *   3. Throw a clear error telling you what to set.
 *
 * On top of that, `synthesizeWithFallback` (see lib/ai/agent.ts) will
 * automatically retry with the *next* available provider if the first one
 * fails before it has streamed any text — e.g. an expired key, a rate
 * limit, or a regional outage on one provider doesn't take your whole demo
 * down if you've configured a second key.
 */

export type ProviderName = "anthropic" | "openai" | "google";

// Priority order used when no LLM_PROVIDER is forced. Feel free to reorder.
const AUTO_DETECT_ORDER: ProviderName[] = ["anthropic", "openai", "google"];

function hasKey(provider: ProviderName): boolean {
  switch (provider) {
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "google":
      return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  }
}

function isProviderName(value: string): value is ProviderName {
  return value === "anthropic" || value === "openai" || value === "google";
}

/**
 * Returns every provider that currently has a usable key, ordered so the
 * forced/preferred provider (if any) comes first. This is the list
 * `synthesizeWithFallback` walks through.
 */
export function availableProviders(): ProviderName[] {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  const available = AUTO_DETECT_ORDER.filter(hasKey);

  if (forced && isProviderName(forced) && available.includes(forced)) {
    return [forced, ...available.filter((p) => p !== forced)];
  }
  return available;
}

// Default model per provider. These strings change often — check the
// provider's docs if one stops working and override it via the matching
// *_MODEL env var rather than editing this file.
const DEFAULT_MODEL: Record<ProviderName, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4.1-mini",
  google: "gemini-2.5-flash",
};

const MODEL_ENV_VAR: Record<ProviderName, string> = {
  anthropic: "ANTHROPIC_MODEL",
  openai: "OPENAI_MODEL",
  google: "GOOGLE_MODEL",
};

export function modelIdFor(provider: ProviderName): string {
  return process.env[MODEL_ENV_VAR[provider]] || DEFAULT_MODEL[provider];
}

export function modelFor(provider: ProviderName): LanguageModel {
  const modelId = modelIdFor(provider);
  switch (provider) {
    case "anthropic":
      return anthropic(modelId);
    case "openai":
      return openai(modelId);
    case "google":
      return google(modelId);
  }
}

export class NoProviderConfiguredError extends Error {
  constructor() {
    super(
      "No LLM API key found. Set at least one of OPENAI_API_KEY, " +
        "ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env.local " +
        "(see .env.example)."
    );
    this.name = "NoProviderConfiguredError";
  }
}

/** The provider + model that will actually be used right now, for display in the UI. */
export function activeProviderInfo(): { provider: ProviderName; model: string } {
  const [primary] = availableProviders();
  if (!primary) throw new NoProviderConfiguredError();
  return { provider: primary, model: modelIdFor(primary) };
}
