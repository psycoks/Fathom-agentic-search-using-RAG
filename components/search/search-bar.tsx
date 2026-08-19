"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SearchBar({
  onSubmit,
  disabled,
  placeholder,
  autoFocus,
  large,
}: {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={cn(
        "glass-strong flex items-end gap-2 rounded-2xl p-2 transition-shadow focus-within:ring-2 focus-within:ring-accent-violet/40",
        large && "p-3"
      )}
    >
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ask anything…"}
        autoFocus={autoFocus}
        rows={1}
        disabled={disabled}
        className={cn(
          "max-h-40 resize-none border-0 bg-transparent px-2 py-2 focus-visible:ring-0",
          large && "text-base"
        )}
      />
      <Button
        variant="glow"
        size="icon"
        disabled={disabled || !value.trim()}
        onClick={submit}
        aria-label="Ask"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
