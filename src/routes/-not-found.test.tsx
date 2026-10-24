// @vitest-environment jsdom
import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { LESSONS } from "@/lib/curriculum";
import { Route as AnyOtherPath } from "./$";
import { Route as LessonRoute } from "./course.$slug.lesson.$index";
import { Route as NotesRoute } from "./notes.$lessonId";

/** What a route's beforeLoad does with these params: let the page open, or throw. */
function load(route: { options: { beforeLoad?: unknown } }, params: Record<string, string>) {
  const beforeLoad = route.options.beforeLoad as (ctx: { params: Record<string, string> }) => void;
  try {
    beforeLoad({ params });
    return "opens";
  } catch (error) {
    return isNotFound(error) ? "404" : error;
  }
}

describe("addresses that are no page", () => {
  it("are the app's 404 when nothing else matches", () => {
    expect(load(AnyOtherPath, { _splat: "nope" })).toBe("404");
  });

  it("are a 404 for notes of a lesson that doesn't exist", () => {
    expect(load(NotesRoute, { lessonId: "not-a-lesson" })).toBe("404");
    expect(load(NotesRoute, { lessonId: "" })).toBe("404");
  });

  it("open the notes of every real lesson, done or not (the page itself says when they open)", () => {
    for (const lesson of LESSONS) expect(load(NotesRoute, { lessonId: lesson.id })).toBe("opens");
  });

  it("are a 404 for a lesson number outside the map, instead of the nearest lesson", () => {
    const slug = "critical-thinking";
    for (const index of ["0", String(LESSONS.length + 1), "99", "-1"]) {
      expect(load(LessonRoute, { slug, index })).toBe("404");
    }
  });

  it("are a 404 for a lesson number that isn't a whole number", () => {
    const slug = "critical-thinking";
    for (const index of ["abc", "2.5", "1e1", " 3", "", "0x2"]) {
      expect(load(LessonRoute, { slug, index })).toBe("404");
    }
  });

  it("open every lesson from 1 to the last, counted from the lesson list", () => {
    const slug = "critical-thinking";
    for (let n = 1; n <= LESSONS.length; n++) {
      expect(load(LessonRoute, { slug, index: String(n) })).toBe("opens");
    }
  });
});
