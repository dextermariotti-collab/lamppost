import type { LessonNotes } from "@/lib/lesson-notes";

/** Unit 2: Evidence. All names, places and products are made up. */
const evidence: Record<string, LessonNotes> = {
  "evidence-types": {
    lessonId: "evidence-types",
    hook: "“Studies show” can mean anything from a careful experiment to one person's impression. Knowing what each kind of evidence can show tells you how much weight it bears.",
    idea: [
      "Evidence is strong to the degree that it rules out other explanations. If people who drink a herbal tea sleep better, maybe the tea helped, or calmer people choose herbal tea, or they expected to sleep better. Good evidence is designed to separate those.",
      "A randomized experiment does it best: chance decides who gets the tea, so the groups differ only in the tea. A cohort study follows people over time but can't control who chose what. A survey records what people report at one moment. Expert opinion is only as good as the evidence behind it, and a single story rules out nothing.",
      "Rank evidence by what it can show, not by how confident it sounds.",
    ],
    terms: [
      {
        term: "Randomized controlled trial",
        meaning:
          "An experiment where chance decides who gets the treatment, so the groups differ only in the thing tested.",
      },
      {
        term: "Cohort study",
        meaning:
          "Following groups of people over time to see what happens to them. Good for spotting links, weaker on causes.",
      },
      {
        term: "Control group",
        meaning:
          "The comparison group that doesn't get the treatment, showing what would have happened anyway.",
      },
    ],
    example: {
      case: "The claim: “Brightway's phonics app improves reading.” The evidence offered: a teacher's glowing review, a survey of 300 parents who bought it, and a trial in which 40 classes were randomly assigned either to use the app or to carry on as usual.",
      moves: [
        "Ask what else could explain better reading: motivated parents, good teachers, children who were improving anyway.",
        "The review is one impression, from a teacher who may have chosen the app. It rules out almost nothing.",
        "The parents chose to buy it, so they may differ from other parents in many ways. The survey shows a link at best.",
        "Random assignment makes the two sets of classes alike apart from the app. If the app classes read better, the trial is what points at the app.",
      ],
    },
    subtleties: [
      {
        title: "The ladder isn't absolute",
        body: "A huge, careful cohort study can tell you more than a tiny, sloppy trial. And some questions can't ethically be tested by experiment, like whether smoking harms people. There, many studies pointing the same way, with a known mechanism, make a strong case.",
      },
      {
        title: "Strong isn't the same as relevant",
        body: "A perfect trial in adults may tell you little about children. Before ranking evidence, check it answers your question: the same kind of people, the same outcome, a similar setting.",
      },
    ],
    ask: "What other explanations does this evidence rule out?",
    tryIt:
      "The next time you see “research shows” in an article or ad, find out what kind of study it was. Was there a comparison group, and did chance decide who was in it?",
  },

  "evidence-anecdote-vs-data": {
    lessonId: "evidence-anecdote-vs-data",
    hook: "A single story can move us more than a page of numbers. That is useful when the story is typical, and misleading when it isn't.",
    idea: [
      "An anecdote is one case: my uncle never wore a bike helmet and was fine, my neighbor's car was stolen on our street. One case proves that something can happen. It can't tell you how often it happens, or what is typical, because you don't know how many cases went the other way.",
      "Data counts all the cases, including the dull ones nobody tells stories about. The piece missing from most anecdotes is the denominator: out of how many? Three lottery winners from one store sounds remarkable until you learn the store sold two million tickets.",
      "Stories still have uses. They suggest what to look into, and show what an average means for a person.",
    ],
    terms: [
      {
        term: "Anecdote",
        meaning: "A single case or personal story, offered as evidence.",
      },
      {
        term: "Denominator",
        meaning:
          "The total a number is out of. Three winners means little until you know out of how many.",
      },
      {
        term: "Base rate",
        meaning:
          "How often something happens across everyone, not just in the cases you heard about.",
      },
    ],
    example: {
      case: "A parents' forum post: “My son started at Kestrel Academy in September and he's been bullied twice already. Avoid this school.” Another parent replies with the school's anonymous survey: 92% of students said they felt safe, slightly above the local average.",
      moves: [
        "Take the story seriously as a fact: this child was bullied, and it matters.",
        "Ask what it can show. It proves bullying happens there. It can't show it happens more than at other schools.",
        "Check the data's denominator: every student who answered, compared with nearby schools. That speaks to how common the problem is.",
        "A fair conclusion uses both: the school looks no worse than others, and this case still needs dealing with.",
      ],
    },
    subtleties: [
      {
        title: "One case can break an “always”",
        body: "A story can't show how common something is, but it can refute a universal claim. If someone says a lock can't be picked, one video of it being picked is enough. Check whether the claim is about all cases or about what's typical.",
      },
      {
        title: "Averages can hide people too",
        body: "An average can bury a real problem for a small group. If 2% of patients react badly to a medicine, the overall figures may look fine. When stories keep repeating the same detail, they may be pointing at a group the data lumps together.",
      },
    ],
    ask: "Out of how many?",
    tryIt:
      "Next time a friend or a news story uses one striking case to make a point, ask yourself: out of how many? Try to find the real figure before deciding what the story shows.",
  },

  "evidence-source-reliability": {
    lessonId: "evidence-source-reliability",
    hook: "You can't check everything yourself, so most of what you know comes from sources. The skill is deciding quickly and fairly which ones deserve your trust.",
    idea: [
      "Four questions decide most cases. Does the source know this subject, through relevant training or direct access to what it describes? Who pays it, and does it gain if you believe it? What has it gotten right or wrong before? Does anyone independent agree?",
      "No single answer settles it. A company's scientists may know the subject better than anyone and still have a stake in the result. A campaign group may be independent of sellers and still have a cause to promote. Weigh the four together, and treat a strong incentive as a reason to look for independent confirmation, not as proof the source is wrong.",
    ],
    terms: [
      {
        term: "Conflict of interest",
        meaning: "When a source gains from you believing something, whatever the truth is.",
      },
      {
        term: "Track record",
        meaning: "How often a source has been right before about similar things.",
      },
      {
        term: "Independent confirmation",
        meaning:
          "Agreement from a source that could have disagreed, and shares no stake or origin with the first.",
      },
    ],
    example: {
      case: "A report says Ridgeline's new water filters remove 99% of microplastics. It was written by Ridgeline's own lab. A university team tested the same filters and found 80%. A popular home blog calls them “amazing.”",
      moves: [
        "Expertise: both labs test filters; the blog's writer has no stated training.",
        "Incentives: Ridgeline gains if you believe 99%. The university team sells nothing, though it's worth checking who funded the study.",
        "Track record and agreement: has either lab been right before, and do other independent tests land nearer 80% or 99%?",
        "Conclusion: lean on the independent figure until more tests agree. The blog adds enthusiasm, not evidence.",
      ],
    },
    subtleties: [
      {
        title: "A stake isn't proof of error",
        body: "A source with something to gain can still be right, and dismissing it only because of who funds it is its own mistake. Use the incentive to decide how much checking a claim needs, then check.",
      },
      {
        title: "Echoes aren't agreement",
        body: "Ten websites repeating one press release are one source, not ten. Agreement counts only when sources looked for themselves and could have found something different.",
      },
    ],
    ask: "Who knows, who gains, who has been right, and who agrees?",
    tryIt:
      "Pick one source you rely on: a news site, a podcast, a forum. Answer the four questions about it honestly, and note one kind of claim from it you'd check elsewhere.",
  },

  "evidence-correlation-causation": {
    lessonId: "evidence-correlation-causation",
    hook: "Two things rising together is one of the most common reasons people give for one causing the other. It is also one of the easiest to get wrong.",
    idea: [
      "A correlation means two things tend to go together. A cause means changing one would change the other. Every correlation has rival explanations that have to be ruled out before you can call it a cause.",
      "There are three to check. A common cause: something else drives both, as hot weather drives ice cream sales and sunburn. Reverse causation: the arrow runs the other way, as when people who already feel sick stop exercising. Coincidence: with enough data, some things line up by chance. The surest way past all three is an experiment where chance decides who gets the supposed cause.",
    ],
    terms: [
      {
        term: "Correlation",
        meaning:
          "Two things tending to rise and fall together. On its own, it says nothing about why.",
      },
      {
        term: "Confounder",
        meaning: "A hidden common cause that drives both things and makes them look linked.",
      },
      {
        term: "Reverse causation",
        meaning: "When the supposed effect is actually the cause.",
      },
    ],
    example: {
      case: "A lifestyle magazine reports that dog owners have lower blood pressure than other adults, and concludes: “Get a dog to protect your heart.”",
      moves: [
        "Common cause: people who are fitter, better off or have more free time may be likelier both to own a dog and to have lower blood pressure.",
        "Reverse direction: people in poor health may find a dog harder to look after, so health could drive ownership.",
        "Coincidence: possible, but less likely if several large studies find the same link.",
        "What would help: comparing people alike in age, income and fitness, or tracking blood pressure before and after people get a dog.",
      ],
    },
    subtleties: [
      {
        title: "A link is still evidence",
        body: "“Correlation isn't causation” doesn't make a link worthless. A strong, consistent link that survives the obvious confounders, with a plausible mechanism, is a reason to take a cause seriously. Name the specific rival rather than waving every link away.",
      },
      {
        title: "Links can flip when you split them",
        body: "One hospital can have worse survival overall yet better survival for both mild and severe cases, because it treats far more severe ones. This is called Simpson's paradox. Always ask which groups are mixed together.",
      },
    ],
    ask: "What else could make these two go together?",
    tryIt:
      "Look for one “X linked to Y” headline this week. Before reading the article, write down a possible common cause and a possible reverse direction. Then see whether the article mentions either.",
  },

  "evidence-sample-cherry-picking": {
    lessonId: "evidence-sample-cherry-picking",
    hook: "Every number about people depends on which people were counted. Change who gets counted and the same question can give a very different answer.",
    idea: [
      "A sample is the part you measure to learn about the whole. It misleads in three main ways. It can be too small, so chance swings the result: four heads in four flips isn't rare (about 1 in 16). It can be self-selected, so the eager or angry answer and everyone else doesn't. Or it can hold only survivors, so the cases that failed are missing.",
      "Cherry-picking is choosing which results to show: the best weeks, the happiest reviews, the start date that flatters a trend. The check is the same for all of these: ask who was counted, who was left out, and how they were chosen.",
    ],
    terms: [
      {
        term: "Random sample",
        meaning: "One where everyone in the group had the same chance of being picked.",
      },
      {
        term: "Self-selection",
        meaning:
          "When people choose whether to be counted, so the result reflects who chose to answer.",
      },
      {
        term: "Survivorship bias",
        meaning:
          "Looking only at the cases that made it, because the failures are no longer around to count.",
      },
    ],
    example: {
      case: "Sproutly, a language app, says: “Our learners reach conversational level in six months.” The evidence is a set of interviews with 25 learners who are still using the app after a year.",
      moves: [
        "Who was counted: learners still using it after a year. People who stopped, perhaps because they weren't progressing, are missing.",
        "How many: 25 is small, and the interviews were probably picked to suit an ad.",
        "A fair sample: a random set of everyone who started in one month, tested after six months, including those who stopped.",
        "Expect the fair figure to look worse, and to be worth far more.",
      ],
    },
    subtleties: [
      {
        title: "Bigger isn't automatically better",
        body: "A million self-selected answers can tell you less than a thousand random ones, because size doesn't fix who chose to answer. How people got into the sample matters more than how many there are.",
      },
      {
        title: "Small groups produce the extremes",
        body: "In school rankings, the smallest schools tend to have both the best and the worst results, just by chance. Before praising or blaming an extreme result, check whether it comes from a small group.",
      },
    ],
    ask: "Who was counted, and who was left out?",
    tryIt:
      "Find one figure this week that describes a group of people: a poll, a review score, a success rate. Track down how the people were chosen, and say who might be missing.",
  },
};

export default evidence;
