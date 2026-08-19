import { ExternalLink } from "lucide-react";
import type { SourceItem } from "@/types";
import { favIconFor } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function SourceCard({ source }: { source: SourceItem }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-64 shrink-0"
    >
      <Card className="h-full p-3 transition-all hover:-translate-y-0.5 hover:bg-white/10">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source.favicon ?? favIconFor(source.url)}
            alt=""
            className="h-4 w-4 rounded-sm"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {source.domain}
          </span>
          <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/50" />
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{source.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {source.snippet || "No preview available."}
        </p>
      </Card>
    </a>
  );
}
