import { getDomain } from "@/lib/utils";

// Raw shape of a single Tavily result (docs.tavily.com/documentation/api-reference/endpoint/search).
// Kept loose/defensive on purpose: this hits a real third-party API we can't
// unit test from here, so every field is optional-safe on read.
interface TavilyRawResult {
  title?: string;
  url?: string;
  content?: string;
  favicon?: string;
  score?: number;
}

interface TavilyRawResponse {
  results?: TavilyRawResult[];
}

export interface RawSearchHit {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon: string | null;
  score: number;
}

/**
 * Multiple Tavily keys are supported for free: set TAVILY_API_KEY and
 * (optionally) TAVILY_API_KEY_2. Keys are tried in round-robin order per
 * call and the client automatically fails over to the next key if one is
 * rate-limited or rejected — useful because Tavily's free tier caps monthly
 * credits, so two keys effectively doubles your search budget during a demo
 * period without any code changes.
 */
function configuredKeys(): string[] {
  return [process.env.TAVILY_API_KEY, process.env.TAVILY_API_KEY_2].filter(
    (k): k is string => Boolean(k && k.trim())
  );
}

let rotation = 0;

export class NoSearchKeyConfiguredError extends Error {
  constructor() {
    super("TAVILY_API_KEY is not set. Add it to .env.local (see .env.example).");
    this.name = "NoSearchKeyConfiguredError";
  }
}

export async function tavilySearch(query: string, maxResults = 5): Promise<RawSearchHit[]> {
  const keys = configuredKeys();
  if (keys.length === 0) throw new NoSearchKeyConfiguredError();

  let lastError: unknown;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[rotation % keys.length];
    rotation++;

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          search_depth: "basic",
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
          include_favicon: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Tavily responded with ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as TavilyRawResponse;
      return (data.results ?? [])
        .filter((r): r is TavilyRawResult & { url: string } => Boolean(r.url))
        .map((r) => ({
          title: r.title?.trim() || getDomain(r.url),
          url: r.url,
          domain: getDomain(r.url),
          snippet: (r.content ?? "").trim(),
          favicon: r.favicon ?? null,
          score: r.score ?? 0,
        }));
    } catch (err) {
      lastError = err;
      continue; // try the next key, if any
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Tavily search failed for an unknown reason.");
}
