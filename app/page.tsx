"use client";

import { useState } from "react";
import { PanelLeft } from "lucide-react";
import { useAgentSearch } from "@/hooks/use-agent-search";
import { SearchHero } from "@/components/search/search-hero";
import { SearchBar } from "@/components/search/search-bar";
import { AgentStepper } from "@/components/search/agent-stepper";
import { SourceRow } from "@/components/search/source-row";
import { AnswerStream } from "@/components/search/answer-stream";
import { HistorySidebar } from "@/components/search/history-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";

export default function Home() {
  const {
    hydrated,
    threads,
    activeThread,
    activeThreadId,
    liveState,
    ask,
    newThread,
    selectThread,
    deleteThread,
  } = useAgentSearch();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messages = activeThread?.messages ?? [];
  const isStreaming = liveState.status === "streaming";
  const showHero = messages.length === 0 && liveState.status === "idle";

  return (
    <div className="flex min-h-screen">
      <HistorySidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelect={(id) => {
          selectThread(id);
          setSidebarOpen(false);
        }}
        onNew={() => {
          newThread();
          setSidebarOpen(false);
        }}
        onDelete={deleteThread}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-background/70 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open history"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={newThread}
              className="font-display text-sm font-medium tracking-tight text-foreground"
            >
              <span className="bg-gradient-to-r from-accent-cyan to-accent-violet bg-clip-text text-transparent">
                fathom
              </span>
              <span className="ml-1.5 text-muted-foreground">agentic search</span>
            </button>
          </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-40">
          {showHero ? (
            <SearchHero onSubmit={ask} disabled={!hydrated} />
          ) : (
            <div className="flex-1 space-y-10 py-6">
              {messages.map((m) => (
                <MessageBlock key={m.id} message={m} />
              ))}

              {isStreaming && (
                <div className="space-y-4">
                  <AgentStepper activeStep={liveState.activeStep} label={liveState.stepLabel} />
                  {liveState.sources.length > 0 && <SourceRow sources={liveState.sources} />}
                  {liveState.answer && (
                    <AnswerStream text={liveState.answer} sources={liveState.sources} />
                  )}
                </div>
              )}

              {liveState.status === "error" && !liveState.answer && (
                <div className="glass rounded-xl border border-red-500/30 p-4 text-sm text-red-400">
                  Couldn&apos;t finish that search — {liveState.error}. Check your API keys in{" "}
                  <code className="font-mono text-xs">.env.local</code> and try again.
                </div>
              )}
            </div>
          )}
        </main>

        {!showHero && (
          <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-4 pt-10 lg:pl-72">
            <div className="mx-auto max-w-3xl">
              {liveState.provider && (
                <p className="mb-2 text-center font-mono text-[10px] text-muted-foreground/60">
                  answered by {liveState.provider.provider} · {liveState.provider.model}
                </p>
              )}
              <SearchBar onSubmit={ask} disabled={isStreaming} placeholder="Ask a follow-up…" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBlock({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
        {message.content}
      </h2>
    );
  }

  return (
    <div className="space-y-4">
      {message.sources && message.sources.length > 0 && <SourceRow sources={message.sources} />}
      <AnswerStream text={message.content} sources={message.sources ?? []} />
    </div>
  );
}
