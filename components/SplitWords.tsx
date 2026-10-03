"use client";

import { cn } from "@/lib/cn";

type Props = {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "blockquote";
  className?: string;
  id?: string;
  /** Base delay before first word (ms). Each word adds 38ms. */
  delay?: number;
  /** Wrap with data-rev for the shared reveal observer */
  reveal?: boolean;
  revealDelay?: number;
};

/**
 * Per-word split: each word rises 0.4em and fades in, 38ms incremental delay.
 * Parent must receive .in (via data-rev or className "in" / "split-words in").
 */
export function SplitWords({
  text,
  as: Tag = "p",
  className,
  id,
  delay = 0,
  reveal = true,
  revealDelay = 0,
}: Props) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag
      id={id}
      className={cn("split-words", className)}
      {...(reveal
        ? { "data-rev": true, style: { ["--d" as string]: revealDelay } }
        : {})}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span
            className="split-word"
            style={{ ["--wd" as string]: delay + i * 38 }}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
