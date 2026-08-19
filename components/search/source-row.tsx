import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceCard } from "./source-card";
import type { SourceItem } from "@/types";

export function SourceRow({ sources }: { sources: SourceItem[] }) {
  if (sources.length === 0) return null;

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {sources.length} source{sources.length === 1 ? "" : "s"}
      </p>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-3">
          {sources.map((s) => (
            <SourceCard key={s.id} source={s} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
