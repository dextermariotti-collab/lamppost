import {
  CHEST_DAILY_CAP,
  CHEST_PRIZES,
  HINT_OVERFLOW_GEMS,
  expectedChestGems,
} from "@/lib/rewards";

const label = (kind: "gems" | "hint", amount: number) =>
  kind === "gems" ? `${amount} gems` : `${amount} hint token${amount === 1 ? "" : "s"}`;

/**
 * What a reward chest can hold, and how likely each thing is. Always the real
 * table (the server rolls from the same one), so what is shown is what happens.
 */
export function ChestOdds() {
  return (
    <div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">What a reward chest can hold, and the chance of each</caption>
        <thead>
          <tr className="text-[12px] text-muted-foreground">
            <th scope="col" className="py-1 font-semibold">
              Inside
            </th>
            <th scope="col" className="py-1 text-right font-semibold">
              Chance
            </th>
          </tr>
        </thead>
        <tbody>
          {CHEST_PRIZES.map((prize) => (
            <tr key={prize.id} className="border-t border-border">
              <th scope="row" className="py-2 font-semibold text-foreground">
                {label(prize.kind, prize.amount)}
              </th>
              <td className="py-2 text-right font-semibold tabular-nums text-foreground">
                {prize.weight}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        The odds never change and nothing tilts them. On average a chest holds about{" "}
        {Math.round(expectedChestGems())} gems. If your hint pouch is full, a hint token turns into{" "}
        {HINT_OVERFLOW_GEMS} gems instead, and the history says so. You can open up to{" "}
        {CHEST_DAILY_CAP} a day, one for each lesson, review or daily challenge you finish. Chests
        can't be bought.
      </p>
    </div>
  );
}
