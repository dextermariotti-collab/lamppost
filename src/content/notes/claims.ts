import type { LessonNotes } from "@/lib/lesson-notes";

/** Unit 1: Claims & assumptions. All names, places and products are made up. */
const claims: Record<string, LessonNotes> = {
  "claims-the-actual-claim": {
    lessonId: "claims-the-actual-claim",
    hook: "Most arguments that go nowhere skip one step: nobody pins down what is actually being claimed. People end up agreeing or arguing with something that was never said.",
    idea: [
      "Every argument has a point: the one thing the writer wants you to accept or do. Everything else in the passage is there to hold that point up, as a reason, as evidence, or as background that sets the scene. Finding the claim first tells you what the rest is for, and what you would be agreeing to if the reasons hold.",
      "The claim isn't marked by its position or its volume. It can come first, last or in the middle, and it is often quieter than the sentences around it. Sometimes it is never stated, and you have to say what the details add up to. Words like should, so and therefore often point to it.",
      "Once you have it, restate it in one sentence of your own: what it is about, and what it says is true or should be done.",
    ],
    terms: [
      {
        term: "Claim",
        meaning:
          "The statement an argument is trying to get you to accept. Also called the conclusion.",
      },
      {
        term: "Implied claim",
        meaning:
          "A claim the writer builds toward but never states. Say it out loud before you judge it.",
      },
      {
        term: "Background",
        meaning:
          "True details that set the scene but support nothing. Remove them and the argument is no weaker.",
      },
    ],
    example: {
      case: "A post in the Harbor Lane neighborhood group: “Third time this month the trash wasn't picked up on Tuesday. The town changed contractors in June. Families with small children can't leave garbage in the hall for a week. Other streets get their pickups without any trouble.”",
      moves: [
        "Ask what the post wants. Nothing says “should,” so the claim is implied.",
        "Add up the details: missed pickups, a new contractor, a real cost to families, other streets doing fine. They all point one way.",
        "Say it in one sentence: “The town should fix the Tuesday trash pickup on Harbor Lane.”",
        "Check it goes no further than the details. “The new contractor should be fired” is a bigger claim the post never makes.",
      ],
    },
    subtleties: [
      {
        title: "Claims inside claims",
        body: "Longer pieces argue for a main claim through smaller ones: “the bridge is unsafe, so it should close.” “The bridge is unsafe” is a claim with its own support, and also a reason for the main one. Find the main claim first, then the steps on the way.",
      },
      {
        title: "A question can be a claim",
        body: "“Do we really need another parking lot?” is a question in form, but it argues that we don't. Rhetorical questions, and even jokes, can carry the claim. Restate them as plain statements before you weigh them.",
      },
    ],
    ask: "What is this trying to get me to accept or do?",
    tryIt:
      "Next time you read an opinion piece or a long message, stop at the end and write its claim in one sentence before you react. Then check whether your reply argues with that sentence or with something else.",
  },

  "claims-hidden-assumptions": {
    lessonId: "claims-hidden-assumptions",
    hook: "Arguments usually fail at a step nobody said out loud. Learn to find that step and you can test an argument that otherwise sounds airtight.",
    idea: [
      "Reasons rarely lead straight to a conclusion. Between “the café has fewer customers” and “the new road hurt the café” sits an unstated belief: that nothing else changed. That unstated belief is an assumption, and the argument is only as strong as it is.",
      "To find one, ask what would have to be true for the reason to lead to the conclusion. Then test it by imagining it false. If the argument collapses, the assumption is load-bearing, and that is the place to look hardest.",
      "Assumptions aren't faults in themselves. Every argument has some, and many are safe. The skill is telling the safe ones from the shaky ones.",
    ],
    terms: [
      {
        term: "Assumption",
        meaning: "Something an argument needs to be true but doesn't say.",
      },
      {
        term: "Load-bearing",
        meaning:
          "An assumption the argument can't do without: if it is false, the conclusion no longer follows.",
      },
      {
        term: "Negation test",
        meaning: "Imagine the assumption is false and see whether the argument still works.",
      },
    ],
    example: {
      case: "“Since the Linden Street gym started opening at 5 am, more members say they're getting fitter. So the early opening is good for members' health.”",
      moves: [
        "Find the gap: members say they're fitter, therefore the early opening improved their health.",
        "Name what bridges it. First, that saying you're fitter means you are. Second, that the early hours caused it rather than something else.",
        "Negate each. If the members who say they're fitter aren't, the argument has nothing. If a new class or a new year's resolution explains it, early opening gets no credit.",
        "Both are load-bearing, so those are the two questions to put to the gym.",
      ],
    },
    subtleties: [
      {
        title: "Plausible isn't load-bearing",
        body: "A statement can be true and still not be what the argument depends on. “The gym has more members” may be true, but the argument survives without it. Look for the belief the conclusion can't stand without, not any belief nearby.",
      },
      {
        title: "Shared assumptions hide best",
        body: "Assumptions everyone around you holds are the hardest to see, because nobody thinks to say them. If an argument feels obviously right, that is a good moment to ask what it takes for granted.",
      },
    ],
    ask: "What has to be true for this to follow, and is it?",
    tryIt:
      "Pick one decision being argued about at work, school or home this week. Write down one thing the argument takes for granted, then ask someone involved whether it actually holds.",
  },

  "claims-facts-opinions-values": {
    lessonId: "claims-facts-opinions-values",
    hook: "Many disagreements are stuck because people are arguing about different kinds of thing. Some questions are settled by checking, and others by deciding what matters.",
    idea: [
      "A factual claim says how the world is, and could in principle be checked: the bus takes 40 minutes, the trial cut injuries by 9%. Facts can be wrong, but there is a way to find out.",
      "An opinion reports a preference: the film was dull, coriander tastes awful. A value claim says what ought to matter or be done: the trial was worth the cost, the park should be protected. Values can be argued for with reasons, but data alone can't settle them, because the question is how to weigh things.",
      "Real sentences mix all three. Split them before you argue: agree on the facts, then talk openly about the values.",
    ],
    terms: [
      {
        term: "Factual claim",
        meaning:
          "A statement about how things are that could be checked, even if nobody has checked it yet.",
      },
      {
        term: "Opinion",
        meaning:
          "A report of a preference or taste. It tells you about the speaker, not the thing.",
      },
      {
        term: "Value claim",
        meaning:
          "A statement about what matters or should be done. Facts inform it but can't settle it.",
      },
    ],
    example: {
      case: "From the Brookfield community newsletter: “The new speed bumps on Mill Road have cut average speeds from 34 to 26 mph. They're ugly and noisy. The council was right to put them in, and should do the same on Station Road.”",
      moves: [
        "Split it. “Average speeds fell from 34 to 26 mph” is a factual claim: someone could check the measurements.",
        "“Ugly” is opinion. “Noisy” is partly checkable, with a sound meter.",
        "“Right to put them in” and “should do the same” are value claims. They weigh safety against looks, noise and cost.",
        "So there are two separate questions: is the speed figure right, and is the drop worth what it costs residents?",
      ],
    },
    subtleties: [
      {
        title: "A value can hide inside a fact",
        body: "“The council wasted $20,000” sounds factual, but “wasted” is a judgment. The $20,000 can be checked; whether it was wasted depends on what you think it should have bought. Watch for loaded verbs and adjectives.",
      },
      {
        title: "Values still need reasons",
        body: "Data can't settle a value claim, but that doesn't make every view equally good. “The park should stay because children have nowhere else to play” gives a reason others can weigh. “Because I say so” doesn't.",
      },
    ],
    ask: "Could this be checked, or is it about what matters?",
    tryIt:
      "When you next disagree with someone, pause and ask: are we disagreeing about what happened, or about what matters? Say which out loud and notice whether the conversation changes.",
  },

  "claims-burden-of-proof": {
    lessonId: "claims-burden-of-proof",
    hook: "Whoever has to prove a claim often loses an argument by default. Knowing who owes the evidence stops you being talked into proving a negative.",
    idea: [
      "The person who makes a claim owes the support for it. If someone says a supplement doubles your energy, it is up to them to show it, not up to you to show it doesn't. “You can't prove it isn't true” tries to shift that burden, and it adds no evidence at all.",
      "How much support is owed depends on how surprising the claim is. “I had cereal for breakfast” needs little more than my word. “I saw a flying car” needs far more, because it clashes with everything else we know. A negative claim, like “the new schedule won't save time,” is still a claim, and owes support too.",
    ],
    terms: [
      {
        term: "Burden of proof",
        meaning: "The duty to support a claim. It sits with whoever makes the claim.",
      },
      {
        term: "Shifting the burden",
        meaning:
          "Demanding that others disprove a claim that was never supported in the first place.",
      },
      {
        term: "Extraordinary claim",
        meaning:
          "One that clashes with a lot of what we already know, so it owes stronger evidence.",
      },
    ],
    example: {
      case: "At a staff meeting at Pinecrest Clinic, Dana says the new booking app is losing appointments. Rob replies: “Show me one appointment it lost. Until you can, the app is fine.”",
      moves: [
        "Dana made a claim: the app is losing appointments. The burden is hers, so Rob can fairly ask for evidence.",
        "But Rob made a claim too: “the app is fine.” It needs support as well, and the lack of Dana's evidence isn't it.",
        "How surprising is Dana's claim? New software losing bookings is ordinary, so modest evidence would do: a few patients whose bookings vanished.",
        "The fair outcome: Dana gathers examples, and nobody declares the app fine or broken until someone has looked.",
      ],
    },
    subtleties: [
      {
        title: "When absence of evidence counts",
        body: "“No evidence of harm” means something only if someone looked properly. A large, careful study that finds no effect is real evidence of no effect. A product nobody has tested has no evidence either way, which isn't the same thing.",
      },
      {
        title: "Practical burdens are a choice",
        body: "In decisions, the burden is sometimes placed on purpose: a new medicine must show it is safe before it is sold. That isn't a rule of logic but a choice about which mistake would cost more.",
      },
    ],
    ask: "Who made the claim, and have they supported it as much as it needs?",
    tryIt:
      "Notice the next time someone says “prove me wrong” or “you can't show it isn't so,” in person or online. Write down what the original claim was and what support it would be fair to ask for.",
  },

  "claims-vague-language": {
    lessonId: "claims-vague-language",
    hook: "Some claims are built so that nothing could ever count against them. They sound informative and tell you almost nothing.",
    idea: [
      "A useful claim takes a risk: it is specific enough that a result could show it false. “This cream reduces wrinkles by a third in eight weeks” could fail a test. “This cream may help skin look younger” can't, because any result fits.",
      "The escape is usually one or two words. May, can, up to, helps, supports, linked to and some people all loosen a claim until it promises nothing in particular. To test a claim, ask what result would count as failure. If the honest answer is none, the claim isn't telling you anything you can use.",
    ],
    terms: [
      {
        term: "Testable",
        meaning:
          "Specific enough that some possible result would show it false. Philosophers call this falsifiable.",
      },
      {
        term: "Weasel word",
        meaning:
          "A word that makes a claim sound stronger than it is while letting it escape any test: may, up to, helps.",
      },
    ],
    example: {
      case: "An ad for Glowfield Water: “Our mineral water supports healthy digestion and may help you feel more energized. Thousands of customers say they feel the difference.”",
      moves: [
        "Find the escape words: “supports,” “may help,” “feel the difference.”",
        "Ask what result would count against it. If nobody's digestion changes, the water still “supports” it. If people feel the same, it only “may” help.",
        "Look at the testimonial: thousands feeling a difference says nothing about how many felt none, or whether tap water would do as well.",
        "A testable version: “People who drank it for a month reported fewer digestive problems than people who drank tap water.”",
      ],
    },
    subtleties: [
      {
        title: "Caution isn't vagueness",
        body: "A careful researcher who says “may” is often being honest about uncertainty, and then gives the numbers. The problem is “may” standing in for numbers. Check whether the soft word comes with a size and a comparison, or replaces them.",
      },
      {
        title: "Stronger isn't testable",
        body: "“The best cream on the market” sounds bolder, but best at what, measured how? A rewrite only helps if it names a measure and a comparison that could come out the wrong way.",
      },
    ],
    ask: "What result would count as this claim being wrong?",
    tryIt:
      "Read three ads or product labels this week and underline every weasel word. Rewrite one claim so it could fail a test, and ask yourself whether the company would be willing to print it.",
  },
};

export default claims;
