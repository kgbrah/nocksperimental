"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Small clipboard hook reused by the footer + donate panels. `copied` flips true for `timeoutMs`, then
// resets, so a button can show a transient "Copied" state without each caller re-implementing it. The
// reset timer is tracked in a ref so rapid re-clicks don't stack independent timers, and a pending reset
// is cancelled if the component unmounts (e.g. the donate dialog closes) within the window.
export function useCopy(timeoutMs = 1500): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const flagCopied = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = window.setTimeout(() => setCopied(false), timeoutMs);
  }, [timeoutMs]);

  const copy = useCallback(
    (text: string) => {
      try {
        if (navigator?.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(flagCopied).catch(() => setCopied(false));
        } else {
          setCopied(false);
        }
      } catch {
        setCopied(false);
      }
    },
    [flagCopied]
  );

  // Cancel any pending reset on unmount so it never fires setState on a gone component.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { copied, copy };
}
