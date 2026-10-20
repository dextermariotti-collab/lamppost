import type { LessonScript } from "@/lib/steps/types";

/**
 * Unit 6: Probability and decisions. All names, places and products are made up, and the
 * numbers are worked so that each answer can be checked by hand.
 */
const probability: Record<string, LessonScript> = {
  "probability-base-rates": {
    lessonId: "probability-base-rates",
    takeaway: "Before you weigh a test result, ask how common the thing is.",
    written: {
      prompt:
        "Explain what a positive result means here, using the counts and not only the test's accuracy.",
      passage:
        "A clinic offers a screening for a condition that affects 1 in 100 adults. The screening catches 90 in 100 real cases, and wrongly flags 10 in 100 healthy people. A customer tests positive and asks, “So I almost certainly have it?”",
      guidance:
        "Picture 1,000 adults and count who tests positive, then say how many of those are real.",
    },
    steps: [
      {
        id: "test",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "1 in 100 people have a condition. A test catches 90 of every 100 real cases, and wrongly flags 10 of every 100 healthy people. You test positive. What is the chance you have it?",
        options: [
          {
            text: "About 90%, the test's accuracy.",
            whyNot: "That is how good the test is. It ignores how rare the condition is.",
          },
          { text: "About 8%, or roughly 1 in 12." },
          {
            text: "About 50%, since a result is either right or wrong.",
            whyNot: "It would only be 50% if the condition were as common as not.",
          },
        ],
        correct: 1,
        hint: "Picture 1,000 people. How many have it? How many healthy people get flagged?",
        why: "Of 1,000 people, about 9 real cases test positive, but so do about 99 healthy people. So about 9 in 108 positives are real.",
      },
      {
        id: "kinds",
        kind: "sort",
        prompt: "Two kinds of fact matter. Sort each one.",
        buckets: [
          { id: "base", label: "How common it is" },
          { id: "test", label: "How good the test is" },
        ],
        items: [
          {
            id: "1",
            text: "1 in 500 people have the illness.",
            bucket: "base",
            why: "It says how common the illness is.",
          },
          {
            id: "2",
            text: "The test catches 95 in 100 real cases.",
            bucket: "test",
            why: "It says how well the test finds real cases.",
          },
          {
            id: "3",
            text: "Among adults over 70, 1 in 8 have it.",
            bucket: "base",
            why: "It is how common the illness is in one group.",
          },
          {
            id: "4",
            text: "1 healthy person in 20 is wrongly flagged.",
            bucket: "test",
            why: "It says how often the test raises a false alarm.",
          },
          {
            id: "5",
            text: "About 4 in 1,000 people in this town have it.",
            bucket: "base",
            why: "It is a count of how common the illness is locally.",
          },
        ],
        hint: "Is it about the people, or about the test?",
        why: "The first kind is the base rate. The second is the test's accuracy. Both are needed, and people tend to remember only the second.",
      },
      {
        id: "counting",
        kind: "stronger",
        noun: "Explanation",
        prompt:
          "Two people explain a positive result for a rare condition. Who explains it better?",
        a: "The test is 90% accurate, so you almost certainly have the condition.",
        b: "Out of 1,000 people, about 108 test positive but only 9 are real cases. A positive is usually a false alarm.",
        stronger: "b",
        factor: "It counts everyone, not just the test",
        weakerWhy:
          "It only quotes the test's accuracy. It never asks how many of the people tested actually had the condition.",
        hint: "Which explanation counts the healthy people too?",
        why: "Counting people is easier than working with percentages. When a condition is rare, the healthy majority produces most of the false alarms.",
      },
      {
        id: "app",
        kind: "flaw",
        label: "Spot the missing number",
        prompt: "Tap the step that leaves out the number that matters most.",
        passage: [
          {
            text: "Nia's health app reports: “Positive. This test is 95% accurate.”",
            tappable: true,
            whyNot: "That is a fair statement of the test's accuracy.",
          },
          {
            text: "Nia decides she is 95% likely to have the illness.",
            tappable: true,
            flaw: true,
          },
          {
            text: "The illness affects 1 in 500 people.",
            tappable: true,
            whyNot:
              "That is the base rate, a fact she overlooked. It isn't the flawed step itself.",
          },
        ],
        fallacy: "Ignoring the base rate",
        hint: "Is a result's accuracy the same as the chance it's right about you?",
        why: "Accuracy describes the test, not the odds for one person. With an illness this rare, most positives are still false alarms.",
      },
      {
        id: "airport",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "An airport scanner is right 95% of the time.",
        conclusion: "So a passenger it flags is 95% likely to be a smuggler.",
        options: [
          {
            text: "Scanners are cheap to keep running at airports.",
            whyNot: "Cost has no bearing on what a flag means.",
          },
          { text: "Roughly half the passengers are smuggling something." },
          {
            text: "Smugglers know how to avoid the scanners there.",
            whyNot: "That would lower the scanner's hits, but it isn't the missing link.",
          },
        ],
        correct: 1,
        hint: "If almost no passengers smuggle, who would the flags mostly be?",
        why: "A 95% accurate scanner's flags are 95% right only if about half the passengers smuggle. The rarer smuggling is, the more flags are false alarms.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each new fact make it more or less likely that Ada has the condition?",
        claim: "Ada has the condition.",
        prior: 10,
        cards: [
          {
            id: "a",
            text: "Her test is positive. It catches 8 in 10 real cases and flags 1 in 10 healthy people.",
            shift: 37,
            note: "About half of positives are real at this base rate, so the chance rises to about 47%.",
          },
          {
            id: "b",
            text: "A careful repeat test is negative.",
            shift: -30,
            note: "A second, independent negative counts strongly against it.",
          },
          {
            id: "c",
            text: "She has none of the symptoms most people with it have.",
            shift: -10,
            note: "Missing symptoms make the condition somewhat less likely.",
          },
          {
            id: "d",
            text: "Her friend says the app's results look frightening.",
            shift: 0,
            note: "How the result feels tells you nothing about what it means.",
          },
        ],
        hint: "Which facts are about Ada's body or tests, not about feelings?",
        why: "The starting chance is the base rate. Each new fact then moves it in proportion to how well it separates real cases from false alarms.",
      },
      {
        id: "common",
        kind: "choice",
        prompt: "What happens to the share of positives that are real?",
        stimulus:
          "The same test is now used on a group where half of the people have the condition, instead of 1 in 100.",
        options: [
          {
            text: "It stays the same, because the test hasn't changed.",
            whyNot:
              "The test is unchanged, but the share of positives that are real depends on the base rate.",
          },
          { text: "It rises a lot, as far more positives are real cases." },
          {
            text: "It falls, because there are more people to test.",
            whyNot: "More real cases in the group means more of the positives are real.",
          },
        ],
        correct: 1,
        hint: "In a group where half have it, who are most of the positives?",
        why: "The same result means very different things in different groups. When the condition is common, a positive is far more likely to be real.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "Your bag is flagged. Roughly how likely is it that it really holds a banned item? Count it out of 10,000 bags.",
        stimulus:
          "A new airport scanner wrongly flags 1 in 50 innocent bags, and catches 95% of bags carrying banned items. About 1 bag in 10,000 actually carries a banned item.",
        options: [
          {
            text: "Well under 1%: about 1 real case among some 200 flags.",
          },
          {
            text: "About 95%, because that's how often the scanner catches banned items.",
            whyNot:
              "95% is how often a banned item gets flagged, not how often a flag means a banned item. Most flags come from innocent bags.",
          },
          {
            text: "About 50%, since a flagged bag either has one or it doesn't.",
            whyNot:
              "Two possibilities aren't equally likely. With innocent bags so common, most flags are false alarms.",
          },
          {
            text: "About 2%, the rate at which innocent bags are flagged.",
            whyNot:
              "That's the false-alarm rate among innocent bags. The question is what share of flags are real.",
          },
        ],
        correct: 0,
        hint: "Picture 10,000 bags. How many carry a banned item? How many innocent bags get flagged by mistake?",
        why: "Out of 10,000 bags, about 1 holds a banned item and gets flagged. About 200 innocent bags are flagged too. So a flag means a real item about 1 time in 200.",
      },
    ],
  },

  "probability-expected-value": {
    lessonId: "probability-expected-value",
    takeaway: "Compare options by payoff times chance, not by the best thing that could happen.",
    written: {
      prompt:
        "Work out which option has the higher average payoff, and say whether that settles the choice.",
      passage:
        "Sol can take a job at a market stand that pays $300 a week for certain, or sell his own crafts and earn $900 in a good week (a 1-in-4 chance) and nothing otherwise. He can afford a few weeks with no pay, but not many.",
      guidance:
        "Multiply each payoff by its chance, add them up, then consider whether Sol can repeat the choice.",
    },
    steps: [
      {
        id: "pick",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "Option A pays $50 for certain. Option B gives a 1-in-10 chance of $400 and nothing otherwise. Which is worth more on average?",
        options: [
          { text: "A, worth $50 on average." },
          {
            text: "B, worth $400 when it pays out.",
            whyNot: "Multiply the prize by its chance: $400 × 1/10 = $40, less than A's $50.",
          },
          {
            text: "They are worth the same.",
            whyNot: "A is worth $50 and B only $40 on average, so they are not equal.",
          },
        ],
        correct: 0,
        hint: "Multiply each prize by how likely it is.",
        why: "Average value is payoff times chance. B's big prize is tempting, but it comes up so rarely that A is worth more.",
      },
      {
        id: "bets",
        kind: "sort",
        prompt:
          "Pay to play, win a prize with a given chance. Sort each bet by its average result.",
        buckets: [
          { id: "plus", label: "Wins on average" },
          { id: "even", label: "Breaks even" },
          { id: "minus", label: "Loses on average" },
        ],
        items: [
          {
            id: "1",
            text: "Pay $2 for a 1-in-4 chance of $10.",
            bucket: "plus",
            why: "The average prize is $2.50, a little more than the $2 price.",
          },
          {
            id: "2",
            text: "Pay $5 for a 1-in-10 chance of $30.",
            bucket: "minus",
            why: "The average prize is $3, so you lose $2 on average.",
          },
          {
            id: "3",
            text: "Pay $4 for a 1-in-5 chance of $20.",
            bucket: "even",
            why: "The average prize is $4, exactly the price.",
          },
          {
            id: "4",
            text: "Pay $10 for a 1-in-100 chance of $500.",
            bucket: "minus",
            why: "The average prize is $5, so you lose $5 on average.",
          },
        ],
        hint: "Prize × chance = average prize. Compare it with the price.",
        why: "A bet is worth taking on average only when the average prize beats the price. A big prize alone doesn't decide it.",
      },
      {
        id: "ticket",
        kind: "stronger",
        noun: "Reasoning",
        prompt: "The prize is $1 million. Which reasoning about a $2 ticket is better?",
        a: "Buy it. The jackpot is $1 million and someone has to win.",
        b: "The chance is about 1 in 30 million, so the ticket is worth about 3 cents on average, far below $2.",
        stronger: "b",
        factor: "It weighs the prize by its chance",
        weakerWhy:
          "It looks only at the size of the prize. Someone winning doesn't make any one ticket likely to win.",
        hint: "Which one uses the chance of winning?",
        why: "A huge prize with a tiny chance is worth little on average. Ignoring the chance is why lotteries feel better than they are.",
      },
      {
        id: "jobs",
        kind: "flaw",
        label: "Find the best-case thinking",
        prompt: "Tap the step where Priya compares only the best case.",
        passage: [
          {
            text: "Job A pays $30,000 for certain.",
            tappable: true,
            whyNot: "That is a plain description of Job A.",
          },
          {
            text: "Job B pays $60,000 with a 40% chance, and $0 otherwise.",
            tappable: true,
            whyNot: "That is also a fair description. Stating it isn't the mistake.",
          },
          { text: "Priya says: “B pays double, so B is better.”", tappable: true, flaw: true },
        ],
        fallacy: "Judging by the best case",
        hint: "What does B pay on average, once the 40% is counted?",
        why: "B pays $60,000 × 0.4 = $24,000 on average, less than A's $30,000. The best case looks bigger, but it isn't the typical outcome.",
      },
      {
        id: "case",
        kind: "builder",
        prompt: "Build the case for Job A. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "The working" },
        ],
        pieces: [
          { id: "pc", text: "Job A is the better choice on average.", role: "conclusion" },
          { id: "pp", text: "Its average pay is higher than Job B's.", role: "premise" },
          {
            id: "pe",
            text: "B pays $60,000 × 40% = $24,000 on average, against A's $30,000.",
            role: "evidence",
          },
          {
            id: "px",
            text: "Job B's office has a garden.",
            role: null,
            note: "Pleasant, but it says nothing about the average pay.",
          },
        ],
        hint: "The working is the calculation that backs the reason.",
        why: "A sound comparison shows its working. The reason says which is higher, and the sum lets anyone check it.",
      },
      {
        id: "repeat",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "The risky option has the higher average payoff.",
        conclusion: "So you should take the risky option.",
        options: [
          { text: "A bad outcome wouldn't ruin you, and choices like it come often." },
          {
            text: "Risky options are always more fun than safe ones, for most people.",
            whyNot: "Fun isn't the link between average payoff and what you should choose.",
          },
          {
            text: "The safe option is certain to lose money in the long run.",
            whyNot: "Nothing says so, and it wouldn't be the missing link.",
          },
        ],
        correct: 0,
        hint: "An average only shows up if you can play many times.",
        why: "Averages describe what happens over many tries. If one loss would ruin you, or you get a single try, the average is less useful.",
      },
      {
        id: "raffle",
        kind: "choice",
        prompt: "What is a ticket worth on average?",
        stimulus:
          "A raffle sells 500 tickets at $2 each. There is one prize of $400, and each ticket has an equal chance.",
        options: [
          { text: "80 cents, so you lose $1.20 on average." },
          {
            text: "$400, which is the size of the prize.",
            whyNot: "That is the prize. Multiply it by a ticket's 1-in-500 chance.",
          },
          {
            text: "$2, which is what you paid for it.",
            whyNot: "That is the price. The average return is the prize times the chance.",
          },
        ],
        correct: 0,
        hint: "Divide the prize by the number of tickets.",
        why: "$400 ÷ 500 tickets is 80 cents per ticket. Paying $2 for it loses $1.20 on average, whatever the prize sounds like.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "Zara is offered phone insurance. What does the expected value say, and what else matters?",
        stimulus:
          "A store offers Zara a $60 plan for her $400 phone, covering one replacement over two years. She thinks there's a 10% chance she'll break or lose it in that time. She has $2,000 in savings.",
        options: [
          {
            text: "Buy it: losing or breaking a $400 phone would be a disaster for her.",
            whyNot:
              "That looks only at the worst case. Its chance matters too: 10% of $400 is $40.",
          },
          {
            text: "Skip it: insurance plans like this are always a waste of money.",
            whyNot:
              "“Always” is too strong. When a loss would be ruinous, paying above the average can be sensible.",
          },
          {
            text: "Buy it: $60 is far less than the $400 the phone cost her.",
            whyNot:
              "Comparing the price with the whole phone ignores the 10% chance. On average the plan is worth $40.",
          },
          {
            text: "On average it's worth $40, less than $60, and she can afford a loss.",
          },
        ],
        correct: 3,
        hint: "Multiply the payout by its chance. Then ask whether a loss would actually hurt her badly.",
        why: "10% × $400 = $40 on average, below the $60 price. With $2,000 saved, a loss wouldn't be ruinous, so the average is a fair guide here. Someone with no savings might reasonably choose otherwise.",
      },
    ],
  },

  "probability-thinking-in-bets": {
    lessonId: "probability-thinking-in-bets",
    takeaway: "Judge a decision by its reasoning at the time, not only by how it turned out.",
    written: {
      prompt:
        "Judge the decision by how it was made, then say what you would do differently and why.",
      passage:
        "Tom read two years of sales for his bike shop, saw winter was always slow, and ordered less stock for January. A cold snap then sent riders indoors and sales fell even lower. His partner says: “You got it wrong. You should have ordered nothing.”",
      guidance: "Separate what Tom knew from what turned out to be true.",
    },
    steps: [
      {
        id: "decisions",
        kind: "sort",
        prompt: "Sort each decision by how well it was reasoned, ignoring how it turned out.",
        buckets: [
          { id: "good", label: "A well-reasoned decision" },
          { id: "poor", label: "A poorly reasoned decision" },
        ],
        items: [
          {
            id: "1",
            text: "Dev checked three months of sales and expanded. A storm then closed the store for a week.",
            bucket: "good",
            why: "He used the evidence he had. The storm was bad luck.",
          },
          {
            id: "2",
            text: "Lia put all her savings into one stock “because it felt lucky.” It tripled.",
            bucket: "poor",
            why: "It was a gamble on a feeling, and a lucky win doesn't fix that.",
          },
          {
            id: "3",
            text: "Omar skipped a safety check to save time. Nothing went wrong.",
            bucket: "poor",
            why: "Skipping the check was a poor choice even though he got away with it.",
          },
          {
            id: "4",
            text: "Tessa studied the route, packed water and set off. She got a flat tire.",
            bucket: "good",
            why: "She prepared well. A flat tire is bad luck, not bad planning.",
          },
        ],
        hint: "Would you make the same choice knowing only what they knew?",
        why: "A good decision can lose and a poor one can win. The reasoning is what you can control and learn from, and the outcome partly isn't.",
      },
      {
        id: "coach",
        kind: "stronger",
        noun: "Review",
        prompt: "Two coaches review a lost match. Which one judges the decision better?",
        a: "We lost, so the plan was bad. We'll throw it out.",
        b: "We lost, but the plan was based on last season's games and two key players were injured. We'll keep the plan and watch injuries.",
        stronger: "b",
        factor: "It separates the plan from the luck",
        weakerWhy:
          "It treats the result as proof the plan was bad, so it can't tell bad luck from a bad plan.",
        hint: "Which review asks why it lost?",
        why: "A result mixes decision and luck. A good review asks what part was the decision and what part happened anyway.",
      },
      {
        id: "hunch",
        kind: "flaw",
        label: "Judged by the result",
        prompt: "Tap the step where Marta judges the decision by how it turned out.",
        passage: [
          {
            text: "Marta bought shares on a hunch, without checking anything about the company.",
            tappable: true,
            whyNot:
              "This describes what she did. Acting on a hunch is the process, not the conclusion.",
          },
          {
            text: "Prices then rose and she made a profit.",
            tappable: true,
            whyNot: "That is the outcome. Stating it isn't the mistake, but using it as proof is.",
          },
          {
            text: "She concludes the hunch was a good decision.",
            tappable: true,
            flaw: true,
          },
        ],
        fallacy: "Judging by the outcome",
        hint: "Did the profit show she reasoned well?",
        why: "The profit was luck she didn't plan. A decision made without checking anything stays a poor one, even when it pays off.",
      },
      {
        id: "sound",
        kind: "builder",
        prompt: "Build the case that a failed decision was still sound. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          {
            id: "pc",
            text: "Tom's decision to order less stock was still sound.",
            role: "conclusion",
          },
          {
            id: "pp",
            text: "It rested on the best information he had at the time.",
            role: "premise",
          },
          {
            id: "pe",
            text: "He checked two years of January sales before ordering.",
            role: "evidence",
          },
          {
            id: "px",
            text: "It was raining on the day he placed the order.",
            role: null,
            note: "It has nothing to do with the quality of the reasoning.",
          },
        ],
        hint: "What did Tom know when he chose?",
        why: "The quality of a decision is judged by what was known then. The evidence he checked, not the cold snap, is what counts.",
      },
      {
        id: "bad",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "A decision was made with careful reasoning and the outcome was bad. What is the most likely explanation?",
        options: [
          {
            text: "The decision must have been poor, or it wouldn't have gone badly.",
            whyNot: "Good decisions still lose sometimes, because chance is part of every outcome.",
          },
          {
            text: "Whoever decided must have been careless.",
            whyNot: "A bad result on its own doesn't show carelessness.",
          },
          { text: "Luck played a part, and the reasoning may still have been sound." },
        ],
        correct: 2,
        hint: "Can a good process ever lose?",
        why: "Outcomes mix skill and luck. A bad result is a reason to re-check the reasoning, not proof that it was bad.",
      },
      {
        id: "worked",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "Ali's plan worked out.",
        conclusion: "So Ali's reasoning was good.",
        options: [
          { text: "Good reasoning, not luck, made the plan work." },
          {
            text: "Ali works very hard, and always has.",
            whyNot: "Effort doesn't show how the result came about.",
          },
          {
            text: "Most plans work out in the end, in the long run.",
            whyNot: "That wouldn't tell us whether luck helped this time.",
          },
        ],
        correct: 0,
        hint: "What else could have made it work?",
        why: "A result can come from skill or from luck. Only if you can rule luck out does a good outcome say much about the reasoning.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each fact make “Sam's investing method is good” more or less likely?",
        claim: "Sam's investing method is good.",
        prior: 50,
        cards: [
          {
            id: "a",
            text: "It earned 20% in its first year.",
            shift: 8,
            note: "One good year could easily be luck, so it moves you only a little.",
          },
          {
            id: "b",
            text: "Four friends who copied it last year all lost money.",
            shift: -20,
            note: "If the method were good, copies of it should have done well too.",
          },
          {
            id: "c",
            text: "Over 20 years, in six different markets, it beat a plain fund in four years out of five.",
            shift: 30,
            note: "A long record across changing conditions is hard to chalk up to luck.",
          },
        ],
        hint: "Which facts would be hard to get by luck alone?",
        why: "A short run of wins is weak evidence. A long record across different conditions is much harder for luck to explain.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A fundraiser lost money. How should the board judge the decision?",
        stimulus:
          "A small charity spent $5,000 on a fundraising dinner after checking that similar dinners had raised $8,000 to $12,000. A storm that evening kept half the guests away, and it raised only $3,000. The board says: “That was a bad decision. No more dinners.”",
        options: [
          {
            text: "Sound but unlucky: the evidence was good and the storm unforeseeable.",
          },
          {
            text: "Bad, because the charity lost $2,000, and that's what counts.",
            whyNot:
              "The loss is real, but judging only by the result ignores what was known when they decided.",
          },
          {
            text: "Good, because any fundraising event is worth trying at least once.",
            whyNot:
              "That's too generous. A decision is good because of its reasoning, not because trying is always fine.",
          },
        ],
        correct: 0,
        hint: "Separate what they knew when they decided from what happened at the dinner.",
        why: "They checked how similar dinners did, and the storm was luck they couldn't plan for. The decision was sound. A fair review might add a backup plan for bad weather, not drop dinners altogether.",
      },
    ],
  },

  "probability-updating-beliefs": {
    lessonId: "probability-updating-beliefs",
    takeaway:
      "Move your confidence by as much as the evidence deserves: not zero, not all the way.",
    written: {
      prompt: "Say how much the new evidence should move your confidence, and why not further.",
      passage:
        "Lina was 70% sure that a new swimming goggle brand doesn't leak. Two reviewers say it leaked during their test. A third says hers stayed dry for a month. The brand's own page says “Never leaks.”",
      guidance: "Weigh each piece of evidence by how hard it would be to fake.",
    },
    steps: [
      {
        id: "bakery",
        kind: "updater",
        prompt:
          "Does each fact make “the bakery will still be open next year” more or less likely?",
        claim: "The new Mill Street bakery will still be open next year.",
        prior: 60,
        cards: [
          {
            id: "a",
            text: "It had long lines on its first three days.",
            shift: 0,
            note: "New places draw curious crowds, so early lines are no real evidence either way.",
          },
          {
            id: "b",
            text: "It is still busy after six months, mostly with regulars.",
            shift: 20,
            note: "Steady repeat business is much harder to fake than an opening rush.",
          },
          {
            id: "c",
            text: "Its landlord has announced a large rent increase.",
            shift: -15,
            note: "A bigger cost makes closing more likely.",
          },
          {
            id: "d",
            text: "The owner's cousin says it will be “huge.”",
            shift: 0,
            note: "A relative's enthusiasm isn't new information about the bakery.",
          },
        ],
        hint: "Which facts would be hard to get without the bakery really doing well?",
        why: "Strong, hard-to-fake evidence should move you a lot. Weak or expected evidence should barely move you at all.",
      },
      {
        id: "supplement",
        kind: "stronger",
        noun: "Response",
        prompt:
          "You believe a supplement helps. A large fair trial finds no effect. Which response is better?",
        a: "I'm still sure it works. Trials miss things.",
        b: "I'm now much less sure it works, though a little doubt remains.",
        stronger: "b",
        factor: "It moves in proportion to the evidence",
        weakerWhy:
          "A large, fair trial is strong evidence. Refusing to move at all means no evidence could ever change your mind.",
        hint: "Which response lets the evidence count?",
        why: "Updating means letting evidence shift you by how strong it is. Neither ignoring it nor throwing your whole view away is proportionate.",
      },
      {
        id: "cafe",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "You are 70% sure a new cafe is good. One friend says she disliked it. How far should you move?",
        options: [
          {
            text: "Down to 0%, since it must be terrible.",
            whyNot: "One opinion is weak evidence, so this swings much too far.",
          },
          {
            text: "Stay at 70%, because one opinion doesn't count.",
            whyNot: "It counts a little. Evidence in either direction should nudge you.",
          },
          { text: "Down a little, to about 60–65%." },
        ],
        correct: 2,
        hint: "How much would one person's view usually tell you?",
        why: "One opinion is a small piece of evidence. Move in the right direction, but only a small step.",
      },
      {
        id: "weight",
        kind: "sort",
        prompt:
          "Your belief: “The riverside path floods every winter.” Sort each piece of news by how far it should move you.",
        buckets: [
          { id: "lot", label: "Moves you a lot" },
          { id: "little", label: "Moves you a little" },
          { id: "none", label: "Shouldn't move you" },
        ],
        items: [
          {
            id: "1",
            text: "City records show it closed in 9 of the last 10 winters.",
            bucket: "lot",
            why: "A long, official record is strong and hard to fake.",
          },
          {
            id: "2",
            text: "A neighbor says it flooded last Tuesday.",
            bucket: "little",
            why: "One flooded day says little about every winter.",
          },
          {
            id: "3",
            text: "A dated photo shows it underwater this January.",
            bucket: "little",
            why: "It is real evidence, but for one winter only.",
          },
          {
            id: "4",
            text: "The path is popular with walkers.",
            bucket: "none",
            why: "Popularity has no bearing on flooding.",
          },
          {
            id: "5",
            text: "The path was built in 1988.",
            bucket: "none",
            why: "Its age doesn't tell you how often it floods.",
          },
        ],
        hint: "How big, how official, and how relevant is each item?",
        why: "Evidence differs in weight. Big, checkable and relevant items should move you a lot. Small or unrelated ones should not.",
      },
      {
        id: "battery",
        kind: "flaw",
        label: "Too big a swing",
        prompt: "Tap the step where Amit swings too far.",
        passage: [
          {
            text: "Amit was about 50% sure a phone's battery lasts two days.",
            tappable: true,
            whyNot: "That is a reasonable starting point.",
          },
          {
            text: "One reviewer measured it lasting 30 hours.",
            tappable: true,
            whyNot: "That is the new evidence. It's reported fairly, and it is worth noting.",
          },
          {
            text: "Amit says: “So it definitely doesn't last two days, and the brand lies.”",
            tappable: true,
            flaw: true,
          },
        ],
        fallacy: "Swinging to certainty",
        hint: "How much can one reviewer's test settle?",
        why: "One measurement should lower his confidence, not end it. “Definitely” and “lies” claim far more than one test can show.",
      },
      {
        id: "negative",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "A single test of the claim came back negative.",
        conclusion: "So you should now be less sure of the claim.",
        options: [
          {
            text: "Negative results are more common than positive ones.",
            whyNot: "How often results are negative overall isn't the link.",
          },
          { text: "A true claim would probably have produced a positive test." },
          {
            text: "The test was cheap to run, so it was easy to repeat.",
            whyNot: "Cost doesn't bear on what the result means.",
          },
        ],
        correct: 1,
        hint: "Why would a negative result count against the claim?",
        why: "Evidence only moves you if it would have looked different had the claim been true. A test that couldn't detect it counts for nothing.",
      },
      {
        id: "medicine",
        kind: "choice",
        prompt: "Which evidence should move you most on “the new medicine works”?",
        options: [
          { text: "A large trial with a fair comparison group." },
          {
            text: "Testimonials from five people who felt better.",
            whyNot:
              "People who recover anyway, or who feel better from hope, give the same testimonials.",
          },
          {
            text: "A poster that says “clinically proven.”",
            whyNot: "A slogan with no trial behind it is not evidence.",
          },
        ],
        correct: 0,
        hint: "Which could have come out the other way?",
        why: "The best evidence is what would look different if the claim were false. A fair, large trial can show that. Testimonials and slogans can't.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A blind test disagrees with you. How should your confidence change?",
        stimulus:
          "You're 80% sure the Harbor Cafe makes the best coffee in town. Then the local paper runs a blind taste test, with 200 tasters and the cafes unnamed, and Harbor comes in seventh of ten.",
        options: [
          {
            text: "Not at all: you know what you like, whatever any test says about it.",
            whyNot:
              "A blind test with 200 tasters is strong evidence. Ignoring it isn't confidence; it's refusing to update.",
          },
          {
            text: "All the way down: Harbor clearly serves some of the worst coffee around.",
            whyNot:
              "Seventh of ten in one test doesn't make it bad, and your own taste still counts for something.",
          },
          {
            text: "Down a lot: a large blind test is hard to explain if Harbor is best.",
          },
        ],
        correct: 2,
        hint: "How likely is a seventh place in a large blind test if Harbor really is the best?",
        why: "If Harbor were the best, it would rarely come in seventh in a large blind test, so the result is strong evidence. Move a long way, but not all the way: taste varies and one test isn't final.",
      },
    ],
  },

  "probability-second-order": {
    lessonId: "probability-second-order",
    takeaway: "After the first effect, ask what people will do in response.",
    written: {
      prompt:
        "Trace the effects: what the rule does first, how people respond, and what that leads to.",
      passage:
        "The Alder Vale city council limits parking on its main street to one hour, so that spaces turn over faster. Cafe owners say their customers need longer. The shopping center outside town offers free parking all day.",
      guidance:
        "Follow the chain at least two steps, and say what you would check to see it happening.",
    },
    steps: [
      {
        id: "parking",
        kind: "choice",
        prompt: "Which is the most likely ripple effect that nobody planned?",
        stimulus:
          "Alder Vale limits main-street parking to one hour so more spaces come free. The shopping center outside town has free parking all day.",
        options: [
          { text: "Some shoppers go to the shopping center, where parking is free." },
          {
            text: "Spaces free up, so the main street becomes busier.",
            whyNot: "That is the intended first effect, not a ripple effect nobody planned.",
          },
          {
            text: "The city council collects more in parking fines each month.",
            whyNot: "That is a direct result of the rule, not a change in what people do.",
          },
        ],
        correct: 0,
        hint: "Where will someone who needs two hours go?",
        why: "The rule changes what is convenient, and people respond. Some who need longer will simply shop elsewhere.",
      },
      {
        id: "gym",
        kind: "sort",
        prompt: "A gym raises the price of its off-peak pass by half. Sort each effect.",
        buckets: [
          { id: "direct", label: "Direct effect" },
          { id: "knock", label: "Ripple effect" },
        ],
        items: [
          {
            id: "1",
            text: "Members who keep the off-peak pass now pay 50% more for it.",
            bucket: "direct",
            why: "It follows straight from the higher price.",
          },
          {
            id: "2",
            text: "More people buy peak passes, so the gym is crowded at 6 p.m.",
            bucket: "knock",
            why: "People respond by changing what they buy.",
          },
          {
            id: "3",
            text: "The gym earns more from each pass it sells.",
            bucket: "direct",
            why: "It follows straight from the higher price.",
          },
          {
            id: "4",
            text: "Members quit and tell friends, so fewer new sign-ups arrive.",
            bucket: "knock",
            why: "It happens through what people do next, not the price alone.",
          },
        ],
        hint: "Is it the price itself, or what people do because of it?",
        why: "Direct effects come from the change itself. Ripple effects come from people adjusting, and they can be bigger than the change, cancel it out or even reverse it.",
      },
      {
        id: "square",
        kind: "stronger",
        noun: "Prediction",
        prompt: "Which prediction thinks a step further?",
        a: "Banning cars from the square will cut traffic there.",
        b: "Banning cars from the square will cut traffic there, but drivers may crowd the streets around it, and stores there that rely on deliveries may lose business.",
        stronger: "b",
        factor: "It asks what people will do next",
        weakerWhy:
          "It stops at the first effect. It doesn't ask where the cars go, or who else is affected.",
        hint: "Which prediction asks “and then what?”",
        why: "First-order thinking stops at the intended change. Better predictions follow how people and traffic respond to it.",
      },
      {
        id: "bakery",
        kind: "flaw",
        label: "Stopped too early",
        prompt: "Tap the step that stops at the first effect.",
        passage: [
          {
            text: "Karo's bakery cut its bread prices by a third.",
            tappable: true,
            whyNot: "That is the action taken. There's nothing wrong with taking it.",
          },
          {
            text: "Sales doubled in the first week, so Karo says the cut is clearly working.",
            tappable: true,
            flaw: true,
          },
          {
            text: "He plans to cut prices again next month.",
            tappable: true,
            whyNot: "That follows from the earlier step. The mistake was made before it.",
          },
        ],
        fallacy: "Stopping at the first effect",
        hint: "What else might change after week one?",
        why: "Sales rose, but at lower prices, and rivals may match him. One week of the first effect doesn't show the cut is paying off.",
      },
      {
        id: "question",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question: "Which question best pushes you past the first-order effect?",
        options: [
          {
            text: "Who was it that proposed this change?",
            whyNot: "That is about the source, and it doesn't trace what happens next.",
          },
          { text: "And then what will people do next?" },
          {
            text: "Is the first effect the one we want?",
            whyNot: "That checks the first step, but it stops there.",
          },
        ],
        correct: 1,
        hint: "Which question looks past the first step?",
        why: "Asking what people will do in response is how you find effects nobody planned.",
      },
      {
        id: "fares",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "The city raised bus fares by 20% to bring in more money.",
        conclusion: "So the city will collect 20% more from buses.",
        options: [
          {
            text: "Bus drivers will be paid more from the new income.",
            whyNot: "Drivers' pay doesn't connect fares to total income.",
          },
          { text: "Ridership will stay about the same at the higher fare." },
          {
            text: "Fares were last raised many years ago, under a different city council.",
            whyNot: "When they last rose doesn't show what riders will do now.",
          },
        ],
        correct: 1,
        hint: "What might riders do when the fare goes up?",
        why: "Income depends on fares and on how many people ride. If some riders leave, the extra 20% per ticket won't add up.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt:
          "Does each fact make “the parking limit does more good than harm” more or less likely?",
        claim: "The one-hour parking limit does more good than harm.",
        prior: 50,
        cards: [
          {
            id: "a",
            text: "Parking spaces turn over twice as fast.",
            shift: 10,
            note: "It is the intended benefit, and it is visible.",
          },
          {
            id: "b",
            text: "Shopping-center sales rise 20% while main-street store sales fall 10%.",
            shift: -25,
            note: "Business is leaving the street the rule was meant to help.",
          },
          {
            id: "c",
            text: "Visitors say the main street feels calmer.",
            shift: 10,
            note: "A smaller, softer benefit, but a real one.",
          },
          {
            id: "d",
            text: "Parking officers issue 300 more fines than last year.",
            shift: 0,
            note: "Fines show the rule is enforced, not that it is working.",
          },
        ],
        hint: "Which facts show what happened to the people the rule was meant to help?",
        why: "A change has to be judged on its ripple effects as well as its first one. Here the response outweighs both benefits.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Think a step further. What's the most likely ripple effect?",
        stimulus:
          "To cut litter, the Kelby city council doubles the fine for dropping litter and, to save on emptying costs, removes half the trash cans downtown.",
        options: [
          {
            text: "Litter falls sharply, because the fine is now twice as high.",
            whyNot:
              "That's the first-order effect the city council hopes for. It ignores how people respond when the cans are gone.",
          },
          {
            text: "People with a wrapper find no can nearby and drop it, so litter may rise.",
          },
          {
            text: "Nothing much changes, since most people never drop litter anyway.",
            whyNot:
              "Possible, but it ignores the missing cans. Having fewer of them changes what's convenient for everyone.",
          },
        ],
        correct: 1,
        hint: "Two changes happen at once. What will someone holding a wrapper do when the nearest trash can is gone?",
        why: "A higher fine pushes litter down, but fewer cans make dropping it more likely, and nobody can enforce fines everywhere. The response to the missing cans could outweigh the fine.",
      },
    ],
  },
};

export default probability;
