import { describe, expect, it } from "vitest";
import { ageBandFor, ageOn, decideAge } from "./age-gate";

// A fixed "today" so the birthday boundaries are exact: 15 June 2026.
const TODAY = new Date(2026, 5, 15, 12, 0, 0);
const kind = (year: string, month: string, day: string) =>
  decideAge({ year, month, day }, TODAY).kind;

describe("the signup age check", () => {
  it("waits until every field is filled in and the year has four digits", () => {
    expect(kind("", "6", "15")).toBe("incomplete");
    expect(kind("2010", "", "15")).toBe("incomplete");
    expect(kind("2010", "6", "")).toBe("incomplete");
    expect(kind("20", "6", "15")).toBe("incomplete");
    expect(kind(" ", " ", " ")).toBe("incomplete");
  });

  it("blocks anyone who has not had their thirteenth birthday yet, down to the day", () => {
    expect(kind("2013", "6", "16")).toBe("blocked"); // turns 13 tomorrow
    expect(kind("2013", "6", "15")).toBe("teen"); // turns 13 today
    expect(kind("2020", "1", "1")).toBe("blocked");
    expect(kind("2026", "6", "15")).toBe("blocked"); // born today
  });

  it("puts 13 to 17 in the teen band and 18 and over in the adult band, down to the day", () => {
    expect(kind("2008", "6", "16")).toBe("teen"); // turns 18 tomorrow
    expect(kind("2008", "6", "15")).toBe("adult"); // turns 18 today
    expect(kind("1990", "1", "1")).toBe("adult");
  });

  it("refuses dates that don't exist or can't be right", () => {
    expect(kind("2010", "2", "30")).toBe("invalid");
    expect(kind("2010", "4", "31")).toBe("invalid");
    expect(kind("2010", "13", "1")).toBe("invalid");
    expect(kind("2010", "0", "1")).toBe("invalid");
    expect(kind("2010", "1", "0")).toBe("invalid");
    expect(kind("2027", "1", "1")).toBe("invalid"); // in the future
    expect(kind("1850", "1", "1")).toBe("invalid");
    expect(kind("1899", "1", "1")).toBe("invalid");
    expect(kind("abcd", "1", "1")).toBe("invalid");
    expect(kind("2010", "1.5", "1")).toBe("invalid");
    expect(kind("2010", "-1", "1")).toBe("invalid");
  });

  it("handles 29 February", () => {
    expect(kind("2012", "2", "29")).toBe("teen"); // a real leap day
    expect(kind("2011", "2", "29")).toBe("invalid"); // not a leap year
    // Born on a leap day: the birthday has not happened on 28 February of a common year.
    expect(ageOn(2012, 2, 29, new Date(2026, 1, 28))).toBe(13);
    expect(ageOn(2012, 2, 29, new Date(2026, 2, 1))).toBe(14);
  });

  it("does not need the date in any particular format", () => {
    expect(kind(" 2000 ", " 06 ", " 05 ")).toBe("adult");
  });

  it("maps the decision to the age band that is stored, and only for people allowed an account", () => {
    expect(ageBandFor(decideAge({ year: "2008", month: "7", day: "1" }, TODAY))).toBe("13-17");
    expect(ageBandFor(decideAge({ year: "1990", month: "7", day: "1" }, TODAY))).toBe("18+");
    expect(ageBandFor(decideAge({ year: "2020", month: "7", day: "1" }, TODAY))).toBeNull();
    expect(ageBandFor({ kind: "incomplete" })).toBeNull();
    expect(ageBandFor({ kind: "invalid" })).toBeNull();
  });
});
