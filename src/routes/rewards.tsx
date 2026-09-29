import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem, Gift, Loader2, Lock, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ChestOdds } from "@/components/ChestOdds";
import { CompanionAvatar } from "@/components/CompanionAvatar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StreakFreezeCard } from "@/components/StreakFreezeCard";
import { Button } from "@/components/ui/button";
import { useCompanion, useSessionUser } from "@/lib/companion-store";
import { dayKey, useProgress, type ChestOutcome, type PurchaseOutcome } from "@/lib/progress";
import {
  CHEST_DAILY_CAP,
  COSMETICS,
  HINT_COST,
  MAX_HINT_TOKENS,
  describePrize,
  type ChestRecord,
  type Cosmetic,
} from "@/lib/rewards";
import { canBuyHint, chestsLeft, chestsOpenedOn } from "@/lib/rewards-state";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — Lamppost" },
      {
        name: "description",
        content:
          "Spend gems on streak freezes, hint tokens and companion cosmetics, and open the reward chests you have earned.",
      },
      { property: "og:title", content: "Rewards — Lamppost" },
      {
        property: "og:description",
        content: "What your gems can buy, and what a reward chest can hold.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/rewards" }],
  }),
  component: RewardsScreen,
});

function RewardsScreen() {
  const { state, hydrated, buyFreeze, buyHint, unlockCosmetic, openChest } = useProgress();
  const { userId } = useSessionUser();
  const { companion } = useCompanion();
  const day = dayKey();
  const left = hydrated ? chestsLeft(state, day) : 0;
  const openedToday = hydrated ? chestsOpenedOn(state, day) : 0;

  return (
    <PhoneFrame>
      <ScreenHeader title="Rewards" backTo="/progress" />
      <div className="px-5 pb-10">
        <section className="mt-5 flex items-center gap-4 rounded-3xl bg-card p-5 shadow-soft">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-text"
          >
            <Gem className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground">Your gems</p>
            <p
              className="text-3xl font-bold leading-none text-foreground"
              data-testid="gem-balance"
            >
              {hydrated ? state.gems.toLocaleString("en-GB") : "—"}
            </p>
          </div>
        </section>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Gems come from finishing lessons, reviews and reward chests. They can't be bought with
          money, and nothing here runs out or counts down.{" "}
          {userId
            ? "They're kept on your account, so they follow you to any device."
            : "Sign in and they're kept on your account, so they follow you to any device."}
        </p>

        <ChestsSection
          left={left}
          openedToday={openedToday}
          history={state.chestHistory}
          onOpen={() => openChest("lesson")}
        />

        <StreakFreezeCard freezes={state.freezes} gems={state.gems} onBuy={buyFreeze} />

        <HintSection tokens={state.hintTokens} gems={state.gems} onBuy={buyHint} />

        <section className="mt-8 border-t border-border pt-5" aria-labelledby="cosmetics-heading">
          <h2 id="cosmetics-heading" className="text-base">
            Companion cosmetics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unlocked once, yours to wear. They change how your companion looks and nothing else.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {COSMETICS.map((item) => (
              <CosmeticCard
                key={item.id}
                item={item}
                owned={state.cosmetics.includes(item.id)}
                gems={state.gems}
                companion={companion}
                onUnlock={() => unlockCosmetic(item.id)}
              />
            ))}
          </ul>
        </section>
      </div>
    </PhoneFrame>
  );
}

function ChestsSection({
  left,
  openedToday,
  history,
  onOpen,
}: {
  left: number;
  openedToday: number;
  history: ChestRecord[];
  onOpen: () => Promise<ChestOutcome>;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const open = () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    void onOpen()
      .then((result) =>
        setNote(result.ok ? `Inside: ${describePrize(result.record)}` : result.message),
      )
      .catch(() => setNote("That couldn't go through just now."))
      .finally(() => setBusy(false));
  };

  return (
    <section className="mt-8 border-t border-border pt-5" aria-labelledby="chests-heading">
      <h2 id="chests-heading" className="flex items-center gap-2 text-base">
        <Gift aria-hidden className="h-4 w-4 text-primary-text" /> Reward chests
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You earn one for each lesson, review or daily challenge you finish, up to {CHEST_DAILY_CAP}{" "}
        a day. Opened today: {openedToday} of {CHEST_DAILY_CAP}.
      </p>

      {left > 0 ? (
        <Button
          type="button"
          onClick={open}
          disabled={busy}
          aria-busy={busy}
          className="mt-3 h-11 w-full rounded-full font-semibold"
        >
          {busy ? <Loader2 aria-hidden className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {busy ? "Opening…" : left === 1 ? "Open your chest" : `Open a chest (${left} waiting)`}
        </Button>
      ) : (
        <p className="mt-3 rounded-2xl bg-muted/60 px-4 py-3 text-[13px] font-semibold text-muted-foreground">
          {openedToday >= CHEST_DAILY_CAP
            ? "That's all three for today."
            : "No chest waiting. Finish a lesson, a review or the daily challenge and there will be one."}
        </p>
      )}
      {note && (
        <p role="status" className="mt-2 text-sm font-semibold text-foreground">
          {note}
        </p>
      )}

      <details className="mt-4" id="odds">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary-text">
          The odds
        </summary>
        <div className="pb-2">
          <ChestOdds />
        </div>
      </details>

      <h3 className="mt-4 text-sm">History</h3>
      {history.length === 0 ? (
        <p className="mt-1 text-[13px] text-muted-foreground">No chests opened yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
          {history.map((record, i) => (
            <li
              key={`${record.day}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="text-sm font-semibold text-foreground">
                {record.kind === "gems"
                  ? `${record.amount} gems`
                  : `${record.amount} hint token${record.amount === 1 ? "" : "s"}`}
                {record.converted ? (
                  <span className="block text-[12px] font-normal text-muted-foreground">
                    Your hint pouch was full, so it was paid as gems.
                  </span>
                ) : null}
              </span>
              <time className="shrink-0 text-[12px] text-muted-foreground" dateTime={record.day}>
                {new Date(`${record.day}T12:00:00`).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HintSection({
  tokens,
  gems,
  onBuy,
}: {
  tokens: number;
  gems: number;
  onBuy: () => Promise<PurchaseOutcome>;
}) {
  const full = tokens >= MAX_HINT_TOKENS;
  return (
    <section className="mt-8 border-t border-border pt-5" aria-labelledby="hints-heading">
      <h2 id="hints-heading" className="flex items-center gap-2 text-base">
        <Sparkles aria-hidden className="h-4 w-4 text-primary-text" /> Hint tokens
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A hint token gives you a guiding question on a review or challenge drill without taking half
        the XP. You hold {tokens} of {MAX_HINT_TOKENS}.
      </p>
      {!full && (
        <Purchase
          label={`Get a hint token for ${HINT_COST} gems`}
          short={`${Math.max(HINT_COST - gems, 0)} more gems for a hint token`}
          affordable={canBuyHint({ gems, hintTokens: tokens })}
          onBuy={onBuy}
        />
      )}
    </section>
  );
}

/** One buy button with a working state and a plain reason when it didn't go through. */
function Purchase({
  label,
  short,
  affordable,
  onBuy,
}: {
  label: string;
  short: string;
  affordable: boolean;
  onBuy: () => Promise<PurchaseOutcome>;
}) {
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const buy = () => {
    if (pending) return;
    setPending(true);
    setProblem(null);
    void onBuy()
      .then((outcome) => setProblem(outcome.ok ? null : outcome.message))
      .catch(() => setProblem("That couldn't go through just now. Your gems were not spent."))
      .finally(() => setPending(false));
  };

  return (
    <>
      <Button
        type="button"
        onClick={buy}
        disabled={!affordable || pending}
        aria-busy={pending}
        className="mt-3 h-11 w-full rounded-full font-semibold"
      >
        {pending ? <Loader2 aria-hidden className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        {pending ? "One moment…" : affordable ? label : short}
      </Button>
      {problem && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-destructive">
          {problem}
        </p>
      )}
    </>
  );
}

function CosmeticCard({
  item,
  owned,
  gems,
  companion,
  onUnlock,
}: {
  item: Cosmetic;
  owned: boolean;
  gems: number;
  companion: ReturnType<typeof useCompanion>["companion"];
  onUnlock: () => Promise<PurchaseOutcome>;
}) {
  const preview = item.kind === "accessory" ? { accessory: item.id } : { palette: item.id };
  return (
    <li className="flex flex-col items-center rounded-3xl bg-card p-3 text-center shadow-soft">
      <CompanionAvatar companion={{ ...companion, ...preview }} size={72} />
      <p className="mt-1 text-sm font-semibold text-foreground">{item.name}</p>
      <p className="text-[12px] text-muted-foreground">
        {item.kind === "accessory" ? "Accessory" : "Colour"}
      </p>
      {owned ? (
        <Link
          to="/companion"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-text"
        >
          Yours — wear it
        </Link>
      ) : (
        <CosmeticBuy item={item} gems={gems} onUnlock={onUnlock} />
      )}
    </li>
  );
}

function CosmeticBuy({
  item,
  gems,
  onUnlock,
}: {
  item: Cosmetic;
  gems: number;
  onUnlock: () => Promise<PurchaseOutcome>;
}): ReactNode {
  const affordable = gems >= item.cost;
  return (
    <div className="w-full">
      <Purchase
        label={`Unlock for ${item.cost}`}
        short={`${item.cost - gems} more gems`}
        affordable={affordable}
        onBuy={onUnlock}
      />
      {!affordable && (
        <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Lock aria-hidden className="h-3 w-3" /> {item.cost} gems
        </p>
      )}
    </div>
  );
}
