/**
 * A stand-in for `createServerFn` so a server function's handler can be run in a
 * test without the framework's request context. It keeps the chain the app uses
 * (`middleware`, `inputValidator`, `handler`) and calls the handler directly with
 * the validated input, so the input schema and the handler are both exercised.
 *
 *   vi.mock("@tanstack/react-start", async () => (await import("@/test/server-fn")).startMock);
 */
type Handler = (args: { data: unknown; context: unknown }) => unknown;

export function createServerFn() {
  let validate: ((input: unknown) => unknown) | undefined;
  let context: unknown = {};
  const chain = {
    middleware: () => chain,
    inputValidator(fn: (input: unknown) => unknown) {
      validate = fn;
      return chain;
    },
    handler(fn: Handler) {
      return (input?: { data?: unknown; context?: unknown }) =>
        Promise.resolve().then(() =>
          fn({
            data: validate ? validate(input?.data) : input?.data,
            context: input?.context ?? context,
          }),
        );
    },
    withContext(value: unknown) {
      context = value;
      return chain;
    },
  };
  return chain;
}

export const startMock = { createServerFn };
