"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { SourceItem } from "@/types";

export function CitationBadge({ number, source }: { number: number; source?: SourceItem }) {
  if (!source) {
    return (
      <Badge variant="citation" size="sm" aria-hidden="true">
        {number}
      </Badge>
    );
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="align-super"
          aria-label={`Source ${number}: ${source.title}`}
        >
          <Badge variant="citation" size="sm">
            {number}
          </Badge>
        </a>
      </TooltipTrigger>
      <TooltipContent>
        <p className="mb-1 font-sans font-medium text-foreground">{source.title}</p>
        <p className="line-clamp-3 font-sans text-muted-foreground">{source.snippet}</p>
        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">{source.domain}</p>
      </TooltipContent>
    </Tooltip>
  );
}
