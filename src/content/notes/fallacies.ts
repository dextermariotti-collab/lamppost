import type { LessonNotes } from "@/lib/lesson-notes";

/** Unit 3: Logical fallacies. All names, places and products are made up. */
const fallacies: Record<string, LessonNotes> = {
  "fallacies-adhominem-strawman": {
    lessonId: "fallacies-adhominem-strawman",
    hook: "Most bad rebuttals don't look bad. They sound like answers, but quietly answer a different person, or a different claim.",
    idea: [
      "A rebuttal deals with the argument as it was made: its claim, its reasons and its evidence. Two common moves avoid that while seeming to reply.",
      "Ad hominem targets the person instead: their character, motives or background. “She only says that because she cycles” tells you nothing about whether the bike lane is a good idea. A strawman swaps the claim for an easier one to knock down: “trim the timetable slightly” becomes “scrap the buses”. Both leave the real argument untouched.",
      "To check, put the original next to the reply. Does the reply engage with what was actually said?",
    ],
    terms: [
      {
        term: "Ad hominem",
        meaning: "Attacking the person making an argument instead of the argument itself.",
      },
      {
        term: "Strawman",
        meaning:
          "Replacing someone's claim with a weaker or more extreme version, then attacking that instead.",
      },
      {
        term: "Rebuttal",
        meaning: "A reply that engages the argument as stated and gives reasons it fails.",
      },
    ],
    example: {
      case: "Mei proposes that Hollins Library open an hour later on weekdays to pay for Sunday opening. Owen replies: “So you want to lock out everyone who works early? Typical of someone who's never had a nine-to-five.” Asha replies: “Who uses the 9 am hour? If it's mostly older readers, Sunday won't help them.”",
      moves: [
        "Owen's first sentence swaps “open an hour later” for “lock out everyone”: a strawman.",
        "His second sentence is about Mei's working life, which has no bearing on opening hours: ad hominem.",
        "Asha's reply is blunt, but it engages the actual proposal: who loses the early hour, and does Sunday make up for it?",
        "Asha's is the rebuttal worth answering.",
      ],
    },
    subtleties: [
      {
        title: "Sometimes the person is relevant",
        body: "If a witness has lied before, or an expert is paid by the company they're praising, saying so is fair: it bears on how far to trust their testimony. It becomes ad hominem when it replaces dealing with the argument and evidence.",
      },
      {
        title: "Harsh isn't a fallacy",
        body: "A rude reply can still be a good rebuttal, and a polite one can be a strawman. Judge a reply by what it engages with, not by its tone.",
      },
    ],
    ask: "Does this reply deal with what was actually said?",
    tryIt:
      "In the next online disagreement you read, find the original claim and restate it fairly in one sentence. Then check whether the top reply answers that sentence, the person, or a different claim.",
  },

  "fallacies-dilemma-slippery-slope": {
    lessonId: "fallacies-dilemma-slippery-slope",
    hook: "Two framings make a weak case feel urgent: “it's this or disaster” and “one step leads to the next”. Both can be true, and both are often just asserted.",
    idea: [
      "A false dilemma offers two options as if they were the only ones: either we ban phones in school or we accept that pupils can't concentrate. Real choices usually have middle ground, mixtures and options nobody mentioned. The test is simple: try to name a third option.",
      "A slippery slope claims one step will set off a chain ending somewhere bad: allow one food stall and the park will be covered in fast-food chains. Chains like that do sometimes happen. The fault is asserting the links without supporting them. Check each link: is there a reason or a comparison showing this step leads to the next?",
    ],
    terms: [
      {
        term: "False dilemma",
        meaning:
          "Presenting two options as the only ones when others exist. Also called a false choice.",
      },
      {
        term: "Slippery slope",
        meaning:
          "Claiming a small step will lead to an extreme result through a chain of links nobody has supported.",
      },
    ],
    example: {
      case: "A letter to the Westmoor Gazette: “If we let the council charge £1 for the lake car park, next it will be £5, then they'll charge for the footpaths, and soon only the rich will see the lake. Either the car park stays free or we lose the lake for good.”",
      moves: [
        "Find the chain: £1, then £5, then footpath charges, then only the rich. Is any link supported by a plan, a budget or another council that did this? None is given.",
        "Find the either/or: a free car park or losing the lake. Left out: a charge with a free first hour, residents' passes, a capped fee.",
        "Rewrite it fairly: “A £1 charge may put some visitors off. Could it be capped, or residents exempted?”",
      ],
    },
    subtleties: [
      {
        title: "Some slopes are real",
        body: "If a council has raised a charge every year for a decade, warning that a new charge will rise is backed by evidence. Judge a chain by its links, not by how alarming its end is.",
      },
      {
        title: "Some choices really are binary",
        body: "A flight leaves or it doesn't; a vote is yes or no. A dilemma is false only when real options were left out. Check before you call it.",
      },
    ],
    ask: "What's the third option, and which links in this chain are supported?",
    tryIt:
      "Listen for “either… or…” and “next thing you know…” this week, in adverts, news or conversation. For each, name one option that was left out, or one link nobody supported.",
  },

  "fallacies-authority-popularity": {
    lessonId: "fallacies-authority-popularity",
    hook: "Most of what we believe we take on trust, from experts or from the people around us. That is reasonable, until the trust is placed in the wrong thing.",
    idea: [
      "Citing an expert is good reasoning when they know this specific subject, when other experts in the field broadly agree, and when there's evidence you could inspect if you wanted to. A heart surgeon on heart surgery passes. A heart surgeon on running shoes, a celebrity on nutrition, or one confident voice against a whole field does not.",
      "Popularity is evidence of popularity. Millions of buyers show that a product sells, not that it works, and plenty of popular beliefs have been wrong. A crowd counts only when its members judged for themselves, on a question they're placed to judge.",
    ],
    terms: [
      {
        term: "Appeal to authority",
        meaning:
          "Treating a claim as true because of who said it. A fallacy when they lack relevant expertise or evidence.",
      },
      {
        term: "Appeal to popularity",
        meaning: "Treating a claim as true because many people believe it or buy it.",
      },
      {
        term: "Expert consensus",
        meaning:
          "Broad agreement among the people who study a subject, reached by weighing the evidence.",
      },
    ],
    example: {
      case: "An advert for Summit Joint Gel: “Recommended by Olympic champion Lara Voss. Over 2 million tubes sold. Clinically tested.”",
      moves: [
        "Lara Voss is an expert at running, not at medicine. Her recommendation tells you she likes it, or was paid to say so.",
        "Two million tubes shows the gel is popular. It doesn't show it works better than another gel, or than nothing.",
        "“Clinically tested” is the only part that might be evidence, but it doesn't say what was tested or what was found.",
        "The question to ask: where is the test, and what was the gel compared with?",
      ],
    },
    subtleties: [
      {
        title: "Trusting experts is usually right",
        body: "Rejecting expert consensus because “experts have been wrong before” is its own mistake. They have, but non-experts have been wrong far more often. The fallacy is the empty appeal, not relying on people who know the field.",
      },
      {
        title: "Crowds can be wise",
        body: "Many separate guesses, averaged, are often accurate, like guesses at the weight of a cake at a fair. It works when people judge independently. When they copy each other, the crowd is one opinion repeated.",
      },
    ],
    ask: "Does this person know this subject, and what evidence stands behind them?",
    tryIt:
      "Look at three adverts or posts that lean on a famous face or a big number of buyers. For each, say what the person is actually expert in, and what evidence the message leaves out.",
  },

  "fallacies-circular-reasoning": {
    lessonId: "fallacies-circular-reasoning",
    hook: "Some arguments feel solid because the conclusion keeps coming back. Often that's because it never left: the reason is the conclusion, reworded.",
    idea: [
      "An argument is circular when its reason only restates its conclusion, or quietly assumes it. “The Crestmoor Herald is trustworthy because it only prints the truth” gives no reason at all: only printing the truth is what being trustworthy means. Anyone who doubts the conclusion has no more reason to accept the premise.",
      "A real reason is something separate that you could check, and that could have turned out either way: the Herald's record of corrections, an independent review of its reporting. To test a reason, ask whether it could be true while the conclusion is false. If not, it's the conclusion in disguise.",
    ],
    terms: [
      {
        term: "Circular reasoning",
        meaning:
          "Supporting a conclusion with a reason that already assumes it. Also called begging the question.",
      },
      {
        term: "Independent reason",
        meaning:
          "A reason that could be true or false separately from the conclusion, so checking it tells you something.",
      },
    ],
    example: {
      case: "“Our new manager is a great leader. Everyone follows her direction, because she's such a strong leader. And strong leaders are the ones people follow.”",
      moves: [
        "Find the conclusion: she's a great leader.",
        "Trace the reasons: people follow her because she's a strong leader, and strong leaders are those people follow. The reasons loop back to the conclusion.",
        "Ask for something separate: the team's results, how many staff stay, what the team says when asked anonymously.",
      ],
    },
    subtleties: [
      {
        title: "Definitions can do the circling",
        body: "Circular arguments often hide in a definition: “real fans buy every album”. If anyone who doesn't buy every album isn't counted as a real fan, the claim can't be wrong, and it tells you nothing about fans.",
      },
      {
        title: "“Begging the question” has two meanings",
        body: "In everyday speech it means “raises the question”. In reasoning it means assuming what you set out to prove. To avoid confusion, just say “that's circular”.",
      },
    ],
    ask: "Could this reason be true while the conclusion is false?",
    tryIt:
      "Notice one argument this week that leans on a word like “real”, “true” or “proper”. Ask whether the claim could ever be shown false, or whether the definition is doing all the work.",
  },

  "fallacies-hasty-generalization": {
    lessonId: "fallacies-hasty-generalization",
    hook: "Generalising is how we learn from experience, and also how stereotypes form. The difference is whether the cases could have shown the rule was wrong.",
    idea: [
      "A generalisation moves from some cases to a rule about many: three late trains, so the line is unreliable. That's sometimes fine. It is hasty when there are too few cases to rule out chance, or when the cases were picked in a way that couldn't have shown the rule false.",
      "Two questions check it. Are there enough cases for the size of the claim? “All”, “always” and “everyone” need far more than “some” or “often”. And how were the cases chosen? A handful you happened to notice, met in one place or remember because they stood out can't speak for the rest.",
    ],
    terms: [
      {
        term: "Generalisation",
        meaning: "A conclusion about many cases, drawn from some of them.",
      },
      {
        term: "Hasty generalisation",
        meaning: "A rule drawn from too few cases, or from cases that aren't typical of the rest.",
      },
      {
        term: "Representative",
        meaning: "Typical of the larger group in the ways that matter to the question.",
      },
    ],
    example: {
      case: "After her first week at a new office, Nadia says: “People in the finance team are unfriendly. Two of them didn't say hello in the lift, and one ignored my email.”",
      moves: [
        "Count the cases: three moments, three people, one week.",
        "Ask how they were chosen: only the moments that stood out. Friendly hellos are easy to forget.",
        "Look for other explanations: busy people, a bad day, an email caught in a filter.",
        "A fair version: “A couple of people in finance seemed short with me in my first week. I'll see whether it continues.”",
      ],
    },
    subtleties: [
      {
        title: "Not every generalisation is hasty",
        body: "A large random sample is exactly what justifies a general claim. “Most adults in this town drive to work” is fine if a proper survey shows it. The fault is overreach, not generalising.",
      },
      {
        title: "Rules about people stick",
        body: "Rules about a group, drawn from a few people you've met, are how stereotypes form, and once formed they notice only the cases that fit. When the group is people, ask especially hard how the cases were chosen.",
      },
    ],
    ask: "Enough cases, chosen in a way that could have proved me wrong?",
    tryIt:
      "This week, catch yourself once saying “always”, “never” or “all” about a group or a place. Count how many cases you're going on, and rewrite the sentence to fit them.",
  },
};

export default fallacies;
