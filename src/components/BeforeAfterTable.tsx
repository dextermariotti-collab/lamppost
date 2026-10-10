import { LineBullet } from "@/components/LineBullet";
import type { CheckResult, CheckStore } from "@/lib/unit-checks";

const cell = (result: CheckResult | undefined) =>
  result ? `${result.right}/${result.total}` : "–";

/**
 * Each unit's check results side by side: before the unit, straight after it, and three months
 * on. The "3 months" column only appears once someone has a result in it.
 */
export function BeforeAfterTable({
  units,
  checks,
  className = "",
}: {
  units: readonly { id: string; title: string }[];
  checks: CheckStore;
  className?: string;
}) {
  const later = units.some((u) => checks[u.id]?.later);
  return (
    <table className={`w-full border-collapse text-sm ${className}`}>
      <caption className="sr-only">Unit check results before, after and three months on</caption>
      <thead>
        <tr className="border-b-2 border-edge">
          <th scope="col" className="legend py-2 text-left text-muted-foreground">
            Line
          </th>
          <th scope="col" className="legend w-14 py-2 text-right text-muted-foreground">
            Before
          </th>
          <th scope="col" className="legend w-14 py-2 text-right text-muted-foreground">
            After
          </th>
          {later && (
            <th scope="col" className="legend w-16 py-2 text-right text-muted-foreground">
              3 mo.
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {units.map((unit) => {
          const r = checks[unit.id];
          return (
            <tr key={unit.id} className="border-b border-border">
              <th scope="row" className="py-2 pr-2 text-left font-semibold">
                <span className="flex min-w-0 items-center gap-2">
                  <LineBullet unitId={unit.id} />
                  <span className="truncate">{unit.title}</span>
                </span>
              </th>
              <td className="py-2 text-right font-mono font-bold">{cell(r?.before)}</td>
              <td className="py-2 text-right font-mono font-bold">{cell(r?.after)}</td>
              {later && <td className="py-2 text-right font-mono font-bold">{cell(r?.later)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
