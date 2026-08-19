import { NextRequest } from "next/server";
import { z } from "zod";
import type { StreamEvent } from "@/types";
import { decomposeQuery, synthesizeWithFallback } from "@/lib/ai/agent";
import { searchAll } from "@/lib/search";

export const runtime = "nodejs";
// Agentic search involves several sequential network calls (LLM + search),
// so give it more headroom than Next's default before the platform times
// the request out.
export const maxDuration = 60;

const requestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        createdAt: z.number(),
      })
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { query, history } = parsed.data;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        send({ type: "status", step: "decompose", label: "Understanding your question…" });
        const queries = await decomposeQuery(query, history);
        send({ type: "queries", queries });

        send({ type: "status", step: "search", label: "Searching the web…" });
        const sources = await searchAll(queries);
        send({ type: "sources", sources });

        send({
          type: "status",
          step: "read",
          label: `Reading ${sources.length} source${sources.length === 1 ? "" : "s"}…`,
        });

        send({ type: "status", step: "synthesize", label: "Writing your answer…" });
        const generator = synthesizeWithFallback({ query, history, sources });
        for await (const chunk of generator) {
          if ("text" in chunk) {
            send({ type: "answer-delta", text: chunk.text });
          } else {
            send({ type: "provider", provider: chunk.providerUsed, model: chunk.modelUsed });
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Something went wrong while researching that.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
