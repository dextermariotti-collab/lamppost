import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Lamppost is written in American English: lessons, notes, cases, checks and every screen. This
 * catches the British spellings, words and units the content was first written with, so a new
 * lesson can't bring them back. Kept as is: the party names content-rules.ts bans, the patterns
 * moderation.ts matches against what people type, and the number parser, which still reads "£".
 */
const ROOT = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const EXEMPT = [
  join("src", "content", "content-rules.ts"),
  join("src", "content", "american-english.test.ts"),
  join("src", "lib", "moderation.ts"),
  join("src", "lib", "numeric-answer.ts"),
  join("src", "lib", "numeric-answer.test.ts"),
];
const source = walk(join(ROOT, "src"))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => ({ file: relative(ROOT, file), text: readFileSync(file, "utf8") }))
  .filter(({ file }) => !EXEMPT.includes(file))
  .filter(({ file }) => !file.startsWith(join("src", "integrations", "supabase")))
  .filter(({ file }) => !/routeTree\.gen\.ts$|acknowledgements\.generated\.ts$/.test(file));

/**
 * A rule is a pattern, optionally with `except` (spans blanked from the line before matching:
 * stored values and keys, not prose) or `only` (a folder it applies to, for a word that is fine
 * in code but British in what learners read).
 */
type Rule = { rx: RegExp; except?: RegExp; only?: string };

const BRITISH: (RegExp | Rule)[] = [
  /\b(colour|favour|behaviour|neighbour|honour|rumour|harbour|labour|flavour|humour|vapour|endeavour|parlour|savour|odour|armour|vigour|rigour|tumour|candour|saviour)\w*/i,
  /\b(centre|theatre|metre|kilometre|litre|fibre|calibre|sombre|spectre|lustre|meagre)s?\b/i,
  /\bpractis(e|ed|es|ing)\b/i,
  /\b(organis|recognis|generalis|criticis|realis|apologis|summaris|prioritis|categoris|personalis|normalis|memoris|dehumanis|sexualis|randomis|energis|authoris|capitalis)(e|ed|es|ing|ation|ations|able|ably|ability|abilities|er|ers)\b/i,
  /\b(emphasis|minimis|maximis|optimis|standardis|specialis|visualis|utilis|finalis|characteris|sympathis|mobilis|familiaris|scrutinis|stabilis|rationalis|publicis|popularis|socialis|modernis|customis|globalis|legalis|localis|monetis|privatis|subsidis|sanitis|stigmatis|traumatis|victimis|polaris|hospitalis|moisturis|itemis|jeopardis|idealis|patronis|fantasis|agonis|antagonis|hypothesis|theoris|vandalis|weaponis|demonis|romanticis|trivialis|marginalis|incentivis|centralis|immunis|sterilis|neutralis|penalis|symbolis|criminalis|dramatis|economis|empathis|equalis|formalis|humanis|militaris|monopolis|moralis|naturalis|plagiaris|pressuris|regularis|revitalis|scandalis|synchronis|systematis|verbalis|vocalis|mesmeris|nationalis|internalis|sensationalis|commercialis|individualis|contextualis|harmonis|mechanis|colonis|evangelis|liberalis|politicis)(e|ed|es|ing|ation|ations|able|er|ers)\b/i,
  // "Analyses" is also the plural of "analysis", so only the verb forms.
  /\b(analys|paralys|catalys)(e|ed|ing)\b/i,
  /\b(cancelled|cancelling|labelled|labelling|travelled|travelling|trialled|modelled|modelling|fuelled|fuelling|signalled|signalling|levelled|levelling|counselling|counsellors?|quarrelled|totalled|totalling|marvellous|jewellery|woollen)\b/i,
  /\b(judgements?|programmes?|catalogue|licences?|defence|offences?|sceptic\w*|tyres?|grey|towards|afterwards|maths)\b/i,
  /\b(fulfil|fulfils|fulfilment|instalments?|skilful(ly)?|wilful(ly)?|pretence|aluminium|aeroplanes?|cheques?|kerbs?|motorways?|flatmates?|holidaymakers?|nappy|nappies)\b/i,
  /£/,
  /\b(rubbish|timetables?|footballers?|power cut|bank holiday|corner shop|exclamation marks|whilst|amongst|learnt|spelt|parcels?|loyalty scheme)\b/i,
  /\b(car parks?|high[- ]streets?|pupils?|lorry|lorries|petrol|head teacher|fortnight|councillors?)\b|(?<!real )\bestate agents?\b/i,
  /\b(enrol|enrols|enrolments?|takings|canteens?|knock-on|retail parks?|off sick|ltd|footfall|quiz nights?|league tables?|gritters?|coriander|grandads?|cycle lanes?|post ?codes?|mobile phones?)\b/i,
  // Personal trainers are American too; trainers you wear are sneakers.
  /(?<!\b(personal|fitness|dog|horse|animal) )\btrainers\b/i,
  // Gritting your teeth is American; gritting the roads is salting them.
  /\bgritting\b(?! (my|your|his|her|their|our) teeth)/i,
  /\b(to|at|from|down|round) the shops\b|\bstudents['’] union\b/i,
  // Metric units in what learners read: miles, pounds, inches and Fahrenheit instead.
  /\b\d+(\.\d+)?\s?(km|kg|cm|mm)\b|\b(kilomet(er|re)s?|kilograms?|centimet(er|re)s?|millimet(er|re)s?)\b|\d\s?°C\b/i,
  // A queue in code is a data structure; in a lesson, it's a line.
  { rx: /\bqueu(e|es|ed|ing|eing)\b/i, only: join("src", "content") },
  // "advert" stays only as an object key (advert:), a whole stored value ("advert") or an
  // alternative in a pattern (|advert|) that matches what a model writes.
  {
    rx: /\badverts?\b/i,
    except: /^\s*adverts?:|(["'])adverts?\1|(?<=\|)adverts?(?=[|)])|(?<=\()adverts?(?=\|)/gi,
  },
];
const rules: Rule[] = BRITISH.map((r) => (r instanceof RegExp ? { rx: r } : r));
const britishIn = (file: string, line: string) =>
  rules.flatMap(({ rx, except, only }) => {
    if (only && !file.startsWith(only)) return [];
    const match = (except ? line.replace(except, "∅") : line).match(rx);
    return match ? [match[0]] : [];
  });

/**
 * Step and lesson ids are permanent: saved progress and the review queue refer to them, so an id
 * written before a word was banned (the case step "knock-on") stays. Only the id is blanked, and
 * only where it is one: an `id:` value, or the second argument of cases.ts's ask()/sure() (after
 * the lesson id), and only when it's a single kebab-case token. Newlines are kept, so line
 * numbers don't move.
 */
const blank = (id: string) => "-".repeat(id.length);
const withoutIds = (text: string) =>
  text
    .replace(
      /(\bid:\s*)(["'])([a-z0-9-]+)\2/g,
      (_m, before: string, q: string, id: string) => `${before}${q}${blank(id)}${q}`,
    )
    .replace(
      /(\b(?:ask|sure)\(\s*(["'])[a-z0-9-]+\2,\s*)(["'])([a-z0-9-]+)\3/g,
      (_m, before: string, _q: string, q: string, id: string) => `${before}${q}${blank(id)}${q}`,
    );

/**
 * Known hits waiting for a fix in their own file, let through by `file: word` until then. Delete
 * an entry once its file is fixed: the last test fails while one is stale.
 */
const KNOWN: string[] = [];

const found = source.flatMap(({ file, text }) =>
  withoutIds(text)
    .split("\n")
    .flatMap((line, i) =>
      britishIn(file, line).map((word) => ({ where: `${file}:${i + 1}`, key: `${file}: ${word}` })),
    ),
);

describe("American English", () => {
  it("uses American spelling, words and units everywhere a learner reads", () => {
    const fresh = found.filter(({ key }) => !KNOWN.includes(key));
    expect(fresh.map(({ where, key }) => `${where}: ${key.split(": ")[1]}`)).toEqual([]);
  });

  it("catches what earlier reviews found by hand, and keeps ids, keys and stored values", () => {
    const sample = [
      ["      ask(", false],
      ['        "probability-second-order",', false],
      ['        "knock-on",', false],
      ['        "What\'s the knock-on effect?",', true],
      ['    { id: "grandad", kind: "choice", prompt: "Grandad says so." },', true],
      ['    source: "advert",', false],
      ['  advert: "An ad",', false],
      ['    text: "Advert: buy now.",', true],
      ['    text: "The logo is instantly recognisable.",', true],
      ['    text: "A high-street chain",', true],
      ['    text: "It weighs 2 kg and the walk is 5km at 20°C.",', true],
      ['    text: "New trainers for the gym",', true],
      ['    text: "Two personal trainers said so",', false],
      ['    text: "Joel was off sick for a fortnight",', true],
      ['    text: "A long queue outside the bakery",', true],
    ] as const;
    const file = join("src", "content", "cases.ts");
    const hits = withoutIds(sample.map(([line]) => line).join("\n"))
      .split("\n")
      .map((line) => britishIn(file, line).length > 0);
    expect(hits).toEqual(sample.map(([, british]) => british));
    expect(britishIn(join("src", "lib", "review-drills.ts"), "the review queue")).toEqual([]);
  });

  it("has no stale entries in the list of known hits", () => {
    const keys = new Set(found.map(({ key }) => key));
    expect(KNOWN.filter((key) => !keys.has(key))).toEqual([]);
  });
});
