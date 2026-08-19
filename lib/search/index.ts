import type { SourceItem } from "@/types";
import { tavilySearch } from "./tavily";

const MAX_SOURCES = 8;
const MAX_RESULTS_PER_QUERY = 5;

/**
 * Runs every sub-query concurrently, merges the results, drops duplicate
 * URLs (a source found by two sub-queries is more likely to be relevant,
 * so duplicates are resolved by keeping the highest score), sorts by
 * relevance, caps the total, and assigns the stable 1..N ids the UI and
 * the LLM's citation markers both key off of.
 */
export async function searchAll(queries: string[]): Promise<SourceItem[]> {
  const settled = await Promise.allSettled(
    queries.map((q) => tavilySearch(q, MAX_RESULTS_PER_QUERY))
  );

  const byUrl = new Map<string, { title: string; url: string; domain: string; snippet: string; favicon: string | null; score: number }>();

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const hit of result.value) {
      const existing = byUrl.get(hit.url);
      if (!existing || hit.score > existing.score) {
        byUrl.set(hit.url, hit);
      }
    }
  }

  // If every single sub-query failed, surface that — the route handler
  // turns this into a user-facing error event instead of a silent 0 results.
  if (byUrl.size === 0 && settled.every((r) => r.status === "rejected")) {
    const firstRejection = settled.find(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    throw firstRejection?.reason ?? new Error("Web search failed for all sub-queries.");
  }

  return Array.from(byUrl.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCES)
    .map((hit, index) => ({
      id: index + 1,
      title: hit.title,
      url: hit.url,
      domain: hit.domain,
      snippet: hit.snippet,
      favicon: hit.favicon,
    }));
}
