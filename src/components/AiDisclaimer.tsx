import { Link } from "@tanstack/react-router";
import { HeartPulse, Sparkles } from "lucide-react";

type Props = {
  /** Adds the stricter, separate training/fitness notice. */
  fitness?: boolean;
  className?: string;
};

/**
 * Shown wherever AI-generated lessons or programs are presented. The fitness
 * notice is intentionally a separate block, never merged into the general one.
 */
export function AiDisclaimer({ fitness = false, className = "" }: Props) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
        <p className="text-[11px] leading-relaxed font-semibold text-muted-foreground">
          AI-generated and may contain errors. Not professional, medical, legal or financial advice
          — verify anything important independently.{" "}
          <Link to="/legal/ai-content" className="font-extrabold text-primary-text underline">
            How this works
          </Link>
        </p>
      </div>

      {fitness && (
        <div className="flex items-start gap-2 rounded-2xl bg-flame/10 p-3">
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-flame" />
          <p className="text-[11px] leading-relaxed font-semibold text-foreground/80">
            Training content: talk to a doctor before starting any new program. Lamppost is not a
            coach or medical supervisor, and you train at your own risk.{" "}
            <Link to="/legal/health" className="font-extrabold text-flame underline">
              Health &amp; fitness disclaimer
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
