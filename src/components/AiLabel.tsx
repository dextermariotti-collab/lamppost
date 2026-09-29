import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

/**
 * Marks text that an AI wrote. The chip is the short form; `note` adds the one-line caution and
 * a link to how it works, for places where a learner reads feedback rather than a question.
 */
export function AiLabel({
  note = false,
  what = "This",
  className = "",
}: {
  note?: boolean;
  /** Names what the AI wrote, so the caution reads naturally ("The feedback"). */
  what?: string;
  className?: string;
}) {
  if (!note) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground ${className}`}
      >
        <Sparkles aria-hidden className="h-3 w-3" />
        AI-generated
      </span>
    );
  }
  return (
    <p
      className={`flex items-start gap-1.5 text-[11px] font-semibold text-muted-foreground ${className}`}
    >
      <Sparkles aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        {what} is written by an AI, which can make mistakes. Check anything important.{" "}
        <Link to="/legal/ai-content" className="font-extrabold text-primary-text underline">
          How this works
        </Link>
      </span>
    </p>
  );
}
