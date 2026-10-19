import type { LessonNotes } from "@/lib/lesson-notes";

/** Unit 4: Cognitive biases. All names, places and products are made up. */
const biases: Record<string, LessonNotes> = {
  "biases-confirmation": {
    lessonId: "biases-confirmation",
    hook: "The easiest person to fool is yourself, because you're on your own side. Confirmation bias is how that happens, quietly and without any intention to cheat.",
    idea: [
      "Once we believe something, we tend to look for evidence that agrees, read neutral evidence as agreeing, and remember the hits while forgetting the misses. None of this feels like bias. It feels like noticing how often you're right.",
      "The correction is to look for the test that could fail. Ask what you would expect to see if you were wrong, then go and look for exactly that. Seek out the strongest case against your view from people who hold it, and count the misses as carefully as the hits. A belief that survives a fair attempt to break it is worth far more than one that was only ever agreed with.",
    ],
    terms: [
      {
        term: "Confirmation bias",
        meaning:
          "Favoring evidence that supports what you already believe, in how you search, read and remember.",
      },
      {
        term: "Disconfirming evidence",
        meaning: "Evidence that would count against your belief, if you found it.",
      },
    ],
    example: {
      case: "Leo believes his new running shoes have made him faster. He remembers his three best times since buying them, and lately he's been reading reviews that praise the shoes.",
      moves: [
        "Notice the selection: his three best times and the praising reviews were both chosen because they agree.",
        "Ask what he'd see if the shoes did nothing: some fast runs and some slow ones, much as before.",
        "Find a test that could fail: compare all his times on the same route for a month before and a month after.",
        "Look for the other side on purpose: reviews from runners who noticed no difference.",
      ],
    },
    subtleties: [
      {
        title: "Being clever doesn't protect you",
        body: "Skill at arguing can make the bias worse, because you get better at explaining away evidence you don't like. The protection is a habit, not intelligence: say in advance what would change your mind.",
      },
      {
        title: "Choose where to spend the effort",
        body: "You don't need to re-test that the sun will rise. Save the effort for beliefs that matter, that you feel strongly about, or that you're about to act on. That's where the bias does the most damage.",
      },
    ],
    ask: "What would I expect to see if I were wrong, and have I looked?",
    tryIt:
      "Pick one belief you hold firmly about your work, your health or a decision. Write down what evidence would change your mind, then spend ten minutes looking for exactly that.",
  },

  "biases-anchoring": {
    lessonId: "biases-anchoring",
    hook: "The first number you hear on a subject sticks. It pulls every later estimate toward it, even when you know it means nothing.",
    idea: [
      "In experiments, people who spin a wheel that lands on a high number go on to guess higher on an unrelated question than people whose wheel landed low. The number is obviously random, they know it is, and it still pulls. That pull is anchoring.",
      "Anchors are everywhere: an asking price, a crossed-out “was $200,” a first offer in a negotiation, a forecast mentioned in passing. We adjust away from them, but not far enough. The defense is to form your own estimate from evidence before you hear anyone's number, then treat theirs as one more thing to weigh.",
    ],
    terms: [
      {
        term: "Anchor",
        meaning:
          "A number seen first that later estimates stay close to, whether or not it's relevant.",
      },
      {
        term: "Insufficient adjustment",
        meaning: "Moving away from an anchor in the right direction, but not far enough.",
      },
    ],
    example: {
      case: "A used car is listed at $9,500. After some haggling, Hana buys it for $8,200 and feels she got a great deal. Similar cars with the same mileage sold locally last month for between $7,000 and $7,800.",
      moves: [
        "Spot the anchor: $9,500. Every offer was judged against it, so $8,200 felt like a win.",
        "Find the evidence about real value: recent local sales of similar cars, $7,000 to $7,800.",
        "Against that, $8,200 is above the market, not a bargain.",
        "The better order: look up recent sales first, set a top price, then read the listing.",
      ],
    },
    subtleties: [
      {
        title: "Experts are anchored too",
        body: "In one well-known study, real estate agents valuing the same house gave higher values when shown a higher listing price, while insisting the price hadn't influenced them. Knowing about anchoring doesn't switch it off; changing the order you look at things does.",
      },
      {
        title: "An anchor can be honest",
        body: "Making the first offer in a negotiation sets the anchor, and that's fair if your number is grounded in evidence. It becomes manipulation when a number is chosen only for its pull.",
      },
    ],
    ask: "Where did the first number come from, and what do I think without it?",
    tryIt:
      "Before your next sizeable purchase, write down what you think it's worth and why, before you see the price. Then compare, and notice how far the listed number tugs at you.",
  },

  "biases-availability": {
    lessonId: "biases-availability",
    hook: "We judge how common something is by how easily examples come to mind. That works for everyday things and fails badly for anything vivid, rare or in the news.",
    idea: [
      "Ease of recall stands in for frequency. Usually it's a decent guide: you remember rain more than snow because it rains more. But memory favors the vivid, the recent and the much-discussed, so dramatic events feel common and dull ones feel rare.",
      "Plane crashes, shark attacks and break-ins on your street are easy to picture. Falls at home and slow illnesses are not, though they're far more common. When a risk feels big, ask for a rate: how many cases, out of how many people or trips, over what time? Then compare like with like.",
    ],
    terms: [
      {
        term: "Availability",
        meaning: "Judging how likely something is by how easily examples come to mind.",
      },
      {
        term: "Rate",
        meaning:
          "How many times something happens out of a stated number of chances, like 2 per 100,000 trips.",
      },
    ],
    example: {
      case: "After two local news stories about e-scooter crashes, Rowanford's city council debates banning e-scooters. Hospital records show 4 scooter injuries last year, against 61 cycling injuries and 140 injuries from falls on icy sidewalks.",
      moves: [
        "Notice why scooters feel dangerous: two vivid stories, recent and widely shared.",
        "Ask for the counts: 4 scooter injuries, against 61 for cycling and 140 from icy sidewalks.",
        "Ask for rates too: how many scooter trips were there? Few trips with 4 injuries could still be risky per trip.",
        "Decide on rates, and notice that salting sidewalks might prevent far more harm than a ban.",
      ],
    },
    subtleties: [
      {
        title: "Counts aren't rates",
        body: "Fewer injuries might just mean fewer people doing it. A risk that injures 4 people in 1,000 trips is worse per trip than one that injures 140 in a million. Ask for the denominator before comparing.",
      },
      {
        title: "Your own experience is a sample",
        body: "If you've never known anyone hurt by something, it feels safe: availability working the other way. Personal experience is a small, unrepresentative sample of what happens to everyone.",
      },
    ],
    ask: "Is this common, or just easy to remember?",
    tryIt:
      "Next time a news story makes something feel dangerous, look up how many people it actually affects in a year. Compare it with one everyday risk, such as falls at home or road accidents.",
  },

  "biases-sunk-cost": {
    lessonId: "biases-sunk-cost",
    hook: "Walking away from something you've put a lot into feels like waste. That feeling keeps people in bad projects, classes and lines long after they should leave.",
    idea: [
      "A sunk cost is money, time or effort already spent that you can't get back, whatever you decide now. Because it's the same on every path, it can't make one path better than another. The only things that can are the costs and benefits still ahead.",
      "The sunk cost fallacy is letting past spending decide: “we've spent $20,000 on this software, we can't stop now.” The useful question is the fresh-start one: if I were starting today, knowing what I now know, would I choose to spend what's still needed? If not, the past spending isn't a reason to carry on.",
    ],
    terms: [
      {
        term: "Sunk cost",
        meaning: "What has already been spent and can't be recovered, whatever you decide next.",
      },
      {
        term: "Sunk cost fallacy",
        meaning: "Carrying on because of what you've already put in, rather than what lies ahead.",
      },
      {
        term: "Opportunity cost",
        meaning:
          "What you give up by choosing one option: the other things your time or money could do.",
      },
    ],
    example: {
      case: "Kemi has watched four episodes of a crime series and isn't enjoying it. Six are left. She says: “I've already put four hours in. I should see how it ends.”",
      moves: [
        "Separate past from future: four hours gone either way, six hours still ahead.",
        "Ask what's ahead: six hours of a show she isn't enjoying, plus the ending. Is the ending worth six hours?",
        "Count the opportunity cost: those hours could go on something she'd enjoy more.",
        "If she'd be content to read a plot summary, that's her answer.",
      ],
    },
    subtleties: [
      {
        title: "The past can be evidence",
        body: "Past effort can tell you something real: a project that keeps running over budget may run over again. Use the past as evidence about the future, not as a debt the future has to repay.",
      },
      {
        title: "Quitting has costs too",
        body: "Stopping can mean penalties, lost goodwill or a half-built thing that's useless. Those are future costs and they count. The rule isn't “quit more”; it's “weigh only what's still ahead.”",
      },
    ],
    ask: "If I were starting fresh today, would I choose this?",
    tryIt:
      "Pick something you're continuing mainly because you've started it: a book, a course, a subscription, a project. Ask the fresh-start question honestly, and act on the answer.",
  },

  "biases-overconfidence": {
    lessonId: "biases-overconfidence",
    hook: "Feeling sure and being right are different things, and most of us feel sure more often than we're right. The gap can be measured, and narrowed.",
    idea: [
      "Calibration is how well your confidence matches your accuracy. If you're well calibrated, the things you're 90% sure of turn out right about nine times in ten, and the things you're 60% sure of about six in ten. Most people are overconfident: their 90% is right far less often than that.",
      "Overconfidence is worst on hard questions and where we rarely get clear feedback. Quick answers to tricky problems feel certain. The fix is practical: say how sure you are before you find out, write it down, and check your record. Over time you learn what your “sure” is actually worth.",
    ],
    terms: [
      {
        term: "Calibration",
        meaning: "How closely your confidence matches how often you're right.",
      },
      {
        term: "Overconfidence",
        meaning: "Being more sure than your track record justifies.",
      },
      {
        term: "Feedback",
        meaning:
          "Finding out, clearly and soon, whether you were right. Without it, calibration can't improve.",
      },
    ],
    example: {
      case: "At a trivia night, Sam marks each of his 20 answers as either 50% or 90% sure, ten of each, before the answers are read out. Afterward he checks: his 90% answers were right 6 times out of 10, and his 50% answers 5 times out of 10.",
      moves: [
        "Compare stated with actual: 90% stated, 60% actual. That band is overconfident.",
        "His 50% answers came out at 50%: well calibrated there.",
        "Ten answers per band is a small sample, so treat it as a first reading, not a verdict.",
        "Next time, before committing to a “90%” answer, he can ask what would make it wrong.",
      ],
    },
    subtleties: [
      {
        title: "Underconfidence is a miss too",
        body: "Saying 50% when you're right 80% of the time wastes good knowledge and makes you hesitate when you shouldn't. The aim isn't less confidence; it's confidence that matches your record.",
      },
      {
        title: "Ranges show it most",
        body: "Asked for a range they're 90% sure contains the answer, like a building's height, people give ranges so narrow they miss far more than one time in ten. Widen your ranges until they feel slightly uncomfortable.",
      },
    ],
    ask: "How often am I right when I feel this sure?",
    tryIt:
      "This week, write down five predictions about things you'll soon find out, like a match, a delivery time or a meeting's outcome, each with a percentage. Check them at the end of the week.",
  },
};

export default biases;
