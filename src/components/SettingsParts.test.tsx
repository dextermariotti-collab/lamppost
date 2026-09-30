// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusSheet, SegmentedRow, SettingsGroup, SettingsRow } from "./SettingsParts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("Settings parts", () => {
  it("groups rows under one label", () => {
    render(
      <SettingsGroup label="Comfort">
        <SettingsRow title="Sound effects" sub="Short tones." />
      </SettingsGroup>,
    );
    const group = screen.getByRole("region", { name: "Comfort" });
    expect(within(group).getByText("Sound effects")).toBeTruthy();
  });

  it("makes a row with somewhere to go a link, or a button, with a chevron either way", () => {
    const onClick = vi.fn();
    const { container } = render(
      <SettingsGroup label="About">
        <SettingsRow title="About and policies" to="/legal" />
        <SettingsRow title="Training focus" value="Not set" onClick={onClick} />
        <SettingsRow title="Static" />
      </SettingsGroup>,
    );
    expect(screen.getByRole("link", { name: /About and policies/ }).getAttribute("href")).toBe(
      "/legal",
    );
    fireEvent.click(screen.getByRole("button", { name: /Training focus.*Not set/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });

  it("shows the current choice as pressed and reports a change", () => {
    const onChange = vi.fn();
    render(
      <SegmentedRow
        label="Daily goal"
        options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
        value={2}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole("group", { name: "Daily goal" });
    expect(within(group).getByRole("button", { name: "2" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(within(group).getByRole("button", { name: "3" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("offers the five situations in a sheet, says what they change, and saves on choosing", () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <FocusSheet open onOpenChange={onOpenChange} value="misinformation" onChange={onChange} />,
    );
    expect(screen.getByText(/Review drills borrow examples/)).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(
      (
        screen.getByRole("radio", { name: /Spot misinformation/ }) as HTMLButtonElement
      ).getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: /Work and meetings/ }));
    expect(onChange).toHaveBeenCalledWith("work");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
