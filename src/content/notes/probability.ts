import type { LessonNotes } from "@/lib/lesson-notes";

/** Unit 6: Probability & decisions. All names, places and products are made up. */
const probability: Record<string, LessonNotes> = {
  "probability-base-rates": {
    lessonId: "probability-base-rates",
    hook: "A test that is 95% accurate sounds nearly certain. What a positive result means depends on something the test can't tell you: how common the thing is.",
    idea: [
      "The base rate is how common something is before you look at any specific evidence. With a rare condition, most people tested don't have it, so even a small false-alarm rate in that large healthy group can produce more false positives than true ones.",
      "The clearest way to see it is to count people instead of using percentages. Picture 1,000 people. If 1 in 100 has the condition, that's 10. A test that catches 9 of them and wrongly flags 5% of the other 990 flags about 50 healthy people. Only 9 of 59 positives are real: about 15%.",
      "Start every judgement from the base rate, then let the evidence move you.",
    ],
    terms: [
      {
        term: "Base rate",
        meaning: "How common something is in the group, before any test or specific evidence.",
      },
      {
        term: "False positive",
        meaning: "A test saying yes when the true answer is no.",
      },
      {
        term: "Natural frequencies",
        meaning:
          "Counts like “9 out of 59” instead of percentages. They make base-rate problems much easier to see.",
      },
    ],
    example: {
      case: "A bank's fraud system wrongly flags 2% of normal card payments and catches 99% of real fraud. About 1 in 1,000 payments is fraud. Your payment has just been flagged. How likely is it to be fraud?",
      moves: [
        "Picture 100,000 payments: 100 are fraud and 99,900 are normal.",
        "The system catches about 99 of the 100 frauds, and wrongly flags 2% of the normal ones: about 1,998.",
        "Flagged payments: 99 + 1,998 = 2,097. Of those, 99 are fraud: under 5%.",
        "So a flag is worth checking, but it's far more likely a false alarm than fraud.",
      ],
    },
    subtleties: [
      {
        title: "Common in which group?",
        body: "If doctors test only people with symptoms, the base rate in that group is far higher than in everyone, and a positive result means much more. The right base rate is the one for the group being tested.",
      },
      {
        title: "Base rates aren't destiny",
        body: "Starting from the base rate doesn't mean ignoring the evidence about this case. Strong evidence should move you a long way. The mistake is skipping the starting point, not using it.",
      },
    ],
    ask: "How common is this to begin with, in this group?",
    tryIt:
      "Next time you see a test, screening or alert called “accurate”, picture 1,000 cases. Using a rough guess at how common the thing is, estimate how many real alarms and false alarms there would be.",
  },

  "probability-expected-value": {
    lessonId: "probability-expected-value",
    hook: "Choices with uncertain results are easy to judge by their best case. A simple sum gives a fairer comparison, and shows when the best case is a trap.",
    idea: [
      "Expected value is the average result you'd get if you could make the same choice many times. Multiply each possible payoff by its chance, then add them up. A 10% chance of winning £500 is worth £50 on average; if the ticket costs £60, you lose £10 on average, however exciting £500 sounds.",
      "Comparing options by expected value stops the biggest prize from crowding out its small chance. But it isn't the whole story. When you get only one try, when a loss would be ruinous, or when money isn't what matters most, the spread of outcomes matters as well as the average.",
    ],
    terms: [
      {
        term: "Expected value",
        meaning:
          "The average payoff over many tries: each outcome's payoff times its chance, added up.",
      },
      {
        term: "Risk of ruin",
        meaning:
          "The chance of a loss so large you can't recover or try again. Averages ignore it.",
      },
    ],
    example: {
      case: "A bakery has one free weekend. It can cater a wedding for a certain £800 profit, or enter a baking contest: a 30% chance of a £2,000 prize, a 70% chance of nothing, and £100 of ingredients either way.",
      moves: [
        "Wedding: £800 for certain, so its expected value is £800.",
        "Contest: 0.3 × £2,000 = £600, minus £100 of ingredients, gives £500 on average.",
        "The contest's best case is bigger, but on average the wedding is worth £300 more.",
        "Then ask what the averages leave out: could the bakery afford a weekend that earns nothing? Would a prize bring new customers? Those can change the choice, but weigh them openly.",
      ],
    },
    subtleties: [
      {
        title: "The average may never happen",
        body: "The contest never pays £500. It pays £1,900 or loses £100. Expected value describes the long run, so for a one-off decision look at the range of outcomes as well.",
      },
      {
        title: "Payoffs aren't only money",
        body: "Time, health, stress and reputation are payoffs too. Putting rough numbers on them, even uncertain ones, often shows which option is really better, and why.",
      },
    ],
    ask: "What is each option worth on average, and what does the average leave out?",
    tryIt:
      "Next time you're tempted by a prize draw, an extended warranty or a raffle, work out its expected value: the prize times the chance, minus the cost. Then decide whether anything else justifies it.",
  },

  "probability-thinking-in-bets": {
    lessonId: "probability-thinking-in-bets",
    hook: "A good decision can turn out badly, and a reckless one can turn out well. If you judge only by results, you'll learn the wrong lesson from both.",
    idea: [
      "Outcomes mix two things: the quality of the decision and luck. A decision is good if it used the information available at the time sensibly, weighed the likely outcomes and their chances, and fitted the stakes. A single result tells you only a little about that.",
      "Judging decisions by outcomes is common enough to have a name: resulting. It leads people to copy lucky gamblers and abandon sound plans after one bad break. A better review asks four things: what did we know, what did we expect, what happened, and how much of the gap was luck?",
    ],
    terms: [
      {
        term: "Resulting",
        meaning:
          "Judging a decision only by how it turned out, ignoring what was known when it was made.",
      },
      {
        term: "Decision quality",
        meaning: "How well a choice used the information, options and odds available at the time.",
      },
    ],
    example: {
      case: "Two drivers take the same back road to avoid a jam. Ines checked the traffic map first, which showed the road clear; a water main burst minutes later and she was late. Tomas just guessed, and arrived early.",
      moves: [
        "Separate the decision from the result. Ines used the best information she had; Tomas checked nothing.",
        "Ask what was knowable: the water main burst after Ines checked. She couldn't have seen it coming.",
        "Judge the decisions: Ines's was sound and unlucky; Tomas's was careless and lucky.",
        "The lessons: Ines should keep checking the map, and Tomas shouldn't count on guessing.",
      ],
    },
    subtleties: [
      {
        title: "Outcomes are still evidence",
        body: "One bad result says little, but many bad results from the same kind of decision say a lot. If a method keeps failing, re-check the reasoning: luck runs out as an explanation.",
      },
      {
        title: "Hindsight rewrites what was knowable",
        body: "Afterwards, outcomes feel obvious, and we forget how uncertain things looked. Writing down your reasons and odds before deciding is the best protection.",
      },
    ],
    ask: "Was the decision sound given what was known, whatever the result?",
    tryIt:
      "Before one decision this week, write down what you expect and how sure you are. After the result, review the decision separately from the outcome: what was judgement, and what was luck?",
  },

  "probability-updating-beliefs": {
    lessonId: "probability-updating-beliefs",
    hook: "New evidence should change your mind, but by how much? Moving too little and moving too far are both mistakes, and there's a way to judge the right amount.",
    idea: [
      "Updating means adjusting your confidence when evidence arrives, by an amount that matches how telling the evidence is. The key question: how much more likely is this evidence if the claim is true than if it's false? The bigger the difference, the further you should move.",
      "A large, fair trial finding no effect is hard to explain if a treatment works, so it should move you a lot. A friend's opinion, one anecdote or a confident slogan would turn up whether the claim were true or not, so they should barely move you. And one piece of evidence rarely justifies going from doubt to certainty.",
    ],
    terms: [
      {
        term: "Prior",
        meaning: "How confident you were before the new evidence arrived.",
      },
      {
        term: "Updating",
        meaning:
          "Changing how confident you are when new evidence arrives, by as much as it deserves.",
      },
      {
        term: "Diagnostic evidence",
        meaning:
          "Evidence much more likely if the claim is true than if it's false, so it should move you a lot.",
      },
    ],
    example: {
      case: "Ravi thinks his local swimming pool might be closing: maybe 30% likely. Then three things happen: he hears a rumour in the changing room, a council agenda lists “future of Ravenbrook Pool”, and the pool cancels all bookings after March.",
      moves: [
        "Start from his prior: about 30%.",
        "The rumour: rumours like this spread whether or not a pool is closing. A small nudge at most.",
        "The agenda item: likelier if closure is being considered, but councils review pools for many reasons. A moderate move.",
        "The cancelled bookings: hard to explain unless something is ending. A big move, though a refit would fit too, so not all the way to certain.",
      ],
    },
    subtleties: [
      {
        title: "Order shouldn't matter",
        body: "The same evidence in any order should leave you in the same place. If you wave away the second piece because the first already made up your mind, that's anchoring, not updating.",
      },
      {
        title: "Expected evidence moves you less",
        body: "If you were already sure a shop was closing, a “closing down” sign adds little. Evidence moves you most when it's surprising given what you believed.",
      },
    ],
    ask: "How much more likely is this if the claim is true than if it's false?",
    tryIt:
      "Pick one belief and give it a rough percentage. This week, note each new piece of relevant evidence and move the number by what it deserves. See where you end up, and why.",
  },

  "probability-second-order": {
    lessonId: "probability-second-order",
    hook: "Most plans are judged by what they do first. What people do in response often matters more, and it's the part nobody planned.",
    idea: [
      "A first-order effect is the direct, intended result of a change: a parking charge reduces parking. A second-order effect is what follows as people respond: drivers park on side streets, shoppers go to the retail park instead, the high street gets quieter.",
      "To find second-order effects, ask “and then what?” at least twice, and ask who will change what they do. People respond to prices, rules and rewards, and when a measure becomes a target they work on the measure. The response can be bigger than the change, cancel it out, or even reverse it.",
    ],
    terms: [
      {
        term: "First-order effect",
        meaning: "The direct, intended result of a change.",
      },
      {
        term: "Second-order effect",
        meaning: "What follows as people and systems respond to the change.",
      },
      {
        term: "Goodhart's law",
        meaning:
          "When a measure becomes a target, people chase the measure and it stops measuring what it did.",
      },
    ],
    example: {
      case: "To cut waiting times, Lakeside Hospital's emergency department is set a target: see 95% of patients within four hours.",
      moves: [
        "First order: staff work to see patients faster. Good.",
        "Then what? Patients close to four hours get moved to a ward to stop the clock, whether or not that's best for them.",
        "And then what? Wards fill up, and planned operations are cancelled to make room.",
        "So judge the target on all three, and also measure what it was meant to improve: how patients do.",
      ],
    },
    subtleties: [
      {
        title: "Knock-on effects can be good",
        body: "A new cycle lane may cut car trips, which makes the road quieter and draws more cyclists. Second-order thinking finds benefits too, and they can be the main reason a change is worth it.",
      },
      {
        title: "You can't foresee everything",
        body: "Second-order thinking isn't predicting the future in detail. It's asking the obvious next questions, trying changes small first, and watching how people respond so it can be corrected.",
      },
    ],
    ask: "When people respond to this, what happens next?",
    tryIt:
      "Pick one new rule, price change or target at work, at school or in the news. Write down its first effect, then ask “and then what?” twice. Note one effect nobody seems to have mentioned.",
  },
};

export default probability;
