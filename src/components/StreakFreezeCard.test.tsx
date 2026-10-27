// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StreakFreezeCard } from "./StreakFreezeCard";

afterEach(cleanup);

const button = () => screen.getByRole("button");

describe("StreakFreezeCard", () => {
  it("offers a freeze the learner can afford, at a 44px target", () => {
    render(<StreakFreezeCard freezes={1} gems={100} onBuy={async () => ({ ok: true })} />);
    expect(button().textContent).toMatch(/get another for 60 gems/i);
    expect((button() as HTMLButtonElement).disabled).toBe(false);
    expect(button().className).toMatch(/\bh-11\b/);
  });

  it("says how many more gems are needed, and can't be pressed, when short", () => {
    render(<StreakFreezeCard freezes={1} gems={45} onBuy={async () => ({ ok: true })} />);
    expect(button().textContent).toMatch(/15 more gems/i);
    expect((button() as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers nothing once the learner holds as many as they can", () => {
    render(<StreakFreezeCard freezes={2} gems={500} onBuy={async () => ({ ok: true })} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows that it is working while the server decides, and can't be pressed twice", async () => {
    let settle!: (value: { ok: true }) => void;
    const onBuy = vi.fn(() => new Promise<{ ok: true }>((resolve) => (settle = resolve)));
    render(<StreakFreezeCard freezes={1} gems={100} onBuy={onBuy} />);

    fireEvent.click(button());
    expect(button().textContent).toMatch(/getting your freeze/i);
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(button().getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button());
    expect(onBuy).toHaveBeenCalledTimes(1);

    await act(async () => settle({ ok: true }));
    expect(button().textContent).toMatch(/get another/i);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells the learner why it didn't go through, and lets them try again", async () => {
    const onBuy = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "You don't have enough gems for that yet." })
      .mockResolvedValueOnce({ ok: true });
    render(<StreakFreezeCard freezes={1} gems={100} onBuy={onBuy} />);

    await act(async () => fireEvent.click(button()));
    expect(screen.getByRole("alert").textContent).toBe("You don't have enough gems for that yet.");

    await act(async () => fireEvent.click(button()));
    expect(onBuy).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says nothing was spent if the purchase throws", async () => {
    render(
      <StreakFreezeCard
        freezes={1}
        gems={100}
        onBuy={async () => {
          throw new Error("offline");
        }}
      />,
    );
    await act(async () => fireEvent.click(button()));
    expect(screen.getByRole("alert").textContent).toMatch(/gems were not spent/i);
    expect((button() as HTMLButtonElement).disabled).toBe(false);
  });
});
