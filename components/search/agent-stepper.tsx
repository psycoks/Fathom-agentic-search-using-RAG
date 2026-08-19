"use client";

import { motion } from "framer-motion";
import { Search, ListTree, BookOpen, PenLine, Check } from "lucide-react";
import type { AgentStep } from "@/types";
import { cn } from "@/lib/utils";

const STEPS: { key: AgentStep; label: string; icon: typeof Search }[] = [
  { key: "decompose", label: "Plan", icon: ListTree },
  { key: "search", label: "Search", icon: Search },
  { key: "read", label: "Read", icon: BookOpen },
  { key: "synthesize", label: "Write", icon: PenLine },
];

export function AgentStepper({
  activeStep,
  label,
}: {
  activeStep: AgentStep | null;
  label?: string;
}) {
  const activeIndex = activeStep ? STEPS.findIndex((s) => s.key === activeStep) : -1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <div className="relative flex items-center gap-1.5 rounded-full px-2.5 py-1.5">
                {isActive && (
                  <motion.div
                    layoutId="agent-step-glow"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-cyan/25 to-accent-violet/25"
                    style={{ boxShadow: "0 0 18px -3px var(--color-accent-violet)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span
                  className={cn(
                    "relative flex h-4 w-4 items-center justify-center",
                    isDone && "text-accent-cyan",
                    isActive && "text-foreground",
                    !isDone && !isActive && "text-muted-foreground/40"
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </span>
                <span
                  className={cn(
                    "relative font-mono text-[11px]",
                    (isDone || isActive) ? "text-foreground" : "text-muted-foreground/40"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px w-3 shrink-0", isDone ? "bg-accent-cyan/50" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
      {label && (
        <motion.p
          key={label}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-xs text-muted-foreground"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
