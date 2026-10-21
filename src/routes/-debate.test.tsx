// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordAiConsent } from "@/lib/ai-consent";
import type { DebateSummary } from "@/lib/debate.functions";

const h = vi.hoisted(() => ({
  data: null as unknown,
  refetch: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: h.data, isLoading: false, refetch: h.refetch }),
}));
vi.mock("@/lib/account", () => ({
  useAccount: () => ({ signedIn: true, sessionReady: true }),
}));
vi.mock("@/lib/debate.functions", () => ({
  getDebate: vi.fn(),
  listDebates: vi.fn(),
  markDebateSeen: vi.fn(async () => ({ ok: true })),
  submitDebateResponse: h.submit,
}));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ScreenHeader", () => ({ ScreenHeader: () => null }));
vi.mock("@/components/ReportContentButton", () => ({
  ReportContentButton: ({ context }: { context: { courseTopic?: string; excerpt?: string } }) => (
    <button type="button" data-topic={context.courseTopic} data-excerpt={context.excerpt}>
      Report this content
    </button>
  ),
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
  useParams: () => ({ id: "debate-1" }),
  useNavigate: () => vi.fn(),
}));

import { Route as DebateRoute } from "./debate.$id";
import { Route as DebatesRoute } from "./debates";

const DebateScreen = DebateRoute.options.component as () => ReactNode;
const DebatesScreen = DebatesRoute.options.component as () => ReactNode;

const score = (n: number, feedback: string) => ({ score: n, feedback });
const grade = (total: number, tip: string) => ({
  scores: { claim: score(3, "Clear."), reasons: score(2, "Thin."), objection: score(2, "Brief.") },
  tip,
  total,
  max: 12,
});

const OPEN: DebateSummary = {
  id: "debate-1",
  topic: "School uniforms",
  passage: "Motion: schools should require uniforms. Some say they cut costs; others disagree.",
  prompt: "Argue your side in three to five sentences.",
  mySide: "for",
  theirSide: "against",
  opponent: { id: "o", handle: "sam", displayName: "Sam" },
  status: "open",
  myAnswer: null,
  theirAnswer: null,
  myGrade: null,
  theirGrade: null,
  winner: null,
  myTurn: true,
  unseenResult: false,
  createdAt: "2026-10-20T12:00:00Z",
};

const MY_CASE =
  "Uniforms cut what families spend on clothes, and they take one daily pressure off students.";

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  h.data = OPEN;
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe("A debate", () => {
  it("labels the AI-written motion and lets it be reported", () => {
    render(<DebateScreen />);
    expect(screen.getByText("AI-generated")).toBeTruthy();
    const report = screen.getByRole("button", { name: /report this content/i });
    expect(report.dataset["topic"]).toBe("Debate");
    expect(report.dataset["excerpt"]).toContain(OPEN.passage);
    expect(report.dataset["excerpt"]).toContain(OPEN.prompt);
  });

  it("asks before the learner's case goes to the grader, and Not now sends nothing", async () => {
    h.submit.mockResolvedValue({ ok: true });
    render(<DebateScreen />);
    fireEvent.change(screen.getByLabelText("Your case"), { target: { value: MY_CASE } });
    fireEvent.click(screen.getByRole("button", { name: /submit my case/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(h.submit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /submit my case/i }));
    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    });
    expect(h.submit).toHaveBeenCalledWith({ data: { id: "debate-1", answer: MY_CASE } });
  });

  it("doesn't ask again once they've agreed", async () => {
    recordAiConsent();
    h.submit.mockResolvedValue({ ok: true });
    render(<DebateScreen />);
    fireEvent.change(screen.getByLabelText("Your case"), { target: { value: MY_CASE } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit my case/i }));
    });
    expect(h.submit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lets the scoring be reported, without the other person's words in it", () => {
    h.data = {
      ...OPEN,
      status: "graded",
      myTurn: false,
      myAnswer: MY_CASE,
      theirAnswer: "Uniforms cost money up front and limit how students express themselves.",
      myGrade: grade(9, "Answer the strongest objection."),
      theirGrade: grade(7, "Give a second reason."),
      winner: "you",
    } satisfies DebateSummary;
    render(<DebateScreen />);
    const reports = screen.getAllByRole("button", { name: /report this content/i });
    expect(reports).toHaveLength(2);
    const scoring = reports[1]!.dataset["excerpt"] ?? "";
    expect(scoring).toContain("Answer the strongest objection.");
    expect(scoring).toContain("Give a second reason.");
    expect(scoring).not.toContain("limit how students express themselves");
    expect(scoring).not.toContain("Sam");
  });
});

describe("The debates list", () => {
  it("says the motions are written by an AI", () => {
    h.data = [OPEN];
    render(<DebatesScreen />);
    expect(screen.getByText(/Each motion is written by an AI/)).toBeTruthy();
  });

  it("says nothing about AI while there are no debates", () => {
    h.data = [];
    render(<DebatesScreen />);
    expect(screen.queryByText(/written by an AI/)).toBeNull();
  });
});
