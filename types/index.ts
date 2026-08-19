// Shared types used by both the server (app/api/search/route.ts) and the
// client (hooks/components). Keeping them in one place means the stream
// producer and stream consumer can never silently drift apart.

export type AgentStep = "decompose" | "search" | "read" | "synthesize";

export interface SourceItem {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon: string | null;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources?: SourceItem[];
  queries?: string[];
  createdAt: number;
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ---- Streaming protocol -----------------------------------------------
// The API route emits one JSON object per line (NDJSON). This union is the
// full set of events the client will ever receive for a single turn.

export type StreamEvent =
  | { type: "status"; step: AgentStep; label: string }
  | { type: "queries"; queries: string[] }
  | { type: "sources"; sources: SourceItem[] }
  | { type: "answer-delta"; text: string }
  | { type: "provider"; provider: string; model: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface SearchRequestBody {
  query: string;
  history: ChatMessage[];
}
