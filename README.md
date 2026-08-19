# Fathom — an Agentic RAG Search Engine

A working Perplexity-style search assistant: your question gets **planned into sub-queries,
searched across the live web, and synthesized into a cited answer** — streamed to the browser
step by step so you can see the agent working, not just a spinner.

Built for a final-year major project. Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 +
the Vercel AI SDK, with a hand-rolled streaming protocol so it has zero dependency on any single
LLM provider.

---

## 1. What's actually implemented

This intentionally does **not** try to build every feature in a typical "Agentic RAG SaaS"
architecture doc in one project — that combines what would realistically be 4–5 separate
capstones (auth, a live graph-orchestration visualizer, a Postgres-backed analytics dashboard,
hybrid vector+web RAG...). What's here is a complete, working core:

| Feature | Where |
|---|---|
| Query decomposition (1 question → 1-4 search queries) | `lib/ai/agent.ts` → `decomposeQuery` |
| Concurrent web search, dedupe, ranking | `lib/search/index.ts` → `searchAll` |
| Streamed, cited synthesis (`[1]`, `[2]`…) | `lib/ai/agent.ts` → `synthesizeWithFallback` |
| Multi-provider LLM (OpenAI / Anthropic / Google), auto-detect + fallback | `lib/ai/provider.ts` |
| Multi-key search with automatic failover | `lib/search/tavily.ts` |
| Custom NDJSON streaming protocol (status, sources, answer tokens) | `app/api/search/route.ts` + `hooks/use-agent-search.ts` |
| Agent progress stepper (Plan → Search → Read → Write) | `components/search/agent-stepper.tsx` |
| Source cards with favicons + inline citation badges w/ hover preview | `components/search/source-*.tsx`, `citation-badge.tsx` |
| Follow-up questions (multi-turn, context-aware) | `hooks/use-agent-search.ts` |
| Local thread history (persists across reloads) | `hooks/use-agent-search.ts` (localStorage) |
| Dark / light theme (system-aware + manual toggle) | `components/theme-*.tsx` |
| Glassmorphism + OKLCH design system | `app/globals.css` |

### Deliberately out of scope (see §5 — good "Future Scope" material for your report)

Auth/OAuth, server-side history (Postgres/Drizzle), a live LangGraph + React Flow graph
visualizer, an analytics/telemetry dashboard, and a self-hosted SearXNG fallback. All are
reasonable next steps and are discussed in §5 with where to hook them in.

---

## 2. Architecture in one page

```
 you type a question
        │
        ▼
 POST /api/search  (app/api/search/route.ts)
        │
        ├─ 1. PLAN     decomposeQuery()      → LLM turns your question into 1-4 search queries
        ├─ 2. SEARCH   searchAll()           → runs them concurrently against Tavily, dedupes, ranks
        ├─ 3. READ     (status event only — sources are already in hand)
        └─ 4. WRITE    synthesizeWithFallback() → LLM streams an answer, citing sources as [1] [2]
        │
        ▼
 NDJSON stream, one JSON event per line:
 {"type":"status", ...} → {"type":"sources", ...} → {"type":"answer-delta", ...}* → {"type":"done"}
        │
        ▼
 useAgentSearch() hook (hooks/use-agent-search.ts) reads the stream and updates React state
        │
        ▼
 UI renders live: AgentStepper, SourceRow, AnswerStream (citation badges)
```

**Why a hand-rolled NDJSON stream instead of the AI SDK's built-in data-stream protocol?**
Vercel AI SDK's streaming wire format has changed shape across major versions. A plain
`ReadableStream` of `{type, ...}` JSON lines has zero version risk, is trivial to debug
(`curl` it and read the output), and gives full control over interleaving custom events
(status/sources) with token deltas. `streamText()` from the AI SDK is still doing the actual
LLM call — this only replaces how the *result* reaches the browser.

---

## 3. Setup

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in:

1. **At least one LLM key** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY`.
2. **A Tavily key** — `TAVILY_API_KEY`, free at [app.tavily.com](https://app.tavily.com).

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Model IDs move fast. If a request fails with a "model not found"-type error, check the
> provider's current model list (linked in `.env.example`) and set the matching `*_MODEL`
> variable — no code changes needed.

---

## 4. Using more than one API key

Yes — this is built in two independent ways:

**LLM provider fallback.** Set two or three of `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` /
`GOOGLE_GENERATIVE_AI_API_KEY` at once. `lib/ai/provider.ts` auto-detects which are present
(priority: Anthropic → OpenAI → Google, or force one with `LLM_PROVIDER=openai`, etc.). If the
primary provider errors out *before* it has streamed any text — an expired key, a rate limit, a
regional outage — `synthesizeWithFallback()` in `lib/ai/agent.ts` transparently retries with the
next configured provider. (Once tokens have started reaching the browser it can't cleanly swap
mid-sentence, so it only retries pre-stream failures — that's a deliberate, documented
trade-off, not an oversight.)

**Search key rotation.** Set `TAVILY_API_KEY` and `TAVILY_API_KEY_2`. `lib/search/tavily.ts`
round-robins between them and automatically retries the other key if one is rejected or
rate-limited — useful since Tavily's free tier caps monthly credits, so two keys roughly doubles
your usable quota during a semester-long project without touching the code.

To add a third search provider (e.g. Brave), implement the same `(query) => RawSearchHit[]`
shape as `tavilySearch` in a new file under `lib/search/`, and extend `searchAll()` to call it
too.

---

## 5. Extending it (future scope)

- **Auth** — wrap `app/page.tsx` with NextAuth/Auth.js; gate `/api/search` behind a session check.
- **Server-side history** — swap the `localStorage` calls in `hooks/use-agent-search.ts` for API
  calls to a `threads` table (Drizzle + Postgres works well here); the `Thread`/`ChatMessage`
  types in `types/index.ts` are already shaped for this.
- **Live agent graph (React Flow)** — the NDJSON `status` events already carry the exact node the
  agent is on (`decompose` / `search` / `read` / `synthesize`); feed the same events into a React
  Flow graph instead of (or alongside) `AgentStepper` to get the LangGraph-Studio-style visual.
- **Hybrid RAG** — add a vector store lookup (Qdrant/pgvector) alongside `searchAll()` and merge
  results before ranking, for grounding against your own documents as well as the live web.
- **SearXNG fallback** — implement it as another `lib/search/` adapter, same pattern as Tavily.

---

## 6. Deploying

See the deployment steps provided alongside this project. Short version: push to GitHub, import
into Vercel, add the same `.env.local` variables in the Vercel dashboard, deploy.

---

## 7. Project structure

```
app/
  page.tsx              main view (hero + results)
  layout.tsx             fonts, theme + tooltip providers
  globals.css             design tokens, glassmorphism utilities
  api/search/route.ts     the agent: plan → search → read → write, streamed
components/
  ui/                    hand-built shadcn-style primitives (Button, Card, Tooltip, ...)
  search/                search-specific UI (stepper, source cards, citations, hero, sidebar)
hooks/use-agent-search.ts client-side streaming + local thread history
lib/ai/                  provider selection, prompts, decompose/synthesize logic
lib/search/              Tavily client + fan-out/ranking
types/index.ts            shared types + the NDJSON event protocol
```
