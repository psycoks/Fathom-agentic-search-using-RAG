import { Fragment } from "react";
import type { SourceItem } from "@/types";
import { CitationBadge } from "./citation-badge";

function renderInline(text: string, sourceById: Map<number, SourceItem>, keyPrefix: string) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const num = Number(match[1]);
      return <CitationBadge key={`${keyPrefix}-c${i}`} number={num} source={sourceById.get(num)} />;
    }
    return part ? <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment> : null;
  });
}

export function AnswerStream({ text, sources }: { text: string; sources: SourceItem[] }) {
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  return (
    <div className="max-w-none space-y-4 font-serif text-[17px] leading-[1.7] text-foreground/90">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.length > 0 && lines.every((l) => l.trim().startsWith("- "));

        if (isList) {
          return (
            <ul key={bi} className="space-y-2 pl-1">
              {lines.map((line, li) => (
                <li key={li} className="flex gap-2.5">
                  <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-accent-violet" />
                  <span>{renderInline(line.replace(/^- /, ""), sourceById, `${bi}-${li}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bi}>{renderInline(block, sourceById, `${bi}`)}</p>
        );
      })}
    </div>
  );
}
