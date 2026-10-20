import type { LessonScript } from "@/lib/steps/types";

/**
 * Unit 7: Media and information. All names, outlets, sites and products are made up.
 */
const media: Record<string, LessonScript> = {
  "media-headlines-vs-findings": {
    lessonId: "media-headlines-vs-findings",
    takeaway:
      "A headline can be true and still mislead; find the size of the change and who was studied.",
    written: {
      prompt: "Compare the headline with the findings, and write a more accurate one.",
      passage:
        "Headline: “New snack doubles your risk of heart problems.” The study followed 4,000 adults for a year. Heart problems affected 2 in 1,000 people who ate the snack daily, and 1 in 1,000 people who didn't. The researchers say the difference could be due to chance.",
      guidance: "Say what the headline leaves out, then write a headline that fits the study.",
    },
    steps: [
      {
        id: "snack",
        kind: "stronger",
        noun: "Headline",
        prompt:
          "In a study, 2 in 1,000 snack eaters had a heart problem, against 1 in 1,000 others. Which headline is more faithful?",
        a: "Snack doubles your risk of heart problems!",
        b: "Snack linked to 1 extra heart problem per 1,000 people in a study.",
        stronger: "b",
        factor: "It gives the actual size of the change",
        weakerWhy:
          "“Doubles” is true in relative terms, but hides that the risk moved from 1 in 1,000 to 2 in 1,000.",
        hint: "How big is the change, in real numbers?",
        why: "Relative change makes small numbers sound large. The absolute change, one extra case in a thousand, tells you how much it matters.",
      },
      {
        id: "sleep",
        kind: "flaw",
        label: "Headline past the study",
        prompt: "Tap the line that claims more than the study found.",
        passage: [
          {
            text: "A study of 60 students at one university found those who slept eight hours scored higher.",
            tappable: true,
            whyNot: "That is a fair summary of what was found.",
          },
          {
            text: "The headline reads: “Sleep makes you smarter, science proves.”",
            tappable: true,
            flaw: true,
          },
          {
            text: "The researchers say more work is needed.",
            tappable: true,
            whyNot: "That is an honest note from the authors. It isn't the problem.",
          },
        ],
        fallacy: "Headline goes past the finding",
        hint: "Compare “60 students at one university” with “science proves.”",
        why: "A small study can suggest a link, not prove that sleep makes anyone smarter. The headline drops the size, the place and the caution.",
      },
      {
        id: "walking",
        kind: "sort",
        prompt:
          "A small trial: 40 adults, six weeks. A walking group lost 4 pounds more than a non-walking group. Sort each headline claim.",
        buckets: [
          { id: "supported", label: "The study supports it" },
          { id: "beyond", label: "Goes beyond the study" },
        ],
        items: [
          {
            id: "1",
            text: "Walking group lost more weight over six weeks.",
            bucket: "supported",
            why: "That is exactly what was measured.",
          },
          {
            id: "2",
            text: "Walking cures obesity.",
            bucket: "beyond",
            why: "Four pounds in six weeks is far from a cure.",
          },
          {
            id: "3",
            text: "In a small trial of 40 adults, the walkers lost a little more weight.",
            bucket: "supported",
            why: "It gives the size of the trial and keeps the result modest.",
          },
          {
            id: "4",
            text: "Walking is the best way to lose weight.",
            bucket: "beyond",
            why: "Nothing was compared against other methods.",
          },
          {
            id: "5",
            text: "Everyone should walk to lose weight.",
            bucket: "beyond",
            why: "A trial of 40 adults can't say what is right for everyone.",
          },
        ],
        hint: "Would the study's own numbers back this?",
        why: "A headline can only claim what the study measured: who, how many, for how long and what was compared.",
      },
      {
        id: "plants",
        kind: "cause",
        prompt:
          "A headline says homes with more houseplants have healthier children. Switch on the hidden variable, then say what is going on.",
        scenario: "Each dot is a home in the town of Haldane.",
        xLabel: "Houseplants per home",
        yLabel: "Child health score",
        hiddenLabel: "Household income",
        groups: [
          {
            id: "lower",
            label: "Lower income",
            points: [
              [1, 44],
              [2, 50],
              [2, 46],
              [3, 47],
              [3, 52],
              [4, 45],
            ],
          },
          {
            id: "higher",
            label: "Higher income",
            points: [
              [7, 78],
              [8, 72],
              [9, 76],
              [9, 80],
              [10, 74],
              [11, 79],
            ],
          },
        ],
        question: "What best explains the pattern?",
        options: [
          {
            text: "Houseplants make children healthier in every home.",
            whyNot:
              "Inside each income group the link mostly disappears, so plants aren't the reason.",
          },
          { text: "Higher income goes with more plants and better health." },
          {
            text: "Healthy children make their parents buy more plants.",
            whyNot:
              "Inside each group, healthier children don't have more plants, so this doesn't fit.",
          },
        ],
        correct: 1,
        hint: "What might better-off homes have more of, besides plants?",
        why: "Income is a hidden third factor. It raises both plants and health, so together they appear linked when they aren't.",
      },
      {
        id: "first-question",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question: "A headline says a habit raises your risk by 50%. What should you ask first?",
        options: [
          { text: "50% more than what, and out of how many?" },
          {
            text: "Who wrote the headline about the habit?",
            whyNot: "The writer matters less than what the number means.",
          },
          {
            text: "Is 50% a big number, or a small one?",
            whyNot: "Without a starting point, a percentage can be large while the change is tiny.",
          },
        ],
        correct: 0,
        hint: "A percentage needs something to be a percentage of.",
        why: "A relative change is only meaningful against the base. A 50% rise on 2 in 10,000 is 3 in 10,000, a very small change.",
      },
      {
        id: "overstate",
        kind: "builder",
        prompt:
          "Build the case that the headline overstates the finding. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          { id: "pc", text: "The headline overstates the finding.", role: "conclusion" },
          {
            id: "pp",
            text: "It reports a relative change without saying how small the base is.",
            role: "premise",
          },
          {
            id: "pe",
            text: "The study found 2 cases per 1,000 people, against 1 per 1,000.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The story was published on a Tuesday.",
            role: null,
            note: "The day it ran has no bearing on whether it overstates the finding.",
          },
        ],
        hint: "The evidence is what the study actually found.",
        why: "Criticizing a headline works like any argument. Say what it gets wrong, why that matters, and what the study shows.",
      },
      {
        id: "cheese",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "A survey finds that people who eat cheese daily live longer.",
        conclusion: "So eating cheese every day will extend your life.",
        options: [
          { text: "Cheese, not something else about cheese eaters, explains it." },
          {
            text: "Cheese is cheap and widely available in most stores and cafes.",
            whyNot: "Availability doesn't link eating cheese to living longer.",
          },
          {
            text: "Most people already eat some cheese at least once a week.",
            whyNot: "How common cheese is doesn't show it causes longer life.",
          },
        ],
        correct: 0,
        hint: "What else might cheese eaters have in common?",
        why: "A link in a survey doesn't show cause. The conclusion follows only if nothing else about cheese eaters explains the difference.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Read past the headline. Which version is faithful to the study?",
        stimulus:
          "Headline: “Chocolate cuts stroke risk by 20%!” The study: 1,200 adults over 65 in one region were asked about their diets. Over five years, 5 in 100 of those eating chocolate weekly had a stroke, against 6.25 in 100 of those who didn't.",
        options: [
          {
            text: "“Eating chocolate every week prevents strokes, scientists now prove.”",
            whyNot:
              "A diet survey can't prove prevention. Chocolate eaters may differ in other ways, such as health or income.",
          },
          {
            text: "“Chocolate has no link whatsoever to strokes, new study finds.”",
            whyNot:
              "There was a link, just a small one. Denying it is as unfaithful as overstating it.",
          },
          {
            text: "“Older chocolate eaters had slightly fewer strokes in one survey.”",
          },
        ],
        correct: 2,
        hint: "Who was studied, how big was the absolute change, and what kind of study was it?",
        why: "It's a survey of adults over 65 in one region, and the absolute change is 1.25 strokes per 100. A link, not proof of prevention. A faithful headline keeps the group, the size and the caution.",
      },
    ],
  },

  "media-misleading-charts": {
    lessonId: "media-misleading-charts",
    takeaway: "Read the axis and the window before the shape.",
    written: {
      prompt: "Say what is misleading about the chart and how you would redraw it.",
      passage:
        "A chart from Brightfield Energy shows the average monthly bill falling steeply, with the caption “Bills are plummeting!” The vertical axis runs only from $118 to $122. The line starts in March, the month bills were highest, and ends in August.",
      guidance: "Name the axis, the window, and what the change is in real terms.",
    },
    steps: [
      {
        id: "axis",
        kind: "choice",
        prompt: "What is the honest reading of the difference?",
        stimulus:
          "A chart shows the share of customers satisfied with two stores: A 95%, B 97%. The vertical axis starts at 94%, so B's bar looks three times taller than A's.",
        options: [
          {
            text: "B is three times as good as A, judging by the bars.",
            whyNot: "It only looks that way because the axis is cut off at 94%.",
          },
          { text: "B is about 2 points higher, a small difference." },
          {
            text: "The chart shows that A is a bad store overall.",
            whyNot: "95% satisfied is high, and the chart shows nothing bad about A.",
          },
        ],
        correct: 1,
        hint: "Compare the numbers, not the heights of the bars.",
        why: "A bar that doesn't start at zero exaggerates differences. Read the values, and the honest gap here is 2 points.",
      },
      {
        id: "bills",
        kind: "flaw",
        label: "Find the trick",
        prompt: "Tap the detail that makes the fall look dramatic.",
        passage: [
          {
            text: "An energy firm's ad shows a line falling steeply, captioned “Bills are plummeting!”",
            tappable: true,
            whyNot: "The caption is punchy, but the trick is in how the chart is drawn.",
          },
          {
            text: "The vertical axis runs only from $118 to $122.",
            tappable: true,
            flaw: true,
          },
          {
            text: "The line has one point for each month.",
            tappable: true,
            whyNot: "One point a month is a reasonable way to draw a monthly bill.",
          },
        ],
        fallacy: "Cut-off axis",
        hint: "How much range is the axis showing?",
        why: "A drop from $122 to $118 is about 3%. Cutting the axis to that narrow range makes it look like a collapse.",
      },
      {
        id: "points",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "A store's share of the market went from 2% to 4%. Which statement is accurate and clear?",
        options: [
          {
            text: "The store's sales grew by 2%, a small rise overall.",
            whyNot: "Its share rose by 2 percentage points, which is a doubling, not a 2% change.",
          },
          { text: "Its share rose 2 points, from 2% to 4%, doubling." },
          {
            text: "The store's sales grew by 4%, a fairly modest rise.",
            whyNot: "4% is where the share ended up, not how much it rose.",
          },
        ],
        correct: 1,
        hint: "Percent of what, and by how much?",
        why: "A percentage point is a step on a scale of percentages. “Doubled” and “rose 2 points” are both true, but “grew 2%” is not.",
      },
      {
        id: "honest",
        kind: "sort",
        prompt:
          "Sort each feature: does it help you read a chart honestly, or does it risk misleading you?",
        buckets: [
          { id: "honest", label: "Helps you read it" },
          { id: "misleading", label: "Risks misleading" },
        ],
        items: [
          {
            id: "1",
            text: "Bars start at zero, so lengths match the values.",
            bucket: "honest",
            why: "The bar height matches the number.",
          },
          {
            id: "2",
            text: "A trend line that starts at the single lowest month.",
            bucket: "misleading",
            why: "Starting from a low point makes any later rise look bigger.",
          },
          {
            id: "3",
            text: "Axes labeled in units, with dates and the source.",
            bucket: "honest",
            why: "You can check what is shown and where it came from.",
          },
          {
            id: "4",
            text: "Two lines on different scales, so they seem to cross.",
            bucket: "misleading",
            why: "Where the lines meet depends on the scales chosen.",
          },
          {
            id: "5",
            text: "A change shown as a percentage, with no counts behind it.",
            bucket: "misleading",
            why: "A big percentage of a tiny number can mean almost nothing.",
          },
        ],
        hint: "Could you check the number behind it?",
        why: "Honest charts let you see the real values, the starting point and the scale. Misleading ones hide one of them.",
      },
      {
        id: "ads",
        kind: "cause",
        prompt:
          "A chart shows stores that spend more on ads sell more. Switch on the hidden variable, then say what is going on.",
        scenario: "Each dot is a store in the Marlow Market group.",
        xLabel: "Ad spend ($100s a month)",
        yLabel: "Sales ($1,000s a month)",
        hiddenLabel: "Store size",
        groups: [
          {
            id: "small",
            label: "Small stores",
            points: [
              [1, 10],
              [2, 13],
              [2, 9],
              [3, 12],
              [3, 11],
              [4, 10],
            ],
          },
          {
            id: "large",
            label: "Large stores",
            points: [
              [7, 46],
              [8, 50],
              [9, 44],
              [9, 48],
              [10, 52],
              [11, 47],
            ],
          },
        ],
        question: "What best explains the pattern?",
        options: [
          {
            text: "Ads raise sales by a large amount.",
            whyNot:
              "Inside each size of store, more ads don't bring more sales, so ads aren't the reason.",
          },
          {
            text: "Sales are high because the ads are well designed.",
            whyNot: "Design would matter within each group too, and the chart shows no such link.",
          },
          { text: "Larger stores both spend more on ads and sell more." },
        ],
        correct: 2,
        hint: "What sort of store can afford both?",
        why: "Store size is a hidden third factor. Big stores spend more on ads and sell more, so the two appear linked across the whole chart.",
      },
      {
        id: "window",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "The chart starts in the month the store reopened after a fire.",
        conclusion: "So the store's sales are growing fast.",
        options: [
          {
            text: "Fires make stores more popular with the people nearby.",
            whyNot:
              "Nothing here says so, and it isn't the link between the start point and growth.",
          },
          { text: "Sales in that first month were typical of its usual level." },
          {
            text: "The chart has a clear title and labeled axes.",
            whyNot: "A clear title doesn't tell you whether the start point is fair.",
          },
        ],
        correct: 1,
        hint: "Growth from a low start looks bigger. Was the start low?",
        why: "A window starting at an unusually low point makes any recovery look like growth. The start has to be representative for the trend to mean much.",
      },
      {
        id: "caption",
        kind: "stronger",
        noun: "Caption",
        prompt:
          "A chart shows support requests rising from 8 to 11 a month. Which caption is more honest?",
        a: "Support requests soared this year!",
        b: "Support requests rose from 8 to 11 a month this year, still below the 30 a month in 2022.",
        stronger: "b",
        factor: "It gives the numbers and the context",
        weakerWhy:
          "“Soared” turns a rise of three into a crisis and leaves out that requests are still far below earlier years.",
        hint: "Which caption lets you judge for yourself?",
        why: "Honest captions give the values and a fair comparison. Strong verbs and missing context are how small changes look large.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "The numbers are right. What's misleading about the chart?",
        stimulus:
          "A city council flyer has a line chart titled “Crime falls!” It shows reported burglaries from March to August: 120 down to 85. Full-year figures show burglaries dip every summer, and last year's total was 1,100, the same as the year before.",
        options: [
          {
            text: "Nothing: burglaries really did fall from 120 to 85.",
            whyNot:
              "The numbers may be accurate. The problem is the window, which turns a seasonal dip into a trend.",
          },
          {
            text: "The window: a usual summer dip is shown as a fall.",
          },
          {
            text: "The axis: it should show burglaries per person, not counts.",
            whyNot:
              "Rates can help, but the population barely changes in six months. The window is the real problem here.",
          },
          {
            text: "The source: city councils can never be trusted on crime.",
            whyNot:
              "That dismisses the source instead of reading the chart. The figures may be right; the framing isn't.",
          },
        ],
        correct: 1,
        hint: "What happens to burglaries every summer? Now look at which months the chart chose.",
        why: "March to August catches the usual summer dip, and the yearly totals haven't moved. A window chosen like this turns a pattern that repeats every year into an apparent improvement.",
      },
    ],
  },

  "media-manipulation": {
    lessonId: "media-manipulation",
    takeaway: "Pressure without new information is the sign; feeling with facts is not.",
    written: {
      prompt:
        "Point out where the message pressures you, and say what you would want to know before deciding.",
      passage:
        "An email from Skyline Tickets reads: “Only 2 seats left! 47 people are looking at this flight right now! Book in the next 10 minutes or lose this price forever. Don't be the one who missed out.” Last week the same message arrived with “3 seats left.”",
      guidance: "Separate any real facts from the pressure, and say how you could check them.",
    },
    steps: [
      {
        id: "pressure",
        kind: "sort",
        prompt:
          "Sort each message: pressure with nothing new, or feeling with facts you can check?",
        buckets: [
          { id: "pressure", label: "Pressure, nothing new" },
          { id: "honest", label: "Feeling plus facts" },
        ],
        items: [
          {
            id: "1",
            text: "Only 3 left! 47 people are looking at this right now!",
            bucket: "pressure",
            why: "It rushes you without saying anything you can check.",
          },
          {
            id: "2",
            text: "Floods destroyed 40 homes on Weir Lane. Here is how to help, and where the money goes.",
            bucket: "honest",
            why: "It is emotional, but it gives facts and a way to check them.",
          },
          {
            id: "3",
            text: "If you really cared about your kids, you'd sign up today.",
            bucket: "pressure",
            why: "It uses guilt in place of a reason.",
          },
          {
            id: "4",
            text: "I'm heartbroken: our library closes on March 1. The city council vote was 5 to 4.",
            bucket: "honest",
            why: "It shows strong feeling and states facts that can be checked.",
          },
          {
            id: "5",
            text: "Doctors HATE this trick! You won't believe what happens next.",
            bucket: "pressure",
            why: "It teases you into clicking and gives you no information.",
          },
        ],
        hint: "What could you check in the message?",
        why: "Strong feeling isn't the problem. The sign of manipulation is pressure to act that comes with nothing new to weigh.",
      },
      {
        id: "midnight",
        kind: "flaw",
        label: "Spot the pressure",
        prompt: "Tap the line that pushes you to decide before you can check.",
        passage: [
          {
            text: "The Brightwell alarm fits any door in about an hour.",
            tappable: true,
            whyNot: "That is a plain product claim you can check.",
          },
          {
            text: "Order before midnight or the price doubles!",
            tappable: true,
            flaw: true,
          },
          {
            text: "It comes with a 30-day return policy.",
            tappable: true,
            whyNot: "That works against pressure, because it lets you change your mind.",
          },
        ],
        fallacy: "Manufactured urgency",
        hint: "Which line gives you no time to think?",
        why: "A deadline with no reason behind it is there to stop you from checking. The return policy does the opposite by giving you time.",
      },
      {
        id: "charity",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "A message says: “Twelve children at Ash Street Elementary have no winter coats. $20 buys one. Our full financial reports are on our site.” What does it do?",
        options: [
          { text: "Uses feeling, but gives facts you can check." },
          {
            text: "Manufactures urgency to make you give money.",
            whyNot: "It states a need and a price, with no false deadline or pressure.",
          },
          {
            text: "Hides where the donated money actually goes.",
            whyNot: "It points to its financial reports, which is the opposite of hiding.",
          },
        ],
        correct: 0,
        hint: "Can you check what it says?",
        why: "The message is emotional, but it gives numbers and points to its financial reports. Feeling with checkable facts is honest persuasion.",
      },
      {
        id: "hall",
        kind: "stronger",
        noun: "Message",
        prompt: "Which message respects the reader?",
        a: "Sign up now before it's too late! Everyone's doing it!",
        b: "Registration closes June 30 because the hall holds 80 people. 61 spots are taken.",
        stronger: "b",
        factor: "It gives a real reason for the deadline",
        weakerWhy: "The deadline and the crowd are unexplained, so all they do is rush you.",
        hint: "Which deadline has a reason?",
        why: "A real deadline comes with a reason you can check. A vague one exists to hurry you.",
      },
      {
        id: "rooms",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "An email says only 2 rooms are left.",
        conclusion: "So you must book now.",
        options: [
          {
            text: "Booking now is always cheaper than booking later.",
            whyNot: "Nothing says so, and it doesn't show the scarcity is real.",
          },
          { text: "The claim of only two rooms left is true." },
          {
            text: "The hotel has many happy guests every year.",
            whyNot: "Guests' happiness doesn't show that rooms are running out.",
          },
        ],
        correct: 1,
        hint: "What is the whole argument resting on?",
        why: "The urgency depends on scarcity being real. Without a way to check it, the claim is just pressure.",
      },
      {
        id: "rush",
        kind: "builder",
        prompt: "Build the case that the offer is trying to rush you. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          { id: "pc", text: "The offer is trying to rush you.", role: "conclusion" },
          {
            id: "pp",
            text: "It adds pressure but gives no new information.",
            role: "premise",
          },
          {
            id: "pe",
            text: "Its “ends at midnight” deadline was reset three times last month.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The email has a green button.",
            role: null,
            note: "The color of a button says nothing about the deadline.",
          },
        ],
        hint: "The evidence is a pattern you could look up.",
        why: "Naming manipulation is an argument like any other. Say what the message does, why it is pressure, and what shows it.",
      },
      {
        id: "reply",
        kind: "choice",
        prompt: "What is the best reply to a message that presses you to decide right now?",
        options: [
          {
            text: "Decide quickly, or you'll miss out.",
            whyNot: "That is what the message wants. Speed is the whole point of the pressure.",
          },
          { text: "Pause, then check what the message claims." },
          {
            text: "Ignore everything in it, including any facts.",
            whyNot: "Some of it may be true and useful. Check it rather than dismiss it.",
          },
        ],
        correct: 1,
        hint: "What does the pressure hope you won't do?",
        why: "Time to check is the best defense. Verify the claim, then decide.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Before deciding, what should you check first?",
        stimulus:
          "An email: “Hi, it's Alex from Mapleway Gym! We've noticed you haven't visited in a while. Your rate of $25 a month is locked in, but only if you renew by midnight tonight. After that it rises to $39. 47 members renewed today!”",
        options: [
          {
            text: "Whether the $39 price and midnight deadline are in the terms.",
          },
          {
            text: "Whether 47 members really renewed today, by asking the gym.",
            whyNot:
              "Even if it's true, other people renewing tells you nothing about whether you should. It's social proof.",
          },
          {
            text: "Whether Alex is friendly, since the email sounds personal.",
            whyNot:
              "A friendly tone is easy to write. It doesn't change whether the deadline or the price is real.",
          },
        ],
        correct: 0,
        hint: "Which claim, if it were false, would remove the pressure entirely?",
        why: "The deadline and the price increase create the pressure. If they're real and in the terms, you can decide calmly; if not, the email is just hurrying you. The other details are decoration.",
      },
    ],
  },

  "media-ai-answers": {
    lessonId: "media-ai-answers",
    takeaway:
      "Fluent isn't correct; check the specific numbers, named sources and confident claims.",
    written: {
      prompt:
        "Say which parts of the AI answer you would check first and how you would check them.",
      passage:
        "An AI assistant is asked about a local reservoir. It replies: “The Corvane reservoir was finished in 1974 and supplies the town of Aldwick. A 2021 report by the Northern Water Institute found that silt has reduced its capacity by exactly 12.4%.” It gives no link to the report.",
      guidance: "Look for precise numbers and named sources you cannot see.",
    },
    steps: [
      {
        id: "check",
        kind: "flaw",
        label: "Check this first",
        prompt: "Tap the part of this AI answer you should verify first.",
        passage: [
          {
            text: "The reservoir supplies the town of Aldwick.",
            tappable: true,
            whyNot: "That is a plain claim, and it's easy to check against the town's water page.",
          },
          {
            text: "A 2021 report by the “Northern Water Institute” found silt cut its capacity by exactly 12.4%.",
            tappable: true,
            flaw: true,
          },
          {
            text: "It is a large reservoir.",
            tappable: true,
            whyNot: "That is vague and low-stakes, so it's not the first thing to check.",
          },
        ],
        fallacy: "Precise claim, no source you can find",
        hint: "Which part is precise but gives you nothing to look up?",
        why: "Made-up details look just like real ones. A specific figure and a named report with no link are what to check first.",
      },
      {
        id: "sources",
        kind: "sort",
        prompt: "Sort each part of an AI answer: check it first, or fine as a starting point?",
        buckets: [
          { id: "check", label: "Check it first" },
          { id: "fine", label: "Fine to start with" },
        ],
        items: [
          {
            id: "1",
            text: "A specific percentage with no source.",
            bucket: "check",
            why: "A precise figure can be invented and still sound convincing.",
          },
          {
            id: "2",
            text: "A named study with a year but no link.",
            bucket: "check",
            why: "Fake references look like real ones until you search for them.",
          },
          {
            id: "3",
            text: "A general description of what a reservoir does.",
            bucket: "fine",
            why: "It is common knowledge and easy to confirm.",
          },
          {
            id: "4",
            text: "A quote from “a leading expert” with no name.",
            bucket: "check",
            why: "With no name, there is no one to verify it with.",
          },
          {
            id: "5",
            text: "A plain explanation of how a concept works.",
            bucket: "fine",
            why: "Its claims are general and easy to confirm elsewhere, so it works as a start.",
          },
        ],
        hint: "Could this part be invented without you noticing?",
        why: "The risky parts are the ones that sound exact but can't be traced. Accept general ideas as a start and verify specifics.",
      },
      {
        id: "sure",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "An AI answer is fluent and confident and cites a report you can't find. What should you do?",
        options: [
          {
            text: "Trust it, because it sounds authoritative and confident.",
            whyNot: "Fluent writing is easy to produce, and it says nothing about accuracy.",
          },
          { text: "Search for the report; if it isn't there, don't rely on it." },
          {
            text: "Trust it, because AI tools are usually right anyway.",
            whyNot: "Usually isn't always, and made-up sources sound just like real ones.",
          },
        ],
        correct: 1,
        hint: "How could you tell whether the report exists?",
        why: "If a source can't be found, the claim rests on nothing. Check it, or leave it out.",
      },
      {
        id: "use",
        kind: "stronger",
        noun: "Use",
        prompt: "Which way of using an AI answer is better?",
        a: "Copy the numbers into the report because the answer was detailed.",
        b: "Use the answer to find search terms, then check the numbers against the original source.",
        stronger: "b",
        factor: "It verifies before relying",
        weakerWhy:
          "Detail is not evidence. Copying the numbers passes on any invented ones without checking.",
        hint: "Which use keeps a check in the loop?",
        why: "An AI answer is a good place to start looking and a poor place to stop. The original source is what to rely on.",
      },
      {
        id: "tone",
        kind: "gap",
        prompt: "What does this argument quietly rely on?",
        reason: "The AI gave a detailed, confident reply.",
        conclusion: "So the reply is correct.",
        options: [
          {
            text: "The reply came back very quickly, within seconds.",
            whyNot: "Speed isn't the link between confidence and correctness.",
          },
          {
            text: "The reply was several paragraphs long, with sections.",
            whyNot: "Length isn't the link between confidence and correctness either.",
          },
          { text: "A detailed, confident tone reliably signals accuracy." },
        ],
        correct: 2,
        hint: "What link joins “confident” to “correct”?",
        why: "That link is exactly what fails. A tool can sound sure while being wrong, so the conclusion does not follow.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each fact make “the AI's figure is accurate” more or less likely?",
        claim: "The AI's 12.4% silt figure is accurate.",
        prior: 50,
        cards: [
          {
            id: "a",
            text: "A water-utility survey, independent of the AI, gives a similar silt figure.",
            shift: 35,
            note: "An independent source that finds something similar is strong support.",
          },
          {
            id: "b",
            text: "You cannot find the report the AI named, by its title or its author.",
            shift: -30,
            note: "The AI may have invented its source, and the exact figure along with it.",
          },
          {
            id: "c",
            text: "The AI gives the same figure when you ask again.",
            shift: 0,
            note: "The same tool agreeing with itself isn't an independent check, so it changes nothing.",
          },
          {
            id: "d",
            text: "The answer sounds very sure of itself.",
            shift: 0,
            note: "Confidence of tone is not evidence.",
          },
        ],
        hint: "Which facts come from outside the AI's answer?",
        why: "Evidence from outside the answer is what moves you. Repetition and tone come from the same source, so they don't move you at all.",
      },
      {
        id: "search",
        kind: "builder",
        prompt: "Build the case for holding the figure back. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          { id: "pc", text: "The figure shouldn't be repeated yet.", role: "conclusion" },
          {
            id: "pp",
            text: "The answer names a source that can't be found.",
            role: "premise",
          },
          {
            id: "pe",
            text: "Searching for the report's title returns no results.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The answer was three paragraphs long.",
            role: null,
            note: "Length says nothing about whether the source exists.",
          },
        ],
        hint: "The evidence is what you found when you looked.",
        why: "Holding a claim back is a decision you can defend: name the problem and show what you found.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "You want to use this in a school project. What's the best next step?",
        stimulus:
          "You ask an AI tool when Fenwick Bridge opened. It replies: “Fenwick Bridge opened in 1887. It was designed by the engineer Margaret Holt and was the longest bridge in the county until 1952, according to the Fenwick Historical Society.”",
        options: [
          {
            text: "Use it as written, since it names a source.",
            whyNot:
              "Naming a source isn't the same as being backed by one. Tools can attach real-sounding sources to wrong facts.",
          },
          {
            text: "Ask the same tool again and see if it agrees.",
            whyNot:
              "The same tool agreeing with itself isn't independent. It can repeat an invented detail just as confidently.",
          },
          {
            text: "Check the date and designer in the society's own records.",
          },
          {
            text: "Throw it all away, since AI answers are always wrong.",
            whyNot:
              "Too far the other way. Much of it may be right; the point is to check the specific claims first.",
          },
        ],
        correct: 2,
        hint: "Which parts are specific and checkable? Where would you find the original?",
        why: "Specific dates, names and records are what tools can get wrong while sounding sure. The named source, the society's own records, will confirm or correct them, and then you cite that, not the tool.",
      },
    ],
  },

  "media-lateral-reading": {
    lessonId: "media-lateral-reading",
    takeaway: "To judge a source, leave the page and see what others say about it.",
    written: {
      prompt: "Say what you would check first about this source, and where you would look.",
      passage:
        "A site called the Pinewood Health Council says a herbal supplement cures tiredness. Its About page calls it “independent and trusted.” The page has a clean design, several quotes from happy customers, and a link to buy the supplement.",
      guidance:
        "Plan your checks outside the page. What would you search, and what would you hope to learn?",
    },
    steps: [
      {
        id: "own-word",
        kind: "sort",
        prompt:
          "Sort each check: does it use independent information, or only the site's own word?",
        buckets: [
          { id: "outside", label: "Independent check" },
          { id: "own", label: "The site's own word" },
        ],
        items: [
          {
            id: "1",
            text: "Search the site's name and see what others say.",
            bucket: "outside",
            why: "It goes to sources the site does not control.",
          },
          {
            id: "2",
            text: "Read the site's “About us” page.",
            bucket: "own",
            why: "The site is describing itself.",
          },
          {
            id: "3",
            text: "Look for the same claim on two unrelated news sites.",
            bucket: "outside",
            why: "It tests the claim against independent reports.",
          },
          {
            id: "4",
            text: "Notice how professional the page design looks.",
            bucket: "own",
            why: "Anyone can build a polished site.",
          },
          {
            id: "5",
            text: "Read the banner that says “Trusted by millions.”",
            bucket: "own",
            why: "It is the site praising itself.",
          },
        ],
        hint: "Who is speaking in each?",
        why: "A site's own pages can only tell you what it wants you to think. Independent sources are what test that story.",
      },
      {
        id: "first",
        kind: "choice",
        prompt: "What is the best first move?",
        stimulus:
          "You land on the Pinewood Health Council's site, which says a supplement cures tiredness.",
        options: [
          {
            text: "Read the whole page carefully for clues.",
            whyNot: "Reading harder keeps you inside the page's own story.",
          },
          {
            text: "Check that the page looks very professional.",
            whyNot: "Anyone can build a polished site, so the design shows nothing.",
          },
          { text: "Open a new tab and search who runs the Council." },
        ],
        correct: 2,
        hint: "Where could you find out who is behind it?",
        why: "Leave the page first. Who runs it, and what others say about them, tells you more than the page can.",
      },
      {
        id: "about",
        kind: "flaw",
        label: "Where the check went wrong",
        prompt: "Tap the step where Lena trusts the site's word about itself.",
        passage: [
          {
            text: "Lena wants to know whether the Pinewood Health Council can be trusted.",
            tappable: true,
            whyNot: "Wanting to check is the right start.",
          },
          {
            text: "Its About page says it is “independent and trusted,” so she decides it is.",
            tappable: true,
            flaw: true,
          },
          {
            text: "She then shares its supplement advice with her class.",
            tappable: true,
            whyNot: "Sharing is a consequence of the mistake made in the step before.",
          },
        ],
        fallacy: "Trusting a site's word for itself",
        hint: "Who wrote the About page?",
        why: "The site wrote its own description. It would say it was independent whether or not it was, so that tells Lena nothing.",
      },
      {
        id: "funding",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "You search for the Council and find two news reports saying it is funded by the supplement's maker. What does this suggest?",
        options: [
          {
            text: "The supplement must be harmful.",
            whyNot: "Funding is a reason for caution, not proof of harm.",
          },
          { text: "The Council may not be independent on this topic." },
          {
            text: "The reports must be wrong, because the site says otherwise.",
            whyNot: "That trusts the site's own word over independent sources.",
          },
        ],
        correct: 1,
        hint: "Does the funder gain if you believe the claim?",
        why: "A group paid by a seller has a reason to praise the product. It doesn't show the product is bad, but it means you should look for independent evidence.",
      },
      {
        id: "copies",
        kind: "gap",
        prompt: "What must be true for this to follow?",
        reason: "Three other sites repeat the same claim, word for word.",
        conclusion: "So the claim is well supported.",
        options: [
          {
            text: "The three sites all have very professional designs online.",
            whyNot: "Design doesn't show that anyone checked anything.",
          },
          {
            text: "The claim is short, catchy and easy to repeat online.",
            whyNot: "That makes it easy to spread, which isn't the same as being checked.",
          },
          { text: "The sites each checked it, rather than copying one source." },
        ],
        correct: 2,
        hint: "Word for word suggests what?",
        why: "Several copies of one claim may all trace back to one source. Repetition only counts if each one was checked independently.",
      },
      {
        id: "method",
        kind: "stronger",
        noun: "Student",
        prompt: "Two students check a claim. Who is checking better?",
        a: "Reads the article three times and checks every link inside it.",
        b: "Opens new tabs to see who is behind the site and whether reliable sources agree.",
        stronger: "b",
        factor: "Leaves the page to check",
        weakerWhy:
          "The links inside the article are chosen by the article. Reading it again only repeats its own story.",
        hint: "Which student goes outside the article?",
        why: "Checking from inside a page only gets you the page's version. Reading sideways, across other sources, tests it.",
      },
      {
        id: "trace",
        kind: "builder",
        prompt: "Build the case for doubting the site on this topic. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          {
            id: "pc",
            text: "The site shouldn't be trusted on this topic yet.",
            role: "conclusion",
          },
          {
            id: "pp",
            text: "Independent sources say it is funded by the seller.",
            role: "premise",
          },
          {
            id: "pe",
            text: "Two news reports name the seller as its main funder.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The site's logo is a green leaf.",
            role: null,
            note: "A logo tells you nothing about who funds the site.",
          },
        ],
        hint: "The evidence is something you found outside the site.",
        why: "A judgment about a source is strongest when it rests on independent evidence you can point to.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A friend shares this article. What's the best first move to judge the source?",
        stimulus:
          "The article is from “Parents for Safe Screens,” a site saying a popular new game harms children's sleep. The site looks professional, cites “recent research” without links, and its About page says it is “a grassroots group of concerned parents.”",
        options: [
          {
            text: "Read the whole article carefully to see if it sounds convincing.",
            whyNot:
              "That's reading vertically. A careful read only tells you the site's own story.",
          },
          {
            text: "Open a new tab and search who runs and funds the group.",
          },
          {
            text: "Trust its About page, since it says it's a grassroots group.",
            whyNot:
              "The site wrote its own description. It would say “grassroots” whether or not it was.",
          },
        ],
        correct: 1,
        hint: "Would the site's own pages ever tell you it had a hidden backer?",
        why: "The site controls everything on its own pages, including its About page. Searching who runs and funds it, in a new tab, tells you who's talking. Then look for the research it mentions.",
      },
    ],
  },
};

export default media;
