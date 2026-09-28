import { describe, expect, it } from "vitest";
import { UNITS, unitLinks } from "./curriculum";
import {
  EDGE_CLEARANCE,
  GRAPH_H,
  GRAPH_W,
  NODE_D,
  NODE_POSITIONS,
  NODE_R,
  pointsAlong,
  routeAllEdges,
} from "./graph-layout";

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("thinking map layout", () => {
  it("places every unit, inside the frame, without any two nodes touching", () => {
    const ids = UNITS.map((u) => u.id);
    expect(Object.keys(NODE_POSITIONS).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const p = NODE_POSITIONS[id]!;
      expect(p.x - NODE_R).toBeGreaterThanOrEqual(0);
      expect(p.x + NODE_R).toBeLessThanOrEqual(GRAPH_W);
      expect(p.y - NODE_R).toBeGreaterThanOrEqual(0);
      expect(p.y + NODE_R).toBeLessThanOrEqual(GRAPH_H);
    }
    for (const a of ids) {
      for (const b of ids) {
        if (a < b) expect(dist(NODE_POSITIONS[a]!, NODE_POSITIONS[b]!)).toBeGreaterThan(NODE_D + 8);
      }
    }
  });

  it("draws one edge per pair of linked units, carrying every concept that joins them", () => {
    const edges = routeAllEdges();
    const pairs = new Set(unitLinks().map((l) => [l.fromUnit, l.toUnit].sort().join("::")));
    expect(edges.map((e) => e.key).sort()).toEqual([...pairs].sort());
    const concepts = edges.flatMap((e) => e.links.map((l) => l.concept));
    expect(concepts.sort()).toEqual(
      unitLinks()
        .map((l) => l.concept)
        .sort(),
    );
  });

  it("never runs an edge behind a node it is not attached to", () => {
    for (const edge of routeAllEdges()) {
      for (const [id, node] of Object.entries(NODE_POSITIONS)) {
        if (id === edge.from || id === edge.to) continue;
        for (const point of pointsAlong(edge.d)) {
          expect(
            dist(point, node),
            `${edge.key} passes ${Math.round(NODE_R - dist(point, node))}px inside ${id}`,
          ).toBeGreaterThanOrEqual(NODE_R + EDGE_CLEARANCE - 1);
        }
      }
    }
  });

  it("starts and ends on the outline of the two nodes it joins, and stays in frame", () => {
    for (const edge of routeAllEdges()) {
      const points = pointsAlong(edge.d);
      const first = points[0]!;
      const last = points[points.length - 1]!;
      const fromNode = NODE_POSITIONS[edge.from]!;
      const toNode = NODE_POSITIONS[edge.to]!;
      expect(Math.abs(dist(first, fromNode) - NODE_R)).toBeLessThan(6);
      expect(Math.abs(dist(last, toNode) - NODE_R)).toBeLessThan(6);
      for (const p of points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(GRAPH_W);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(GRAPH_H);
      }
    }
  });
});
