import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Lamppost is written in American English: lessons, notes, cases, checks and every screen. This
 * catches the British spellings and words the content was first written with, so a new lesson
 * can't bring them back. Kept as is: the party names content-rules.ts bans, the patterns
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

const BRITISH = [
  /\b(colour|favour|behaviour|neighbour|honour|rumour|harbour|labour)\w*/i,
  /\b(centre|theatre|metre|kilometre)s?\b/i,
  /\bpractis(e|ed|es|ing)\b/i,
  /\b(organis|recognis|generalis|criticis|realis|apologis|summaris|prioritis|categoris|personalis|normalis|memoris|dehumanis|sexualis|randomis|energis|authoris|capitalis)(e|ed|es|ing|ation|ations)\b/i,
  /\b(cancelled|cancelling|labelled|labelling|travelled|travelling|trialled)\b/i,
  /\b(judgements?|programmes?|catalogue|licences?|defence|offences?|sceptic\w*|tyres?|grey|towards|afterwards|maths)\b/i,
  /£/,
  /\b(rubbish|timetables?|footballers?|power cut|bank holiday|corner shop|exclamation marks|whilst|amongst|learnt|spelt|parcels?|loyalty scheme)\b/i,
  /\b(car parks?|high street|pupils?|lorry|lorries|petrol|head teacher|fortnight|councillors?)\b|(?<!real )\bestate agents?\b/i,
  // "advert" stays only as a stored value ("advert") or an object key (advert:).
  /(?<!["|(])\badverts?\b(?!["'|:])/i,
];

describe("American English", () => {
  it("uses American spelling and words everywhere a learner reads", () => {
    const found = source.flatMap(({ file, text }) =>
      text.split("\n").flatMap((line, i) =>
        BRITISH.flatMap((rx) => {
          const match = line.match(rx);
          return match ? [`${file}:${i + 1}: ${match[0]}`] : [];
        }),
      ),
    );
    expect(found).toEqual([]);
  });
});
