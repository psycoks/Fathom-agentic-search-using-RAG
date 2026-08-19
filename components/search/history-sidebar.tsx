"use client";

import { Plus, Trash2, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Thread } from "@/types";

export function HistorySidebar({
  threads,
  activeThreadId,
  onSelect,
  onNew,
  onDelete,
  open,
  onToggle,
}: {
  threads: Thread[];
  activeThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r border-border/60 bg-background/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 lg:bg-transparent lg:backdrop-blur-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              History
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onToggle}
              aria-label="Close history"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="glass" className="mb-4 justify-start gap-2" onClick={onNew}>
            <Plus className="h-4 w-4" /> New search
          </Button>

          <div className="flex-1 space-y-1 overflow-y-auto">
            {threads.length === 0 && (
              <p className="px-2 py-4 text-xs leading-relaxed text-muted-foreground">
                Your past searches will show up here — stored locally in your browser.
              </p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "group flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-foreground/5",
                  t.id === activeThreadId && "bg-foreground/10"
                )}
              >
                <span
                  className={cn(
                    "flex-1 truncate text-muted-foreground group-hover:text-foreground",
                    t.id === activeThreadId && "text-foreground"
                  )}
                >
                  {t.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label={`Delete "${t.title}"`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
