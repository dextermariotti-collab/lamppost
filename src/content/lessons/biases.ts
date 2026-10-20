import type { LessonScript } from "@/lib/steps/types";

/**
 * Unit 4: Cognitive biases. All names, places and products are made up.
 */
const biases: Record<string, LessonScript> = {
  "biases-confirmation": {
    lessonId: "biases-confirmation",
    takeaway: "The useful test is the one that could prove you wrong.",
    written: {
      prompt:
        "Write the strongest case for the view you disagree with, so that its supporters would nod.",
      passage:
        "Oakfield's old library building is much loved but expensive to heat and hard to reach without stairs. Some residents want it kept and repaired. Others want a new, cheaper, wheelchair-accessible building on the same site. Pick the side you lean away from.",
      guidance: "Use the best reasons that side has, not the weakest.",
    },
    steps: [
      {
        id: "tram",
        kind: "choice",
        prompt:
          "Noor thinks the new streetcar line is a mistake. She has read three articles that criticize it. What should she do next to test her belief?",
        options: [
          {
            text: "Search for even more articles that criticize the streetcar line.",
            whyNot:
              "More of the same can only add to what she already believes. It can't show her she's wrong.",
          },
          { text: "Look for the best evidence that the streetcar works, and test it." },
          {
            text: "Ask a few friends who also dislike the streetcar what they think.",
            whyNot: "They probably agree, so she learns very little that she didn't already know.",
          },
        ],
        correct: 1,
        hint: "Which choice could change her mind?",
        why: "A useful test is one that could fail. Looking for the strongest case against your view is the fair way to check it.",
      },
      {
        id: "tests",
        kind: "sort",
        prompt:
          "The belief: “Our study group does better when we meet in the morning.” Sort each way of checking it.",
        buckets: [
          { id: "could", label: "Could show I'm wrong" },
          { id: "agree", label: "Can only agree with me" },
        ],
        items: [
          {
            id: "1",
            text: "Count only the mornings when we did well.",
            bucket: "agree",
            why: "It leaves out any morning that would disagree.",
          },
          {
            id: "2",
            text: "Compare scores for morning and evening meetings across all the weeks.",
            bucket: "could",
            why: "It counts every meeting, so the result could go against the belief.",
          },
          {
            id: "3",
            text: "Ask only the members who prefer mornings.",
            bucket: "agree",
            why: "They are the people most likely to say yes.",
          },
          {
            id: "4",
            text: "Say beforehand what score we expect next week, then check.",
            bucket: "could",
            why: "A prediction made in advance can turn out wrong.",
          },
          {
            id: "5",
            text: "Remember the one evening we did badly and forget the evening we did well.",
            bucket: "agree",
            why: "Picking which memories to keep is how a belief protects itself.",
          },
        ],
        hint: "Ask of each: could this come out against me?",
        why: "Tests that can only agree with you prove nothing. The valuable ones are those that could have shown you were wrong.",
      },
      {
        id: "diary",
        kind: "flaw",
        label: "Find the rigged search",
        prompt: "Tap the step that only lets the belief win.",
        passage: [
          {
            text: "Dev believes the herbal tea helps him focus.",
            tappable: true,
            whyNot: "That's the belief being tested. Having one is fine.",
          },
          {
            text: "He keeps a diary, noting only the days he felt focused after tea.",
            tappable: true,
            flaw: true,
          },
          {
            text: "He plans to show it to his friends.",
            tappable: true,
            whyNot: "Sharing it isn't the problem. What is in the diary is.",
          },
        ],
        fallacy: "Confirmation bias: only recording what agrees",
        hint: "What would the diary look like if the tea did nothing?",
        why: "Only the good days are recorded, so the diary would look the same even if the tea did nothing. It can't disagree with Dev.",
      },
      {
        id: "question",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question: "Which question best protects you from confirmation bias?",
        options: [
          {
            text: "Where can I find more support for what I already believe?",
            whyNot: "That is exactly the habit of looking only for agreement.",
          },
          { text: "What would I see if I were wrong, and have I looked?" },
          {
            text: "Who else shares my view, and how confident are they about it?",
            whyNot: "Agreement from others feels reassuring, but it isn't a test of the view.",
          },
        ],
        correct: 1,
        hint: "Which question invites disagreement?",
        why: "Asking what would count against your view, and then checking, turns a comfortable belief into a tested one.",
      },
      {
        id: "fair-test",
        kind: "stronger",
        label: "Who is testing fairly?",
        noun: "Investigator",
        prompt:
          "Two people test the idea that full moons cause bad sleep. Who is testing it more fairly?",
        a: "Kofi searches his diary for every bad night that fell on a full moon.",
        b: "Lena lists what she would expect if the idea were wrong, then checks nights across all moon phases.",
        stronger: "b",
        factor: "She looks for what could prove her wrong",
        weakerWhy:
          "Kofi only counts the bad nights that fit. He never checks bad nights at other times, or full moons with good sleep.",
        hint: "Whose test could end up showing the idea is wrong?",
        why: "A fair test looks at all the cases, including the ones that would count against the idea.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each new piece of evidence make the claim more or less likely?",
        claim: "Lumen Tea improves focus.",
        prior: 60,
        cards: [
          {
            id: "a",
            text: "A fan's diary lists twenty good-focus days, each after a cup of tea.",
            shift: 0,
            note: "Only good days were recorded, so the diary would read the same whether or not the tea helps.",
          },
          {
            id: "b",
            text: "In a trial with a placebo group, the tea group focused 5% better.",
            shift: 15,
            note: "A comparison with a placebo could have gone the other way, so it carries real weight.",
          },
          {
            id: "c",
            text: "A larger trial with 600 people finds no difference from the placebo.",
            shift: -30,
            note: "A bigger, fair test that finds nothing should lower your confidence a lot.",
          },
        ],
        hint: "Could the evidence have come out the other way?",
        why: "Evidence that couldn't have gone against a claim should barely move you. Fair tests that could fail are what count.",
      },
      {
        id: "reviews",
        kind: "gap",
        prompt: "What has to be true for this to follow?",
        reason: "Priya only reads reviews that give the phone five stars.",
        conclusion: "So the phone must be excellent.",
        options: [
          {
            text: "Five-star reviews are more enjoyable to read than others.",
            whyNot:
              "Enjoyment of reading has nothing to do with whether the reviews are representative.",
          },
          {
            text: "Reviews of phones are usually written by people who bought them.",
            whyNot: "True, but it doesn't say whether the five-star ones she picked are typical.",
          },
          { text: "The five-star reviews she reads are typical of all the reviews." },
        ],
        correct: 2,
        hint: "How did Priya decide which reviews to read?",
        why: "She chose the reviews that agree with what she hoped. The conclusion only follows if those are typical, and choosing them makes that unlikely.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Freya has a theory about her bakery. What should she do to test it fairly?",
        stimulus:
          "Freya believes her new sourdough sells best on rainy days. She has noticed a few rainy days with big sourdough sales, and she's started writing down sales whenever it rains.",
        options: [
          {
            text: "Keep writing down sales on rainy days for another month.",
            whyNot:
              "Still only rainy days. Without dry days to compare, the record can't show that rain makes a difference.",
          },
          {
            text: "Ask her regular customers whether they buy more bread when it rains.",
            whyNot:
              "People's guesses about their own habits are weak evidence, and the question invites them to agree.",
          },
          {
            text: "Record sourdough sales every day, and compare rainy days with dry ones.",
          },
          {
            text: "Stop testing, since she has already seen it happen several times.",
            whyNot:
              "Seeing it a few times is exactly how confirmation bias feels. Those were the memorable days.",
          },
        ],
        correct: 2,
        hint: "Her record only includes the days that could agree with her. What's missing?",
        why: "A fair test needs the days that could prove her wrong: dry days with good sales, rainy days with poor ones. Only a full record, compared both ways, can show whether rain matters.",
      },
    ],
  },

  "biases-anchoring": {
    lessonId: "biases-anchoring",
    takeaway: "Work out your own estimate before you hear anyone else's number.",
    written: {
      prompt:
        "Point out where an anchor is at work, and say how you would judge the price without it.",
      passage:
        "At the Alder Street furniture store, a sofa is tagged “Was $1,400, now $790.” The salesman adds: “Most of our customers spend around $1,200 on a sofa like this.” A similar sofa in another store costs $650 with no “was” price.",
      guidance: "Say which numbers are doing the pulling, and what evidence you'd use instead.",
    },
    steps: [
      {
        id: "tree",
        kind: "confidence",
        prompt: "Choose the best explanation, then say how sure you are.",
        question:
          "People were split at random into two groups. Each saw a random number on a spinner, then guessed the height of a tree. The group that saw 80 guessed higher on average than the group that saw 20. Why?",
        options: [
          {
            text: "Group 80 happened to include people who are better at guessing heights.",
            whyNot:
              "Groups were formed at random, so skill should be about equal. The spinner number is the difference.",
          },
          { text: "The first number pulled guesses toward it, though it meant nothing." },
          {
            text: "The spinner numbers gave real information about how tall the tree was.",
            whyNot: "The spinner was random. It carried no information about the tree at all.",
          },
        ],
        correct: 1,
        hint: "What was the only thing that differed between the groups?",
        why: "That is anchoring: a number seen first drags later estimates toward it, even when it's random and known to be.",
      },
      {
        id: "sort",
        kind: "sort",
        prompt:
          "Sort each item: an anchor that might pull your estimate, or evidence about the real value.",
        buckets: [
          { id: "anchor", label: "An anchor" },
          { id: "evidence", label: "Evidence about value" },
        ],
        items: [
          {
            id: "1",
            text: "The “was $200” price printed on a sale tag.",
            bucket: "anchor",
            why: "It sets a reference number, whether or not it was ever a real price.",
          },
          {
            id: "2",
            text: "What three similar items sold for last month.",
            bucket: "evidence",
            why: "Actual sale prices of comparable things tell you about value.",
          },
          {
            id: "3",
            text: "The seller's first offer in a negotiation.",
            bucket: "anchor",
            why: "The opening number tends to pull the whole discussion toward it.",
          },
          {
            id: "4",
            text: "The item's weight, materials and age.",
            bucket: "evidence",
            why: "Real properties that affect what it is worth.",
          },
          {
            id: "5",
            text: "A random number on a wheel of fortune before you estimate.",
            bucket: "anchor",
            why: "It carries no information but can still pull your guess.",
          },
        ],
        hint: "Is it about the thing itself, or just a number placed in front of you?",
        why: "Evidence bears on what something is worth. An anchor is just a number that gets there first.",
      },
      {
        id: "house",
        kind: "flaw",
        label: "Find the anchor",
        prompt: "Tap the phrase that plants a number to make another look small.",
        passage: [
          {
            text: "The real estate agent mentioned that a much bigger house nearby sold for $900,000.",
            tappable: true,
            flaw: true,
          },
          {
            text: "“This one, at $780,000, is a bargain,”",
            tappable: true,
            whyNot: "That's the claim. It works because of the number planted before it.",
          },
          {
            text: "she said, opening the front door.",
            tappable: true,
            whyNot: "Just a description of what she did.",
          },
        ],
        fallacy: "Anchoring: a first number sets the reference",
        hint: "Which number was introduced first, and what did it make the next one look like?",
        why: "The $900,000 makes $780,000 look cheap. Compared with similar houses that actually sold, it might not be a bargain at all.",
      },
      {
        id: "own-first",
        kind: "stronger",
        label: "Which approach resists anchoring?",
        noun: "Approach",
        prompt:
          "You're about to negotiate a used-bike price. Which approach best resists anchoring?",
        a: "Ask the seller for their price and negotiate down from there.",
        b: "Decide what it is worth to you from three comparable listings, then see what they ask.",
        stronger: "b",
        factor: "You set your number before hearing theirs",
        weakerWhy:
          "Starting from their price makes it your reference. Every counter-offer will be measured against it.",
        hint: "Whose number becomes the starting point?",
        why: "Working out your own estimate from evidence first means the other side's number is only one more thing to weigh.",
      },
      {
        id: "random",
        kind: "gap",
        prompt: "What must be true for the anchor to be the explanation?",
        reason: "People shown a random number before estimating gave guesses close to it.",
        conclusion: "So a first number can pull estimates even when it means nothing.",
        options: [
          {
            text: "People enjoy guessing numbers together in a group setting.",
            whyNot: "Enjoyment says nothing about why guesses moved toward the number.",
          },
          { text: "The number told them nothing, so only the anchor explains it." },
          {
            text: "Larger numbers always make people more careful with guessing.",
            whyNot:
              "There is no such rule, and it wouldn't explain guesses landing near the number.",
          },
        ],
        correct: 1,
        hint: "If the number was random, what else could have moved the guesses?",
        why: "Because the number was random, it couldn't have informed anyone. The pull toward it is the anchor at work.",
      },
      {
        id: "protect",
        kind: "choice",
        prompt: "A seller names a price first. Which response best protects your judgment?",
        options: [
          {
            text: "Take their number as a starting point and move a little each way.",
            whyNot:
              "That keeps their number at the center of your thinking, which is what an anchor does.",
          },
          { text: "Look up what comparable ones sold for, and judge the price against that." },
          {
            text: "Pretend you didn't hear the price and hope it doesn't matter.",
            whyNot:
              "You can't un-hear a number. Trying not to think of it doesn't stop it pulling.",
          },
        ],
        correct: 1,
        hint: "Where can you get a number that isn't theirs?",
        why: "You can't ignore a number you've heard, but you can weigh it against real evidence about what similar things are worth.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A number arrives before Jess has said hers. What should she do with it?",
        stimulus:
          "Jess is negotiating her salary for a new job. Before she names a figure, the employer says: “Candidates for this role usually ask for around $42,000.” Jess has researched similar roles nearby, which pay $47,000 to $52,000.",
        options: [
          {
            text: "Ask for a little more than $42,000, to show she's being reasonable.",
            whyNot:
              "That lets the anchor set the range. Her research says the going rate is well above it.",
          },
          {
            text: "Start from her research and ask within $47,000 to $52,000.",
          },
          {
            text: "Ignore all numbers and ask for whatever feels fair in the moment.",
            whyNot:
              "“Feels fair” is exactly where the anchor pulls hardest. Her research is the defense.",
          },
        ],
        correct: 1,
        hint: "Which number came from evidence, and which simply arrived first?",
        why: "$42,000 arrived first and will drag her estimate down if she lets it. Her research on similar roles is evidence about real value, so it should set the range she negotiates in.",
      },
    ],
  },

  "biases-availability": {
    lessonId: "biases-availability",
    takeaway: "How easily something comes to mind isn't how often it happens.",
    written: {
      prompt: "Explain why the fear may not match the risk, and what numbers you'd want to see.",
      passage:
        "After a widely reported news story about a boat capsizing at Marlow Lake, reservations at the lake's boat rental fell by half. That summer, the lake recorded one capsizing among 9,000 rentals. That same summer, an unreported tally showed 41 minor injuries from cycling on the lakeside path.",
      guidance: "Compare how vivid each risk is with how often it happens.",
    },
    steps: [
      {
        id: "worry",
        kind: "choice",
        prompt:
          "After a vivid news story about a boating accident, Tomas cancels his trip. What is most likely happening?",
        options: [
          {
            text: "Boating has become much more dangerous than it was last week.",
            whyNot: "One reported accident doesn't show a change in how dangerous boating is.",
          },
          { text: "The story is easy to picture, so the risk feels bigger than it is." },
          {
            text: "Tomas has weighed every risk of the trip very carefully indeed.",
            whyNot:
              "Canceling right after a vivid story suggests his feeling, not a calculation, is driving it.",
          },
        ],
        correct: 1,
        hint: "What does a vivid story change: the risk, or how it feels?",
        why: "This is the availability effect: what's easy to recall feels common. A vivid story changes the feeling far more than the risk.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each piece of evidence make the claim more or less likely?",
        claim: "Boat trips at Marlow Lake are dangerous.",
        prior: 70,
        cards: [
          {
            id: "a",
            text: "A dramatic news story about one capsized boat last week.",
            shift: 0,
            note: "One real case, however vivid, sits against thousands of safe trips. It shouldn't move you much.",
          },
          {
            id: "b",
            text: "Records: one capsizing in 9,000 rentals this summer.",
            shift: -30,
            note: "The actual rate is very low, which lowers the claim a lot.",
          },
          {
            id: "c",
            text: "Serious injuries on the lake happened in only 1 rental in 20,000 over five years.",
            shift: -15,
            note: "A longer record points the same way: trips are rarely dangerous.",
          },
          {
            id: "d",
            text: "The boat rental briefly closed when the wind picked up.",
            shift: 0,
            note: "Closing in high wind is normal caution, and it says nothing about the usual risk.",
          },
          {
            id: "e",
            text: "An inspection found faulty life jackets on three of the ten rental boats.",
            shift: 20,
            note: "A documented safety fault is real evidence of risk, which a vivid story is not.",
          },
        ],
        hint: "What do the numbers say, compared with the story?",
        why: "Rates from records are the honest guide to risk. A single vivid case makes it feel bigger than it is.",
      },
      {
        id: "sort",
        kind: "sort",
        prompt:
          "Which risks feel bigger than they are because they are memorable, and which get less worry than they deserve?",
        buckets: [
          { id: "over", label: "Feels bigger than it is" },
          { id: "under", label: "Gets too little worry" },
        ],
        items: [
          {
            id: "1",
            text: "A rare but widely reported accident.",
            bucket: "over",
            why: "Heavy coverage makes it easy to picture and so feels common.",
          },
          {
            id: "2",
            text: "Slow, unreported harms, such as too little sleep across many years.",
            bucket: "under",
            why: "No dramatic story makes it easy to bring to mind.",
          },
          {
            id: "3",
            text: "A dramatic event that happened last week.",
            bucket: "over",
            why: "Recent events come to mind more easily than older ones.",
          },
          {
            id: "4",
            text: "A common everyday risk that never makes headlines.",
            bucket: "under",
            why: "Because it is routine, it doesn't stick in memory.",
          },
        ],
        hint: "Which are easy to picture, and which are easy to forget?",
        why: "Memorable, recent and heavily covered events feel more common than they are. Quiet, routine risks get less attention than their numbers deserve.",
      },
      {
        id: "count",
        kind: "flaw",
        label: "Find the memory trap",
        prompt: "Tap the phrase that judges frequency by how easily examples come to mind.",
        passage: [
          {
            text: "I can think of three burglaries on our street this year,",
            tappable: true,
            flaw: true,
          },
          {
            text: "so break-ins must be far more common than the police say.",
            tappable: true,
            whyNot: "That's the conclusion. The trouble lies in what it rests on.",
          },
          {
            text: "We are getting a second lock.",
            tappable: true,
            whyNot: "An action, not the reasoning.",
          },
        ],
        fallacy: "Availability: recall standing in for frequency",
        hint: "Are three remembered cases enough to compare with police figures?",
        why: "Three cases that come to mind, perhaps because neighbors talked about them, can't outweigh a count of all break-ins.",
      },
      {
        id: "sure",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question: "Which is the best guide to how likely something is?",
        options: [
          {
            text: "How many examples you can remember at once, without effort.",
            whyNot: "Memory favors vivid, recent and repeated stories, not the common ones.",
          },
          {
            text: "How strongly and how often the news covers it each week.",
            whyNot: "Coverage follows what is dramatic and new, which often isn't what is common.",
          },
          { text: "A record of how often it happened out of how many chances." },
        ],
        correct: 2,
        hint: "Which needs a count, not a feeling?",
        why: "A rate needs a count of events out of all the chances. Memory and headlines can point the wrong way.",
      },
      {
        id: "compare",
        kind: "stronger",
        label: "Which comparison is better?",
        noun: "Comparison",
        prompt:
          "Two people compare the risk of a lake trip with a drive to the lake. Whose comparison is better?",
        a: "“Boat accidents make the news, but drives don't, so boats must be riskier.”",
        b: "“Let's compare injuries per thousand trips for each: boats and drives.”",
        stronger: "b",
        factor: "It compares rates, not headlines",
        weakerWhy:
          "News covers what's unusual, not what's common. Headlines can't tell you whether drives or boat trips go wrong more often; only a count of trips can.",
        hint: "Which one counts trips as well as accidents?",
        why: "Comparing per-trip rates fixes the effect of coverage. Headlines can show which events are dramatic, not which are common.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "A shocking video and five years of records. What would a fair reading of the risk say?",
        stimulus:
          "After a widely shared video of a dog attack, a parents' group wants all dogs banned from Hartley Park. Over the past five years, the park recorded 2 dog bites in roughly 400,000 visits, and 31 injuries from its old playground equipment.",
        options: [
          {
            text: "Dog bites are rare there; the playground causes far more injuries.",
          },
          {
            text: "Dogs must be the main danger, since the video shows how bad it can be.",
            whyNot:
              "The video shows how bad one case was, not how often it happens. That's availability at work.",
          },
          {
            text: "There isn't enough information to compare the two risks at all.",
            whyNot:
              "The records give counts for both over the same five years. That's enough for a rough comparison.",
          },
          {
            text: "Both risks are tiny, so neither deserves any attention.",
            whyNot:
              "Thirty-one injuries is worth acting on. Comparing risks is about where effort helps most.",
          },
        ],
        correct: 0,
        hint: "Put the vivid video aside. What do five years of records say?",
        why: "The video makes dog attacks easy to picture, so they feel common. The records show 2 bites against 31 playground injuries. Fixing the playground would likely prevent more harm.",
      },
    ],
  },

  "biases-sunk-cost": {
    lessonId: "biases-sunk-cost",
    takeaway: "What you've already spent is gone either way; decide from what's ahead.",
    written: {
      prompt: "Decide what the club should do, using only the costs and benefits still ahead.",
      passage:
        "The Fenwick Chess Club has spent $20,000 on a new website that isn't finished. Finishing it would cost another $8,000. Once done, it is expected to bring in about $3,000 in membership over five years. The club treasurer says: “We've already spent so much. Stopping now would waste it all.”",
      guidance: "Say which numbers should count and which should be ignored.",
    },
    steps: [
      {
        id: "concert",
        kind: "choice",
        prompt:
          "Ines paid $40 for concert tickets, then feels sick the day of the show. Which reasoning is sound?",
        options: [
          {
            text: "I paid $40, so I have to go or the money is wasted.",
            whyNot:
              "The $40 is spent whether she goes or stays home, so going doesn't get it back.",
          },
          { text: "The $40 is gone either way; is going worth it tonight?" },
          {
            text: "The tickets were expensive, so it would be rude not to go.",
            whyNot: "How much they cost doesn't change what happens next.",
          },
        ],
        correct: 1,
        hint: "Which money can still change depending on what she does?",
        why: "Money already spent is the same in both cases. Only what's still to come can make one choice better.",
      },
      {
        id: "sunk",
        kind: "sort",
        prompt:
          "A team is deciding whether to finish a project. Sort each cost: already spent, or still ahead.",
        buckets: [
          { id: "sunk", label: "Already spent" },
          { id: "ahead", label: "Still ahead" },
        ],
        items: [
          {
            id: "1",
            text: "$12,000 already paid for the old software.",
            bucket: "sunk",
            why: "It's gone whatever they decide next.",
          },
          {
            id: "2",
            text: "Another $3,000 needed to finish the project.",
            bucket: "ahead",
            why: "They only pay it if they keep going.",
          },
          {
            id: "3",
            text: "The staff training hours already completed.",
            bucket: "sunk",
            why: "The hours have been spent either way.",
          },
          {
            id: "4",
            text: "A $200 monthly license for the next two years.",
            bucket: "ahead",
            why: "It depends on what they choose from here.",
          },
          {
            id: "5",
            text: "A $900 deposit that cannot be refunded.",
            bucket: "sunk",
            why: "It's lost whether or not they continue.",
          },
        ],
        hint: "Would this change if they stopped today?",
        why: "Sunk costs are the same whichever way you go. Only the costs and benefits still ahead should shape the choice.",
      },
      {
        id: "degree",
        kind: "flaw",
        label: "Find the sunk cost",
        prompt: "Tap the step that lets past effort decide the future.",
        passage: [
          {
            text: "Lena has spent three years on a major she no longer enjoys.",
            tappable: true,
            whyNot: "That's her situation. It isn't a mistake in reasoning.",
          },
          { text: "“I've put in three years," },
          { text: "so I can't quit now,”", tappable: true, flaw: true },
          {
            text: "she says, and signs up for another semester.",
            tappable: true,
            whyNot: "That's the result of the reasoning, not the flaw itself.",
          },
        ],
        fallacy: "Sunk cost: past effort steering the next choice",
        hint: "Would quitting bring the three years back?",
        why: "The three years are gone either way. What should decide it is what another semester would cost and bring her.",
      },
      {
        id: "roof",
        kind: "stronger",
        label: "Which decision is sounder?",
        noun: "Reasoning",
        prompt:
          "A homeowner has already spent $50,000 on a roof repair that keeps failing. Whose reasoning is sounder?",
        a: "“We've spent $50,000 on this, so we must spend another $20,000 to see it through.”",
        b: "“Ignoring what's spent, is another $20,000 worth what a working roof would give us?”",
        stronger: "b",
        factor: "It looks only at what's ahead",
        weakerWhy:
          "The $50,000 is gone whether they spend more or stop. Using it as a reason to spend more can add a second loss to the first.",
        hint: "Which one ignores the money already spent?",
        why: "The sound question is always “from here, what will more cost and bring?” The past spending is the same in both cases.",
      },
      {
        id: "assume",
        kind: "gap",
        prompt: "What does this argument quietly assume?",
        reason: "We've already put two years and $30,000 into the project.",
        conclusion: "So we should keep going.",
        options: [
          {
            text: "Projects that take two years are usually worth finishing in the end.",
            whyNot:
              "That's a general claim about projects, not the link the argument actually uses.",
          },
          { text: "What was already spent should count when deciding what to do next." },
          {
            text: "Projects that cost $30,000 always earn their money back in the end.",
            whyNot:
              "No claim is made about future earnings. The argument leans on the past instead.",
          },
        ],
        correct: 1,
        hint: "What connects the past spending to the decision?",
        why: "The argument treats past spending as a reason to continue. That assumption is the sunk cost fallacy.",
      },
      {
        id: "build",
        kind: "builder",
        prompt: "Build the sound argument for stopping. One piece is money that shouldn't count.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "The numbers ahead" },
        ],
        pieces: [
          { id: "pc", text: "The club should stop the website project.", role: "conclusion" },
          {
            id: "pp",
            text: "Finishing would cost more than the site would bring in.",
            role: "premise",
          },
          {
            id: "pe",
            text: "Remaining cost $8,000; expected income over five years $3,000.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The club has already spent $20,000 on it.",
            role: null,
            note: "That money is gone either way, so it shouldn't change the decision.",
          },
        ],
        hint: "Which numbers can still change with the decision?",
        why: "Only the figures ahead matter: $8,000 to finish against $3,000 to gain. The $20,000 is the same either way.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A theater group has spent a lot already. Which reasoning is sound?",
        stimulus:
          "A theater group has spent $6,000 and four months rehearsing a play. Two weeks before opening, ticket sales suggest they'll bring in $1,500, and the venue rental still to pay is $3,000. A cheaper venue has offered them a slot next spring.",
        options: [
          {
            text: "Go ahead: $6,000 and four months are too much to waste now.",
            whyNot:
              "The $6,000 and four months are spent whatever they decide. They can't make going ahead a better choice.",
          },
          {
            text: "Cancel: the $6,000 already spent proves the play was a mistake.",
            whyNot:
              "Past spending doesn't prove anything either way. The decision rests on what's still ahead.",
          },
          {
            text: "Compare what's ahead: $3,000 to bring in $1,500, or the spring slot.",
          },
        ],
        correct: 2,
        hint: "Cross out everything already spent. What's left to compare?",
        why: "The $6,000 and the rehearsals are gone on every path. What can still change is ahead: paying $3,000 to bring in about $1,500 now, against the cheaper spring slot.",
      },
    ],
  },

  "biases-overconfidence": {
    lessonId: "biases-overconfidence",
    takeaway: "Being 90% sure should mean being right about nine times in ten.",
    written: {
      prompt:
        "Say how confident the writer sounds, and whether their evidence justifies that level.",
      passage:
        "“I'm 100% certain the Kestrel Labs app will be a hit,” says its founder. “Our test group of six friends loved it, and nothing could possibly go wrong. Anyone who disagrees just doesn't get it.”",
      guidance: "Compare the strength of the claim with the strength of the evidence.",
    },
    steps: [
      {
        id: "prime",
        kind: "confidence",
        prompt: "Choose an answer, then set how sure you are before you lock it in.",
        question: "Is 391 a prime number?",
        options: [
          {
            text: "Yes, it is prime.",
            whyNot: "It looks prime, but 17 × 23 = 391. It has factors, so it isn't.",
          },
          { text: "No, it isn't prime." },
        ],
        correct: 1,
        hint: "Try dividing by 17.",
        why: "391 is 17 × 23, so it isn't prime. It looks prime, which is why so many people feel sure and are wrong.",
      },
      {
        id: "ball",
        kind: "confidence",
        prompt: "Choose an answer, then set how sure you are.",
        question:
          "A bat and a ball cost $1.10 together. The bat costs $1 more than the ball. Does the ball cost 10 cents?",
        options: [
          {
            text: "Yes: the ball costs 10 cents.",
            whyNot:
              "If the ball were 10 cents, the bat would be $1.10 and the total $1.20. The ball costs 5 cents.",
          },
          { text: "No: the ball costs 5 cents." },
        ],
        correct: 1,
        hint: "Check the total if the ball is 10 cents.",
        why: "A 5-cent ball and a $1.05 bat make $1.10, and the bat is exactly $1 more. Quick answers here feel certain and are often wrong.",
      },
      {
        id: "days",
        kind: "confidence",
        prompt: "Choose an answer, then set how sure you are.",
        question: "Are there more than 100 days between March 1 and July 1 of the same year?",
        options: [
          { text: "Yes: there are 122 days." },
          {
            text: "No: there are fewer than 100 days.",
            whyNot:
              "March, April, May and June have 31 + 30 + 31 + 30 = 122 days, which is more than 100.",
          },
        ],
        correct: 0,
        hint: "Add up the four months.",
        why: "March to June is 31 + 30 + 31 + 30 = 122 days. Working it out beats trusting a hunch.",
      },
      {
        id: "forecasters",
        kind: "stronger",
        label: "Who is better calibrated?",
        noun: "Forecaster",
        prompt: "Two people forecast the weekend's weather. Who is better calibrated?",
        a: "“I'm 100% sure it will rain. It can't possibly stay dry.”",
        b: "“I'd say 70% rain. When I say 70%, it rains about seven times out of ten.”",
        stronger: "b",
        factor: "Their confidence matches their record",
        weakerWhy:
          "“100% sure” leaves no room to be wrong. Almost nobody is right every time they say that, so it is overconfidence.",
        hint: "Which one has checked how often they are right?",
        why: "Calibration means your confidence matches your hit rate. A forecaster who says 70% should be right about 7 times in 10.",
      },
      {
        id: "sort",
        kind: "sort",
        prompt: "Sort each statement: overconfident, or well calibrated.",
        buckets: [
          { id: "over", label: "Overconfident" },
          { id: "calibrated", label: "Well calibrated" },
        ],
        items: [
          {
            id: "1",
            text: "“I'm certain, 100%, that my team wins on Saturday.”",
            bucket: "over",
            why: "Certainty about something uncertain leaves no room for being wrong.",
          },
          {
            id: "2",
            text: "“About 65%. When I say 65%, I'm right roughly two times in three.”",
            bucket: "calibrated",
            why: "It matches a checked track record.",
          },
          {
            id: "3",
            text: "“There is no way I could be wrong about this.”",
            bucket: "over",
            why: "It rules out the possibility of error without any evidence for that.",
          },
          {
            id: "4",
            text: "“Around 90% sure, and about nine of my last ten 90% calls came true.”",
            bucket: "calibrated",
            why: "Its confidence follows its results.",
          },
        ],
        hint: "Does the confidence come with a record to back it up?",
        why: "Calibrated people can point to results that match their confidence. Overconfident people just feel sure.",
      },
      {
        id: "tally",
        kind: "gap",
        prompt: "What must 90% confidence mean for this to follow?",
        reason: "Priya said she was 90% sure of ten answers and got six right.",
        conclusion: "So Priya was overconfident.",
        options: [
          {
            text: "Ten answers is a nice round number to test on a quiz.",
            whyNot: "The number of answers isn't the link between 90% and overconfident.",
          },
          {
            text: "Getting six of ten is a good score on a hard quiz for anyone.",
            whyNot: "It may be, but the question is whether it matches 90% confidence.",
          },
          { text: "Being 90% sure should mean being right about nine in ten." },
        ],
        correct: 2,
        hint: "What does “90% sure” promise?",
        why: "A 90% claim predicts about nine hits in ten. Six hits means her confidence ran ahead of her results.",
      },
      {
        id: "habit",
        kind: "choice",
        prompt: "Which habit best helps you become better calibrated?",
        options: [
          { text: "Write predictions with a percentage, then check how often you were right." },
          {
            text: "Always say you're 50% sure so that you are never badly wrong.",
            whyNot:
              "That avoids being wrong by saying nothing useful. Calibration means matching confidence to evidence.",
          },
          {
            text: "Only make predictions when you feel completely certain of the outcome.",
            whyNot:
              "Feeling certain is exactly what overconfidence looks like. It isn't a sign of being right.",
          },
        ],
        correct: 0,
        hint: "How would you find out how often you're right?",
        why: "Recording predictions and results is the only way to learn how much to trust your own confidence.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "confidence",
        prompt: "Choose, then say how sure you are. Being honest about it is the skill.",
        question:
          "Kai says he's “95% sure” his team's projects finish on time. Of his last 20 projects, 12 finished on time and 8 ran late. What's the best reading?",
        options: [
          {
            text: "His confidence is about right, since most projects finished on time.",
            whyNot:
              "Most isn't 95%. Twelve of 20 is 60%, so his stated confidence is far above his record.",
          },
          {
            text: "He's overconfident: 12 of 20 is about 60%, not 95%.",
          },
          {
            text: "He's underconfident, because 20 projects is plenty of evidence.",
            whyNot:
              "Twenty projects is a fair amount of evidence, and it points the other way: his record is well below 95%.",
          },
          {
            text: "Nothing can be said, since every project is different.",
            whyNot:
              "Projects differ, but a record of 20 still shows how often his 95% has come true.",
          },
        ],
        correct: 1,
        hint: "Turn his record into a percentage and compare it with what he says.",
        why: "Twelve on time out of 20 is 60%. If he were right to be 95% sure, about 19 in 20 would finish on time. His confidence runs well ahead of his record.",
      },
    ],
  },
};

export default biases;
