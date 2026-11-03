"use client";

import { useEffect, useState } from "react";

interface TypingTextProps {
  words: string[];
  /** ms per character while typing (section 3.4: 50ms) */
  speed?: number;
  /** pause when a word is complete */
  hold?: number;
  className?: string;
}

/**
 * Types each word, holds, deletes, then moves to the next — with a blinking block caret.
 * Screen readers get the full list once; reduced-motion users see the first word, static.
 */
export function TypingText({ words, speed = 50, hold = 1800, className }: TypingTextProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(words[0] ?? "");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("holding");

  useEffect(() => {
    if (words.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const word = words[index % words.length] ?? "";
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      t = text.length < word.length
        ? setTimeout(() => setText(word.slice(0, text.length + 1)), speed)
        : setTimeout(() => setPhase("holding"), 0);
    } else if (phase === "holding") {
      t = setTimeout(() => setPhase(words.length > 1 ? "deleting" : "holding"), hold);
    } else {
      t = text.length > 0
        ? setTimeout(() => setText(text.slice(0, -1)), speed / 2)
        : setTimeout(() => {
            setIndex((i) => (i + 1) % words.length);
            setPhase("typing");
          }, 200);
    }
    return () => clearTimeout(t);
  }, [text, phase, index, words, speed, hold]);

  return (
    <span className={className}>
      <span className="sr-only">{words.join(", ")}</span>
      <span aria-hidden="true">
        {text}
        <span className="caret" />
      </span>
    </span>
  );
}
