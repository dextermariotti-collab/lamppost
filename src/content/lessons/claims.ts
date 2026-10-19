import type { LessonScript } from "@/lib/steps/types";

/**
 * Unit 1: Claims & assumptions. All names, places and products are made up.
 */
const claims: Record<string, LessonScript> = {
  "claims-the-actual-claim": {
    lessonId: "claims-the-actual-claim",
    takeaway: "The claim is the sentence everything else is there to support.",
    written: {
      prompt: "In one sentence, restate the writer's main claim in your own words.",
      passage:
        "Every time the Crestwood ferry is canceled, the island stores lose a day's income. Last winter it was canceled eleven times. The store owners aren't asking for a bridge. They're asking for a second, smaller boat that can sail in rougher weather.",
      guidance: "Say what the writer wants, not just what the passage describes.",
    },
    steps: [
      {
        id: "find-it",
        kind: "choice",
        prompt: "Read the paragraph. Which sentence is the claim the others are there to support?",
        stimulus:
          "Oakridge Library should stay open until 9 p.m. Students at Oakridge often study late into the evening, the evening bus runs until 9:30, and the reading room is still full when it closes at 5.",
        options: [
          {
            text: "Students at Oakridge often study late into the evening.",
            whyNot: "That's a reason offered for the claim, not the claim itself.",
          },
          {
            text: "The reading room is still full when it closes at 5.",
            whyNot:
              "That's evidence about the present. It supports the claim, but it isn't what the writer wants you to accept.",
          },
          { text: "Oakridge Library should stay open until 9 p.m." },
        ],
        correct: 2,
        hint: "Ask: what is the writer trying to get me to agree with?",
        why: "The claim is what everything else is offered to support. Here it comes first, and the rest are reasons for it.",
      },
      {
        id: "build-bike",
        kind: "builder",
        prompt: "Put the claim at the top and its support underneath. One piece doesn't belong.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something you can check" },
        ],
        pieces: [
          {
            id: "pc",
            text: "Fenwick Bikes should hold its sale on a weekend.",
            role: "conclusion",
          },
          { id: "pp", text: "More of its customers are free on weekends.", role: "premise" },
          { id: "pe", text: "Last year's Saturday sales were double Tuesday's.", role: "evidence" },
          {
            id: "px",
            text: "Fenwick Bikes opened in 2009.",
            role: null,
            note: "True, but the opening year has no bearing on which day the sale should be.",
          },
        ],
        hint: "The claim is what the other pieces are trying to prove.",
        why: "The claim sits on top; reasons and evidence hold it up. A true fact that supports nothing is only background.",
      },
      {
        id: "implied",
        kind: "choice",
        prompt: "Nobody states the conclusion here. What claim is the writer really making?",
        stimulus:
          "The new bus lane took two parking spaces from Elm Street. Since then, stores there report fewer customers than last winter. Nobody asked the store owners.",
        options: [
          {
            text: "Every store on Elm Street is about to close.",
            whyNot:
              "The passage says fewer customers, not closing. That claim goes further than the writer does.",
          },
          { text: "The Elm Street bus lane has hurt local stores." },
          {
            text: "Buses are bad for business everywhere.",
            whyNot: "Too broad. The passage is about one lane on one street.",
          },
        ],
        correct: 1,
        hint: "What is the passage building toward, even though it never says it?",
        why: "An implied claim is what the parts add up to. Check it: it should follow from the details without going further than they do.",
      },
      {
        id: "loud",
        kind: "choice",
        prompt: "This one is loud. Which sentence is the claim?",
        stimulus:
          "Marlow Swim Club's fees rose 30% in two years. Members are furious that the club let this happen! It is a disgrace to treat loyal members this way. The club should hold fees steady next year.",
        options: [
          { text: "The club should hold fees steady next year." },
          {
            text: "It is a disgrace to treat loyal members this way.",
            whyNot: "Loud, but it's a feeling. It doesn't say what the writer wants done.",
          },
          {
            text: "Members are furious that the club let this happen!",
            whyNot: "A reaction, added for pressure. Strong feeling isn't the claim.",
          },
        ],
        correct: 0,
        hint: "Which sentence says what should change?",
        why: "The loudest sentence isn't the claim. The claim is what the writer wants you to accept or do.",
      },
      {
        id: "sure",
        kind: "confidence",
        prompt: "Choose the claim, then say how sure you are before you lock it in.",
        question:
          "“The pond should be fenced. A child nearly fell in last month, and fences are cheap.” Which sentence is the claim?",
        options: [
          {
            text: "Fences are cheap.",
            whyNot:
              "It comes last, but it's a second reason. Position doesn't make a sentence the claim.",
          },
          { text: "The pond should be fenced." },
          {
            text: "A child nearly fell in last month.",
            whyNot: "That's a reason for fencing the pond, not the claim itself.",
          },
        ],
        correct: 1,
        hint: "Two sentences give reasons. One says what to do.",
        why: "Two reasons support one claim. What a sentence supports decides whether it's the claim, not where it sits.",
      },
      {
        id: "precise",
        kind: "stronger",
        label: "Which is more precise?",
        noun: "Version",
        prompt:
          "A writer argues that Riverside's new tower blocks the hill view and wasn't put to a public vote. Which restatement of their claim is more precise?",
        a: "The tower is bad.",
        b: "The city council should not have approved the Riverside tower without a public vote.",
        stronger: "b",
        factor: "It says exactly what should change",
        weakerWhy:
          "“Bad” could mean ugly, tall, expensive or all three. A precise claim names the subject and the position so someone can agree or disagree.",
        hint: "Which version could a reader clearly say yes or no to?",
        why: "A precise restatement lets people respond to something specific, not to a mood.",
      },
      {
        id: "roles",
        kind: "sort",
        prompt: "Sort each sentence from a flyer: the claim, a reason, or just background.",
        buckets: [
          { id: "claim", label: "The claim" },
          { id: "reason", label: "A reason" },
          { id: "background", label: "Just background" },
        ],
        items: [
          {
            id: "1",
            text: "Ridgeway Park needs ten more benches.",
            bucket: "claim",
            why: "This is what the flyer wants you to accept.",
          },
          {
            id: "2",
            text: "Older visitors have nowhere to rest on the long path.",
            bucket: "reason",
            why: "It's offered as a reason more benches are needed.",
          },
          {
            id: "3",
            text: "People who sit down stay longer and spend more at the cafe by the gate.",
            bucket: "reason",
            why: "Another reason, this time about who benefits.",
          },
          {
            id: "4",
            text: "Ridgeway Park opened in 1974.",
            bucket: "background",
            why: "True, but it doesn't bear on whether it needs benches.",
          },
          {
            id: "5",
            text: "The park has a duck pond.",
            bucket: "background",
            why: "A pleasant detail with no link to the benches.",
          },
        ],
        hint: "Does the sentence push toward the conclusion, or just sit there?",
        why: "Only the claim is being argued, only reasons push toward it, and background is true but idle.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "A longer one, with a claim inside a claim. Which sentence states the writer's main claim?",
        stimulus:
          "“The Westfield footbridge has been closed for repairs twice this year, and the engineers' report calls its supports ‘worn beyond economic repair.’ Patching it again would cost nearly as much as a new bridge. So the bridge is no longer worth fixing. The city council should put the money toward a replacement instead.”",
        options: [
          {
            text: "The footbridge has been closed for repairs twice this year.",
            whyNot:
              "That's evidence offered for the claim. It describes the problem but doesn't say what the writer wants.",
          },
          {
            text: "The bridge is no longer worth fixing.",
            whyNot:
              "That's a claim, but a step on the way: it's offered as the reason for what the council should do.",
          },
          {
            text: "The engineers' report calls the supports worn beyond repair.",
            whyNot: "That's the strongest piece of evidence, not the claim it supports.",
          },
          {
            text: "The council should replace the bridge rather than patch it.",
          },
        ],
        correct: 3,
        hint: "One sentence is a conclusion that then becomes a reason for another. Which one is the writer finally aiming at?",
        why: "“Not worth fixing” is a claim, but it's offered to support the last one: the council should fund a replacement. The main claim is where the argument ends up.",
      },
    ],
  },

  "claims-hidden-assumptions": {
    lessonId: "claims-hidden-assumptions",
    takeaway: "An assumption is the unstated bridge: test it by asking what happens if it's false.",
    written: {
      prompt: "Name one assumption this argument depends on, and say why it might not hold.",
      passage:
        "Northfield School's new bell schedule ends the school day ten minutes earlier so students can catch their buses. Since September, the principal reports, fewer students have been late for buses. This proves the new schedule works, so it should stay.",
      guidance: "Ask what else might explain the change, or what the argument takes for granted.",
    },
    steps: [
      {
        id: "battery",
        kind: "gap",
        prompt: "What has to be true for the reason to lead to the conclusion?",
        reason: "Mia's phone died after two hours of video.",
        conclusion: "So Mia's phone is faulty.",
        options: [
          {
            text: "Mia watches a lot of video on her phone every day, mostly at night.",
            whyNot:
              "That adds a detail about her habits, but it doesn't connect “died after two hours” to “faulty.”",
          },
          {
            text: "Batteries in most phones are made of lithium.",
            whyNot: "True, but it says nothing about whether this battery life is normal.",
          },
          { text: "A healthy phone would last longer than two hours of video." },
        ],
        correct: 2,
        hint: "What would you need to believe about normal phones?",
        why: "The argument only works if a healthy phone would last longer. That unstated link is an assumption.",
      },
      {
        id: "chess",
        kind: "gap",
        prompt: "Find the missing link in this one.",
        reason: "Every student who joined the chess club raised their math grade.",
        conclusion: "So the chess club raises math grades.",
        options: [
          { text: "Nothing else explains the rise, such as motivated students joining." },
          {
            text: "Chess is a popular game, played in many schools around the world.",
            whyNot: "Popularity doesn't connect joining the club to improving.",
          },
          {
            text: "Math grades matter for getting into college.",
            whyNot: "Probably true, but it isn't what links the club to the improvement.",
          },
        ],
        correct: 0,
        hint: "Could something else explain both joining and improving?",
        why: "The argument needs the club to be the cause. If motivated students both join and study harder, the club isn't doing the work.",
      },
      {
        id: "shop-lights",
        kind: "flaw",
        label: "Find the leap",
        prompt: "Tap the step that depends on an assumption nobody stated.",
        passage: [
          {
            text: "Ines saw the bakery's lights were off at noon,",
            tappable: true,
            whyNot: "That's what she saw. Nothing wrong with noticing it.",
          },
          { text: "so" },
          { text: "the bakery must have closed for good.", tappable: true, flaw: true },
          {
            text: "She told her friends not to bother going.",
            tappable: true,
            whyNot: "That follows from her conclusion. The shaky step is the one before it.",
          },
        ],
        fallacy: "Unstated assumption: lights off means closed for good",
        hint: "What else could explain the lights being off?",
        why: "Lights off could mean a lunch break, a power outage or a holiday. The conclusion needs “lights off at noon means closed for good” to be true.",
      },
      {
        id: "late",
        kind: "confidence",
        prompt: "Choose the assumption the argument relies on, then say how sure you are.",
        question:
          "“Dev arrived late three times this month, so Dev doesn't care about the job.” Which assumption is the argument relying on?",
        options: [
          { text: "Lateness comes from not caring, not from late buses or illness." },
          {
            text: "Dev is a bad person who is also unreliable.",
            whyNot:
              "The argument only goes as far as caring about the job. This assumption is bigger than it needs.",
          },
          {
            text: "Other staff are never late, even when the weather is bad or the trains are delayed.",
            whyNot: "It might be true, but the argument doesn't depend on it.",
          },
        ],
        correct: 0,
        hint: "What would you have to believe to go from “late” to “doesn't care”?",
        why: "The argument treats lateness as a sign of not caring. If a late bus or an illness explains it, the conclusion falls.",
      },
      {
        id: "collapse",
        kind: "choice",
        prompt: "Which statement is load-bearing: if it were false, the argument would collapse?",
        stimulus: "Market Street should be closed to cars, because it is crowded on Saturdays.",
        options: [
          {
            text: "Market Street has several cafes.",
            whyNot: "The argument would survive without that.",
          },
          {
            text: "People enjoy shopping in town on Saturdays.",
            whyNot: "Probably true, but the argument doesn't rest on it.",
          },
          { text: "Closing it to cars would ease the crowding." },
        ],
        correct: 2,
        hint: "Delete each statement in turn. Which deletion breaks the argument?",
        why: "A load-bearing assumption is one the argument can't do without. Remove “closing it helps” and the reason no longer supports the conclusion.",
      },
      {
        id: "defend",
        kind: "stronger",
        label: "Which assumption is easier to defend?",
        prompt:
          "Both arguments lean on a hidden assumption. Which one leans on the easier-to-defend assumption?",
        a: "The bakery's loaves sold out by 9 a.m., so many people like them.",
        b: "The bakery's loaves sold out by 9 a.m., so they must be the cheapest in town.",
        stronger: "a",
        factor: "The hidden assumption is reasonable",
        weakerWhy:
          "It assumes cheapness is the only reason a loaf could sell out. Taste, freshness or a loyal following fit the same fact.",
        hint: "What has to be true for each conclusion to follow?",
        why: "Hidden assumptions can be reasonable or shaky. Spotting them lets you ask whether each one holds.",
      },
      {
        id: "campus",
        kind: "gap",
        prompt: "One more missing link.",
        reason: "Northfield School moved its exams online this year.",
        conclusion: "So students will find cheating easier.",
        options: [
          {
            text: "Exams are stressful for most students at Northfield.",
            whyNot: "For many students, yes, but it doesn't link online exams to cheating.",
          },
          {
            text: "Students own laptops that they can use at home.",
            whyNot:
              "They need laptops to take online exams, but that alone doesn't make cheating easier.",
          },
          { text: "Online exams are less closely supervised than in-person ones." },
        ],
        correct: 2,
        hint: "What would be different about supervision?",
        why: "The argument works only if online means less supervision. If every online exam were watched by camera, the conclusion wouldn't follow.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "gap",
        prompt: "A real-world one. What must be true for this argument to work?",
        reason:
          "Since Harlow Street went one-way in May, its stores' sales are down 15% from the same months last year.",
        conclusion: "So the one-way traffic is hurting the stores, and it should be reversed.",
        options: [
          {
            text: "Nothing besides the one-way traffic explains the drop in the stores' sales.",
          },
          {
            text: "Some shoppers find one-way streets confusing to drive along.",
            whyNot:
              "Plausible, but the argument doesn't need it. What it needs is that nothing else explains the drop.",
          },
          {
            text: "The city council introduced the one-way traffic without asking the stores.",
            whyNot:
              "That may be a fair complaint, but it isn't what links the drop in sales to the one-way traffic.",
          },
        ],
        correct: 0,
        hint: "Imagine the 15% drop had another cause. Which statement rules that out?",
        why: "The argument treats the one-way traffic as the cause of the drop. That only works if nothing else, such as road work or a slow year for every store in town, explains it.",
      },
    ],
  },

  "claims-facts-opinions-values": {
    lessonId: "claims-facts-opinions-values",
    takeaway: "Ask of any statement: can it be checked, or does it say what should matter?",
    written: {
      prompt:
        "Pick one sentence from the passage and say whether it is a fact, an opinion or a value claim, and why.",
      passage:
        "The Harbor Line ferry is the fastest way to cross the bay: the trip takes 18 minutes, compared with 35 by car. It is also the nicest, with sea views the whole way. Because of that, the city council should keep the ferry running even if it loses money.",
      guidance: "Say how you could check it, or why you couldn't.",
    },
    steps: [
      {
        id: "sort-1",
        kind: "sort",
        prompt:
          "Sort each statement. A fact can be checked, an opinion is a preference, a value says what ought to matter.",
        buckets: [
          { id: "fact", label: "Fact", hint: "Can be checked" },
          { id: "opinion", label: "Opinion", hint: "A personal taste" },
          { id: "value", label: "Value", hint: "What ought to matter" },
        ],
        items: [
          {
            id: "1",
            text: "The Alder Street bridge is 140 feet long.",
            bucket: "fact",
            why: "You could measure it.",
          },
          {
            id: "2",
            text: "The Alder Street bridge is ugly.",
            bucket: "opinion",
            why: "Ugly is a taste, and reasonable people differ.",
          },
          {
            id: "3",
            text: "The city ought to protect old bridges.",
            bucket: "value",
            why: "It says what should matter, which measurements alone can't settle.",
          },
          {
            id: "4",
            text: "The bridge opened in 1998.",
            bucket: "fact",
            why: "A date you could check in the records.",
          },
          {
            id: "5",
            text: "Blue is the nicest color for a bridge.",
            bucket: "opinion",
            why: "A preference, not something you can measure.",
          },
        ],
        hint: "Ask of each one: could I check it, or is it what someone likes, or what ought to matter?",
        why: "Facts can be checked. Opinions report a taste. Values say what matters, and “ought” claims can't be settled by data alone.",
      },
      {
        id: "mixed",
        kind: "flaw",
        label: "Split the sentence",
        prompt: "Real sentences mix types. Tap the part that data alone can't settle.",
        passage: [
          {
            text: "The new schedule cut delays by 9%,",
            tappable: true,
            whyNot: "That's a checkable fact: you could count delays before and after.",
          },
          { text: "so" },
          { text: "it was the right call.", tappable: true, flaw: true },
          {
            text: "Fewer trains were also canceled.",
            tappable: true,
            whyNot: "Another checkable statement about the numbers.",
          },
        ],
        fallacy: "A value judgment presented as a fact",
        hint: "Which part says what ought to have been done?",
        why: "The 9% is a fact. “The right call” is a value judgment: it depends on what matters, such as cost or convenience, not only on delay figures.",
      },
      {
        id: "which-value",
        kind: "choice",
        prompt: "Which of these is a value claim?",
        options: [
          {
            text: "The reservoir is at 60% capacity.",
            whyNot: "That can be measured, so it's a fact.",
          },
          {
            text: "Lake views are nicer than mountain views.",
            whyNot: "That's a taste, an opinion, not a claim about what ought to matter.",
          },
          { text: "Public parks should be free to enter." },
        ],
        correct: 2,
        hint: "A value claim says what ought to be, or what matters.",
        why: "“Should” claims are about what matters. Data can inform them but can't settle them alone.",
      },
      {
        id: "split",
        kind: "confidence",
        prompt: "Decide, then say how sure you are.",
        question:
          "“The city council's new bike lane cut cycling injuries by a third, so it was worth the cost.” Which part is a value judgment?",
        options: [
          { text: "It was worth the cost." },
          {
            text: "The lane cut injuries by a third.",
            whyNot: "That's a checkable claim about injuries.",
          },
          {
            text: "The council built a lane.",
            whyNot: "A checkable claim about what was built.",
          },
        ],
        correct: 0,
        hint: "Which part weighs one thing against another?",
        why: "Injuries and the lane are facts. “Worth the cost” weighs safety against money, and people weigh those differently.",
      },
      {
        id: "clean",
        kind: "stronger",
        label: "Which keeps fact and opinion apart?",
        noun: "Review",
        prompt: "Two reviewers describe the same movie. Which one keeps fact and opinion apart?",
        a: "It's a boring movie: two hours long, with a dull ending.",
        b: "The movie runs two hours. I found the ending dull.",
        stronger: "b",
        factor: "It labels the opinion as an opinion",
        weakerWhy:
          "“Boring” is presented as if it were a property of the movie, and the length is offered as proof, though length alone doesn't make anything dull.",
        hint: "Which reviewer says who is doing the judging?",
        why: "Stating the fact and owning the opinion lets readers check one and decide about the other.",
      },
      {
        id: "sort-2",
        kind: "sort",
        prompt: "Sort these workplace statements the same way.",
        buckets: [
          { id: "fact", label: "Fact", hint: "Can be checked" },
          { id: "opinion", label: "Opinion", hint: "A personal taste" },
          { id: "value", label: "Value", hint: "What ought to matter" },
        ],
        items: [
          {
            id: "1",
            text: "Kestrel Labs has a bike rack.",
            bucket: "fact",
            why: "You could go and look.",
          },
          {
            id: "2",
            text: "Cycling is more fun than driving.",
            bucket: "opinion",
            why: "Fun is a personal taste.",
          },
          {
            id: "3",
            text: "Employers should reward staff who cycle.",
            bucket: "value",
            why: "It says what employers ought to do, which depends on what you think matters.",
          },
          {
            id: "4",
            text: "Rain makes cycling miserable.",
            bucket: "opinion",
            why: "Some people enjoy it, so it's a feeling, not a measurement.",
          },
        ],
        hint: "“Should” and “ought” usually point to a value.",
        why: "The same test works everywhere: check it, like it, or decide it matters.",
      },
      {
        id: "rewrite",
        kind: "choice",
        prompt: "Which rewrite turns this opinion into a claim you could check?",
        stimulus: "“The cafeteria food is terrible.”",
        options: [
          {
            text: "The cafeteria food is honestly, truly and completely terrible, in my view.",
            whyNot: "Stronger words, but it's still an opinion. Nothing here could be checked.",
          },
          { text: "In a survey of 200 staff, 120 rated the food “poor” or worse." },
          {
            text: "Everyone in the whole building hates the cafeteria food.",
            whyNot: "It sounds factual, but nobody counted, and “hates” is a feeling.",
          },
        ],
        correct: 1,
        hint: "What could you count or measure?",
        why: "A checkable version names something countable. That turns a mood into a claim you can test.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "Two neighbors disagree about new floodlights. Where does their disagreement really lie?",
        stimulus:
          "Jonah: “The new floodlights at Brook Park are a waste. They cost $40,000 and they're only used twice a week.” Ama: “Twice a week is 100 extra hours of soccer a year for kids who had nowhere to play in winter. That's money well spent.”",
        options: [
          {
            text: "In what the floodlights cost and how often they're used.",
            whyNot:
              "They agree on those facts: $40,000, used about twice a week. Neither disputes the numbers.",
          },
          {
            text: "In whether the use they agree on is worth the cost.",
          },
          {
            text: "In whether children like playing soccer in winter.",
            whyNot:
              "That's a preference nobody here disputes. Their argument is about whether the spending is justified.",
          },
        ],
        correct: 1,
        hint: "Check which facts both of them accept. What's left once those are agreed?",
        why: "They agree on the facts: the cost and the use. What divides them is a value question, whether that use is worth $40,000, and more data alone won't settle it.",
      },
    ],
  },

  "claims-burden-of-proof": {
    lessonId: "claims-burden-of-proof",
    takeaway: "Support is owed by whoever makes the claim, and more for unusual claims.",
    written: {
      prompt: "Say who owes evidence in this exchange, and how much.",
      passage:
        "Kofi: “My herbal tea prevents colds. It's all natural.” Lena: “Do you have any evidence?” Kofi: “Do you have any evidence it doesn't? Nobody's proved it wrong, and thousands of people drink it.”",
      guidance: "Look at who made the claim, and what Kofi asks Lena to do.",
    },
    steps: [
      {
        id: "who-owes",
        kind: "stronger",
        label: "Who owes the evidence?",
        noun: "Reply",
        prompt:
          "Tomas says the school lake has a giant catfish. Priya doubts it. Whose reply puts the burden on the right person?",
        a: "Priya to Tomas: “Prove there isn't a catfish, then.”",
        b: "Priya to Tomas: “What evidence do you have that there is one?”",
        stronger: "b",
        factor: "The one making the claim supplies the support",
        weakerWhy:
          "That flips the burden. Tomas claimed there's a catfish, so he owes the evidence. Nobody has to prove there isn't one.",
        hint: "Who made the claim?",
        why: "Whoever makes a claim owes the support for it.",
      },
      {
        id: "cant-disprove",
        kind: "flaw",
        label: "Find the flipped burden",
        prompt: "Tap the sentence that flips the burden of proof.",
        passage: [
          { text: "Kofi says his herbal tea prevents colds. When asked for evidence, he says," },
          { text: "“Nobody has ever shown that it doesn't work,”", tappable: true, flaw: true },
          {
            text: "and adds that his aunt swears by it.",
            tappable: true,
            whyNot:
              "That's weak support, but it is an attempt at evidence, not a flip of the burden.",
          },
          {
            text: "He sold forty jars last week.",
            tappable: true,
            whyNot:
              "A sales figure. It shows people buy it, not that it works, but it doesn't shift the burden.",
          },
        ],
        fallacy: "Shifting the burden of proof",
        hint: "Who is being asked to prove what?",
        why: "Not having been disproved isn't evidence. The person making the claim owes the support.",
      },
      {
        id: "unusual",
        kind: "choice",
        prompt: "Which claim owes the most evidence?",
        options: [
          { text: "The old mill is haunted by the ghost of a miller." },
          {
            text: "The library is closed on Sundays, as it has been for years.",
            whyNot: "Ordinary and easy to check: a small amount of evidence settles it.",
          },
          {
            text: "A new streetcar line will open on the main street next year.",
            whyNot: "Plausible. A city announcement or a schedule would be enough.",
          },
        ],
        correct: 0,
        hint: "Which would surprise you most if it were true?",
        why: "The more unusual the claim, the more evidence it owes. Ordinary claims need little; extraordinary ones need strong support.",
      },
      {
        id: "proof-gap",
        kind: "gap",
        prompt: "When does “no evidence of harm” show something is safe?",
        reason: "Nobody has found evidence that the water fountain is unsafe.",
        conclusion: "So the fountain must be safe.",
        options: [
          {
            text: "Fountains like this one are popular with students.",
            whyNot: "Popularity says nothing about safety.",
          },
          {
            text: "Drinking water is healthy for people of every age and in every season.",
            whyNot: "True in general, but it doesn't connect “no evidence” to “safe.”",
          },
          { text: "Someone has tested it properly and would have found any problem." },
        ],
        correct: 2,
        hint: "Was anyone actually looking?",
        why: "“No evidence of harm” only shows safety if someone has looked properly. An absence of evidence counts when the search was a good one.",
      },
      {
        id: "who",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "Ola says the new ferry schedule won't save anyone time. Sam asks how she knows, and Ola replies: “Prove it will.” Is Ola's reply fair?",
        options: [
          { text: "No: Ola made the claim, so Ola owes the support." },
          {
            text: "Yes: new schedules should prove themselves first.",
            whyNot:
              "That might be a fair demand of the schedule's designers, but Ola still made a claim and owes support for it.",
          },
          {
            text: "Yes: it's always the other person's job to disprove.",
            whyNot:
              "There is no such rule. Whoever asserts something, including a negative claim, owes the reasons.",
          },
        ],
        correct: 0,
        hint: "Did Ola say something that needs support?",
        why: "A negative claim (“it won't save time”) is still a claim. Ola asserted it, so the support is Ola's to give, not Sam's.",
      },
      {
        id: "burden",
        kind: "sort",
        prompt: "Sort each reply: a fair request for evidence, or the burden shifted back.",
        buckets: [
          { id: "fair", label: "Fair to ask" },
          { id: "shifted", label: "Burden shifted" },
        ],
        items: [
          {
            id: "1",
            text: "“You say the bridge is unsafe. What did the inspection find?”",
            bucket: "fair",
            why: "It asks the person making the claim for their support.",
          },
          {
            id: "2",
            text: "“You can't prove the bridge is safe, so it must be unsafe.”",
            bucket: "shifted",
            why: "It treats “not proved” as proof of the opposite.",
          },
          {
            id: "3",
            text: "“Everyone knows the water tastes odd. Prove it doesn't.”",
            bucket: "shifted",
            why: "The one making the claim asks others to disprove it.",
          },
          {
            id: "4",
            text: "“You say the water tastes odd. Have you compared it with another faucet?”",
            bucket: "fair",
            why: "A reasonable question about how the claim was tested.",
          },
        ],
        hint: "Who is being asked to do the proving?",
        why: "A fair request asks the claimant for support. A shifted burden demands that others disprove what was never supported.",
      },
      {
        id: "how-much",
        kind: "choice",
        prompt: "How much evidence should each claim owe?",
        stimulus:
          "Priya says she had cereal for breakfast. Tomas says he was carried off by a flying saucer last night.",
        options: [
          {
            text: "Both should be asked for the same evidence.",
            whyNot: "Ordinary claims need little support; extraordinary ones need a lot more.",
          },
          {
            text: "Neither needs any evidence, because both are personal.",
            whyNot:
              "Any claim you're asked to accept owes some support, and the unusual one owes more.",
          },
          { text: "Priya's needs little; Tomas's needs strong evidence." },
        ],
        correct: 2,
        hint: "Which claim is a surprise?",
        why: "The burden grows with how unusual the claim is. A bowl of cereal is believable; a flying saucer needs far more than someone's word.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A real exchange. What's the fairest response to Colm?",
        stimulus:
          "At a residents' meeting, Colm says the new cell tower is making people on Ash Court sick. Asked for evidence, he says: “Lots of us have had headaches since it went up. Until the phone company proves the tower is safe, it should be shut off.”",
        options: [
          {
            text: "Colm must prove the tower causes harm before anyone takes his worry seriously.",
            whyNot:
              "Too dismissive. His claim does owe support, but a worry can be taken seriously while evidence is gathered.",
          },
          {
            text: "The phone company must prove the tower is completely safe, as Colm says.",
            whyNot:
              "That accepts the shifted burden. Colm made the claim of harm, and “prove it's completely safe” asks for what nobody can show.",
          },
          {
            text: "Colm's claim owes evidence: compare headaches with similar streets without a tower.",
          },
          {
            text: "Headaches are common, so Colm's claim is obviously false.",
            whyNot:
              "That goes too far the other way. Common headaches make his evidence weak, not his claim false.",
          },
        ],
        correct: 2,
        hint: "Who made the claim here? And what evidence would actually test it, rather than repeat the worry?",
        why: "Colm made the claim of harm, so it owes support. Headaches since the tower went up is weak evidence, because headaches are common. A comparison with similar streets could test it either way.",
      },
    ],
  },

  "claims-vague-language": {
    lessonId: "claims-vague-language",
    takeaway: "A claim you can't fail isn't telling you anything.",
    written: {
      prompt: "Rewrite the claim so that it could be shown false.",
      passage:
        "The Kestrel Labs sleep band “helps support healthier sleep patterns for many users.” The company says thousands of customers “report feeling more rested.” It gives no figures on how many, how much, or compared with what.",
      guidance: "Name a measure and something to compare it with.",
    },
    steps: [
      {
        id: "weasel",
        kind: "flaw",
        label: "Find the weasel word",
        prompt: "Tap the word that lets this claim escape being proven wrong.",
        passage: [
          { text: "Lumen Tea" },
          { text: "may", tappable: true, flaw: true },
          {
            text: "help you",
            tappable: true,
            whyNot:
              "Loose, yes, but even a firm “helps you” could be tested. The escape hatch is “may.”",
          },
          { text: "feel more" },
          {
            text: "relaxed",
            tappable: true,
            whyNot: "A soft word, but it's “may” that makes the whole claim impossible to fail.",
          },
          { text: "as part of a balanced routine." },
        ],
        fallacy: "Weasel word: “may”",
        hint: "Which word means no result could ever count against the claim?",
        why: "“May” means nothing counts as failure: if you feel relaxed, it worked; if not, it only “may” have.",
      },
      {
        id: "testable",
        kind: "sort",
        prompt: "Sort each claim: could it be shown false, or can it never fail?",
        buckets: [
          { id: "testable", label: "Could be shown false" },
          { id: "slippery", label: "Can never fail" },
        ],
        items: [
          {
            id: "1",
            text: "Lumen Tea contains 40 mg of caffeine per cup.",
            bucket: "testable",
            why: "A lab could measure it, and the answer could be different.",
          },
          {
            id: "2",
            text: "Lumen Tea supports a sense of calm.",
            bucket: "slippery",
            why: "“Supports” and “a sense of” fit almost any result.",
          },
          {
            id: "3",
            text: "Sleep improved for 6 of 10 volunteers who drank Lumen Tea nightly.",
            bucket: "testable",
            why: "It gives numbers that a repeat study could contradict.",
          },
          {
            id: "4",
            text: "Lumen Tea is linked to wellbeing.",
            bucket: "slippery",
            why: "“Linked to” names no size and no direction, so it can't be wrong.",
          },
          {
            id: "5",
            text: "Up to 30% more energy!",
            bucket: "slippery",
            why: "“Up to” includes zero, so no result can contradict it.",
          },
        ],
        hint: "Could a result exist that proves the claim wrong?",
        why: "A testable claim sticks its neck out. A slippery one is built so that no result can count against it.",
      },
      {
        id: "up-to",
        kind: "choice",
        prompt: "The sign says “Up to 50% off everything!” What is the least it promises?",
        options: [
          {
            text: "Everything in the store at exactly 50% off, just as the sign says.",
            whyNot: "“Up to” sets a ceiling, not a floor. Most things don't have to be 50% off.",
          },
          {
            text: "Half of the items at half price, and the rest at full price.",
            whyNot: "“Up to” doesn't promise any share of the items.",
          },
          { text: "Very little: one item at 50% off and the rest at full price would fit." },
        ],
        correct: 2,
        hint: "What is the smallest thing that would make the sign true?",
        why: "“Up to 50%” stays true if a single item is 50% off. It sets a ceiling and promises nothing below it.",
      },
      {
        id: "rewrite",
        kind: "choice",
        prompt: "Which rewrite makes the claim testable, not just stronger?",
        stimulus: "“Our app helps children with reading.”",
        options: [
          {
            text: "Our app absolutely, definitely and undeniably helps children of all ages with reading.",
            whyNot:
              "Stronger-sounding, but “helps” still has no measure, so nothing could count against it.",
          },
          { text: "Children who used the app for 8 weeks out-scored similar children who didn't." },
          {
            text: "Our app is the best reading app that any child could use.",
            whyNot: "“Best” has no measure, so it can't be tested.",
          },
        ],
        correct: 1,
        hint: "What could you measure, and compare against what?",
        why: "A testable claim names a measure and something to compare it with, so it can turn out to be false.",
      },
      {
        id: "spot",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "“Studies suggest that Fennel Fuel supports healthy energy levels.” What makes this claim hard to test?",
        options: [
          { text: "“Suggest” and “supports” leave room for any result." },
          {
            text: "It mentions studies but doesn't name a single one of them or say who ran them.",
            whyNot:
              "Citing studies isn't the fault. The fault is how little the claim actually promises.",
          },
          {
            text: "It sounds far too confident about its benefits.",
            whyNot: "It's the opposite: it is hedged in ways that make it impossible to catch out.",
          },
        ],
        correct: 0,
        hint: "Look at the verbs.",
        why: "“Suggest” and “supports” promise no particular size or direction, so every result fits.",
      },
      {
        id: "clearer",
        kind: "stronger",
        label: "Which claim can be tested?",
        noun: "Sign",
        prompt: "Two cafe signs. Which claim could a customer actually check?",
        a: "Our coffee is linked to a great morning.",
        b: "Every cup is made with 18 grams of freshly ground beans.",
        stronger: "b",
        factor: "You can check it",
        weakerWhy:
          "“Linked to a great morning” fits any morning, good or bad. There's no result that would prove it wrong.",
        hint: "Which one could turn out to be false?",
        why: "A sign you can check is a promise. One you can't check is only a mood.",
      },
      {
        id: "unfalsifiable",
        kind: "gap",
        prompt: "What makes this conclusion follow?",
        reason: "Whatever happened, the supplement's makers said it “may have helped.”",
        conclusion: "So there's no way to show the supplement doesn't work.",
        options: [
          { text: "A claim that fits every result can't be shown wrong." },
          {
            text: "Supplements cost a lot compared with ordinary food.",
            whyNot: "Cost has nothing to do with whether the claim can be shown wrong.",
          },
          {
            text: "Supplement makers are usually honest about their products.",
            whyNot: "That would point the other way and isn't the missing link.",
          },
        ],
        correct: 0,
        hint: "What is true of a claim nothing can contradict?",
        why: "If “may have helped” fits every outcome, no outcome can ever count against it.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "A real-sounding promise. Which rewrite would let residents check, in a few years, whether it was kept?",
        stimulus:
          "From the Mayfield City Council's plan: “We will work toward cleaner air in the town center, aiming for significant improvements in the coming years through a range of measures.”",
        options: [
          {
            text: "We are fully committed to making air in the town center dramatically cleaner, as a top priority.",
            whyNot:
              "Stronger words, but still no measure and no date. “Dramatically” could mean anything.",
          },
          {
            text: "We will cut average nitrogen dioxide on Main Street by a quarter by 2030, measured monthly.",
          },
          {
            text: "We will take many important steps to help tackle air pollution across the whole town center.",
            whyNot:
              "“Help tackle” and “many steps” can't fail: any action at all would count as keeping it.",
          },
        ],
        correct: 1,
        hint: "For each version, ask: in 2030, what result would show the promise was broken?",
        why: "A promise you can check names a measure, a size and a date. Only the second could clearly fail, which is exactly what makes it worth something.",
      },
    ],
  },
};

export default claims;
