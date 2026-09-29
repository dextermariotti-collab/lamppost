import { vi } from "vitest";

/**
 * A stand-in for the service-role Supabase client, for testing server functions
 * without a database. Each table answers with what the test gave it, and every
 * chain of filters is recorded so a test can check what was asked for (for
 * example, that a query was for THIS user's rows).
 *
 * `single` answers .maybeSingle()/.single(); `rows` answers awaiting the chain;
 * `count` answers a head/count query. RPCs are `rpc` mocks the test configures.
 */
export type FakeTable = {
  single?: unknown;
  rows?: unknown[];
  count?: number;
  error?: { message: string } | null;
};

export type Call = { table: string; steps: [string, ...unknown[]][] };

export function fakeAdmin(tables: Record<string, FakeTable> = {}) {
  const calls: Call[] = [];
  const writes: { table: string; op: string; payload: unknown }[] = [];
  const rpc = vi.fn();

  const from = (table: string) => {
    const call: Call = { table, steps: [] };
    calls.push(call);
    const def = tables[table] ?? {};
    const answer = () => ({
      data: def.rows ?? [],
      count: def.count ?? def.rows?.length ?? 0,
      error: def.error ?? null,
    });
    const chain: Record<string, unknown> = {};
    const record =
      (name: string) =>
      (...args: unknown[]) => {
        call.steps.push([name, ...args]);
        return chain;
      };
    for (const method of [
      "select",
      "eq",
      "neq",
      "in",
      "gte",
      "lte",
      "lt",
      "gt",
      "order",
      "limit",
      "or",
      "not",
      "ilike",
      "is",
    ]) {
      chain[method] = record(method);
    }
    for (const op of ["insert", "update", "upsert", "delete"]) {
      chain[op] = (payload?: unknown) => {
        call.steps.push([op, payload]);
        writes.push({ table, op, payload });
        return chain;
      };
    }
    chain["maybeSingle"] = async () => ({ data: def.single ?? null, error: def.error ?? null });
    chain["single"] = chain["maybeSingle"];
    chain["then"] = (resolve: (value: unknown) => unknown) => resolve(answer());
    return chain;
  };

  return { client: { from, rpc }, rpc, calls, writes };
}

/** Whether a recorded query was filtered to `column = value`. */
export const filteredTo = (call: Call, column: string, value: unknown) =>
  call.steps.some(([name, col, val]) => name === "eq" && col === column && val === value);
