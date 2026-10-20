import type { LessonNotes } from "@/lib/lesson-notes";

/** Unit 7: Media & AI literacy. All names, places, sites and products are made up. */
const media: Record<string, LessonNotes> = {
  "media-headlines-vs-findings": {
    lessonId: "media-headlines-vs-findings",
    hook: "Most people read the headline and perhaps the first paragraph. Headlines are written to be read, not to be precise, and the gap is often large.",
    idea: [
      "Headlines overstate in predictable ways. They drop the conditions: a study in mice becomes “cure found,” a link in one survey becomes “causes.” And they report relative change where the absolute change would sound tiny: “risk doubles” when it went from 1 in 10,000 to 2 in 10,000.",
      "Before trusting a headline about a study, find four things: who was studied, how many, what they were compared with, and how big the change was in absolute terms. Then check the verb. Linked to, associated with and may fit a correlation, and are honest when they come with a size or a source; without one, they're escape hatches. Causes, proves and cures claim far more.",
    ],
    terms: [
      {
        term: "Relative change",
        meaning: "How much something changed as a share of where it started, like “50% higher.”",
      },
      {
        term: "Absolute change",
        meaning: "The actual difference, like “from 2 in 1,000 to 3 in 1,000.”",
      },
    ],
    example: {
      case: "Headline: “Night owls 30% more likely to get diabetes, study finds.” The study followed 4,000 adults in one city for ten years. By the end, 5 in 100 early risers had developed diabetes, against 6.5 in 100 night owls, who also exercised less.",
      moves: [
        "Relative difference: 6.5 in 100 is 30% higher than 5 in 100, so the headline's number is right.",
        "Absolute difference: 1.5 more cases per 100 people. Real, but less dramatic.",
        "Cause: night owls exercised less, a possible common cause. “More likely to get” is fair; “causes” would not be.",
        "A faithful headline: “Night owls had slightly higher diabetes rates over ten years; less exercise may explain some of it.”",
      ],
    },
    subtleties: [
      {
        title: "The headline may not be the reporter's",
        body: "Headlines are often written by an editor, and the article underneath can be careful. Read a few paragraphs before blaming the journalism, or trusting it.",
      },
      {
        title: "Exaggeration often starts upstream",
        body: "Researchers who compared news stories with the press releases behind them found that much of the exaggeration was already in the release, and the news copied it. Going to the study's own summary is the most reliable fix.",
      },
    ],
    ask: "Who was studied, how many, compared with what, and how big was the change?",
    tryIt:
      "Pick one health or science headline this week. Find the study or its summary and answer the four questions: who, how many, compared with what, how big. Then rewrite the headline to match.",
  },

  "media-misleading-charts": {
    lessonId: "media-misleading-charts",
    hook: "A chart can be accurate in every number and still leave you with the wrong impression. The trick is almost always in what the chart chose to show.",
    idea: [
      "Three choices do most of the misleading. The axis: a vertical axis starting at 95 instead of 0 makes a 2-point gap look huge. The window: starting a line chart at an unusually low month turns ordinary recovery into a surge. The units: a rise from 4% to 6% is 2 percentage points but also a 50% rise, and either can be picked to sound bigger.",
      "Before reading the shape, read the labels: where the axis starts, what time span is shown and why, and whether the numbers are counts, rates or percentages. Then ask what the chart would look like from zero, or over a longer period.",
    ],
    terms: [
      {
        term: "Truncated axis",
        meaning: "An axis that doesn't start at zero, which exaggerates differences between bars.",
      },
      {
        term: "Percentage point",
        meaning:
          "The plain difference between two percentages: from 4% to 6% is 2 points, though it's a 50% rise.",
      },
      {
        term: "Cherry-picked window",
        meaning: "A time span chosen to show the trend someone wants, rather than a typical one.",
      },
    ],
    example: {
      case: "A flyer from Elmstead Transit shows a bar chart headed “On-time rate soars!” The bars go from 91% of buses on time last year to 94% this year, and the vertical axis runs from 90% to 95%.",
      moves: [
        "Read the axis: it starts at 90%, so a 3-point difference fills most of the chart.",
        "Read the numbers: 91% to 94% on time. Late buses fell from 9 in 100 to 6 in 100, a real improvement.",
        "Check the window: only two years. Was last year unusually bad?",
        "An honest caption: “On-time buses rose from 91% to 94% this year.” No “soars.”",
      ],
    },
    subtleties: [
      {
        title: "Zero isn't always right",
        body: "For a line chart of something that never gets near zero, like body temperature, starting at zero can hide changes that matter. The real question is whether the scale makes the change look the size it really is.",
      },
      {
        title: "Same numbers, different stories",
        body: "“Late buses fell by a third” and “the on-time rate rose 3 points” are both true of the example. Choosing between them is a choice of emphasis. Look for both framings before deciding how big a change is.",
      },
    ],
    ask: "Where does the axis start, what's the window, and what are the units?",
    tryIt:
      "Find one chart this week, in the news, at work or in an ad. Check its axis, time window and units, and sketch how it would look starting at zero or covering a longer period.",
  },

  "media-manipulation": {
    lessonId: "media-manipulation",
    hook: "Some messages are built to make you act before you think. The techniques are few and recognizable, and noticing them is most of the defense.",
    idea: [
      "Manipulation works by pressure, not information. The common tools are urgency (“only today”), scarcity (“3 left!”), outrage, fear, flattery and social proof (“everyone's switching”). Each one shortens the time between feeling and acting, so you don't check.",
      "Strong feeling isn't the problem in itself. An honest appeal can be moving and still give figures you can check. The tell is pressure with nothing new to weigh: a deadline with no reason, a claim of scarcity you can't verify. When a message makes you feel rushed, that's the moment to slow down and ask what it isn't telling you.",
    ],
    terms: [
      {
        term: "False urgency",
        meaning:
          "A deadline with no real reason behind it, designed to stop you from comparing or checking.",
      },
      {
        term: "Social proof",
        meaning: "Pressure to act because others supposedly are. Persuasive, and easy to fake.",
      },
      {
        term: "Scarcity claim",
        meaning: "“Only a few left.” Honest when you can check it; pressure when you can't.",
      },
    ],
    example: {
      case: "A text message: “Silverbrook Tollway: You have an unpaid toll of $4.35. Pay within 12 hours to avoid a $75 late fee. Tap here to pay now.”",
      moves: [
        "Find the pressure: “within 12 hours,” “a $75 late fee,” “tap here to pay now.”",
        "Ask what's new to weigh: no license plate, no date or road, no reason for the deadline.",
        "Notice what it asks for: card details through a link, which is exactly what a scam would want.",
        "The move: don't tap. Check for unpaid tolls through the toll road's own app or a website address you type yourself.",
      ],
    },
    subtleties: [
      {
        title: "Honest persuasion uses feeling too",
        body: "A flood relief fundraiser may show distressing pictures. If it also says what the money does and where its financial reports are published, it's giving you something to check. Don't dismiss every emotional message as manipulation.",
      },
      {
        title: "Pressure works best when you're tired",
        body: "Rushed, tired or upset, everyone is easier to push, which is why scams arrive late at night and sales end at midnight. A standing rule, like “I never pay through a link in a message,” saves deciding under pressure.",
      },
    ],
    ask: "Is this giving me something new to check, or just pushing me to act?",
    tryIt:
      "Save the next three marketing emails or messages that create urgency. For each, name the pressure technique and what you'd need to know before acting. Count how many give a real reason for the deadline.",
  },

  "media-ai-answers": {
    lessonId: "media-ai-answers",
    hook: "AI tools write fluent, confident answers, and fluency feels like knowledge. The answers are often right and sometimes invented, in exactly the same calm tone.",
    idea: [
      "A language model produces text that sounds like a good answer. Usually that overlaps with a correct one, but not always: it can invent figures, quotes, studies and references that look exactly like real ones. Confident wording tells you nothing about which you've got.",
      "Treat an AI answer as a lead, not a source. Take the general shape as a starting point, then check the risky parts first: specific numbers, named studies or reports, quotations, and any claim stated with certainty. Look for the original source, and if you can't find it, don't repeat the claim.",
    ],
    terms: [
      {
        term: "Hallucination",
        meaning:
          "When an AI tool produces confident, specific information that is false or made up.",
      },
      {
        term: "Primary source",
        meaning:
          "The original place a fact comes from: the study, the dataset, the official record.",
      },
    ],
    example: {
      case: "Asked about sleep and memory, an AI tool answers: “Sleep helps consolidate memories. A 2019 Halvorsen University study found that students who slept 8 hours remembered 40% more than those who slept 5. Experts recommend 7 to 9 hours a night for adults.”",
      moves: [
        "The general idea: sleep helps memory. Widely supported, so a reasonable starting point.",
        "The specific claim: the study, the year, the 40%. This is exactly what tools can invent. Search for the study itself.",
        "The recommendation: easy to check against a public health agency's own published guidance.",
        "If the study can't be found, drop it, however precise it sounded.",
      ],
    },
    subtleties: [
      {
        title: "A source you haven't opened isn't a source",
        body: "Asking a tool for its sources helps only if you open them. Tools can list references that don't exist, or real ones that don't say what's claimed. Read the source before you rely on it.",
      },
      {
        title: "Stronger on common ground",
        body: "Tools tend to do better on widely written-about topics and worse on recent events, local details, niche subjects and exact figures. The further a question is from common knowledge, the harder you should check.",
      },
    ],
    ask: "Where did this specific claim come from, and have I seen the original?",
    tryIt:
      "Ask an AI tool about something you know well. Check every specific number, name and source in its answer, and note what you'd have believed if you hadn't known the subject.",
  },

  "media-lateral-reading": {
    lessonId: "media-lateral-reading",
    hook: "Professional fact-checkers judge an unfamiliar website faster and better than most people, and not by reading it more carefully. They leave it almost right away.",
    idea: [
      "A website controls everything it says about itself: its design, its about page, its list of experts and its glowing quotes. Reading it harder only tells you more of its own story.",
      "Lateral reading means opening new tabs instead. Before reading closely, search for who runs the site and what independent sources say about them: who funds it, whether reputable outlets cite it, and what others say about the specific claim. A few minutes of this usually tells you more than half an hour on the page. Then go back and read, knowing who's talking.",
    ],
    terms: [
      {
        term: "Lateral reading",
        meaning:
          "Leaving a page to check what independent sources say about it, instead of judging it from the inside.",
      },
      {
        term: "Vertical reading",
        meaning:
          "Judging a source only by the source itself: its design, its about page, its own claims.",
      },
      {
        term: "Click restraint",
        meaning:
          "Looking over the search results before choosing one, rather than opening the top link.",
      },
    ],
    example: {
      case: "A link takes you to “The Clear Water Institute,” a polished site with an official-sounding name. Its article says tap water in your area is unsafe and recommends a particular filter. The site lists a panel of doctors.",
      moves: [
        "Don't judge by looks. A polished design and an official name cost little and prove nothing.",
        "Open a new tab and search for the institute's name with words like “funded by” or “who runs.”",
        "Suppose it turns out to be funded by a filter maker. That doesn't prove the claim false, but it's a reason to check independently.",
        "Search the claim itself: what does your water utility's published test report say?",
      ],
    },
    subtleties: [
      {
        title: "You need context, not the final word",
        body: "To find out who runs an organization, a general encyclopedia or a search of reputable news is often enough. You're not settling the question yet, just learning who's talking.",
      },
      {
        title: "Many copies can be one source",
        body: "If every page you find traces back to the same press release, you've found one source many times. And niche topics may have few independent sources at all. Then say so, and hold the claim more loosely.",
      },
    ],
    ask: "Who is behind this, and what do independent sources say about them?",
    tryIt:
      "The next time a link to an unfamiliar site comes your way, spend two minutes reading laterally before reading the article. Note who runs it and one thing an independent source says about them.",
  },
};

export default media;
