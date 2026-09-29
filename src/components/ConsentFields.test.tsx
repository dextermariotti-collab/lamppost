// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in signup form: the fields, and a button that is enabled only when the form is ready. */
async function mountForm() {
  const { ConsentFields, UnderAgeNotice } = await import("./ConsentFields");
  const { useConsentForm } = await import("@/lib/use-consent-form");
  function Harness() {
    const form = useConsentForm();
    if (form.blocked) return <UnderAgeNotice />;
    return (
      <>
        <ConsentFields form={form} />
        <button disabled={!form.ready}>Create account</button>
        <output data-testid="claim">{JSON.stringify(form.claim)}</output>
      </>
    );
  }
  render(<Harness />);
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const enterBirth = (year: number, month: number, day: number) => {
  type("Month", String(month));
  type("Day", String(day));
  type("Year", String(year));
};
const create = () => screen.getByRole("button", { name: "Create account" }) as HTMLButtonElement;
const agree = () => screen.getByRole("checkbox", { name: /I agree to the/ }) as HTMLInputElement;
const yearsAgo = (years: number, extraDays = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + extraDays);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
};

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(cleanup);

describe("the signup age and consent fields", () => {
  it("starts with nothing filled in and the agreement unchecked", async () => {
    await mountForm();
    expect(agree().checked).toBe(false);
    expect((screen.getByLabelText("Month") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("Day") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Year") as HTMLInputElement).value).toBe("");
    expect(create().disabled).toBe(true);
  });

  it("gives no hint of which age gets in", async () => {
    await mountForm();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\b13\b|\b18\b|must be|at least|years old|old enough|minimum/i);
  });

  it("needs the agreement as well as an age", async () => {
    await mountForm();
    const { year, month, day } = yearsAgo(30);
    enterBirth(year, month, day);
    expect(create().disabled).toBe(true);
    fireEvent.click(agree());
    expect(create().disabled).toBe(false);
    fireEvent.click(agree());
    expect(create().disabled).toBe(true);
  });

  it("links to both documents in a new tab, so the form isn't lost", async () => {
    await mountForm();
    const terms = screen.getByRole("link", { name: /Terms/ });
    const privacy = screen.getByRole("link", { name: /Privacy Policy/ });
    expect(terms.getAttribute("href")).toBe("/legal/terms");
    expect(privacy.getAttribute("href")).toBe("/legal/privacy");
    for (const link of [terms, privacy]) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toMatch(/noopener/);
    }
  });

  it("clicking a link does not tick the box", async () => {
    await mountForm();
    fireEvent.click(screen.getByRole("link", { name: /Terms/ }));
    expect(agree().checked).toBe(false);
  });

  it("asks a 13-to-17-year-old for a parent or guardian's permission, and needs it", async () => {
    await mountForm();
    expect(screen.queryByRole("checkbox", { name: /parent or guardian/i })).toBeNull();
    const { year, month, day } = yearsAgo(15);
    enterBirth(year, month, day);
    fireEvent.click(agree());
    expect(create().disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /parent or guardian/i }));
    expect(create().disabled).toBe(false);
    expect(JSON.parse(screen.getByTestId("claim").textContent!)).toMatchObject({
      ageBand: "13-17",
      guardianConfirmed: true,
    });
  });

  it("doesn't ask an adult for anyone's permission, and records only the age band", async () => {
    await mountForm();
    const { year, month, day } = yearsAgo(30);
    enterBirth(year, month, day);
    fireEvent.click(agree());
    expect(screen.queryByRole("checkbox", { name: /parent or guardian/i })).toBeNull();
    const claim = JSON.parse(screen.getByTestId("claim").textContent!);
    expect(claim).toMatchObject({ ageBand: "18+", guardianConfirmed: false });
    expect(JSON.stringify(claim)).not.toContain(String(year));
  });

  it("says when a date isn't real, without blocking anyone", async () => {
    await mountForm();
    enterBirth(2000, 2, 31);
    expect(screen.getByRole("alert").textContent).toMatch(/real date/i);
    expect(create().disabled).toBe(true);
  });

  it("only takes digits in the day and year", async () => {
    await mountForm();
    type("Day", "1a2");
    type("Year", "19x9y0");
    expect((screen.getByLabelText("Day") as HTMLInputElement).value).toBe("12");
    expect((screen.getByLabelText("Year") as HTMLInputElement).value).toBe("1990");
  });
});

describe("someone under the minimum age", () => {
  const blockSomeone = async () => {
    await mountForm();
    const { year, month, day } = yearsAgo(10);
    enterBirth(year, month, day);
  };

  it("is stopped, told plainly, and shown no form", async () => {
    await mountForm();
    const { year, month, day } = yearsAgo(10);
    enterBirth(year, month, day);
    expect(screen.getByRole("alert").textContent).toMatch(/can't make an account/i);
    expect(screen.queryByLabelText("Year")).toBeNull();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });

  it("has nothing they entered stored anywhere", async () => {
    await mountForm();
    const { year, month, day } = yearsAgo(10);
    enterBirth(year, month, day);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    expect(document.body.textContent).not.toContain(String(year));
  });

  it("stays blocked while they move around the app, until the page is reloaded", async () => {
    await blockSomeone();
    cleanup();
    // Navigating away and back re-mounts the form; the block is still there.
    const { ConsentFields, UnderAgeNotice } = await import("./ConsentFields");
    const { useConsentForm } = await import("@/lib/use-consent-form");
    function Again() {
      const form = useConsentForm();
      return form.blocked ? <UnderAgeNotice /> : <ConsentFields form={form} />;
    }
    render(<Again />);
    expect(screen.getByRole("alert").textContent).toMatch(/can't make an account/i);
    cleanup();

    // A reload starts a fresh module, and nothing was kept.
    vi.resetModules();
    await mountForm();
    expect(screen.getByLabelText("Year")).toBeTruthy();
    expect(window.localStorage.length).toBe(0);
  });

  it("is blocked on the birthday they turn thirteen the day before, and let in on the day", async () => {
    await mountForm();
    const turns13Tomorrow = yearsAgo(13, 1);
    enterBirth(turns13Tomorrow.year, turns13Tomorrow.month, turns13Tomorrow.day);
    expect(screen.getByRole("alert").textContent).toMatch(/can't make an account/i);
    cleanup();

    vi.resetModules();
    await mountForm();
    const turns13Today = yearsAgo(13);
    enterBirth(turns13Today.year, turns13Today.month, turns13Today.day);
    await act(async () => undefined);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("checkbox", { name: /parent or guardian/i })).toBeTruthy();
  });
});
