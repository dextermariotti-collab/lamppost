import type { LessonScript } from "@/lib/steps/types";

/**
 * Unit 2: Evidence. All names, places and products are made up.
 */
const evidence: Record<string, LessonScript> = {
  "evidence-types": {
    lessonId: "evidence-types",
    takeaway: "Stronger evidence rules out more of the other explanations.",
    written: {
      prompt: "Name the kind of evidence each item is, and say which is strongest and why.",
      passage:
        "Brightside Sleep Masks says its product works. Evidence offered: (1) a customer wrote, “I sleep like a baby now.” (2) A survey of 900 owners found 70% said they sleep better. (3) In a trial, 240 volunteers were randomly given either a Brightside mask or a plain cloth one, and the Brightside group fell asleep 9 minutes sooner on average.",
      guidance: "Think about which item best rules out other explanations.",
    },
    steps: [
      {
        id: "pair",
        kind: "stronger",
        label: "Which evidence is stronger?",
        noun: "Evidence",
        prompt:
          "Both are offered for “Lumen Tea helps people fall asleep faster.” Which is stronger evidence?",
        a: "My aunt drinks it every night and swears she sleeps better.",
        b: "In a trial, 200 volunteers were randomly given Lumen Tea or plain tea. The Lumen group fell asleep 12 minutes sooner on average.",
        stronger: "b",
        factor: "Random assignment rules out other explanations",
        weakerWhy:
          "One person's story can't rule out other reasons she slept better: a quieter month, less stress, or chance.",
        hint: "Which one could a quieter month explain away?",
        why: "Evidence is strong to the degree that it rules out other explanations. Random groups do that; a single story can't.",
      },
      {
        id: "strong-weak",
        kind: "sort",
        prompt: "The claim: “The new bus route cut commute times.” Sort each piece of evidence.",
        buckets: [
          { id: "strong", label: "Strong evidence" },
          { id: "weak", label: "Weak evidence" },
        ],
        items: [
          {
            id: "1",
            text: "GPS records show median trip time fell from 41 to 34 minutes over six months.",
            bucket: "strong",
            why: "Measured across many trips, before and after.",
          },
          {
            id: "2",
            text: "A rider says her trip feels quicker.",
            bucket: "weak",
            why: "One person's impression, with no measurement.",
          },
          {
            id: "3",
            text: "The transit agency's press release says “faster trips.”",
            bucket: "weak",
            why: "A claim from the people who built the route, with no data shown.",
          },
          {
            id: "4",
            text: "The agency timed 2,000 trips the month before and the month after the change.",
            bucket: "strong",
            why: "Many timed trips, with a comparison.",
          },
          {
            id: "5",
            text: "A neighbor's cousin got to work early once.",
            bucket: "weak",
            why: "A single occasion, which could have had many causes.",
          },
        ],
        hint: "Is it measured, over many cases, with something to compare to?",
        why: "Strong evidence is measured, covers many cases and has a comparison. Weak evidence is one impression or a claim with nothing behind it.",
      },
      {
        id: "design",
        kind: "choice",
        prompt: "Which study design can best show that one thing causes another?",
        options: [
          {
            text: "A survey asking people about their habits and how they feel.",
            whyNot:
              "A survey reports what people say. It can show a link but can't separate the cause from other differences.",
          },
          {
            text: "A page of glowing testimonials from happy customers.",
            whyNot: "They are picked because they're happy, and there's no comparison group.",
          },
          { text: "An experiment that randomly assigns people to two groups." },
        ],
        correct: 2,
        hint: "Which design makes the two groups alike in everything but the one thing being tested?",
        why: "Random assignment makes the groups alike apart from the thing tested, so a difference between them points at that thing.",
      },
      {
        id: "flaw",
        kind: "flaw",
        label: "Find the overreach",
        prompt: "Tap the step where the evidence can't support the conclusion.",
        passage: [
          {
            text: "A survey of 800 students found that breakfast-eaters scored higher,",
            tappable: true,
            whyNot: "A survey is fine for showing a link. That part is reasonable.",
          },
          { text: "so" },
          { text: "breakfast raises exam scores.", tappable: true, flaw: true },
          {
            text: "Schools should serve free breakfast.",
            tappable: true,
            whyNot: "That's the action they want. The problem is the step before it.",
          },
        ],
        fallacy: "A survey shows a link, not a cause",
        hint: "Could breakfast-eaters differ in other ways?",
        why: "Breakfast-eaters may also sleep more, or come from homes with more time. A survey can't separate those, so it can't show breakfast is the cause.",
      },
      {
        id: "sure",
        kind: "confidence",
        prompt: "Choose the strongest evidence, then say how sure you are.",
        question: "The claim: “Reading before bed improves sleep.” Which evidence is strongest?",
        options: [
          {
            text: "A survey of 5,000 people found that those who read say they sleep better.",
            whyNot: "It shows a link in what people report, but readers may differ in other ways.",
          },
          {
            text: "A sleep specialist with 20 years of practice says reading before bed helps.",
            whyNot: "An expert's view counts for something, but it's weaker than measured results.",
          },
          {
            text: "300 volunteers were randomly told to read or not, and their sleep was tracked.",
          },
        ],
        correct: 2,
        hint: "Which one compares two groups that are alike apart from reading?",
        why: "Random assignment plus tracked sleep rules out the most other explanations. The survey and the opinion both leave them open.",
      },
      {
        id: "opinion",
        kind: "stronger",
        label: "Which evidence is stronger?",
        noun: "Evidence",
        prompt:
          "The claim: “Screens late at night shorten teenagers' sleep.” Which evidence is stronger?",
        a: "A professor of sleep science says late screens are ruining teenagers' sleep.",
        b: "A study followed 3,000 teenagers for two years. Those on screens after 10 p.m. slept 40 minutes less on average.",
        stronger: "b",
        factor: "Measured results over opinion",
        weakerWhy:
          "An expert's view is worth something, but it's a judgment. Measured sleep over two years shows the pattern directly.",
        hint: "Which one shows its measurements?",
        why: "Opinion ranks below measured data, though an expert's view is still worth more than a story.",
      },
      {
        id: "school",
        kind: "choice",
        prompt:
          "A school wants to know whether a reading program works. Which evidence would be strongest?",
        options: [
          {
            text: "Test scores of students randomly given the program versus those not given it.",
          },
          {
            text: "A warm letter from a parent saying her child loved the program and reads more now.",
            whyNot: "One family's experience, with nothing to compare it to.",
          },
          {
            text: "Teachers saying at a staff meeting that the program feels like it's working.",
            whyNot: "Impressions from people who like the program, without measured results.",
          },
        ],
        correct: 0,
        hint: "Which option measures something and compares two groups?",
        why: "Measured results from randomly chosen groups let the school separate the program from everything else going on.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A hospital has three kinds of evidence. Which should it weigh most, and why?",
        stimulus:
          "A hospital wants to know whether a new hand-washing reminder cuts infections. It has nurses' opinions of the reminder; infection rates before and after in one unit that chose to use it; and a study in which 20 units were randomly picked to use it or not.",
        options: [
          {
            text: "The study of 20 units, because chance decided which units used the reminder.",
          },
          {
            text: "The unit that chose it, because it measured real infections over time.",
            whyNot:
              "Real measurements help, but that unit chose the reminder. Motivated staff or a quieter season could explain the change.",
          },
          {
            text: "The nurses' opinions, because they see infections every single day.",
            whyNot:
              "Experience matters, but impressions can't separate the reminder from everything else that changes in a unit.",
          },
        ],
        correct: 0,
        hint: "Which source can separate the reminder from everything else going on in the units?",
        why: "Random assignment makes the units alike apart from the reminder, so a difference in infections points at it. Before-and-after in one unit that volunteered can't rule out the rivals.",
      },
    ],
  },

  "evidence-anecdote-vs-data": {
    lessonId: "evidence-anecdote-vs-data",
    takeaway: "A vivid story shows something can happen, not how often.",
    written: {
      prompt: "Explain what the story shows and what it can't show.",
      passage:
        "Kofi's grandfather drove for sixty years without a seatbelt and never had a crash. “Seatbelts are a waste of time,” Kofi says. “Grandpa is proof.” Studies of millions of trips find that crashes are far less likely to be fatal for people wearing seatbelts.",
      guidance: "Say what the story proves, and what would be needed to prove Kofi's claim.",
    },
    steps: [
      {
        id: "belt",
        kind: "choice",
        prompt:
          "Kofi's grandfather drove for 60 years without a seatbelt and never crashed. Does that show seatbelts aren't needed?",
        options: [
          {
            text: "Yes: one safe lifetime shows they aren't needed.",
            whyNot:
              "One safe driver shows it can happen, not how often. Across millions of drivers the pattern is different.",
          },
          {
            text: "Only for careful drivers, like his grandfather.",
            whyNot:
              "That adds a condition nobody tested. The story can't show which drivers are safe.",
          },
          { text: "No: it shows one case, not how often crashes happen." },
        ],
        correct: 2,
        hint: "What does one person's history tell you about everyone else's?",
        why: "A story shows something can happen. It says nothing about how often, which is what matters for seatbelts.",
      },
      {
        id: "crossing",
        kind: "stronger",
        label: "Which should count for more?",
        noun: "Evidence",
        prompt:
          "A town is asking whether its new crosswalk is safer. Which evidence should count for more?",
        a: "A store owner's dramatic account of a near miss last Tuesday.",
        b: "Records: three accidents in five years at the old crosswalk, none in two years at the new one.",
        stronger: "b",
        factor: "It covers many cases",
        weakerWhy:
          "A near miss is one case. It's vivid, but it doesn't tell you how often such things happen.",
        hint: "Which one counts every case, not just the memorable one?",
        why: "Stories grab our attention. Data covers all the cases, including the quiet ones nobody tells stories about.",
      },
      {
        id: "grapefruit",
        kind: "flaw",
        label: "Find the leap",
        prompt: "Tap the step that turns one story into a rule.",
        passage: [
          {
            text: "Ola's cousin lost weight on the grapefruit plan,",
            tappable: true,
            whyNot:
              "That's one person's result. It's fine to report; the problem is what's built on it.",
          },
          { text: "so the plan" },
          { text: "works for everyone.", tappable: true, flaw: true },
          {
            text: "Ola told the whole class about it.",
            tappable: true,
            whyNot: "That follows from her belief. The shaky step comes before it.",
          },
        ],
        fallacy: "One case treated as a rule",
        hint: "How many people does the evidence cover?",
        why: "One person's result can't show the plan works for everyone. Others might have gained weight, or lost it for other reasons.",
      },
      {
        id: "prove",
        kind: "choice",
        prompt: "What can one vivid story prove?",
        options: [
          { text: "That something can happen." },
          {
            text: "How often it happens.",
            whyNot: "Frequency needs counts across many cases. One story is a single count of one.",
          },
          {
            text: "What most people experience.",
            whyNot:
              "A striking story is more likely to be unusual than typical, so it can mislead about the usual case.",
          },
        ],
        correct: 0,
        hint: "Think about the difference between “can” and “usually.”",
        why: "One case is enough to show something is possible. It can't show how common it is or what is typical.",
      },
      {
        id: "raffle",
        kind: "confidence",
        prompt: "Choose the best reading, then say how sure you are.",
        question:
          "Priya says: “I know three people who won the raffle, so winning must be easy.” How should you read that?",
        options: [
          {
            text: "Fine evidence: three winners she knows is a lot of winners.",
            whyNot: "Three winners means little without knowing how many people entered.",
          },
          { text: "It tells you little until you know how many people entered." },
          {
            text: "Proof that the raffle is rigged in favor of her friends.",
            whyNot: "That jumps to a cause with no evidence for it. The numbers just aren't there.",
          },
        ],
        correct: 1,
        hint: "Three out of how many?",
        why: "Without the total who entered, three winners could be a tiny share. Anecdotes leave out the denominator.",
      },
      {
        id: "blender",
        kind: "gap",
        prompt: "What has to be true for the quotes to support the conclusion?",
        reason: "Every customer quoted on the website loved the blender.",
        conclusion: "So most customers love the blender.",
        options: [
          {
            text: "Blenders are useful appliances in most home kitchens.",
            whyNot: "True, but it doesn't connect the quoted customers to all customers.",
          },
          {
            text: "The website is well designed and easy to read on a phone.",
            whyNot: "Good design doesn't tell you how the quotes were chosen.",
          },
          { text: "The quoted customers are typical of all the customers." },
        ],
        correct: 2,
        hint: "Who chooses which quotes appear on a website?",
        why: "Quotes on a store's own site are picked by the store. The argument only works if they represent everyone, which nothing shows.",
      },
      {
        id: "library",
        kind: "builder",
        prompt:
          "Build the argument that uses data. One piece is a moving story that can't carry it.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Data" },
        ],
        pieces: [
          { id: "pc", text: "The library should buy more large-print books.", role: "conclusion" },
          { id: "pp", text: "Many members struggle with small print.", role: "premise" },
          {
            id: "pe",
            text: "Large-print titles were borrowed four times as often per copy.",
            role: "evidence",
          },
          {
            id: "px",
            text: "One member wrote a moving letter about her eyesight.",
            role: null,
            note: "A moving letter is one case. It can't show how many members are affected.",
          },
        ],
        hint: "Which piece counts many cases?",
        why: "Loan figures cover every member. The letter is moving, but it's one case and can't carry the argument on its own.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A vivid story and a set of records. What can they tell you together?",
        stimulus:
          "A local paper's front page tells the story of Maeve, 34, who got sick after eating at the new street food market. The same week, city records show the market's stands passed all 22 inspections this year, and reports of food poisoning in town are no higher than usual.",
        options: [
          {
            text: "The market is dangerous, because Maeve's story is detailed and recent.",
            whyNot:
              "Detail and recency make a story memorable, not typical. One case can't show the market is riskier than anywhere else.",
          },
          {
            text: "Maeve's story must be false, because the inspections were all passed.",
            whyNot:
              "Passing inspections doesn't mean nobody can ever get sick. The records don't contradict her story.",
          },
          {
            text: "Nothing at all, because one story and a set of records cancel out.",
            whyNot:
              "They don't cancel out. They answer different questions: whether something happened, and how common it is.",
          },
          {
            text: "Illness can happen there, but nothing shows it's more common than elsewhere.",
          },
        ],
        correct: 3,
        hint: "What can one case prove? What do the records say about how often it happens?",
        why: "The story shows illness can follow a meal at the market. The records cover every inspection and every report in town, and show nothing unusual. Together: a real case, no sign of a pattern.",
      },
    ],
  },

  "evidence-source-reliability": {
    lessonId: "evidence-source-reliability",
    takeaway: "Ask who knows, who pays, who has been right, and who agrees.",
    written: {
      prompt: "Judge how reliable the source is, using expertise, incentives and track record.",
      passage:
        "A report titled “Gas Prices Are Fair” was published by the Bayview Fuel Association, a group funded by gas station owners. Its author, a respected economist, has written on fuel markets for twenty years but was paid for this report. The report includes forty pages of tables and no independent review.",
      guidance:
        "Say what the source knows, what it stands to gain, and what would help you trust it.",
    },
    steps: [
      {
        id: "battery",
        kind: "stronger",
        label: "Which source is more reliable?",
        noun: "Source",
        prompt: "Both sources say a phone battery lasts two days. Which is more reliable?",
        a: "An ad from the phone's maker: “Two full days on one charge!”",
        b: "An independent lab that tested 20 phones and published its method and results.",
        stronger: "b",
        factor: "Independent, and shows its method",
        weakerWhy:
          "The maker profits if you believe it, and the ad shows no test. It may be true, but the ad gives you no reason to think so.",
        hint: "Who gains if you believe each one?",
        why: "A reliable source is independent of the result and shows how it knows. An advertiser has a stake and shows nothing.",
      },
      {
        id: "sources",
        kind: "sort",
        prompt: "Sort each source: a good reason to trust it, or a reason to be careful.",
        buckets: [
          { id: "trust", label: "Good reason to trust" },
          { id: "careful", label: "Reason to be careful" },
        ],
        items: [
          {
            id: "1",
            text: "A doctor with no ties to the drug company, citing published trials.",
            bucket: "trust",
            why: "Relevant expertise, no stake, and evidence anyone can check.",
          },
          {
            id: "2",
            text: "A sponsored post: “I only recommend what I truly love!”",
            bucket: "careful",
            why: "The sponsor pays for the praise, so it would say this either way.",
          },
          {
            id: "3",
            text: "A forum post about bridge safety, with no name and no sources.",
            bucket: "careful",
            why: "No sign of expertise or where the claim comes from.",
          },
          {
            id: "4",
            text: "A city engineer's inspection report, signed, dated and open to review.",
            bucket: "trust",
            why: "Expertise, accountability and something others can check.",
          },
          {
            id: "5",
            text: "A confident post that thousands of people have shared.",
            bucket: "careful",
            why: "Shares show popularity, not that the post is right.",
          },
        ],
        hint: "Does the source know the subject, gain from the answer, and show its work?",
        why: "Trust follows knowledge, independence and openness, not confidence, popularity or polish.",
      },
      {
        id: "incentive",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "Dr. Alder, a well-known cardiologist, is paid by Lumen Candy to say sugar is harmless. How should you treat her statement?",
        options: [
          {
            text: "Accept it: she's an expert, so what she says is true.",
            whyNot:
              "Expertise matters, but pay gives her a reason to say it. Check independent sources.",
          },
          { text: "Be cautious: her expertise counts, but so does who pays her." },
          {
            text: "Ignore it: experts can never be trusted.",
            whyNot:
              "That goes too far. Expertise still counts. It just needs independent support here.",
          },
        ],
        correct: 1,
        hint: "Two things can be true at once: she knows the subject, and she is paid.",
        why: "Credentials answer “does she know?” but not “does she gain?” A paid expert needs independent confirmation.",
      },
      {
        id: "stake",
        kind: "flaw",
        label: "Find the stake",
        prompt: "Tap the phrase that shows why this source can't settle the question alone.",
        passage: [
          {
            text: "A report from the Bayview Fuel Association, which is funded by gas stations,",
            tappable: true,
            flaw: true,
          },
          {
            text: "finds that gas prices are fair.",
            tappable: true,
            whyNot: "That's the claim being made. The question is who is making it.",
          },
          {
            text: "The report has forty pages of tables.",
            tappable: true,
            whyNot: "Length isn't reliability; tables can be selective.",
          },
        ],
        fallacy: "A source with a stake in the answer",
        hint: "Who benefits if the report says prices are fair?",
        why: "The people who fund the report gain from its conclusion. That doesn't make it false, but it means it needs independent checking.",
      },
      {
        id: "track",
        kind: "choice",
        prompt:
          "Two forecasters warn about this year's floods. Over the last ten years, one called the floods right eight times; the other, three times. Whom do you weigh more?",
        options: [
          {
            text: "The one who is more confident and dramatic.",
            whyNot:
              "Confidence isn't a track record. Loud forecasters can be wrong as often as quiet ones.",
          },
          {
            text: "Both equally, since a forecast is only a forecast.",
            whyNot:
              "A record of being right or wrong is information, so treating them equally throws it away.",
          },
          { text: "The one who was right eight times out of ten." },
        ],
        correct: 2,
        hint: "What has each one actually gotten right before?",
        why: "A track record is evidence about future reliability. It's not a guarantee, but it beats confidence.",
      },
      {
        id: "independent",
        kind: "gap",
        prompt: "What makes agreement from other sources count for something?",
        reason: "Three separate research teams reached the same result.",
        conclusion: "So the result is more likely to be right.",
        options: [
          {
            text: "Research teams enjoy agreeing with each other's results.",
            whyNot:
              "If teams just copy each other, agreement means nothing. That's the opposite of what's needed.",
          },
          { text: "The teams worked independently, so they could have disagreed." },
          {
            text: "Three is a lucky number in scientific research.",
            whyNot: "The number of sources alone isn't what matters. How they got there is.",
          },
        ],
        correct: 1,
        hint: "Would three copies of one report count as three sources?",
        why: "Agreement only counts if the sources could have disagreed. Independent confirmation is worth far more than repeated echoes.",
      },
      {
        id: "pick",
        kind: "stronger",
        label: "Which source do you lean on?",
        noun: "Source",
        prompt: "You want to know if a local bridge is safe. Which source should you lean on more?",
        a: "A neighbor who is sure it's fine because he drives over it daily.",
        b: "The city's structural inspection, carried out by a licensed engineer and open to public view.",
        stronger: "b",
        factor: "Expertise and accountability",
        weakerWhy:
          "Driving over a bridge doesn't tell him about hidden damage. He's sincere, but he isn't in a position to know.",
        hint: "Who is actually placed to know the answer?",
        why: "A good source is placed to know, accountable for what it says, and open to being checked.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Three sources on one question. Who should residents rely on most, and why?",
        stimulus:
          "Is the Coldwater dam safe? The firm that built it says it's “among the safest in the country.” An engineering professor who inspected it last year for the regional water authority found minor cracks that need monitoring. A popular local social media page says it's “about to burst.”",
        options: [
          {
            text: "The builder, because it knows the dam better than anyone else does.",
            whyNot:
              "It knows the dam, but it has a stake in the dam being seen as safe. Its claim needs independent checking.",
          },
          {
            text: "The professor, who has relevant expertise and inspected it independently.",
          },
          {
            text: "The local page, because it is warning people rather than reassuring them.",
            whyNot:
              "A warning isn't more reliable for being alarming. The page shows no expertise and no evidence.",
          },
        ],
        correct: 1,
        hint: "Run the four questions: who knows, who gains, who has been right, and who agrees?",
        why: "The professor has relevant expertise, looked directly and has no stake in the result. The builder has a stake; the page shows no expertise. A careful, measured finding beats both reassurance and alarm.",
      },
    ],
  },

  "evidence-correlation-causation": {
    lessonId: "evidence-correlation-causation",
    takeaway: "Before A causes B, rule out a common cause, the reverse, and coincidence.",
    written: {
      prompt: "Name the specific rival explanation that applies, and say why it fits.",
      passage:
        "In Coral Bay, weeks with higher ice cream sales also have more cases of sunburn. A columnist writes: “The data are clear. Ice cream leads to sunburn, so the city council should ban ice cream stands near the beach.”",
      guidance: "Don't just say “correlation isn't causation.” Name the alternative.",
    },
    steps: [
      {
        id: "beach",
        kind: "cause",
        prompt:
          "Ice cream sales and sunburn rise together. Switch on the hidden variable, then say what is going on.",
        scenario: "Each dot is a day at Coral Bay beach.",
        xLabel: "Ice creams sold",
        yLabel: "Sunburn cases",
        hiddenLabel: "The weather",
        groups: [
          {
            id: "cool",
            label: "Cool days",
            points: [
              [8, 4],
              [9, 2],
              [10, 5],
              [11, 3],
              [13, 5],
              [14, 3],
            ],
          },
          {
            id: "hot",
            label: "Hot days",
            points: [
              [29, 21],
              [30, 25],
              [31, 20],
              [33, 24],
              [34, 21],
              [35, 23],
            ],
          },
        ],
        question: "What best explains the pattern?",
        options: [
          {
            text: "Ice cream causes sunburn, because people who eat it stay in the sun.",
            whyNot: "Inside each kind of day the link disappears, so it isn't the ice cream.",
          },
          { text: "Hot weather drives both ice cream sales and sunburn." },
          {
            text: "Sunburn makes people buy ice cream to cool their skin down.",
            whyNot:
              "Within a kind of day, more sunburn doesn't come with more ice cream, so this doesn't fit either.",
          },
        ],
        correct: 1,
        hint: "What do hot days do to both?",
        why: "Hot weather is a common cause. It raises both ice cream sales and sunburn; inside each kind of day there's no link left.",
      },
      {
        id: "three-rivals",
        kind: "sort",
        prompt: "Sort each explanation by the rival it offers to “A causes B.”",
        buckets: [
          { id: "common", label: "A common cause" },
          { id: "reverse", label: "The reverse" },
          { id: "chance", label: "Coincidence" },
        ],
        items: [
          {
            id: "1",
            text: "Fit people join gyms, so gym-goers being fit isn't because of the gym.",
            bucket: "reverse",
            why: "Being fit may lead to joining, not the other way around.",
          },
          {
            id: "2",
            text: "Ice cream sales and drownings both rise in hot weather, when more people buy ice cream and swim.",
            bucket: "common",
            why: "Hot weather drives both.",
          },
          {
            id: "3",
            text: "Over the last 200 years, the number of pirates fell as global temperatures rose.",
            bucket: "chance",
            why: "Two trends can line up by accident, with nothing linking them.",
          },
          {
            id: "4",
            text: "Children with more books at home read better, and richer families provide both.",
            bucket: "common",
            why: "Family income may drive both the books and the reading.",
          },
        ],
        hint: "Does a third thing drive both, does B drive A, or is it luck?",
        why: "Before accepting “A causes B,” check the three rivals: a common cause, the reverse direction, and coincidence.",
      },
      {
        id: "reverse",
        kind: "gap",
        prompt: "What would have to be true for “A causes B” to be the better story?",
        reason: "Students who use the school library more get better grades.",
        conclusion: "So using the library raises grades.",
        options: [
          {
            text: "Libraries are pleasant places to be, especially in winter.",
            whyNot: "That doesn't connect library use to grades.",
          },
          {
            text: "Books are cheaper to borrow than to buy at a store.",
            whyNot: "True, but it doesn't say which way the link runs.",
          },
          { text: "Students don't use the library more because they already do well." },
        ],
        correct: 2,
        hint: "Could better students be the ones who go to the library?",
        why: "The argument assumes the link runs from library to grades. If strong students are simply the ones who visit, it runs the other way.",
      },
      {
        id: "coffee",
        kind: "flaw",
        label: "Find the rival",
        prompt: "Tap the phrase that treats a link as a cause.",
        passage: [
          {
            text: "Staff at Northfield Bank who drink three coffees a day earn more,",
            tappable: true,
            whyNot: "That may be accurate. The pattern isn't the problem.",
          },
          { text: "so" },
          { text: "coffee makes you more successful.", tappable: true, flaw: true },
          {
            text: "Management should hand out more free coffee.",
            tappable: true,
            whyNot: "This is the action they want. The problem is the step before.",
          },
        ],
        fallacy: "A link treated as a cause",
        hint: "What might drive both coffee and pay?",
        why: "Senior staff work longer hours and may drink more coffee, so seniority could drive both. The data alone can't say.",
      },
      {
        id: "which-rival",
        kind: "confidence",
        prompt: "Choose the rival that best fits, then say how sure you are.",
        question: "Towns with more storks have more babies born. Which explanation fits best?",
        options: [
          {
            text: "Storks deliver babies, so more storks means more births in a town.",
            whyNot:
              "No mechanism links storks to births, and the pattern has an easier explanation.",
          },
          {
            text: "Babies attract storks to the nearby towns where they are born.",
            whyNot:
              "There's no reason babies would attract storks, so the reverse story doesn't fit.",
          },
          {
            text: "Larger towns have more of both: more people and more nesting places.",
          },
        ],
        correct: 2,
        hint: "What is bigger in a big town?",
        why: "Town size is a common cause: bigger towns have more people and more nesting places. The stork–baby link is a classic confounder.",
      },
      {
        id: "size",
        kind: "stronger",
        label: "Which conclusion is better supported?",
        noun: "Conclusion",
        prompt:
          "Sleep hours and grades rise together. Which conclusion do the data support better?",
        a: "More sleep raises grades.",
        b: "Sleep and grades go together; the data can't say which, if either, causes the other.",
        stronger: "b",
        factor: "It claims no more than the data show",
        weakerWhy:
          "Students who are calmer, healthier or less stressed may both sleep more and do better, so the data alone don't show sleep is the cause.",
        hint: "Which one goes no further than the numbers?",
        why: "A link supports “these go together.” Saying one causes the other needs more, such as an experiment or ruling out rivals.",
      },
      {
        id: "test",
        kind: "choice",
        prompt: "How could a school test whether a homework club raises grades?",
        options: [
          {
            text: "Compare grades of students who chose to attend with those who didn't.",
            whyNot:
              "Motivated students choose to attend, so any gap could just reflect who they are.",
          },
          {
            text: "Randomly invite half the eligible students, then compare grades next semester.",
          },
          {
            text: "Ask attendees whether they think it helped.",
            whyNot:
              "Opinions of people who chose to go say little about what changed their grades.",
          },
        ],
        correct: 1,
        hint: "Which design decides who attends by chance, not by choice?",
        why: "Random invitations make the groups alike in everything except the club, which is what lets a grade gap point at the club.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "A study, an ad and a detail in the small print. Which rival explanation fits best?",
        stimulus:
          "A study of 2,000 office workers finds that those with standing desks take fewer sick days. A furniture company's ad says: “Standing desks keep you healthy.” In the study, standing desks went mostly to staff in newer offices, who were also younger on average.",
        options: [
          {
            text: "Reverse causation: being out sick makes people choose sitting desks.",
            whyNot:
              "Possible in principle, but the study says who got the desks: staff in newer offices. That points at a different rival.",
          },
          {
            text: "Coincidence: with 2,000 people, links like this turn up by chance.",
            whyNot:
              "With 2,000 people a chance link is less likely, and the study names a better candidate: age and office.",
          },
          {
            text: "A common cause: younger staff in newer offices may get sick less anyway.",
          },
        ],
        correct: 2,
        hint: "Look at who got the standing desks. Is there something about them that could cut sick days on its own?",
        why: "Age and newer offices could reduce sick days whether or not anyone stands. That common cause has to be ruled out, by comparing similar staff, before the desks get the credit.",
      },
    ],
  },

  "evidence-sample-cherry-picking": {
    lessonId: "evidence-sample-cherry-picking",
    takeaway: "Ask who was counted and who was left out.",
    written: {
      prompt:
        "Say what is wrong with how the sample was chosen, and what a better one would look like.",
      passage:
        "A gym advertises: “Members lost an average of 24 pounds!” The figure comes from 30 members who entered a transformation contest and stayed the full 12 weeks. The gym has 1,400 members, and does not say how many joined the contest or how many dropped out.",
      guidance: "Think about who is missing from the figure.",
    },
    steps: [
      {
        id: "reviews",
        kind: "stronger",
        label: "Which sample is better?",
        noun: "Survey",
        prompt:
          "Two surveys ask whether a new library app is easy to use. Which sample gives the better picture?",
        a: "Users who chose to leave a review in the app store: 92% said it was easy.",
        b: "500 library members picked at random and asked directly: 71% said it was easy.",
        stronger: "b",
        factor: "Chosen at random, not self-selected",
        weakerWhy:
          "People who bother to review are often the ones with strong feelings, so the reviews tilt away from the typical user, even though the number is more flattering.",
        hint: "Who decided to be included?",
        why: "A sample that picks itself tilts toward eager people. A random one gives everyone the same chance, even if the result is less flattering.",
      },
      {
        id: "small",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "You flip a coin 10 times and get 8 heads. A friend flips the same coin 1,000 times and gets 520 heads. Which result says more about whether the coin is fair?",
        options: [
          {
            text: "The 10 flips: 80% heads is a strong signal that the coin is biased.",
            whyNot:
              "With so few flips, 8 out of 10 happens by chance fairly often. Small samples swing widely.",
          },
          { text: "The 1,000 flips: 52% is close to fair and much less likely to be a fluke." },
          {
            text: "Both equally, since heads came up more often than tails in each.",
            whyNot: "Sample size matters. Ten flips can't tell you what a thousand can.",
          },
        ],
        correct: 1,
        hint: "Which sample could be thrown off by a few lucky flips?",
        why: "Small samples swing wildly by chance. A larger sample settles closer to the truth, and 52% is close to what a fair coin gives.",
      },
      {
        id: "survivors",
        kind: "flaw",
        label: "Find who's missing",
        prompt: "Tap the phrase where the sample leaves out the people who could disagree.",
        passage: [
          {
            text: "Every founder we interviewed at the Alder Valley startup fair (which only invited companies still in business)",
            tappable: true,
            flaw: true,
          },
          { text: "said that" },
          {
            text: "taking big risks is the secret to success.",
            tappable: true,
            whyNot: "That's their conclusion. The trouble is who was asked.",
          },
          {
            text: "We recommend that everyone take big risks.",
            tappable: true,
            whyNot: "That's the advice. The flaw comes earlier, in who was asked.",
          },
        ],
        fallacy: "Survivorship: only the survivors were asked",
        hint: "Who isn't at a fair for companies still in business?",
        why: "Every founder who took big risks and failed isn't there to say so. Asking only survivors makes risk look like the reason they survived.",
      },
      {
        id: "picking",
        kind: "sort",
        prompt: "Sort each report: does it show a fair picture, or has something been picked?",
        buckets: [
          { id: "fair", label: "Fair picture" },
          { id: "picked", label: "Something picked" },
        ],
        items: [
          {
            id: "1",
            text: "“Sales rose at our Elm Street, Mill Road and Harbor Point stores.” (The chain has nine.)",
            bucket: "picked",
            why: "Three good stores were chosen; the other six were left out.",
          },
          {
            id: "2",
            text: "“Across all 9 stores, sales rose 4% on average; 5 rose and 4 fell.”",
            bucket: "fair",
            why: "It covers every store and shows both directions.",
          },
          {
            id: "3",
            text: "“Our best month ever: sales up 30%!” (No other months shown.)",
            bucket: "picked",
            why: "One best month is a peak, not a trend.",
          },
          {
            id: "4",
            text: "“Sales by month for the last two years” with a chart of all 24 months.",
            bucket: "fair",
            why: "Every month is shown, so the picture can't hide the bad ones.",
          },
        ],
        hint: "Can you see all the cases, or just the good ones?",
        why: "A fair report shows the whole set. A picked one shows the best cases and hides the rest.",
      },
      {
        id: "gym",
        kind: "gap",
        prompt: "What has to be true for the gym's figure to describe members in general?",
        reason: "Contest entrants who finished lost 24 pounds on average.",
        conclusion: "So members typically lose 24 pounds.",
        options: [
          {
            text: "Contests are fun to enter and to watch, and members love them.",
            whyNot: "That has nothing to do with whether the entrants are typical.",
          },
          {
            text: "The gym has many members and is well liked in the town.",
            whyNot: "Size and popularity don't make the contest finishers typical.",
          },
          { text: "The finishers are typical of all members, including those who quit." },
        ],
        correct: 2,
        hint: "Who is missing from the figure?",
        why: "Only motivated members who stuck it out are counted. The conclusion needs them to represent everyone, and nothing suggests they do.",
      },
      {
        id: "worse",
        kind: "choice",
        prompt:
          "Which is the better sample for “how satisfied are our customers?” even though it looks worse?",
        options: [
          {
            text: "200 customers picked at random from all who bought this year: 64% satisfied.",
          },
          {
            text: "3,000 customers who filled out the optional form at the register: 91% satisfied.",
            whyNot:
              "It's bigger, but customers chose themselves, so it's tilted toward those with something to say.",
          },
          {
            text: "40 customers chosen by the manager: 98% satisfied.",
            whyNot: "The manager decided who was asked, so it can tilt toward happy customers.",
          },
        ],
        correct: 0,
        hint: "Who chose who was counted?",
        why: "A smaller random sample beats a bigger self-selected one, because the way people get in matters more than how many there are.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Read the small print. What's the biggest problem with “9 out of 10 customers”?",
        stimulus:
          "A coffee chain's ad: “9 out of 10 customers prefer our new blend!” The small print: 50 customers at the flagship cafe were offered a free taste of each blend; 30 agreed, and 27 of those chose the new one.",
        options: [
          {
            text: "It counts only 30 volunteers at one cafe, not customers in general.",
          },
          {
            text: "27 out of 30 is exactly 90%, so the figure is actually fine.",
            whyNot:
              "The arithmetic is right. The problem is who those 30 were: volunteers at one cafe.",
          },
          {
            text: "Taste tests can never tell you anything useful about coffee.",
            whyNot: "Too sweeping. A fair taste test with a proper sample could tell you a lot.",
          },
          {
            text: "The new blend was probably more expensive to make.",
            whyNot:
              "Perhaps, but cost has nothing to do with whether the figure describes customers.",
          },
        ],
        correct: 0,
        hint: "Who was counted? How did they get into the sample, and where?",
        why: "The figure comes from 30 people who chose to take part at one cafe. They may differ from customers elsewhere, so “9 out of 10 customers” claims far more than the sample shows.",
      },
    ],
  },
};

export default evidence;
