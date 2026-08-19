"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentStep, ChatMessage, SourceItem, StreamEvent, Thread } from "@/types";
import { uid } from "@/lib/utils";

const STORAGE_KEY = "agentic-search:threads";
const MAX_STORED_THREADS = 50;

export interface LiveState {
  status: "idle" | "streaming" | "done" | "error";
  activeStep: AgentStep | null;
  stepLabel: string;
  queries: string[];
  sources: SourceItem[];
  answer: string;
  provider: { provider: string; model: string } | null;
  error: string | null;
}

const IDLE_STATE: LiveState = {
  status: "idle",
  activeStep: null,
  stepLabel: "",
  queries: [],
  sources: [],
  answer: "",
  provider: null,
  error: null,
};

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: Thread[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(threads.slice(0, MAX_STORED_THREADS))
    );
  } catch {
    // localStorage can throw (private browsing, quota) — history just won't
    // persist across reloads, which is a fine degradation for a demo app.
  }
}

function titleFrom(query: string): string {
  const trimmed = query.trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}

export function useAgentSearch() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>(IDLE_STATE);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Threads live in localStorage, so only load them after mount.
  useEffect(() => {
    setThreads(loadThreads());
    setHydrated(true);
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const persist = useCallback((next: Thread[]) => {
    setThreads(next);
    saveThreads(next);
  }, []);

  const newThread = useCallback(() => {
    abortRef.current?.abort();
    setActiveThreadId(null);
    setLiveState(IDLE_STATE);
  }, []);

  const selectThread = useCallback((id: string) => {
    abortRef.current?.abort();
    setActiveThreadId(id);
    setLiveState(IDLE_STATE);
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      const next = threads.filter((t) => t.id !== id);
      persist(next);
      if (activeThreadId === id) {
        setActiveThreadId(null);
        setLiveState(IDLE_STATE);
      }
    },
    [threads, persist, activeThreadId]
  );

  const ask = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      const priorMessages = activeThread?.messages ?? [];
      const userMessage: ChatMessage = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      const threadId = activeThread?.id ?? uid();
      const now = Date.now();

      // Optimistically show the user's message and enter the streaming state.
      setActiveThreadId(threadId);
      setLiveState({ ...IDLE_STATE, status: "streaming" });

      const withUserMessage: Thread = activeThread
        ? { ...activeThread, messages: [...activeThread.messages, userMessage], updatedAt: now }
        : {
            id: threadId,
            title: titleFrom(trimmed),
            messages: [userMessage],
            createdAt: now,
            updatedAt: now,
          };

      persist([withUserMessage, ...threads.filter((t) => t.id !== threadId)]);

      const controller = new AbortController();
      abortRef.current = controller;

      let answerSoFar = "";
      let sourcesSoFar: SourceItem[] = [];
      let queriesSoFar: string[] = [];

      const finalize = (status: "done" | "error", errorMessage?: string) => {
        setLiveState((prev) => ({ ...prev, status, error: errorMessage ?? null }));

        // Persist an assistant message if we produced (even partial) content.
        if (answerSoFar.trim().length > 0) {
          const assistantMessage: ChatMessage = {
            id: uid(),
            role: "assistant",
            content: errorMessage ? `${answerSoFar}\n\n[Response cut short: ${errorMessage}]` : answerSoFar,
            sources: sourcesSoFar,
            queries: queriesSoFar,
            createdAt: Date.now(),
          };
          setThreads((prevThreads) => {
            const updated = prevThreads.map((t) =>
              t.id === threadId
                ? { ...t, messages: [...t.messages, assistantMessage], updatedAt: Date.now() }
                : t
            );
            saveThreads(updated);
            return updated;
          });
        }
      };

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, history: priorMessages }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Request failed with status ${res.status}.`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as StreamEvent;

            switch (event.type) {
              case "status":
                setLiveState((prev) => ({ ...prev, activeStep: event.step, stepLabel: event.label }));
                break;
              case "queries":
                queriesSoFar = event.queries;
                setLiveState((prev) => ({ ...prev, queries: event.queries }));
                break;
              case "sources":
                sourcesSoFar = event.sources;
                setLiveState((prev) => ({ ...prev, sources: event.sources }));
                break;
              case "provider":
                setLiveState((prev) => ({
                  ...prev,
                  provider: { provider: event.provider, model: event.model },
                }));
                break;
              case "answer-delta":
                answerSoFar += event.text;
                setLiveState((prev) => ({ ...prev, answer: prev.answer + event.text }));
                break;
              case "error":
                throw new Error(event.message);
              case "done":
                break;
            }
          }
        }

        finalize("done");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        finalize("error", err instanceof Error ? err.message : "Something went wrong.");
      }
    },
    [activeThread, threads, persist]
  );

  return {
    hydrated,
    threads,
    activeThread,
    activeThreadId,
    liveState,
    ask,
    newThread,
    selectThread,
    deleteThread,
  };
}
