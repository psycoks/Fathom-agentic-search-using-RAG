"use client";

import { SearchBar } from "./search-bar";

const EXAMPLE_PROMPTS = [
  "Compare Rust and Go for backend systems",
  "What changed in the latest Next.js release?",
  "Explain retrieval-augmented generation simply",
  "Latest developments in fusion energy",
];

export function SearchHero({
  onSubmit,
  disabled,
}: {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center px-4 text-center">
      <div className="glow-orb" aria-hidden="true" />
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Agentic Web Research
      </p>
      <h1 className="text-balance font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
        Ask anything.
        <br />
        Surface cited answers.
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        Every question gets planned, searched across the live web, and written up with sources
        you can check for yourself.
      </p>

      <div className="mt-8 w-full max-w-2xl">
        <SearchBar onSubmit={onSubmit} disabled={disabled} large autoFocus placeholder="Ask anything…" />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onSubmit(p)}
            disabled={disabled}
            className="glass rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
