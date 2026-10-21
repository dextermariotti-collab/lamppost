import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AI_PROVIDER_NAME } from "@/lib/ai-consent";
import { publicUrl } from "@/lib/platform";

/**
 * Asked once, before the first time the learner's text goes to the AI provider: what is sent,
 * to whom, and that what comes back is written by an AI. Driven by `useAiConsentGate`.
 */
export function AiConsentSheet({
  open,
  onContinue,
  onNotNow,
}: {
  open: boolean;
  onContinue: () => void;
  onNotNow: () => void;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onNotNow();
      }}
    >
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle>Before this goes to an AI</DrawerTitle>
          <DrawerDescription>
            This part of Lamppost uses an AI service. Here is what that means. You&apos;re asked
            once on this device.
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[55vh] overflow-y-auto px-4">
          <dl className="border-y-2 border-edge">
            <div className="border-b border-border py-3">
              <dt className="legend text-muted-foreground">What is sent</dt>
              <dd className="mt-1 text-sm leading-relaxed">
                Only what you type or paste here, and the lesson or task it&apos;s about. Not your
                name, email or account.
              </dd>
            </div>
            <div className="border-b border-border py-3">
              <dt className="legend text-muted-foreground">Who gets it</dt>
              <dd className="mt-1 text-sm leading-relaxed">
                {AI_PROVIDER_NAME}, the AI service that writes the replies.
              </dd>
            </div>
            <div className="py-3">
              <dt className="legend text-muted-foreground">What comes back</dt>
              <dd className="mt-1 text-sm leading-relaxed">
                Replies written by an AI. They can be wrong, so check anything important.
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Please don&apos;t type anything private, like your full name, your address or a health
            detail.{" "}
            <a
              href={`${publicUrl()}/legal/privacy`}
              target="_blank"
              rel="noopener"
              className="font-bold text-primary-text underline"
            >
              Read the privacy policy<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>

        <div className="p-4">
          <Button
            type="button"
            onClick={onContinue}
            className="h-12 w-full rounded-sm text-base font-bold"
          >
            Continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onNotNow}
            className="mt-2 h-11 w-full rounded-sm font-bold"
          >
            Not now
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
