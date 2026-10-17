import type { CaseQuestion, DailyCase } from "@/lib/daily-case";

/**
 * The daily cases, in the order they're served. Each is one real-world text (made-up people,
 * places and products) and three questions from three different units. Add new cases at the end
 * with the next id; `cases.test.ts` holds them to the format, the content rules and freshness.
 *
 * In the option lists, the right answer is a plain string and each wrong answer is
 * [text, why it's wrong].
 */

type Option = string | readonly [text: string, whyNot: string];

function options(list: readonly Option[]) {
  return {
    options: list.map((o) => (typeof o === "string" ? { text: o } : { text: o[0], whyNot: o[1] })),
    correct: list.findIndex((o) => typeof o === "string"),
  };
}

/** A plain question about the case text. */
function ask(
  lessonId: string,
  id: string,
  prompt: string,
  list: readonly Option[],
  why: string,
): CaseQuestion {
  return { lessonId, step: { id, kind: "choice", prompt, ...options(list), why } };
}

/** A question that asks how sure the learner is before the answer is shown. */
function sure(
  lessonId: string,
  id: string,
  question: string,
  list: readonly Option[],
  why: string,
): CaseQuestion {
  return {
    lessonId,
    step: {
      id,
      kind: "confidence",
      prompt: "Answer, then say how sure you are.",
      question,
      ...options(list),
      why,
    },
  };
}

export const DAILY_CASES: DailyCase[] = [
  {
    id: "case-001",
    source: "advert",
    title: "Nine minutes a day",
    text: "FLEXCORE 9: the only workout you'll ever need. Nine minutes a day is all it takes. In our trial, people who used Flexcore every day for a month lost an average of 9 pounds. Personal trainer Dana Reyes says: \"I've never seen results like it.\" Over 200,000 people have already switched. Don't get left behind: the launch price ends Friday.",
    questions: [
      ask(
        "evidence-correlation-causation",
        "trial",
        "Daily users lost 9 pounds in a month. What's the biggest thing the trial leaves out?",
        [
          "What happened to similar people who didn't use it",
          [
            "How many minutes a day the workout takes",
            "The ad tells you that: nine. It isn't what's missing.",
          ],
          [
            "Whether the trainer has tried other workouts",
            "That's about the quote. The trial's gap is what it compares against.",
          ],
        ],
        "With no comparison group, the 9 pounds could come from anything people do when they start a new routine, like eating less. Daily users are also the keenest ones.",
      ),
      ask(
        "fallacies-authority-popularity",
        "switched",
        '"Over 200,000 people have already switched." What does that number show?',
        [
          [
            "That it works for most of the people who try it",
            "Buying something shows people wanted it, not that it did what it promised.",
          ],
          [
            "That the trial's 9-pound result must be accurate",
            "Sales numbers say nothing about how the trial was run.",
          ],
          "That it sells well, which isn't the same as working",
        ],
        "That's an appeal to popularity. Lots of buyers shows good marketing or a real wish to get fit, not results.",
      ),
      ask(
        "media-manipulation",
        "rush",
        "Which line is there to rush you rather than inform you?",
        [
          [
            "Nine minutes a day is all it takes",
            "That's a claim about the product, one you could check.",
          ],
          "The launch price ends Friday",
          [
            "Lost an average of 9 pounds in a month",
            "That's evidence, weak as it is. It isn't a pressure tactic.",
          ],
        ],
        "A deadline creates urgency, so you decide before you look closely. It tells you nothing about the workout.",
      ),
    ],
    takeaway: "Ask what would have happened anyway, and notice who's rushing you.",
  },
  {
    id: "case-002",
    source: "post",
    title: "Since the skate park opened",
    text: "Since the skate park opened in June, my car has been broken into, and so has my neighbor's. Three other people in this group have posted about break-ins too. It's obvious what's going on. The council should close the park before someone gets hurt. Anyone who disagrees clearly doesn't live around here.",
    questions: [
      ask(
        "claims-hidden-assumptions",
        "link",
        "What does the post take for granted without saying so?",
        [
          "That people using the park are the ones breaking in",
          [
            "That cars on the street were broken into",
            "That's stated outright, not taken for granted.",
          ],
          [
            "That the council is the one that runs the park",
            "It's implied, but nothing in the argument hangs on it.",
          ],
        ],
        "The whole case rests on an unstated link between the park's users and the break-ins. Nothing in the post shows that link.",
      ),
      ask(
        "biases-availability",
        "wave",
        "Five break-ins posted in one group. Why might that feel like more crime than it is?",
        [
          [
            "Because five break-ins in a month is a crime wave",
            "Five could be normal for the area. Without past numbers, there's no way to tell.",
          ],
          [
            "Because people in the group tend to exaggerate",
            "Nothing suggests anyone made anything up. The stories may all be true.",
          ],
          "Stories read together in one place feel common",
        ],
        "Vivid stories gathered in one feed are easy to recall, so they feel frequent. Police figures from before and after June would show whether anything changed.",
      ),
      ask(
        "fallacies-adhominem-strawman",
        "disagree",
        "\"Anyone who disagrees clearly doesn't live around here.\" What's wrong with that line?",
        [
          [
            "Nothing: people who live nearby know the area best",
            "Where someone lives doesn't make their reasons right or wrong.",
          ],
          "It dismisses people instead of answering their reasons",
          [
            "It exaggerates the number of break-ins there were",
            "It doesn't mention break-ins. Its problem is how it treats disagreement.",
          ],
        ],
        "It rules out every objection by attacking who would make it, so nobody's reasons ever get heard.",
      ),
    ],
    takeaway:
      "A run of stories and a strong feeling can point somewhere, but only counts over time show a change.",
  },
  {
    id: "case-003",
    source: "article",
    title: "Coffee adds years to your life",
    text: "HEADLINE: Coffee adds years to your life\n\nThe study behind it followed 12,000 adults for ten years. People who said they drank three or more cups a day were 8% less likely to die during that time than people who drank none. The researchers note that coffee drinkers in the study were also more likely to be in work and less likely to smoke, and say more research is needed.",
    questions: [
      ask(
        "media-headlines-vs-findings",
        "headline",
        "How does the headline compare with what the study found?",
        [
          "It turns a link into a cause the study didn't show",
          [
            "It's accurate: coffee drinkers really did live longer",
            'The study found a link in who died over ten years. "Adds years" says coffee caused it.',
          ],
          [
            "It understates what the study actually found",
            "It goes further than the study, whose own authors say more research is needed.",
          ],
        ],
        'The study found coffee drinkers died less often over ten years. "Adds years to your life" claims coffee did it, which the study couldn\'t show.',
      ),
      ask(
        "evidence-correlation-causation",
        "smoke",
        "Coffee drinkers were more likely to be in work and less likely to smoke. Why does that matter?",
        [
          [
            "It means drinking coffee helped people to stop smoking",
            "Nothing says coffee changed anyone's smoking. The groups just differed.",
          ],
          [
            "It shows the study isn't worth taking seriously at all",
            "The link is still worth knowing. It just can't be read as a cause on its own.",
          ],
          "Those differences could explain the longer lives",
        ],
        "People who differ in work and smoking already differ in health. Those differences alone could produce the gap, with coffee doing nothing.",
      ),
      ask(
        "arguments-qualifying-claims",
        "summary",
        "Which is the most accurate one-line summary?",
        [
          [
            "Three cups of coffee a day will help you live longer",
            "Far too strong: the study found a link, not a benefit.",
          ],
          "Heavy coffee drinkers died less often, but differed in other ways",
          [
            "Coffee makes no real difference to how long people live",
            "That overcorrects. The link is real; what it means is the open question.",
          ],
        ],
        "A good summary says what was measured and keeps the limits that came with it.",
      ),
    ],
    takeaway: "A link in who lived longer isn't a cause, and a good summary keeps its limits.",
  },
  {
    id: "case-004",
    source: "chatbot",
    title: "The bridge at Harlow Vale",
    text: "Q: When was the Old Mill Bridge in Harlow Vale built?\n\nA: The Old Mill Bridge in Harlow Vale was built in 1847 by the engineer Thomas Penrith, according to the Harlow Vale Historical Society's 1962 survey. It was the first iron bridge in the county and carried mail coaches until 1910. It remains one of the best-documented bridges in the region.",
    questions: [
      ask(
        "media-ai-answers",
        "check",
        "What's the best first step before repeating this answer?",
        [
          "Check that the 1962 survey exists and says this",
          [
            "Ask the chatbot whether it's sure about the date",
            "It can say yes and still be wrong. Its confidence isn't a check.",
          ],
          [
            "Trust it, since it names a specific source",
            "Chatbots can produce real-sounding sources that don't exist. A name isn't proof.",
          ],
        ],
        "A named source is only worth something if it exists and says what's claimed. That's quick to check, and the answer stands or falls on it.",
      ),
      sure(
        "probability-updating-beliefs",
        "detail",
        "How much should all the specific detail raise your confidence that the answer is right?",
        [
          [
            "A lot: the more detail, the more likely it is true",
            "Detail is easy to generate. Each extra specific is one more thing that could be wrong.",
          ],
          [
            "Not at all: chatbots are never right about history",
            "Too far: they often are. The point is that detail alone can't tell you when.",
          ],
          "Not much: detail makes it sound sure, not be right",
        ],
        "Dates and names feel convincing, but a chatbot adds them just as easily when it's wrong. Move a little, then check.",
      ),
      ask(
        "claims-burden-of-proof",
        "prove",
        'A friend says: "Prove it\'s wrong, then." Who should be doing the proving?',
        [
          [
            "You, because you're the one who is doubting it",
            "Doubting a claim doesn't oblige you to disprove it. The claim needs support first.",
          ],
          "Whoever repeats the claim, by finding the source",
          [
            "Nobody, because old history can't really be checked",
            "Much of it can: records, archives and surveys exist. That's the point of naming one.",
          ],
        ],
        'Whoever makes or passes on a claim carries the burden of supporting it. "Prove it\'s wrong" flips that.',
      ),
    ],
    takeaway: "Confident detail is cheap. Check the one thing the answer depends on.",
  },
  {
    id: "case-005",
    source: "email",
    title: "About next year's rent",
    text: "Dear tenants,\nFrom April, rent for every apartment in Larch House will go up by 12%. Costs have risen across the board, and the building needs a new roof. Either we raise the rent or the building falls apart, so there really is no choice. Most tenants I've spoken to understand. If you're unhappy, you're welcome to look elsewhere.\nBest wishes,\nR. Okafor, Property Manager",
    questions: [
      ask(
        "arguments-premise-conclusion",
        "conclusion",
        "What's the conclusion the email wants you to accept?",
        [
          "The rise is necessary and you should accept it",
          [
            "Costs have risen across the board this year",
            "That's offered as a reason for the conclusion, not the point itself.",
          ],
          [
            "The building is going to need a new roof",
            "Another reason given in support. The conclusion is what it's all for.",
          ],
        ],
        "The reasons are the costs and the roof. The point they're there to support is that you should accept the rise.",
      ),
      ask(
        "fallacies-dilemma-slippery-slope",
        "either",
        '"Either we raise the rent or the building falls apart." What\'s the problem?',
        [
          [
            "It's a fair summary of the only two choices there are",
            "There are others, like a smaller rise or spreading the roof's cost over years.",
          ],
          "It hides other options, like a smaller rise",
          [
            "It's a personal attack on tenants who complain",
            "It doesn't attack anyone. Its problem is pretending there are only two options.",
          ],
        ],
        "A false dilemma offers two choices when there are more. A smaller rise, or paying for the roof over several years, are both possible.",
      ),
      ask(
        "claims-facts-opinions-values",
        "check",
        "Which of these could be checked as a fact?",
        [
          [
            "There really is no other choice",
            "That's a judgment dressed as a fact. Whether there's a choice is the very question.",
          ],
          [
            "The rise is the fair thing to do",
            "That's a value judgment. People can agree on every fact and still disagree on what's fair.",
          ],
          "The rent goes up by 12% from April",
        ],
        'The size and date of the rise can be checked against the letter and the lease. "No choice" and "fair" are judgments.',
      ),
    ],
    takeaway: "When you're told there's no choice, list the options that were left out.",
  },
  {
    id: "case-006",
    source: "review",
    title: "One star for Marlow's",
    text: "One star. Avoid! I had the fish curry at Marlow's on Saturday and was ill all of Sunday. My sister ate there last year and said the service was slow. The owner replied to another review saying the kitchen passed its last inspection, but of course he would say that. This whole street has gone downhill. Never again.",
    questions: [
      ask(
        "biases-availability",
        "blame",
        "Why is the curry the first thing the reviewer blames?",
        [
          "It's the most memorable thing they ate lately",
          [
            "Because restaurants cause most illness",
            "Many things cause a day of illness: other food, a bug going round, a long week.",
          ],
          [
            "Because the curry has been tested",
            "Nothing says anything was tested. The curry is just the obvious suspect.",
          ],
        ],
        "A recent, vivid meal is the easiest thing to recall, so it gets the blame. That doesn't make it the cause, only the first suspect.",
      ),
      ask(
        "fallacies-adhominem-strawman",
        "motive",
        '"Of course he would say that." Does that answer the owner\'s point?',
        [
          "No: it dismisses him without checking the inspection",
          [
            "Yes: owners will always defend their own business",
            "He may be biased, but the inspection can be checked. Dismissing him doesn't check it.",
          ],
          [
            "Yes: inspections are nearly always out of date",
            "Nothing says this one is. That's a new claim with nothing behind it.",
          ],
        ],
        "Pointing at someone's motive isn't the same as showing they're wrong. The inspection record is public and would settle it.",
      ),
      ask(
        "claims-vague-language",
        "downhill",
        '"This whole street has gone downhill." What would make that claim checkable?',
        [
          [
            "Adding more exclamation points for emphasis",
            "Emphasis makes it louder, not clearer. It still can't be tested.",
          ],
          "Saying what has got worse, and since when",
          [
            "Getting more people in the area to agree",
            "Agreement doesn't make it specific. \"Downhill\" still doesn't say what changed.",
          ],
        ],
        '"Gone downhill" could mean anything. Naming what changed (closures, prices, complaints) and since when turns it into something that could be checked.',
      ),
    ],
    takeaway: "One bad night is one data point. Check the record before the reputation.",
  },
  {
    id: "case-007",
    source: "notice",
    title: "Changes to Westbrook Library",
    text: "Westbrook Library will close on Saturdays from next month. Saturday visits have fallen by 30% over five years, and the council must save $40,000 this year. The money saved will keep the bookmobile running. Residents can still use the library online at any time, and the central library, a 25-minute bus ride away, stays open on Saturdays.",
    questions: [
      ask(
        "arguments-counterarguments",
        "objection",
        "Which is the strongest objection a resident could raise?",
        [
          [
            "Libraries matter and should never close, ever",
            "It states a value but doesn't engage with the reasons given.",
          ],
          [
            "The council has probably just made the numbers up",
            "An accusation with nothing behind it. A strong objection works with the facts given.",
          ],
          "The 30% drop may hide who still needs Saturdays",
        ],
        "A strong objection takes the reasons seriously. Visits fell overall, but the people left on Saturdays may be the ones with no other option.",
      ),
      ask(
        "probability-second-order",
        "knock-on",
        "What's a knock-on effect the notice doesn't mention?",
        [
          [
            "The library will spend less on Saturday staff",
            "That's the direct effect, the point of the change.",
          ],
          "People without bus fare may stop using libraries",
          [
            "The bookmobile will keep running next year",
            "The notice already claims this. It's a stated benefit.",
          ],
        ],
        "A 25-minute bus ride costs time and money. Some Saturday users won't make it, so the change could cut library use by more than one day's worth.",
      ),
      ask(
        "claims-hidden-assumptions",
        "online",
        "The notice offers the online library instead. What does that assume?",
        [
          ["That the library already has a website", "It says so directly. Nothing hidden there."],
          "That Saturday visitors can and will use it online",
          [
            "That the council needs to save money this year",
            "That's stated outright, not assumed.",
          ],
        ],
        "Online access only replaces a visit if the people losing Saturdays have the devices, skills and wish to use it. That's left unsaid.",
      ),
    ],
    takeaway: "Ask who is behind an average, and what follows once the change is made.",
  },
  {
    id: "case-008",
    source: "message",
    title: "Get in on Glintcoin",
    text: "Honestly, you should get in on this. My cousin put $500 into Glintcoin in March and it's worth $2,100 now. Everyone at his work is buying. It's only going one way. I've already put in $800 and I'm not selling now, I've come too far. The website says early buyers could see 10x returns by Christmas.",
    questions: [
      ask(
        "evidence-anecdote-vs-data",
        "cousin",
        "What does the cousin's $2,100 tell you about whether you would make money?",
        [
          "Very little: one win says nothing of how many lost",
          [
            "Quite a lot: it shows the coin really does go up",
            "One person's gain shows it went up for him, at one time. It says nothing of the odds.",
          ],
          [
            "Nothing, because the cousin is probably lying",
            "No reason is given to doubt him. The problem is that one result can't show what usually happens.",
          ],
        ],
        "You hear about the winners. Without knowing how many people bought in and what happened to them, one success tells you little.",
      ),
      ask(
        "biases-sunk-cost",
        "too-far",
        "\"I'm not selling now, I've come too far.\" What's the problem with that reasoning?",
        [
          "Money already spent shouldn't decide what to do next",
          [
            "None: being patient is simply how investing works",
            "Patience can be wise, but the reason given is past spending, not a view of what comes next.",
          ],
          [
            "They should have put more money in at the start",
            "That's hindsight. The question is what to do from here.",
          ],
        ],
        "The $800 is spent either way. The only question that matters is whether holding from here is a good bet.",
      ),
      sure(
        "probability-expected-value",
        "tenx",
        'Early buyers "could see 10x returns". What do you need to judge that?',
        [
          [
            "How many people at the cousin's work are buying",
            "Popularity isn't a probability. It doesn't tell you the odds or the downside.",
          ],
          [
            "Whether ten times your money would be enough",
            "That's about what you want, not about whether it's a good bet.",
          ],
          "How likely the 10x is, and what you could lose",
        ],
        "\"Could\" says possible, not likely. A bet's worth depends on how likely each outcome is and how much you'd lose if it went wrong.",
      ),
    ],
    takeaway: "Ask how likely, ask how much you could lose, and ignore what's already spent.",
  },
  {
    id: "case-009",
    source: "report",
    title: "The loyalty program",
    text: "Q3 update from the sales team: our new loyalty program is a hit. Weekly sales in the six stores that trialed it rose from 41,000 to 44,000 units, as the chart on page 2 shows: this quarter's bar is twice the height of last quarter's. Customers love it. We recommend rolling the program out to all 90 stores.",
    questions: [
      ask(
        "media-misleading-charts",
        "bars",
        "Sales rose from 41,000 to 44,000, yet one bar is twice the other's height. What's going on?",
        [
          [
            "Sales must really have doubled over the quarter",
            "41,000 to 44,000 is a rise of about 7%. The bar's height is the chart's choice.",
          ],
          [
            "The chart shows profit rather than units sold",
            "Nothing suggests that. The mismatch comes from where the axis starts.",
          ],
          "The chart's axis doesn't start at zero",
        ],
        "A 7% rise only looks like a doubling if the axis starts near 41,000. Cutting the axis makes small changes look huge.",
      ),
      ask(
        "evidence-sample-cherry-picking",
        "six",
        "The program was tried in six stores. What would you most want to know about them?",
        [
          [
            "Whether staff there enjoyed running the program",
            "Staff views matter, but they don't tell you if the rise would happen elsewhere.",
          ],
          [
            "Whether six is the right number for a report",
            "Which six matters more than how many: hand-picked stores can be the best ones.",
          ],
          "How they were chosen, and how they compare",
        ],
        "If the six were picked because they were already doing well, or had a busy season, the rise may not carry over to 90 stores.",
      ),
      ask(
        "arguments-strong-vs-weak",
        "weaken",
        "Which fact would most weaken the recommendation?",
        [
          [
            "Some customers disliked the program's app",
            "A few complaints don't undo a sales rise. It's minor next to the comparison.",
          ],
          "Stores without it rose by the same amount",
          [
            "The program will cost money in every store",
            "Every program has costs. That doesn't show this one failed to work.",
          ],
        ],
        "If every store rose by 3,000 units, the season did it, not the program. Without that comparison the recommendation rests on very little.",
      ),
    ],
    takeaway: "Read the numbers, not the bar heights, and ask what happened where nothing changed.",
  },
  {
    id: "case-010",
    source: "listing",
    title: "Charming family home",
    text: 'CHARMING FAMILY HOME, Elm Rise. Asking $425,000. Three bedrooms, a sunny backyard and a quiet street, just minutes from the station. Similar homes nearby have sold for up to $500,000. "The best-kept house I\'ve seen this year," says a local agent. Showings are filling up fast, so book today.',
    questions: [
      ask(
        "claims-vague-language",
        "minutes",
        "Which phrase tells you least that you could check?",
        [
          "Just minutes from the station",
          [
            "Asking for offers over $425,000",
            "That's a precise figure you can read straight off the listing.",
          ],
          ["A house with three bedrooms", "That's checkable: you can count them on a viewing."],
        ],
        '"Minutes" could be three or twenty-five. A distance or a timed walk would tell you something; "minutes" just sounds close.',
      ),
      ask(
        "biases-anchoring",
        "fivehundred",
        '"Similar homes nearby have sold for up to $500,000." Why is that line there?',
        [
          "To make $425,000 feel cheap by comparison",
          [
            "To show the house is worth exactly $500,000",
            'It says "up to" and "similar". That\'s a ceiling for other houses, not a value for this one.',
          ],
          [
            "To warn buyers that prices have been falling",
            "Nothing in it suggests falling prices. It sets a high reference point.",
          ],
        ],
        'A high number seen first makes the asking price feel like a bargain, even though "up to $500,000" may describe the best of several different houses.',
      ),
      ask(
        "evidence-source-reliability",
        "agent",
        "How much weight should the agent's quote carry?",
        [
          [
            "A lot: agents see more houses than anyone",
            "Experience counts, but an agent tied to the sale has a reason to praise it.",
          ],
          [
            "None: real estate agents always mislead buyers",
            "Too sweeping. The issue is this quote: unnamed and possibly interested.",
          ],
          "Little: an unnamed agent may gain from the sale",
        ],
        "The quote is anonymous and may come from someone who benefits if the house sells. A survey or your own viewing tells you more.",
      ),
    ],
    takeaway:
      "Check the numbers you can, and notice which ones are there to set your expectations.",
  },
  {
    id: "case-011",
    source: "article",
    title: "Phones out, grades up",
    text: 'Hillcrest Academy banned phones during the school day last September. This summer, the share of its students passing math rose from 61% to 70%. "The ban has transformed our results," said the principal. Three other schools in the county are now considering bans. Across the county as a whole, math pass rates rose from 63% to 69% over the same year.',
    questions: [
      sure(
        "probability-base-rates",
        "county",
        "Pass rates rose across the whole county too. What does that suggest?",
        [
          "Much of Hillcrest's rise may have happened anyway",
          [
            "The ban worked even better than the school claims",
            "The county rose almost as much without a ban, which points the other way.",
          ],
          [
            "Other schools must have banned phones as well",
            "The others are only considering it. The county rise happened without bans.",
          ],
        ],
        "The county went from 63% to 69% without a ban. Hillcrest's 9-point rise is only a little more, so the ban may explain only a small part.",
      ),
      ask(
        "arguments-qualifying-claims",
        "transformed",
        "Which version of the principal's claim does the evidence support?",
        [
          [
            "The phone ban has completely transformed our results",
            '"Transformed" credits the ban with the whole rise, most of which the county saw too.',
          ],
          "Results rose a little more than the county's after the ban",
          [
            "The phone ban made no difference to our results at all",
            "That overcorrects. The rise was slightly above the county's; the ban might have helped a bit.",
          ],
        ],
        "A careful claim keeps to what was measured: a rise slightly above the county's, in one year, at one school.",
      ),
      ask(
        "fallacies-hasty-generalization",
        "copy",
        "Three schools are considering bans because of Hillcrest. What's the risk?",
        [
          [
            "Copying a school that is much too far away",
            "Distance isn't the issue. One school and one year is too little to go on.",
          ],
          [
            "Banning phones is bound to upset some parents",
            "Maybe, but that's a different concern. The reasoning problem is the thin evidence.",
          ],
          "Acting on one school's single year of results",
        ],
        "One school over one year, with the county rising anyway, is a thin base for a policy. Several schools over several years would say more.",
      ),
    ],
    takeaway: "Before crediting a change, check what happened everywhere else that year.",
  },
  {
    id: "case-012",
    source: "post",
    title: "My grandad smoked",
    text: "People keep telling me to stop smoking. My grandad smoked 20 a day from the age of 15 and lived to 94, sharp as a tack. So no, I'm not worried. If smoking were really that bad, he'd have been dead at 50. These health campaigns just want to tell us how to live, and the scientists behind them are paid to scare us.",
    questions: [
      ask(
        "evidence-anecdote-vs-data",
        "grandad",
        "What does the grandad's long life show about the risks of smoking?",
        [
          [
            "That the risks of smoking have been exaggerated",
            "One long life fits with a large risk. The evidence comes from following huge numbers of people.",
          ],
          [
            "That smoking is only risky for some families",
            "That may be true of some risks, but one grandfather can't show it.",
          ],
          "Very little: one person can beat bad odds",
        ],
        "Risk is about what happens across many people. Plenty of smokers live long; far more die early than non-smokers do.",
      ),
      ask(
        "fallacies-adhominem-strawman",
        "fifty",
        "\"If smoking were really that bad, he'd have been dead at 50.\" What's wrong with that?",
        [
          [
            "Nothing: it's a fair test of the health warnings",
            "The warnings are about raised risk, not certain early death. One survivor doesn't test that.",
          ],
          [
            "It picks an age for dying that's too young",
            "The exact age isn't the problem. The problem is which claim it argues against.",
          ],
          "It attacks a claim that nobody actually made",
        ],
        "Health warnings say smoking raises the risk of early death, not that every smoker dies at 50. Arguing against the stronger claim is a strawman.",
      ),
      ask(
        "biases-confirmation",
        "habit",
        "Which habit would the writer most need to watch for?",
        [
          [
            "Trusting their grandad's memory of his own habits",
            "It could matter a little, but the bigger risk is which evidence gets noticed at all.",
          ],
          [
            "Reading far too many health campaigns online",
            "The writer seems to dismiss them. The habit at work is favoring what agrees.",
          ],
          "Noticing the cases that fit what they already think",
        ],
        "One reassuring story is held up and the scientists are waved away as paid. Welcoming what agrees and dismissing what doesn't is confirmation bias.",
      ),
    ],
    takeaway: "One survivor doesn't measure a risk. Ask what happens across many people.",
  },
  {
    id: "case-013",
    source: "leaflet",
    title: "Is your tap water safe?",
    text: "Is your tap water safe? The PureSpring jug removes up to 99% of impurities. Tests by the PureSpring lab found our filter beat three leading brands. Thousands of families trust PureSpring. Ask yourself: can you really afford to risk your children's health for the price of a coffee a week?",
    questions: [
      ask(
        "evidence-source-reliability",
        "lab",
        'The filter "beat three leading brands" in tests. What\'s the main problem with that evidence?',
        [
          [
            "Three brands is too few to compare against",
            "It's a limit, but the bigger issue is who did the testing and whether anyone checked.",
          ],
          "The company tested its own product",
          [
            "Lab tests are never worth trusting",
            "Lab tests can be very good evidence. This one comes from the seller.",
          ],
        ],
        "A test run by the seller, with no details and no outside check, is the weakest kind of lab evidence. An independent lab would mean far more.",
      ),
      ask(
        "claims-vague-language",
        "upto",
        '"Removes up to 99% of impurities." What does "up to" do here?',
        [
          [
            "It promises at least 99% removal every time",
            '"Up to" sets a most, not a least. It could be 99% at best and far less usually.',
          ],
          [
            "It shows the result was measured carefully",
            "It's a phrase that avoids a measurement, and \"impurities\" isn't defined either.",
          ],
          "It lets almost any result below 99% count",
        ],
        '"Up to 99%" is true even if the jug usually removes far less, and "impurities" isn\'t defined. It sounds precise without committing to anything.',
      ),
      ask(
        "media-manipulation",
        "fear",
        '"Can you really afford to risk your children\'s health?" What is that line doing?',
        [
          [
            "Giving parents some useful safety advice",
            "It gives no advice, and no evidence that the water is unsafe.",
          ],
          [
            "Comparing the filter's price fairly with coffee",
            "The price comparison makes it feel small, but the fear does the real work.",
          ],
          "Using fear to skip whether there's a risk at all",
        ],
        "The flyer never shows the tap water is unsafe. It makes you picture your children at risk, so buying feels like protecting them.",
      ),
    ],
    takeaway: 'Ask who ran the test, and what "up to" is hiding.',
  },
  {
    id: "case-014",
    source: "email",
    title: "Back to the office",
    text: "Team,\nFrom next month everyone is back in the office four days a week. When we were all in the office we were more productive, and the best ideas came from chats by the coffee machine. Some people will say they work better at home, but they would say that, wouldn't they? If we let one team work from home, soon nobody will come in at all.\nThanks,\nJo (Head of Operations)",
    questions: [
      ask(
        "fallacies-dilemma-slippery-slope",
        "slope",
        '"If we let one team work from home, soon nobody will come in at all." What\'s the problem?',
        [
          "It jumps from one step to the extreme with no reason",
          [
            "It's a fair prediction from how people behave",
            "No evidence is given that one team's choice spreads. A rule can allow it for one team only.",
          ],
          [
            "It shows Jo has thought about consequences",
            "It names a consequence but skips every step in between. That's the flaw.",
          ],
        ],
        "A slippery slope claims a small step leads to a big one without showing how. Rules can allow one thing and stop there.",
      ),
      ask(
        "arguments-steelmanning",
        "best",
        "What's the strongest version of the work-from-home view?",
        [
          [
            "People like being at home, so they should be allowed",
            "That's a preference, not a reason the business should care about.",
          ],
          "Some work needs quiet, and output can be measured anywhere",
          [
            "Offices are expensive, so they should all be closed",
            "That's an extreme version that's easy to knock down. A steelman is the best case, not the biggest.",
          ],
        ],
        "A steelman puts the other side's best case: one that would matter to the business and could be tested.",
      ),
      ask(
        "biases-confirmation",
        "memory",
        "Jo is sure the office was more productive. What might be shaping that view?",
        [
          "Remembering the moments that fit what Jo prefers",
          [
            "Careful measurements taken before and after",
            "None are mentioned. If they existed, the email would be the place to show them.",
          ],
          [
            "Listening closely to the people who disagree",
            "The email dismisses them, so that isn't what's happening here.",
          ],
        ],
        'With no measure offered, "more productive" may be the good days remembered and the slow ones forgotten. A before-and-after measure would test it.',
      ),
    ],
    takeaway: "Look for the steps a prediction skips, and give the other side its best case.",
  },
  {
    id: "case-015",
    source: "article",
    title: "A new liver test",
    text: "HEADLINE: New test finds hidden liver disease in 500 people\n\nA new screening test for a rare liver condition is described as 95% accurate. In a trial it was given to 10,000 adults, and it flagged about 510 of them. The condition affects roughly 1 in 1,000 people. A charity is now calling for everyone over 40 to be screened.",
    questions: [
      sure(
        "probability-base-rates",
        "flagged",
        "Roughly how many of the 510 flagged people actually have the condition?",
        [
          [
            "About 485, since the test is 95% accurate",
            "95% accurate doesn't mean 95% of flags are right. With a rare condition, most flags are false alarms.",
          ],
          [
            "All 510, since that's what flagged means",
            'A flag means "possibly". Here the false alarms far outnumber the real cases.',
          ],
          "About 10, since only 1 in 1,000 has it",
        ],
        "Only about 10 of the 10,000 have it. A 5% false-alarm rate on the other 9,990 gives about 500 more flags, so roughly 10 of 510 are real.",
      ),
      ask(
        "media-headlines-vs-findings",
        "found",
        'The headline says the test "finds hidden liver disease in 500 people". Is that fair?',
        [
          [
            "Yes: the test did flag about 500 people",
            "Flagged isn't found. Most of those flags are false alarms.",
          ],
          "No: most of the 500 flags are false alarms",
          [
            "No: the real number found was much higher",
            "It's the other way round. Only about 10 had the condition.",
          ],
        ],
        "The study counts flags; the headline calls them disease found. With a rare condition, that turns about 10 real cases into 500.",
      ),
      ask(
        "arguments-counterarguments",
        "screen",
        "What's the strongest objection to screening everyone over 40?",
        [
          "Hundreds of healthy people sent for follow-up tests",
          [
            "It would miss nearly all the people who have it",
            "The test catches most real cases. Its problem is the false alarms.",
          ],
          [
            "Each test would simply take far too long",
            "Nothing suggests that. The bigger cost follows from the false alarms.",
          ],
        ],
        "For every real case, about fifty healthy people would be told they might be ill, with worry and more tests to follow.",
      ),
    ],
    takeaway: "With a rare condition, even a good test's flags are mostly false alarms.",
  },
  {
    id: "case-016",
    source: "post",
    title: "We're driving instead",
    text: "After last week's news about the plane that skidded off the runway, I've canceled our flights to Lisbon and we're driving instead. It's 1,100 miles each way, but at least we'll arrive alive. My partner says flying is safer, but she's just repeating airline ads. Honestly, ever since I saw that footage I can't stop thinking about it.",
    questions: [
      ask(
        "biases-availability",
        "footage",
        "Why might the runway story feel like a bigger risk than it is?",
        [
          [
            "Because flying has become much more dangerous",
            "One incident in the news doesn't show a change in the overall risk.",
          ],
          [
            "Because the writer has flown many times before",
            "Nothing says so, and experience would make the risk feel smaller, not bigger.",
          ],
          "Vivid, recent news is easy to recall, so it feels common",
        ],
        "What comes to mind easily feels likely. Footage you can't stop picturing makes a rare event feel common.",
      ),
      sure(
        "probability-thinking-in-bets",
        "compare",
        'Which comparison would actually settle "at least we\'ll arrive alive"?',
        [
          "The risk of 2,200 miles of driving against two flights",
          [
            "How many people saw the runway footage online",
            "Attention isn't risk. Lots of viewers doesn't make flying more dangerous.",
          ],
          [
            "Whether it's nicer to arrive in Lisbon by car",
            "That's about preference, not safety, which is the reason given.",
          ],
        ],
        "The decision swaps one risk for another. Long drives carry far more risk per mile than flights, so that comparison matters more than the news.",
      ),
      ask(
        "fallacies-adhominem-strawman",
        "adverts",
        '"She\'s just repeating airline ads." What does that do?',
        [
          [
            "It shows that her information is out of date",
            "Nothing says it's out of date. Where she heard it doesn't decide whether it's true.",
          ],
          "It dismisses her point because of where it came from",
          ["It answers her point with better evidence", "No evidence is offered at all."],
        ],
        "Whether flying is safer is a matter of numbers. Dismissing her because of where the claim might come from skips them.",
      ),
    ],
    takeaway: "What you can't stop picturing isn't a measure of risk. Compare the options.",
  },
  {
    id: "case-017",
    source: "article",
    title: "The four-day week trial",
    text: 'Forty companies tried a four-day week for six months. Afterward, 35 said they would keep it, and staff reported less stress. The companies chose to join the trial themselves, and most were small offices. A business group responded: "Shops and hospitals can\'t close on Fridays. This would be a disaster for the country."',
    questions: [
      ask(
        "evidence-sample-cherry-picking",
        "chose",
        "The companies chose to join. Why does that matter?",
        [
          [
            "It means the trial's results were simply made up",
            "Choosing to join doesn't make results false. It makes them less likely to apply to everyone.",
          ],
          "Firms that expected it to work were likelier to join",
          [
            "It shows six months was far too short a trial",
            "Length is a separate question. Who joined affects who the results describe.",
          ],
        ],
        "Volunteers tend to be the companies best suited to the change. Their success may not carry over to firms that wouldn't sign up.",
      ),
      ask(
        "arguments-counterarguments",
        "reply",
        "How strong is the business group's reply as a counterargument?",
        [
          "Weak: it answers a plan nobody proposed",
          [
            "Strong: hospitals really can't shut on Fridays",
            "True, but no one suggested they should. A reply has to meet the actual proposal.",
          ],
          [
            "Strong: anything this big is a disaster",
            "That's a sweeping prediction with no reasons attached.",
          ],
        ],
        "Nobody proposed closing shops and hospitals on Fridays. Replying to that instead of the trial misses the point that was made.",
      ),
      ask(
        "media-headlines-vs-findings",
        "fit",
        "Which headline fits the findings best?",
        [
          "Most firms in a voluntary trial keep the four-day week",
          [
            "Four-day week proven to work for every business",
            'The trial was 40 volunteer firms, mostly small offices. "Every business" claims far more.',
          ],
          [
            "Four-day week trial ends in failure for firms",
            "35 of 40 kept it. That's the opposite of what the findings say.",
          ],
        ],
        "It says what happened (most kept it) and who it happened to (firms that chose to try). The others claim far more, or the opposite.",
      ),
    ],
    takeaway: "Ask who signed up, and answer the plan that's actually on the table.",
  },
  {
    id: "case-018",
    source: "chatbot",
    title: "Rain on the fun run?",
    text: "Q: Will it rain at the Brookfield fun run on Saturday?\n\nA: The forecast gives a 30% chance of rain on Saturday afternoon. That means it probably won't rain, so you don't need to plan for it. For context, last year's fun run was also dry. I'd recommend going ahead without any wet-weather arrangements.",
    questions: [
      sure(
        "probability-thinking-in-bets",
        "plan",
        "Is \"it probably won't rain, so you don't need to plan for it\" good advice?",
        [
          [
            "Yes: 30% is low, so it can safely be ignored",
            "Three in ten isn't rare. Whether to plan depends on what rain would cost you.",
          ],
          "No: 30% happens often, and planning costs little",
          [
            "No: a 30% forecast means it will definitely rain",
            "It means rain on about three days in ten like this one, not certain rain.",
          ],
        ],
        "Unlikely isn't impossible. If a few gazebos would save the day, a three-in-ten chance is worth planning for.",
      ),
      ask(
        "media-ai-answers",
        "weakest",
        "What's the weakest part of the chatbot's answer?",
        [
          [
            "Giving a percentage rather than a yes or no",
            "The percentage is the most useful part. A plain yes or no would hide the uncertainty.",
          ],
          [
            "Mentioning the afternoon, not the morning",
            "Being specific about timing is a strength, not a weakness.",
          ],
          "Using last year's weather as a guide to this year",
        ],
        "One dry year says almost nothing about next Saturday. It sounds like evidence but adds none.",
      ),
      ask(
        "biases-overconfidence",
        "certain",
        "Which phrase sounds more certain than the evidence allows?",
        [
          [
            "A 30% chance of rain on Saturday",
            "That's the forecast itself, and it states the uncertainty openly.",
          ],
          "You don't need to plan for it",
          [
            "For context, last year's run was dry",
            "It's a weak point, but it isn't stated with false certainty.",
          ],
        ],
        'A 30% chance leaves real room for rain. "You don\'t need to" turns an uncertain forecast into a firm promise.',
      ),
    ],
    takeaway: "Unlikely isn't impossible. Weigh the chance against what it would cost.",
  },
  {
    id: "case-019",
    source: "notice",
    title: "Members' survey results",
    text: 'Thank you to everyone who filled in our members\' survey! 92% of responses rated the gym "excellent" or "good". The survey was available on the reception desk for one week in June. Based on these results, we will be raising membership fees by $5 a month from September, to fund new equipment that members clearly value.',
    questions: [
      ask(
        "evidence-sample-cherry-picking",
        "who",
        "92% rated the gym well. Who probably filled in the survey?",
        [
          [
            "A fair cross-section of all the gym's members",
            "A paper survey on the desk for a week reaches whoever came in and chose to stop.",
          ],
          "Keen regulars who happened to come in that week",
          [
            "Mostly the members who were unhappy with it",
            "Unhappy members who've stopped coming are the least likely to see it.",
          ],
        ],
        "People who rarely come, or who've drifted away, were unlikely to see a survey on the desk. They're the members most likely to be unhappy.",
      ),
      ask(
        "claims-hidden-assumptions",
        "value",
        'The rise will "fund new equipment that members clearly value". What does that assume?',
        [
          ["That the gym has a reception desk", "It says so. Nothing hidden there."],
          ["That fees also went up last year", "Nothing in the notice depends on that."],
          "That liking the gym means wanting new kit",
        ],
        "The survey asked how good the gym is. Nothing shows members asked for equipment, let alone at $5 a month.",
      ),
      ask(
        "arguments-strong-vs-weak",
        "support",
        "Do the survey results support the fee rise?",
        [
          [
            "Yes: happy members will be glad to pay more",
            "Being happy with the gym now isn't the same as agreeing to pay more for something new.",
          ],
          [
            "Yes: 92% is a big enough majority to decide it",
            "The number is about ratings, not fees, and it comes from a narrow sample.",
          ],
          "Not really: the reason doesn't lead to the conclusion",
        ],
        "Even a fair 92% would show members like the gym. It wouldn't show they want this equipment or this rise.",
      ),
    ],
    takeaway: "Ask who answered, and whether they were answering the question being decided.",
  },
  {
    id: "case-020",
    source: "advert",
    title: "Think faster with FocusMax",
    text: "FOCUSMAX: think faster, remember more. Students who took FocusMax before exams scored 15% higher on average than those who didn't.* Recommended by Dr. Alan Pryce, nutrition expert. Our formula is natural, so it's safe. Try it risk-free!\n*Based on a survey of 200 FocusMax customers.",
    questions: [
      ask(
        "evidence-types",
        "footnote",
        "The 15% comes from a survey of customers. What's the problem?",
        [
          [
            "200 people is far too few to learn anything from",
            "200 can be plenty in a well-run study. The problem is who they are and how scores were reported.",
          ],
          "Buyers reported their own scores, with no fair comparison",
          [
            "Surveys can never be used to measure exam scores",
            "They can record them, if imperfectly. The issue is that buyers chose themselves.",
          ],
        ],
        "People who buy a focus supplement may already be the keenest students, and may remember their scores kindly. Only a fair comparison could show an effect.",
      ),
      ask(
        "fallacies-authority-popularity",
        "doctor",
        'How much should "Recommended by Dr. Alan Pryce" count?',
        [
          "Little: one expert's backing, maybe paid, isn't a test",
          [
            "A lot: a doctor's recommendation settles it",
            "One person's backing, possibly paid, isn't evidence the product works.",
          ],
          [
            "Nothing: doctors know nothing about nutrition",
            "Too sweeping. Experts can be informative; the problem is one endorsement in an ad.",
          ],
        ],
        "An expert's view can count for something, but an endorsement in an ad isn't a study, and we don't know why he gave it.",
      ),
      ask(
        "claims-hidden-assumptions",
        "natural",
        "\"Our formula is natural, so it's safe.\" What's assumed?",
        [
          "That natural things can't do harm",
          [
            "That the formula really is natural",
            "That's stated, not assumed. Even if true, the problem is what it's taken to prove.",
          ],
          [
            "That buyers care whether it's safe",
            "True but harmless. The leap is from natural to safe.",
          ],
        ],
        'Plenty of natural substances are harmful. "Natural" says where something comes from, not whether it\'s safe to take.',
      ),
    ],
    takeaway: 'Ask who was compared with whom, and what "natural" is being asked to prove.',
  },
  {
    id: "case-021",
    source: "report",
    title: "Membership is booming",
    text: "Tennis club newsletter: membership is booming! The chart shows total members since 2019, and the line climbs every single year. (New this year: anyone who joins the café loyalty card is counted as a club member.) This proves our new coaching program, started in 2023, is working. Let's keep it going!",
    questions: [
      ask(
        "media-misleading-charts",
        "definition",
        "Why might the climbing line mislead?",
        [
          [
            "A line chart can't properly show membership",
            "A line chart is fine for a count over time. The problem is the count changed meaning.",
          ],
          [
            "The years on the chart may be in the wrong order",
            "Nothing suggests that. The real issue is in the small print.",
          ],
          'Counting café card holders changes what "member" means',
        ],
        "If café loyalty card holders now count as members, the line can rise with no new players at all. Changing a definition breaks a trend.",
      ),
      ask(
        "evidence-correlation-causation",
        "proves",
        '"This proves our coaching program is working." What\'s wrong with that?',
        [
          "Membership rose before the program started",
          [
            "Coaching programs never bring in new members",
            "They might. But here the rise began years before the program.",
          ],
          [
            "Tennis is simply more popular than it used to be",
            "Possibly, but that's a guess. The clear problem is the timing.",
          ],
        ],
        "The line climbed every year from 2019, long before the 2023 program. A trend that was already there can't be credited to something that came later.",
      ),
      ask(
        "arguments-qualifying-claims",
        "honest",
        "What could the newsletter honestly say?",
        [
          [
            "Our coaching has doubled interest in tennis",
            "Nothing measured interest in tennis, and the growth started before the program.",
          ],
          "Our list has grown, partly because it counts café cards",
          [
            "The club is about to close for lack of members",
            "That overcorrects: nothing suggests falling membership either.",
          ],
        ],
        "An honest claim says what grew and why the number moved, without crediting a cause the evidence can't support.",
      ),
    ],
    takeaway: "When a line climbs, check that the thing being counted didn't change.",
  },
  {
    id: "case-022",
    source: "message",
    title: "The job offer",
    text: "Big news! I've been offered a job at Corran Digital, at $6,000 more than I earn now. Their reviews from staff online are mostly one star, but my gut says it's a great place. Also, I've already spent three months on their interview process, so it would be mad to turn it down now. What do you think?",
    questions: [
      ask(
        "biases-sunk-cost",
        "months",
        '"I\'ve already spent three months on their interview process." Should that count?',
        [
          [
            "Yes: three months is far too long to just waste",
            "The months are gone whatever they decide. Only what happens next should weigh.",
          ],
          [
            "Yes: a long process means a serious employer",
            "It might mean that, or just slowness. Either way it isn't the reason given.",
          ],
          "No: the time is spent whether they accept or not",
        ],
        "The three months can't be got back either way. The question is whether the new job is better from here.",
      ),
      sure(
        "probability-updating-beliefs",
        "reviews",
        "Most staff reviews are one star. How should that change the friend's view?",
        [
          [
            "Not at all: online reviews are nearly always fake",
            "Some are, but many one-star reviews from staff are a signal worth reading.",
          ],
          "Somewhat: read them for complaints that keep coming up",
          [
            "Completely: one-star reviews prove it's a bad place",
            "Unhappy people review more often, so they're a skewed sample. Look for patterns.",
          ],
        ],
        "Reviews are a skewed sample, but they're real evidence. Repeated, specific complaints should move the view more than a gut feeling.",
      ),
      ask(
        "claims-facts-opinions-values",
        "checkable",
        "Which of these is a fact the friend could check?",
        [
          "The job pays $6,000 more than now",
          [
            "My gut says it's a really great place",
            "A feeling, not a fact. It may be worth something, but it can't be checked.",
          ],
          [
            "It would be mad to turn this offer down",
            "A judgment about what to do. It depends on facts and values together.",
          ],
        ],
        'The salary can be checked against the offer letter. "Great place" and "mad to refuse" are a feeling and a judgment.',
      ),
    ],
    takeaway: "Spent time is spent. Weigh what's ahead, starting with what can be checked.",
  },
  {
    id: "case-023",
    source: "post",
    title: "Share if you agree",
    text: 'SHARE IF YOU AGREE! A screenshot is going round of a quote from "Professor Hannah Gale, Kellerby University": "Children who play video games are 70% more likely to fail at school." The post has 40,000 shares. There\'s no link to a study, and the account that posted it was created last month.',
    questions: [
      ask(
        "media-lateral-reading",
        "check",
        "What's the quickest good way to check this?",
        [
          [
            "Read the comments to see what people think",
            "Comments show reactions, not facts. You'd learn more by leaving the post.",
          ],
          "Search for the professor and the study elsewhere",
          [
            "Study the screenshot for signs it was edited",
            "It can help, but it's slow and often unclear. Checking elsewhere is faster.",
          ],
        ],
        "Lateral reading means leaving the page to see what others say. If the professor or the study can't be found, that tells you a lot.",
      ),
      ask(
        "fallacies-authority-popularity",
        "shares",
        "40,000 shares. What does that tell you about the quote?",
        [
          "That many people found it worth sharing",
          [
            "That it's very likely to be accurate",
            "Shares measure reach, not accuracy. False claims often spread faster than true ones.",
          ],
          [
            "That the professor must have approved it",
            "Nothing connects the shares to the professor at all.",
          ],
        ],
        "Popularity shows a claim struck a chord. It says nothing about whether anyone checked it.",
      ),
      ask(
        "evidence-source-reliability",
        "account",
        "The account is a month old and gives no link. How should that affect your trust?",
        [
          [
            "Raise it: new accounts have no reason to lie",
            "A new account also has no track record. The missing link is the bigger problem.",
          ],
          [
            "No change: trust depends only on the quote",
            "Where a claim comes from is part of how much to trust it.",
          ],
          "Lower it: there's nothing here you could check",
        ],
        "A source earns trust through a track record and by showing its evidence. This one has neither.",
      ),
    ],
    takeaway: "Before you share, leave the post and see who else is saying it.",
  },
  {
    id: "case-024",
    source: "article",
    title: "A parking lot for Ashby",
    text: 'Council members in Ashby have approved a 400-space parking lot on the edge of the town center. "Shops are struggling because people can\'t park," said the planning lead. "More spaces means more shoppers." To help pay for it, the plan removes the free bus that runs from the station to the main street. Building starts in spring.',
    questions: [
      ask(
        "probability-second-order",
        "bus",
        "What might happen that the planning lead hasn't mentioned?",
        [
          [
            "The parking lot will be built with 400 spaces",
            "That's the plan itself, not a consequence of it.",
          ],
          "People who came by bus may stop coming at all",
          [
            "The building work will start in the spring",
            "That's in the article. A knock-on effect follows from the change.",
          ],
        ],
        "Removing the free bus could cost the main street the shoppers who don't drive, canceling out some of what the spaces add.",
      ),
      ask(
        "claims-the-actual-claim",
        "main",
        "What is the planning lead's main claim?",
        [
          [
            "The parking lot will have 400 spaces",
            "That's a detail of the plan, not the point being argued.",
          ],
          [
            "The free bus will no longer run",
            "That's part of the funding, and the planning lead doesn't mention it.",
          ],
          "More parking will bring shoppers back",
        ],
        "Everything else is there to support one claim: build spaces and shoppers will return. That's the claim to test.",
      ),
      ask(
        "arguments-counterarguments",
        "reply",
        "Which is the strongest reply to the plan?",
        [
          [
            "Parking lots are ugly and should never be built",
            "A matter of taste that doesn't engage with the reasons given.",
          ],
          "Find out first whether parking is why shoppers stay away",
          [
            "The council members probably just want to drive in themselves",
            "A guess about motives, not a reply to the argument.",
          ],
        ],
        "The plan rests on one cause for the shops' struggle. The strongest reply tests that cause before the money is spent.",
      ),
    ],
    takeaway: "Check the cause before the cure, and look at what the cure takes away.",
  },
  {
    id: "case-025",
    source: "email",
    title: "Delivery attempt failed",
    text: "Subject: Delivery attempt failed, action needed\n\nWe tried to deliver your package today but no one was home. To rebook, please pay the $1.99 redelivery fee within 24 hours, or your package will be returned to the sender. Pay now at package-redeliver-uk.co. Thousands of customers rebook this way every day.",
    questions: [
      ask(
        "media-manipulation",
        "deadline",
        "What's the 24-hour deadline for?",
        [
          [
            "To make sure the package is kept safe",
            "Nothing explains why the package can't wait. The deadline's job is to hurry you.",
          ],
          [
            "Because packages are only kept for a day",
            "Couriers normally keep packages much longer. The tight limit is there to rush you.",
          ],
          "To stop you checking before you pay",
        ],
        "A short deadline and a small fee make paying feel easier than checking. That's the pattern of a scam.",
      ),
      ask(
        "evidence-source-reliability",
        "real",
        "How could you check whether the message is real?",
        [
          [
            "Click the link and see if the page looks official",
            "Fake pages are easy to make look official, and clicking is the risk.",
          ],
          "Go to the courier's own website or app yourself",
          [
            "Reply to the email and ask whether it's genuine",
            "The sender will say yes. You need a route the sender doesn't control.",
          ],
        ],
        "Checking through a route you trust, not one the message gives you, is the safe test of whether a delivery is waiting.",
      ),
      sure(
        "probability-updating-beliefs",
        "expecting",
        "You are expecting a package this week. Does that make the message much more likely to be real?",
        [
          "Only a little: these go to almost everyone",
          [
            "Yes, a lot: it fits with what's happening",
            "Most people are expecting a package at any time, which is exactly why scammers send these.",
          ],
          [
            "No: real couriers never send emails at all",
            "Many do. The point is that a match with your week isn't strong evidence.",
          ],
        ],
        "Scams go to huge numbers of people, and many of them are expecting a package. A match with your week is what you'd see either way.",
      ),
    ],
    takeaway: "Check through a route you trust, and remember that scams are built to fit.",
  },
  {
    id: "case-026",
    source: "article",
    title: "Keep the uniform",
    text: "Letter to the editor: Our school wants to scrap uniforms. That would be a mistake. Uniforms keep standards high, and we know standards are high because students wear uniforms. The head says students would feel more comfortable without them, but comfort is not what school is for. Next they'll be letting students set their own homework.",
    questions: [
      ask(
        "fallacies-circular-reasoning",
        "circle",
        '"Uniforms keep standards high, and we know standards are high because students wear uniforms." What\'s the problem?',
        [
          [
            "It gives far too much detail about standards",
            "It gives no detail at all: nothing independent is offered.",
          ],
          "It uses its conclusion as its own evidence",
          [
            "It's a fair summary of the evidence on uniforms",
            "No evidence is mentioned. The claim just supports itself.",
          ],
        ],
        "The proof that standards are high is that students wear uniforms, the very thing in question. The argument goes round in a circle.",
      ),
      ask(
        "arguments-steelmanning",
        "head",
        "What's the strongest version of the head's view?",
        [
          [
            "Students like casual clothes, so let them wear them",
            "That's the easiest version to dismiss. A steelman finds the best reason.",
          ],
          [
            "Uniforms are pointless and every school should drop them",
            "Going bigger isn't going stronger. This version is easier to knock down.",
          ],
          "Comfort and cost may affect learning, and that can be tested",
        ],
        "The best version of the head's view connects comfort and cost to learning, the thing the letter says school is for.",
      ),
      ask(
        "claims-facts-opinions-values",
        "for",
        '"Comfort is not what school is for." What kind of statement is that?',
        [
          "A value judgment about what school is for",
          [
            "A fact that research has clearly shown",
            'No research is mentioned, and what school is "for" isn\'t something a study settles alone.',
          ],
          [
            "A prediction about students' future results",
            "It says nothing about what will happen. It says what matters.",
          ],
        ],
        "It's a claim about what matters, not about what is. Values can be argued for, but not checked like a fact.",
      ),
    ],
    takeaway:
      "Check that the evidence isn't the conclusion in disguise, and find the other side's best case.",
  },
  {
    id: "case-027",
    source: "report",
    title: "Our reading clubs",
    text: "Annual report: thanks to your donations, 2,400 children joined our after-school reading clubs this year. The teachers who run them say reading has improved. Children in our clubs read 5 books each on average, compared with 2 for children who didn't join. Every $10 you give brings a child one step closer to a brighter future.",
    questions: [
      ask(
        "evidence-correlation-causation",
        "join",
        "Club children read 5 books and others 2. Why might that not be down to the clubs?",
        [
          [
            "The club's books were shorter than the other books",
            "Possible, but nothing suggests it. The bigger issue is who joined.",
          ],
          "Keen readers were likelier to join in the first place",
          [
            "Five books isn't very many to read in a year",
            "That's a judgment about the number, not about whether the clubs caused it.",
          ],
        ],
        "Children who already like reading are the likeliest to join. The gap could exist even if the clubs made no difference.",
      ),
      ask(
        "claims-vague-language",
        "step",
        '"Every $10 brings a child one step closer to a brighter future." What\'s wrong with it?',
        [
          [
            "$10 is far too little to make a real difference",
            "It might make a difference; the problem is the claim doesn't say what.",
          ],
          [
            'It should say "children" instead of "a child"',
            "Wording aside, it still promises nothing you could test.",
          ],
          "It can't be checked: no step or future is defined",
        ],
        "A good claim about impact says what changes and how you'd know. \"A step closer to a brighter future\" can't be wrong, so it says nothing.",
      ),
      ask(
        "biases-confirmation",
        "teachers",
        "The teachers who run the clubs say reading improved. Why treat that with care?",
        [
          "People involved tend to notice what fits their hopes",
          [
            "Teachers don't really know very much about reading",
            "They may know a lot. The issue is that they're invested in the clubs working.",
          ],
          [
            "It's just one single teacher's personal opinion",
            "It says teachers, plural. The concern is their stake in the result.",
          ],
        ],
        "If you've put work into something, improvements stand out and setbacks fade. A reading test before and after would be fairer.",
      ),
    ],
    takeaway: 'Ask who signs up, and what "impact" would look like if you measured it.',
  },
  {
    id: "case-028",
    source: "advert",
    title: "Peace of Mind cover",
    text: "You've chosen the Vireo X5 washing machine ($449). For just $89, add our three-year Peace of Mind cover. Repairs can cost up to $300! Over 60% of our customers choose cover. Fewer than 1 in 10 machines like this need a repair in their first three years.",
    questions: [
      sure(
        "probability-expected-value",
        "deal",
        "Is the cover a good deal on these numbers?",
        [
          [
            "Yes: one repair could cost $300, far more than $89",
            "That's the worst case. With under 1 in 10 needing repair, the expected cost is about $30 at most.",
          ],
          "No: the expected repair cost is far below $89",
          [
            "Yes: most other customers chose to buy it",
            "What others buy isn't the math. The chance of a repair is.",
          ],
        ],
        "Under 1 in 10 machines need a repair, and repairs cost up to $300, so the expected repair bill is at most about $30, well under $89.",
      ),
      ask(
        "biases-anchoring",
        "threehundred",
        'Why mention that repairs "can cost up to $300"?',
        [
          "To make $89 look small next to a big number",
          [
            "To tell you the average cost of a repair",
            '"Up to" is the most a repair costs, not the typical cost.',
          ],
          [
            "Because the law requires it on every advert",
            "Nothing suggests that. It's there to set your sense of scale.",
          ],
        ],
        "A big number first makes the price that follows feel modest, even though most buyers never pay for a repair at all.",
      ),
      ask(
        "fallacies-authority-popularity",
        "sixty",
        '"Over 60% of our customers choose cover." Is that a reason to buy it?',
        [
          "No: what most people buy isn't evidence of value",
          [
            "Yes: that many people can't all be wrong about it",
            "They can, especially when they're asked at the till, in a hurry.",
          ],
          [
            "Yes: it shows the machine must break down often",
            "The ad's own figure says fewer than 1 in 10 need a repair.",
          ],
        ],
        "Popularity says people bought it, often in a hurry at checkout. The repair odds say whether it's worth it.",
      ),
    ],
    takeaway: "Work out the expected cost, and notice the big number placed before the price.",
  },
];
