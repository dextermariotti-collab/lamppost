import { unitLinks, type UnitLink } from "./curriculum";

/**
 * Geometry of the thinking map. Everything lives in one fixed, isotropic
 * coordinate space (`GRAPH_W` x `GRAPH_H` units) that the SVG uses as its
 * viewBox and the nodes use for their percentage positions, so a distance
 * measured here is a distance on screen at any width. (The previous version
 * measured "clearance" in percent of a non-square box, so edges that looked
 * clear of a node in the maths still ran behind it.)
 */

export const GRAPH_W = 360;
export const GRAPH_H = 496;
/** Node diameter and the space an edge must keep from any node it is not attached to. */
export const NODE_D = 96;
export const NODE_R = NODE_D / 2;
export const EDGE_CLEARANCE = 10;

export type Point = { x: number; y: number };

/** Zig-zag in two columns with an open corridor between them for long edges. */
export const NODE_POSITIONS: Record<string, Point> = {
  claims: { x: 92, y: 56 },
  evidence: { x: 268, y: 120 },
  fallacies: { x: 92, y: 184 },
  biases: { x: 268, y: 248 },
  arguments: { x: 92, y: 312 },
  probability: { x: 268, y: 376 },
  media: { x: 92, y: 440 },
};

type Quad = { a: Point; c: Point; b: Point };

const at = (q: Quad, t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * q.a.x + 2 * u * t * q.c.x + t * t * q.b.x,
    y: u * u * q.a.y + 2 * u * t * q.c.y + t * t * q.b.y,
  };
};

/** The part of a quadratic curve between t0 and t1 (de Casteljau). */
function slice(q: Quad, t0: number, t1: number): Quad {
  const lerp = (p: Point, r: Point, t: number): Point => ({
    x: p.x + (r.x - p.x) * t,
    y: p.y + (r.y - p.y) * t,
  });
  const sub = (from: number, to: number, curve: Quad): Quad => {
    const start = at(curve, from);
    const end = at(curve, to);
    // Control point of the sub-curve: the curve's tangent lines meet there.
    const mid = at(curve, (from + to) / 2);
    const c = { x: 2 * mid.x - (start.x + end.x) / 2, y: 2 * mid.y - (start.y + end.y) / 2 };
    return { a: start, c, b: end };
  };
  void lerp;
  return sub(t0, t1, q);
}

const SAMPLES = 48;
const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);

/** Where along the curve it leaves node A's disc and enters node B's. */
function trim(q: Quad, gap: number): [number, number] {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i <= SAMPLES * 4; i++) {
    const t = i / (SAMPLES * 4);
    if (dist(at(q, t), q.a) >= NODE_R + gap) {
      t0 = t;
      break;
    }
  }
  for (let i = SAMPLES * 4; i >= 0; i--) {
    const t = i / (SAMPLES * 4);
    if (dist(at(q, t), q.b) >= NODE_R + gap) {
      t1 = t;
      break;
    }
  }
  return [t0, t1];
}

/** Smallest distance from the visible part of the curve to any of `others`, and how far out of frame it strays. */
function clearanceOf(visible: Quad, others: Point[]) {
  let nearest = Infinity;
  let overflow = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const p = at(visible, i / SAMPLES);
    for (const other of others) nearest = Math.min(nearest, dist(p, other));
    overflow = Math.max(overflow, 4 - p.x, p.x - (GRAPH_W - 4), 4 - p.y, p.y - (GRAPH_H - 4), 0);
  }
  return { nearest, overflow };
}

export type RoutedEdge = {
  key: string;
  from: string;
  to: string;
  /** SVG path for the visible part of the edge, node edge to node edge. */
  d: string;
  /** Midpoint of that path, where its tap target sits. */
  handle: Point;
  /** Every cross-link the edge stands for. */
  links: UnitLink[];
};

/**
 * Routes one edge as a curve that starts and ends on the node outlines and keeps
 * EDGE_CLEARANCE away from every node it isn't attached to. Bends are tried from
 * gentle to strong, on both sides, and the gentlest clear one wins.
 */
export function routeEdge(
  fromId: string,
  toId: string,
  positions: Record<string, Point> = NODE_POSITIONS,
): Omit<RoutedEdge, "key" | "links"> | null {
  const a = positions[fromId];
  const b = positions[toId];
  if (!a || !b) return null;
  const others = Object.entries(positions)
    .filter(([id]) => id !== fromId && id !== toId)
    .map(([, p]) => p);

  const length = dist(a, b) || 1;
  const nx = -(b.y - a.y) / length;
  const ny = (b.x - a.x) / length;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const need = NODE_R + EDGE_CLEARANCE + 1;

  let best: { visible: Quad; score: number } | null = null;
  const bends = [0, 14, -14, 28, -28, 44, -44, 62, -62, 82, -82, 104, -104, 130, -130, 160, -160];
  for (const bend of bends) {
    // A quadratic's midpoint sits half-way to its control point, so double the bend.
    const control = { x: mid.x + nx * bend * 2, y: mid.y + ny * bend * 2 };
    const curve: Quad = { a, c: control, b };
    const [t0, t1] = trim(curve, 2);
    if (t1 - t0 < 0.05) continue;
    const visible = slice(curve, t0, t1);
    const { nearest, overflow } = clearanceOf(visible, others);
    if (nearest >= need && overflow === 0) {
      best = { visible, score: 0 };
      break;
    }
    const score = Math.max(0, need - nearest) + overflow * 2;
    if (!best || score < best.score) best = { visible, score };
  }
  if (!best) return null;

  const { a: s, c, b: e } = best.visible;
  const handle = at(best.visible, 0.5);
  const f = (n: number) => Math.round(n * 10) / 10;
  return {
    from: fromId,
    to: toId,
    d: `M ${f(s.x)} ${f(s.y)} Q ${f(c.x)} ${f(c.y)} ${f(e.x)} ${f(e.y)}`,
    handle: { x: f(handle.x), y: f(handle.y) },
  };
}

/** One routed edge per pair of units, however many concepts join them. */
export function routeAllEdges(links: UnitLink[] = unitLinks()): RoutedEdge[] {
  const byPair = new Map<string, UnitLink[]>();
  for (const link of links) {
    const key = [link.fromUnit, link.toUnit].sort().join("::");
    byPair.set(key, [...(byPair.get(key) ?? []), link]);
  }
  return [...byPair.entries()].flatMap(([key, group]) => {
    const [from, to] = key.split("::") as [string, string];
    const route = routeEdge(from, to);
    return route ? [{ key, ...route, links: group }] : [];
  });
}

/** Point on a routed path at parameter t, for tests: parses the M/Q path back into a curve. */
export function pointsAlong(d: string, count = 40): Point[] {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const [ax, ay, cx, cy, bx, by] = nums as [number, number, number, number, number, number];
  const q: Quad = { a: { x: ax, y: ay }, c: { x: cx, y: cy }, b: { x: bx, y: by } };
  return Array.from({ length: count + 1 }, (_, i) => at(q, i / count));
}
