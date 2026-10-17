import type { LessonScript } from "@/lib/steps/types";

/**
 * Unit 5: Building arguments. All names, places and products are made up.
 */
const argumentsUnit: Record<string, LessonScript> = {
  "arguments-premise-conclusion": {
    lessonId: "arguments-premise-conclusion",
    takeaway:
      "The conclusion is what the writer wants you to accept; everything else supports it or is background.",
    written: {
      prompt:
        "Set the argument out: the conclusion, the reasons that support it, and anything that is only background.",
      passage:
        "Wrenfield's bus depot should keep the number 9 route. It is the only bus that reaches the hospital before 7am, and last month more than 600 staff and visitors used it. The depot was built in 1962 and its clock is famously slow.",
      guidance: "Say which sentence is the point, and which sentences try to prove it.",
    },
    steps: [
      {
        id: "map",
        kind: "builder",
        prompt:
          "The claim comes first here, but it still belongs on top. Put each piece where it does its job.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          { id: "pc", text: "Harbor Café should close on Mondays.", role: "conclusion" },
          { id: "pp", text: "Mondays bring in the fewest customers.", role: "premise" },
          {
            id: "pe",
            text: "Last year Monday takings were $90, against $310 on Saturdays.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The owner has run the café for eleven years.",
            role: null,
            note: "True, but how long she has run it doesn't show why Mondays should be closed.",
          },
        ],
        hint: "Which piece is the point the others are trying to prove?",
        why: "Order in the text doesn't matter. The claim is what the rest is aiming at, and background that supports nothing sits outside the map.",
      },
      {
        id: "jobs",
        kind: "sort",
        prompt: "Each sentence from this letter has a job. Sort them.",
        buckets: [
          { id: "conclusion", label: "The conclusion" },
          { id: "reason", label: "A reason for it" },
          { id: "background", label: "Background only" },
        ],
        items: [
          {
            id: "1",
            text: "So the ferry should run later on Fridays.",
            bucket: "conclusion",
            why: "“So” points to the claim the letter is trying to prove.",
          },
          {
            id: "2",
            text: "Many night-shift workers finish at 10pm, after the last boat.",
            bucket: "reason",
            why: "It says why a later boat is needed.",
          },
          {
            id: "3",
            text: "The ferry has run between the two islands since 1974.",
            bucket: "background",
            why: "It's true, but it doesn't bear on running later.",
          },
          {
            id: "4",
            text: "Last month forty passengers asked at the desk for a later boat.",
            bucket: "reason",
            why: "It gives evidence that people want it.",
          },
          {
            id: "5",
            text: "The ferry company is based in Tarn Bay.",
            bucket: "background",
            why: "Where the company is based doesn't help the case.",
          },
        ],
        hint: "Ask of each: is this the point, a reason for it, or just context?",
        why: "Every sentence in an argument does one of three things: it makes the point, backs the point, or sets the scene.",
      },
      {
        id: "which",
        kind: "choice",
        prompt: "Which sentence is the conclusion?",
        stimulus:
          "Since the pool's roof leaks, and repairs would cost more than a new roof, the council should replace it.",
        options: [
          {
            text: "The pool's roof leaks.",
            whyNot: "That's a reason offered for the point, not the point itself.",
          },
          {
            text: "Repairs cost more than a new roof.",
            whyNot: "Also a reason. It is offered in support of the last part.",
          },
          { text: "The council should replace the roof." },
        ],
        correct: 2,
        hint: "The word “since” introduces reasons. What are they reasons for?",
        why: "The conclusion is what the reasons are meant to establish. Here it is the recommendation, even though it comes last.",
      },
      {
        id: "background",
        kind: "flaw",
        label: "Find the odd one out",
        prompt: "Tap the sentence that doesn't help Ravi's case.",
        passage: [
          {
            text: "Ravi says the class trip to Ash Farm should move to spring.",
            tappable: true,
            whyNot: "That's his conclusion, the thing he is trying to prove.",
          },
          {
            text: "Winter roads there are often icy.",
            tappable: true,
            whyNot: "This is a reason. It bears on how safe a winter trip is.",
          },
          {
            text: "Last January the school bus was stuck for two hours.",
            tappable: true,
            whyNot: "This is evidence for the reason above, so it does help.",
          },
          { text: "The farm's cows are named after flowers.", tappable: true, flaw: true },
        ],
        fallacy: "True, but irrelevant",
        hint: "Which sentence would make no difference to when the trip should go?",
        why: "The cows are a pleasant fact and nothing more. A detail that doesn't bear on the conclusion is background, however true.",
      },
      {
        id: "signal",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question: "Which word usually tells you a conclusion is coming next?",
        options: [
          { text: "Therefore" },
          {
            text: "Because",
            whyNot: "“Because” introduces a reason, so what follows it is support.",
          },
          {
            text: "For instance",
            whyNot: "It introduces an example, which is evidence, not the conclusion.",
          },
        ],
        correct: 0,
        hint: "Which word looks back at what was just said?",
        why: "Words like therefore, so and it follows that mark a conclusion. Because and since mark the reasons in front of one.",
      },
      {
        id: "gap",
        kind: "gap",
        prompt: "What does this argument quietly rely on?",
        reason: "Every student in Mia's class passed the practice test.",
        conclusion: "So Mia's class will do well in the real exam.",
        options: [
          {
            text: "All the students studied together in the library.",
            whyNot: "Where they studied says nothing about whether the practice predicts the exam.",
          },
          { text: "The practice test is a good guide to the real exam." },
          {
            text: "Passing scores are set at fifty percent.",
            whyNot: "The passing score doesn't connect the practice result to the real exam.",
          },
        ],
        correct: 1,
        hint: "What connects a practice result to a real one?",
        why: "Reasons rarely lead to a conclusion on their own. Something unstated, here that the practice predicts the real exam, joins them.",
      },
      {
        id: "clear",
        kind: "stronger",
        noun: "Version",
        prompt: "Which version actually argues for its claim?",
        a: "Our street should have a speed bump. I hate the noise. The garbage truck comes on Thursdays. Speed bumps exist.",
        b: "Our street should have a speed bump, because cars average 41 mph on it and a child was nearly hit last month.",
        stronger: "b",
        factor: "Reasons that back the claim",
        weakerWhy:
          "Version A states a claim, then lists remarks. None of them says why a bump is needed.",
        hint: "Do the sentences after the claim give a reason for it?",
        why: "An argument isn't a claim plus other sentences. Each reason has to bear on the conclusion.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "builder",
        prompt:
          "A real email, laid out. Put each piece where it does its job. One piece is only background.",
        slots: [
          {
            id: "c",
            role: "conclusion",
            label: "The conclusion",
          },
          {
            id: "p1",
            role: "premise",
            label: "A reason",
          },
          {
            id: "p2",
            role: "premise",
            label: "Another reason",
          },
          {
            id: "e",
            role: "evidence",
            label: "Something you can check",
          },
        ],
        pieces: [
          {
            id: "pc",
            text: "The office should switch to cleaning four days a week instead of five.",
            role: "conclusion",
          },
          {
            id: "pp1",
            text: "The Friday clean adds little, because the office is half empty on Fridays.",
            role: "premise",
          },
          {
            id: "pp2",
            text: "Dropping a day would save money without lowering standards.",
            role: "premise",
          },
          {
            id: "pe",
            text: "Door-pass records show 40% of staff in on Fridays, against 85% midweek.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The cleaning company has served the building since 2012.",
            role: null,
            note: "True, but how long they've worked here doesn't bear on how many days they should come.",
          },
        ],
        hint: "Find what the email wants first. Then ask which pieces give reasons, which gives a checkable figure, and which supports nothing.",
        why: "The conclusion is the switch to four days. The reasons say Friday adds little and a day can be saved, and the door-pass figure backs the first. The company's history supports nothing.",
      },
    ],
  },

  "arguments-strong-vs-weak": {
    lessonId: "arguments-strong-vs-weak",
    takeaway: "Strong support is relevant and enough, whether or not you like the conclusion.",
    written: {
      prompt: "Judge the argument: is the support relevant, and is there enough of it?",
      passage:
        "A columnist says Northgate should close its outdoor pool. It costs $240,000 a year to run, and on a typical day fewer than thirty people swim there. A reader replies that the pool is loved, that swimming is healthy, and that the columnist has never even learned to swim.",
      guidance: "Judge both writers by their reasons, not by which conclusion you prefer.",
    },
    steps: [
      {
        id: "pool",
        kind: "stronger",
        noun: "Argument",
        prompt: "Which argument gives the stronger case, whichever conclusion you prefer?",
        a: "The town should close its outdoor pool. It costs $240,000 a year, and fewer than 30 people use it on a typical day.",
        b: "The town should keep its outdoor pool. Everyone on my street loves it, and my grandmother learned to swim there in 1958.",
        stronger: "a",
        factor: "Relevant reasons, with numbers",
        weakerWhy:
          "It rests on feeling and one memory. Neither says whether enough people use the pool to justify what it costs.",
        hint: "Which argument gives reasons about cost and use?",
        why: "Strength has nothing to do with how popular the conclusion is. An argument for an unpopular view can be the better one.",
      },
      {
        id: "relevance",
        kind: "sort",
        prompt:
          "The claim: “Oakleaf School should run a walking bus,” with adults leading students to school on foot. Which reasons bear on it?",
        buckets: [
          { id: "bears", label: "Bears on the claim" },
          { id: "not", label: "Doesn't bear on it" },
        ],
        items: [
          {
            id: "1",
            text: "Twenty parents say they cannot drive their children in.",
            bucket: "bears",
            why: "It shows a need that a walking bus would meet.",
          },
          {
            id: "2",
            text: "Traffic at the school gate is heavy at 8:45.",
            bucket: "bears",
            why: "Fewer cars at the gate is a benefit of walking together.",
          },
          {
            id: "3",
            text: "The principal has worked there for nine years.",
            bucket: "not",
            why: "How long someone has worked there says nothing about walking.",
          },
          {
            id: "4",
            text: "The playground was repainted in June.",
            bucket: "not",
            why: "It has no connection to how students travel.",
          },
          {
            id: "5",
            text: "Walking to school is good for children's health.",
            bucket: "bears",
            why: "It gives a direct reason to favor walking.",
          },
        ],
        hint: "Would the reason still matter if the claim were false?",
        why: "Relevance is the first test. A reason that has no link to the claim can't support it, however true it is.",
      },
      {
        id: "enough",
        kind: "choice",
        prompt: "Which addition would do most to make the conclusion follow?",
        stimulus: "Three of Dana's friends loved the new café, so it is the best café in town.",
        options: [
          {
            text: "Dana's friends all have very good taste in coffee.",
            whyNot: "Even if true, three opinions still leave out most of the town's cafés.",
          },
          { text: "Hundreds of customers ranked it above every other café." },
          {
            text: "The café is on the main street, close to the station.",
            whyNot: "Where it is says nothing about how good it is.",
          },
        ],
        correct: 1,
        hint: "What would you need to compare it fairly against all the others?",
        why: "Support must also be enough. Three friends can't stand in for a whole town, and a wide comparison can.",
      },
      {
        id: "tower",
        kind: "flaw",
        label: "Spot the thin support",
        prompt: "Tap the step where the support runs out.",
        passage: [
          {
            text: "Sana says the whole town wants the bell tower rebuilt.",
            tappable: true,
            whyNot: "That's her claim. A claim isn't a flaw by itself.",
          },
          {
            text: "She asked her two neighbors and her cousin, and all three agreed.",
            tappable: true,
            flaw: true,
          },
          {
            text: "The tower was last rebuilt in 1911.",
            tappable: true,
            whyNot: "That's background. It doesn't stretch the conclusion.",
          },
        ],
        fallacy: "Too little support",
        hint: "How many people is “the whole town,” and how many did she ask?",
        why: "Three people who happen to be close to her can't show what a whole town wants. The claim reaches far past the evidence.",
      },
      {
        id: "dislike",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "An argument's reasons are true and relevant, but you dislike its conclusion. What should you say about the argument?",
        options: [
          {
            text: "It is weak, because I dislike where it leads.",
            whyNot: "Disliking a conclusion doesn't make good support weaker.",
          },
          {
            text: "It is weak, because unwelcome conclusions are usually false.",
            whyNot: "That treats your feelings as evidence, which they are not.",
          },
          { text: "It may be strong. I should judge whether the reasons support it." },
        ],
        correct: 2,
        hint: "What are you allowed to judge an argument by?",
        why: "Good reasons can point to a conclusion you don't like. If you want to reject it, find what is wrong with the reasons.",
      },
      {
        id: "bakery",
        kind: "gap",
        prompt: "What does this argument quietly rely on?",
        reason: "The town's only bakery raised its bread prices by 10%.",
        conclusion: "So the bakery is now making more profit.",
        options: [
          { text: "The bakery's costs did not rise by as much." },
          {
            text: "Bread is a very popular food in the town.",
            whyNot: "Popularity doesn't show whether the price rise covered the bakery's costs.",
          },
          {
            text: "Other bakeries in the region raised prices last year.",
            whyNot: "What others did doesn't tell you about this bakery's costs.",
          },
        ],
        correct: 0,
        hint: "Profit is what is left after costs. What could stop the price rise helping?",
        why: "Higher prices only mean higher profit if costs and sales hold steady. That missing step is what makes the argument sufficient.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each fact make the claim stronger or weaker?",
        claim: "Northgate's outdoor pool costs more than it is worth.",
        prior: 50,
        cards: [
          {
            id: "a",
            text: "It costs $240,000 a year to run.",
            shift: 15,
            note: "A large, checkable cost is directly relevant, though on its own it needs a comparison with the use.",
          },
          {
            id: "b",
            text: "Fewer than 30 people swim there on a typical day.",
            shift: 10,
            note: "Low use makes each swim expensive, so it adds weight to the claim.",
          },
          {
            id: "c",
            text: "The pool was repainted in June.",
            shift: 0,
            note: "It has no bearing on cost against use, so it should not move you.",
          },
          {
            id: "d",
            text: "A school survey finds 800 residents swim there at least once a month.",
            shift: -25,
            note: "Many more people use it than a typical day suggests, which weakens the claim.",
          },
        ],
        hint: "Which facts bear on cost against use?",
        why: "Strength moves with each relevant fact, up or down. Facts that don't bear on the claim leave it where it is.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Every reason here is relevant. Where is this argument weakest?",
        stimulus:
          "“Our school should make chess mandatory in seventh grade. Chess teaches planning. Students in the chess club got better math grades than other students last year. And chess is cheap: boards cost $4 each.”",
        options: [
          {
            text: "The grades: club members chose chess, so they may differ in other ways.",
          },
          {
            text: "The cost: $4 a board is too expensive for most schools to afford.",
            whyNot:
              "The cost point is relevant and probably fine. It's not where the argument is weakest.",
          },
          {
            text: "The planning claim: chess obviously involves no planning at all.",
            whyNot:
              "Chess clearly involves planning. The question is whether that helps elsewhere, and the evidence offered is the grades.",
          },
          {
            text: "Nothing: every reason given is relevant, so it's a strong case.",
            whyNot:
              "Relevant isn't the same as enough. The grade evidence can't show chess caused the difference.",
          },
        ],
        correct: 0,
        hint: "Each reason is relevant. Now ask whether the strongest-looking one is enough for what it's used to show.",
        why: "The grade link carries the argument, but club members chose chess, so keen or able students may join anyway. It's relevant but not enough to show mandatory chess would raise grades.",
      },
    ],
  },

  "arguments-steelmanning": {
    lessonId: "arguments-steelmanning",
    takeaway:
      "State a view so well that its own supporters would nod, then respond to that version.",
    written: {
      prompt:
        "Write the strongest honest version of the view you disagree with, in a few sentences.",
      passage:
        "Some people at Larkin Primary want to cut homework to one hour a night. Others want the current amount kept, arguing that regular practice builds skills. Choose the view you lean away from.",
      guidance: "Use its best reasons. Its supporters should recognize their own case.",
    },
    steps: [
      {
        id: "museum",
        kind: "stronger",
        noun: "Restatement",
        prompt:
          "Two people restate the view that the museum should charge entry. Which is the stronger, fairer restatement?",
        a: "Some people think the museum should charge, which is understandable, though I hope they'd agree it would be nice to keep it free.",
        b: "The museum should charge because fees would pay for repairs and longer opening hours, and a free day each month keeps it open to everyone.",
        stronger: "b",
        factor: "Its best reasons, stated in full",
        weakerWhy:
          "It is polite but gives none of the view's real reasons. Supporters wouldn't recognize their case in it.",
        hint: "Which one could a supporter sign?",
        why: "Being kind isn't the same as being fair. A steelman gives the view its best reasons, not just a gentle tone.",
      },
      {
        id: "fair",
        kind: "sort",
        prompt: "The view: “Homework should be limited.” Sort each restatement.",
        buckets: [
          { id: "fair", label: "A fair, strong version" },
          { id: "changed", label: "Weakened or changed" },
        ],
        items: [
          {
            id: "1",
            text: "Limits protect sleep and free time, and extra homework adds little after a point.",
            bucket: "fair",
            why: "It gives the view's real reasons.",
          },
          {
            id: "2",
            text: "People who want limits are simply lazy.",
            bucket: "changed",
            why: "It swaps their reasons for an insult.",
          },
          {
            id: "3",
            text: "Teachers should never set homework at all.",
            bucket: "changed",
            why: "It turns “limited” into “none,” which is a different view.",
          },
          {
            id: "4",
            text: "An hour a night keeps the useful practice and protects sleep.",
            bucket: "fair",
            why: "It keeps the position and states its reasons.",
          },
          {
            id: "5",
            text: "Limits are fine if you like that sort of thing.",
            bucket: "changed",
            why: "It gives no reasons at all, so nobody could argue against it.",
          },
        ],
        hint: "Would a supporter say “yes, that's my view”?",
        why: "A fair version keeps the position and its best reasons. Swapping in an insult or an extreme changes the view.",
      },
      {
        id: "swap",
        kind: "flaw",
        label: "Where does the view change?",
        prompt: "Tap the step where Ben swaps Cara's view for a weaker one.",
        passage: [
          {
            text: "Cara says the school should trial a four-day week with longer days, to see if students are less tired.",
            tappable: true,
            whyNot: "That's Cara's actual view, in her own words.",
          },
          {
            text: "Ben answers: “So you want children to learn less.”",
            tappable: true,
            flaw: true,
          },
          {
            text: "He then argues against that version and calls the plan silly.",
            tappable: true,
            whyNot: "That is the result of the swap. The swap happened in the sentence before.",
          },
        ],
        fallacy: "Swapping in a weaker view",
        hint: "Did Cara say anything about learning less?",
        why: "Ben replaced her idea with an easier one to attack. Nothing in what she said claimed children would learn less.",
      },
      {
        id: "first",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "You disagree with a plan to close the town market on Sundays. What is the best first step toward steelmanning it?",
        options: [
          {
            text: "List all the ways in which the plan is mistaken.",
            whyNot: "That is the rebuttal, which comes after you have stated their case fairly.",
          },
          { text: "Ask what its supporters say are their strongest reasons." },
          {
            text: "Write the version that will be easiest to argue with.",
            whyNot: "That is a strawman, which is the opposite of what is wanted.",
          },
        ],
        correct: 1,
        hint: "Whose reasons do you need to hear?",
        why: "You can't state a view's best case without finding out what its supporters think that case is.",
      },
      {
        id: "free",
        kind: "builder",
        prompt: "Build the best case for keeping the museum free. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          { id: "pc", text: "The museum should stay free to enter.", role: "conclusion" },
          {
            id: "pp",
            text: "Fees keep out people who can't easily afford them.",
            role: "premise",
          },
          {
            id: "pe",
            text: "When Kelby Museum added a fee, local school visits fell by a third.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The museum's oldest exhibit is a stuffed heron.",
            role: null,
            note: "A charming fact, but it gives no reason about fees.",
          },
        ],
        hint: "The evidence is something that happened and can be checked.",
        why: "A steelman uses reasons and evidence its supporters would actually offer. Interesting facts that don't support the claim stay out.",
      },
      {
        id: "rewrite",
        kind: "choice",
        prompt: "Which rewrite of the weak restatement is fairer?",
        stimulus: "Weak version: “People who want a bigger park just want to waste land.”",
        options: [
          { text: "People who want a bigger park think green space aids health and community." },
          {
            text: "People who want a bigger park are most likely correct.",
            whyNot: "That's agreement, not restatement. It doesn't say what their reasons are.",
          },
          {
            text: "People who want a bigger park just think that parks are pretty nice.",
            whyNot: "It's too thin to be their best case. It leaves out their real reasons.",
          },
        ],
        correct: 0,
        hint: "Which rewrite states reasons a supporter would give?",
        why: "Fixing a weak restatement means adding the reasons the view's supporters would give, not just softening the tone.",
      },
      {
        id: "fairgap",
        kind: "gap",
        prompt: "What must be true for this to count as a fair restatement?",
        reason: "Jo restated the view using the best reasons its supporters give.",
        conclusion: "So Jo's restatement is a fair one.",
        options: [
          { text: "Supporters of the view would recognize it as their own." },
          {
            text: "Jo agrees with the view by the end of the piece.",
            whyNot:
              "Agreeing isn't required. A fair restatement can come from someone who disagrees.",
          },
          {
            text: "The restatement is shorter than the original text.",
            whyNot: "Length doesn't decide fairness. Accuracy to the view's best reasons does.",
          },
        ],
        correct: 0,
        hint: "Who is the judge of whether a restatement is fair?",
        why: "The test of a steelman is whether the people who hold the view would accept it. Only then have you earned the right to respond.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "You disagree with this view. Which restatement is its strongest, fairest version?",
        stimulus:
          "The view: the Linwood bypass should be built. Its supporters say trucks pass along the village main street every two minutes, the elementary school is on that street, and accidents there have doubled in five years.",
        options: [
          {
            text: "Some people want a big new road because they like driving fast.",
            whyNot:
              "That swaps the supporters' reasons for an unflattering motive. They'd never sign it.",
          },
          {
            text: "Bypass supporters care deeply about the village and mean well.",
            whyNot: "Kind, but empty. It leaves out every reason they actually give.",
          },
          {
            text: "A bypass is the only possible way to reduce any traffic at all.",
            whyNot:
              "That's more extreme than what they say, which makes it easier to attack. A steelman doesn't exaggerate.",
          },
          {
            text: "Constant trucks past a school, and rising accidents, justify a bypass.",
          },
        ],
        correct: 3,
        hint: "Which version would a bypass supporter read and say: yes, that's exactly why?",
        why: "A steelman keeps the position and its best reasons: heavy truck traffic, a school on the route and rising accidents. The others swap in a motive, empty kindness or an exaggeration.",
      },
    ],
  },

  "arguments-counterarguments": {
    lessonId: "arguments-counterarguments",
    takeaway: "A rebuttal answers the strongest objection on its own terms.",
    written: {
      prompt:
        "Name the strongest objection to the plan, then answer it without changing the subject.",
      passage:
        "Kestrel Bay wants to close its main street to cars on Saturdays. Supporters say it would make room for a market and cut noise. Shopkeepers worry that customers who drive from nearby villages will stay away.",
      guidance: "Answer the objection itself, in terms the shopkeepers would accept.",
    },
    steps: [
      {
        id: "strong",
        kind: "sort",
        prompt:
          "The claim: “Elmhurst Library should open on Sundays.” Which objections are strong, and which are easy to brush off?",
        buckets: [
          { id: "strong", label: "A strong objection" },
          { id: "easy", label: "Easy to brush off" },
        ],
        items: [
          {
            id: "1",
            text: "Staffing Sundays would cost $30,000, and a trial drew only 12 visitors a day.",
            bucket: "strong",
            why: "It gives a cost and a use figure that a reply has to face.",
          },
          {
            id: "2",
            text: "Sundays are boring.",
            bucket: "easy",
            why: "It's an opinion with nothing behind it.",
          },
          {
            id: "3",
            text: "Weekday hours might have to be cut to pay for it.",
            bucket: "strong",
            why: "It names a real trade-off that supporters would need to answer.",
          },
          {
            id: "4",
            text: "I don't personally use libraries.",
            bucket: "easy",
            why: "One person's habits don't bear on what others need.",
          },
          {
            id: "5",
            text: "Someone somewhere might not like it.",
            bucket: "easy",
            why: "It's too vague to answer or to matter.",
          },
        ],
        hint: "Which objection would a supporter find hardest to answer?",
        why: "Facing the strongest objection is what makes a case credible. Only beating a weak one proves very little.",
      },
      {
        id: "rebuttal",
        kind: "stronger",
        noun: "Reply",
        prompt:
          "Sunday opening would cost $30,000 for 12 visitors a day. Which reply answers that objection?",
        a: "The trial ran in the coldest month, when all visits fell by half, and the same branch gets 60 a day in summer.",
        b: "Libraries are important, and the town should value them more than it does.",
        stronger: "a",
        factor: "It answers the actual objection",
        weakerWhy:
          "It repeats how much libraries matter, but says nothing about cost or how many people would come.",
        hint: "Which reply speaks to the numbers in the objection?",
        why: "A real rebuttal answers the objection on its own terms. Restating your claim more loudly changes the subject.",
      },
      {
        id: "dodge",
        kind: "flaw",
        label: "Spot the dodge",
        prompt: "Tap the reply that avoids the objection.",
        passage: [
          {
            text: "Ines says a $6 pool fee would keep some families away.",
            tappable: true,
            whyNot: "That's the objection being answered. Making it isn't a flaw.",
          },
          {
            text: "Mr. Carr replies that the new pool has lovely tiles from Portugal.",
            tappable: true,
            flaw: true,
          },
          {
            text: "He adds that the fee starts next spring.",
            tappable: true,
            whyNot: "That is a fact about timing. It's the tiles remark that avoids the objection.",
          },
        ],
        fallacy: "Changes the subject",
        hint: "Did anything Mr. Carr said address the families?",
        why: "The tiles may be lovely, but they have nothing to do with whether families can pay. A rebuttal that avoids the worry leaves it standing.",
      },
      {
        id: "best",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question: "Which is the best answer to “the fee will keep families out”?",
        options: [
          {
            text: "Everyone knows that fees are fair, and always have been.",
            whyNot:
              "Saying it more firmly doesn't address the worry about families being shut out.",
          },
          { text: "The fee is small, and a free pass covers families who can't pay." },
          {
            text: "Ines has never paid a pool fee herself, so she can't judge.",
            whyNot: "That targets her instead of her point.",
          },
        ],
        correct: 1,
        hint: "Which answer deals with the families who can't pay?",
        why: "The best rebuttal takes the objection seriously and shows why it doesn't hold, here by providing for the families concerned.",
      },
      {
        id: "reply",
        kind: "builder",
        prompt: "Build the reply to the fee objection. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The reply" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          { id: "pc", text: "A $6 fee won't keep families out of the pool.", role: "conclusion" },
          { id: "pp", text: "Families who can't pay get a free pass.", role: "premise" },
          {
            id: "pe",
            text: "At the old pool, 140 free passes were used last year.",
            role: "evidence",
          },
          {
            id: "px",
            text: "The pool opened in 2004.",
            role: null,
            note: "True, but the opening year doesn't answer the worry about who can afford to swim.",
          },
        ],
        hint: "The reply is the claim that the objection is wrong.",
        why: "A good reply is itself an argument: a claim about the objection, a reason for it and something checkable behind it.",
      },
      {
        id: "assume",
        kind: "gap",
        prompt: "What does this reply quietly rely on?",
        reason: "The fee is only $6.",
        conclusion: "So it won't keep families out.",
        options: [
          {
            text: "$6 is about the price of a sandwich.",
            whyNot: "Prices of other things don't show whether these families can afford it.",
          },
          { text: "$6 is a sum the families concerned can pay." },
          {
            text: "The pool will earn money from the fees.",
            whyNot: "The pool's income doesn't show that families can pay.",
          },
        ],
        correct: 1,
        hint: "Small for whom?",
        why: "“Only $6” works if the families in question can afford it. A rebuttal has to check that link, or the objection survives.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each fact make “Sunday opening is worth it” more or less likely?",
        claim: "Elmhurst Library should open on Sundays.",
        prior: 50,
        cards: [
          {
            id: "a",
            text: "A survey: 400 residents say they'd visit on Sundays.",
            shift: 15,
            note: "Stated intentions help, but people don't always follow through.",
          },
          {
            id: "b",
            text: "The trial drew only 12 visitors a day.",
            shift: -20,
            note: "Actual use is stronger evidence than stated plans.",
          },
          {
            id: "c",
            text: "The trial ran in the coldest month, when all visits fell by half.",
            shift: 10,
            note: "It answers the objection, so the low count counts for less.",
          },
          {
            id: "d",
            text: "The library has been open since 1931.",
            shift: 0,
            note: "Age doesn't bear on Sunday demand.",
          },
        ],
        hint: "Which facts tell you about real use on Sundays?",
        why: "Objections and replies both move the balance. The strongest reply leaves the objection with less weight, not none.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A proposal meets a hard objection. Which reply answers it on its own terms?",
        stimulus:
          "Proposal: Brackley library should open until 9 pm on weekdays. The council's budget officer objects: “Extra staff hours would cost $45,000 a year, and evening visits at other libraries average eight people an hour.”",
        options: [
          {
            text: "“Libraries are the heart of a community, and that's worth defending.”",
            whyNot: "Heartfelt, but it changes the subject. The objection was about cost and use.",
          },
          {
            text: "“The budget officer has never supported any library spending.”",
            whyNot:
              "That's about the officer, not the figures. The cost and visit numbers still stand.",
          },
          {
            text: "“A volunteer-run trial costing $8,000 would show if eight an hour holds here.”",
          },
          {
            text: "“Nobody can be sure about the future, so we should just try it.”",
            whyNot:
              "That dodges the numbers. A rebuttal has to deal with the cost and the low use.",
          },
        ],
        correct: 2,
        hint: "The objection is about two things: cost and how many people would come. Which reply deals with both?",
        why: "It answers on the objection's terms: a cheaper version cuts the cost, and a trial tests whether the figure from elsewhere applies here. The others change the subject or attack the person.",
      },
    ],
  },

  "arguments-qualifying-claims": {
    lessonId: "arguments-qualifying-claims",
    takeaway: "Qualify a claim to match its evidence; don't hedge it until it can't be wrong.",
    written: {
      prompt: "Rewrite the claim so it fits the evidence: say who, how many and how sure.",
      passage:
        "In a trial at one Fernbank office, 60 staff who drank a coffee at 9am finished 8% more tasks that morning than colleagues who did not. A newsletter reports: “Coffee makes everyone more productive.”",
      guidance: "Keep it testable. A claim that can't be wrong isn't a better claim.",
    },
    steps: [
      {
        id: "qualified",
        kind: "sort",
        prompt:
          "Sort each claim: is it scoped to its evidence, or hedged until nothing could prove it wrong?",
        buckets: [
          { id: "scoped", label: "Scoped and testable" },
          { id: "hedged", label: "Hedged, can't be wrong" },
        ],
        items: [
          {
            id: "1",
            text: "Most Riverton commuters who switched to cycling last year now arrive earlier.",
            bucket: "scoped",
            why: "It names a group, a time and a claim that data could contradict.",
          },
          {
            id: "2",
            text: "Cycling might help some people, in some ways, at some times.",
            bucket: "hedged",
            why: "Almost any result would fit it, so it says nothing.",
          },
          {
            id: "3",
            text: "In the Riverton trial, cyclists' journeys were 4 minutes shorter on average.",
            bucket: "scoped",
            why: "It states what was found, where and how much.",
          },
          {
            id: "4",
            text: "Things could get better, or worse, or stay the same.",
            bucket: "hedged",
            why: "It covers every possibility, so nothing could contradict it.",
          },
          {
            id: "5",
            text: "Cycling perhaps has, arguably, some kind of effect.",
            bucket: "hedged",
            why: "Piling on vague words leaves no claim to test.",
          },
        ],
        hint: "Ask: what result would show this claim wrong?",
        why: "A qualified claim is narrower but still risks being wrong. A hedged one avoids risk by saying nothing.",
      },
      {
        id: "overclaim",
        kind: "flaw",
        label: "Spot the overreach",
        prompt: "Tap the sentence that claims more than the survey shows.",
        passage: [
          {
            text: "A survey of 40 students at one school found 30 sleep less on school nights.",
            tappable: true,
            whyNot: "The survey is small, but it's reported honestly. The overreach comes next.",
          },
          {
            text: "The article concludes that all teenagers everywhere sleep less because of screens.",
            tappable: true,
            flaw: true,
          },
          {
            text: "It adds that the survey was done in March.",
            tappable: true,
            whyNot: "Timing is a detail. The size of the claim is the issue.",
          },
        ],
        fallacy: "Claim bigger than the evidence",
        hint: "Compare “40 students at one school” with “all teenagers everywhere.”",
        why: "The survey covers one school and doesn't test screens as a cause. The claim covers everyone and names a reason the survey never checked.",
      },
      {
        id: "coffee",
        kind: "choice",
        prompt: "Which is the best qualified version of the claim?",
        stimulus:
          "Evidence: in a trial of 60 office workers, those who drank a coffee at 9am finished 8% more tasks that morning.",
        options: [
          {
            text: "Coffee makes everyone more productive, at any hour of the day.",
            whyNot: "It goes far beyond 60 office workers and one morning.",
          },
          { text: "In one trial, 60 office workers got 8% more done after a morning coffee." },
          {
            text: "Coffee may or may not do something helpful for some people.",
            whyNot: "That is hedged. It can't be wrong, so it tells us nothing.",
          },
        ],
        correct: 1,
        hint: "Which version names who, what and how much?",
        why: "The best version says exactly what the evidence supports, no more and no less, so a later study could confirm or contradict it.",
      },
      {
        id: "sure",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "The trial found an 8% gain in 60 office workers. Which level of confidence fits the evidence?",
        options: [
          {
            text: "Certain that coffee always boosts everyone's work.",
            whyNot: "One small trial can't support “always.”",
          },
          {
            text: "No confidence at all, since nothing can be known.",
            whyNot: "That throws away real evidence. The trial does tell us something.",
          },
          { text: "Fairly confident it helped in that trial, unsure beyond." },
        ],
        correct: 2,
        hint: "How far does the evidence reach?",
        why: "Confidence should track evidence. A small, single study earns some confidence about itself and much less about everyone else.",
      },
      {
        id: "version",
        kind: "stronger",
        noun: "Claim",
        prompt: "Which claim is better?",
        a: "Later school starts improve attendance in many of the schools that have tried them.",
        b: "Later school starts might possibly improve something, for some students, at some point.",
        stronger: "a",
        factor: "It's narrow enough to be tested",
        weakerWhy: "It can't be wrong, so it can't be tested. Vagueness isn't the same as caution.",
        hint: "Which claim could a study show to be false?",
        why: "Good qualifying makes a claim more precise, not weaker. “Many” and “that have tried them” tell you exactly what to check.",
      },
      {
        id: "age",
        kind: "gap",
        prompt: "What does this qualifier quietly rely on?",
        reason: "The study covered only adults aged 25 to 40.",
        conclusion: "So the finding may not hold for teenagers.",
        options: [
          { text: "People of different ages can respond differently." },
          {
            text: "Teenagers are never included in studies.",
            whyNot: "Nothing here says so, and it wouldn't explain why age matters.",
          },
          {
            text: "Adults aged 25 to 40 are the healthiest group.",
            whyNot: "Health isn't the link the qualifier uses. Age is.",
          },
        ],
        correct: 0,
        hint: "Why would leaving out teenagers matter?",
        why: "A limit on scope is justified when it rests on a reason. Here it is that a result can change with age.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Should each result raise or lower your confidence in the claim?",
        claim: "Weekly quizzes help students remember.",
        prior: 50,
        cards: [
          {
            id: "a",
            text: "One class of 25 scored 10% higher after weekly quizzes.",
            shift: 10,
            note: "A small sample helps a little, but it could be chance.",
          },
          {
            id: "b",
            text: "A second class of 30, in a different school, gained 6%.",
            shift: 15,
            note: "A repeat in a different place makes chance a weaker explanation.",
          },
          {
            id: "c",
            text: "A trial of 800 students in nine schools shows no clear gain.",
            shift: -30,
            note: "A large, wider test that finds little should lower your confidence a lot.",
          },
        ],
        hint: "Which results are larger and wider?",
        why: "Confidence should move with the size and breadth of the evidence. Small early results give way to larger, wider ones.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Which version fits the evidence, without hedging it into nothing?",
        stimulus:
          "A study at one elementary school in Corley found that students who did ten minutes of exercise before lessons scored higher on that week's spelling test than students who didn't. The school newsletter's headline: “Morning exercise makes children better at spelling.”",
        options: [
          {
            text: "“Exercise might possibly help some children with some school things, perhaps.”",
            whyNot: "Hedged until it can't fail. It names no group, no measure and no size.",
          },
          {
            text: "“At one school, students who exercised first scored higher in spelling that week.”",
          },
          {
            text: "“Morning exercise has been proven to improve every child's spelling results.”",
            whyNot:
              "“Proven” and “every child” go far beyond one school and one week, and the study didn't rule out other causes.",
          },
        ],
        correct: 1,
        hint: "Who was studied, for how long, and how sure can you be? The best version says exactly that, and no more.",
        why: "The study covered one school and one week, and found a link. The qualified version says exactly that. It could still turn out wrong, which is what keeps it worth saying.",
      },
    ],
  },
};

export default argumentsUnit;
