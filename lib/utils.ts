import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts (last one wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract a readable domain (no "www.") from a URL for display. */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Google's favicon service — no API key required, used as a fallback
 *  when a source doesn't come back with its own favicon field. */
export function favIconFor(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
}

/** Small helper for generating client-side ids (thread/message ids). */
export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
