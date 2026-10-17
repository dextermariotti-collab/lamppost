import type { LessonScript } from "@/lib/steps/types";

/**
 * Unit 3: Logical fallacies. All names, places and products are made up.
 */
const fallacies: Record<string, LessonScript> = {
  "fallacies-adhominem-strawman": {
    lessonId: "fallacies-adhominem-strawman",
    takeaway: "A real rebuttal answers what was said, however bluntly.",
    written: {
      prompt:
        "Say whether the reply is a fair rebuttal, an attack on the person, or a strawman, and why.",
      passage:
        "Sam: “I think we should try starting school ten minutes later for a term, then look at the attendance figures.” Ola: “So you want the whole school to sleep through half the morning? That's ridiculous. And of course you'd say that; you're never on time yourself.”",
      guidance: "There may be more than one problem in the reply.",
    },
    steps: [
      {
        id: "sort",
        kind: "sort",
        prompt:
          "Sort each reply: a fair rebuttal, an attack on the person, or a distorted version of the claim.",
        buckets: [
          { id: "fair", label: "A fair rebuttal" },
          { id: "person", label: "Attacks the person" },
          { id: "distorts", label: "Distorts the claim" },
        ],
        items: [
          {
            id: "1",
            text: "“Your plan cuts two bus stops, so riders will walk further. What's your evidence they won't mind?”",
            bucket: "fair",
            why: "It addresses what the plan actually does and asks for evidence.",
          },
          {
            id: "2",
            text: "“You can't trust her plan. She doesn't even own a car.”",
            bucket: "person",
            why: "Whether she owns a car says nothing about whether the plan works.",
          },
          {
            id: "3",
            text: "Tomas: “Let's trim the bus schedule slightly.” Lena: “So you want to scrap buses altogether?”",
            bucket: "distorts",
            why: "Tomas said “trim slightly.” Lena swapped in “scrap altogether,” which is easy to attack.",
          },
          {
            id: "4",
            text: "“That's a blunt way to put it, but your figures are wrong: buses are 90% full at peak.”",
            bucket: "fair",
            why: "Blunt, yes, but it goes at the claim and gives a reason.",
          },
          {
            id: "5",
            text: "“Of course he defends the plan. He just wants a promotion.”",
            bucket: "person",
            why: "It assumes a motive and never answers the argument.",
          },
        ],
        hint: "Does the reply engage with what was actually said?",
        why: "A rebuttal answers the argument as it was made. Attacking the person or swapping in an easier version avoids the argument.",
      },
      {
        id: "distort",
        kind: "flaw",
        label: "Find the distortion",
        prompt: "Tap the reply that swaps the claim for an easier one to knock down.",
        passage: [
          {
            text: "Sam says schools could start ten minutes later.",
            tappable: true,
            whyNot: "That's Sam's actual claim. The distortion comes in the reply.",
          },
          { text: "Ola replies:" },
          {
            text: "“So you want children to sleep through half the school day.”",
            tappable: true,
            flaw: true,
          },
          {
            text: "Ola then asks the council to say no.",
            tappable: true,
            whyNot:
              "That's the outcome. The distortion is earlier, in how the claim was described.",
          },
        ],
        fallacy: "Strawman: an exaggerated version of the claim",
        hint: "Compare what Sam said with what Ola says Sam said.",
        why: "Ten minutes isn't “half the school day.” Ola attacked a version nobody proposed, and left the real claim untouched.",
      },
      {
        id: "person",
        kind: "choice",
        prompt:
          "Priya argues the library should open later. Which reply attacks the person, not the argument?",
        options: [
          {
            text: "“Evening staff would cost more than the extra visitors would repay.”",
            whyNot: "That answers her argument with a cost claim, which is a fair rebuttal.",
          },
          { text: "“Priya only wants late opening because she never finishes her work on time.”" },
          {
            text: "“Your estimate of evening visitors looks high. Where did you get it from?”",
            whyNot: "That is a fair challenge to her evidence.",
          },
        ],
        correct: 1,
        hint: "Which reply would still be the same if a different person had made the argument?",
        why: "The reply talks about Priya, not about opening hours. Whether she is punctual has no bearing on whether the library should open later.",
      },
      {
        id: "engage",
        kind: "stronger",
        label: "Which reply engages the claim?",
        noun: "Reply",
        prompt:
          "Kofi says: “Let's trial a lighter homework load for one month.” Which reply engages with what he said?",
        a: "“So you want kids to do no homework and learn nothing?”",
        b: "“A month is short. How would we tell in that time whether grades were affected?”",
        stronger: "b",
        factor: "It answers what was actually said",
        weakerWhy:
          "Kofi said “lighter,” not “none.” The reply swaps in an extreme version that's easy to knock down.",
        hint: "Which reply would Kofi recognize as answering him?",
        why: "A good reply deals with the claim as stated. It can challenge it hard, but it starts from what was actually said.",
      },
      {
        id: "blunt",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "“That claim is nonsense, and here is the survey that contradicts it.” Is this an ad hominem?",
        options: [
          {
            text: "Yes: calling a claim nonsense is an attack.",
            whyNot:
              "Harsh wording isn't a fallacy. It is aimed at the claim, and a reason follows.",
          },
          {
            text: "Yes: it never mentions the speaker's good points.",
            whyNot:
              "Not praising the speaker isn't a fallacy either. The reply still answers the claim.",
          },
          { text: "No: it is blunt, but it goes at the claim and offers evidence." },
        ],
        correct: 2,
        hint: "Is the target the person or the claim?",
        why: "Ad hominem means going after the person instead of the argument. Blunt language aimed at a claim, with evidence, is a legitimate rebuttal.",
      },
      {
        id: "answer",
        kind: "gap",
        prompt: "What must be true for Lena's reply to count as an answer?",
        reason: "Lena replied to a version of Tomas's claim that he never made.",
        conclusion: "So Lena hasn't answered Tomas's argument.",
        options: [
          {
            text: "Lena disagrees with Tomas about most things, most of the time.",
            whyNot: "General disagreement doesn't decide whether this reply answers this claim.",
          },
          { text: "A reply only answers a claim if it responds to the claim actually made." },
          {
            text: "Tomas is more experienced than Lena at debating in public.",
            whyNot: "Experience has no bearing on whether her reply addressed his claim.",
          },
        ],
        correct: 1,
        hint: "What does “answering” someone require?",
        why: "A rebuttal counts only if it meets the argument on its own terms. Beating a different argument leaves the real one standing.",
      },
      {
        id: "fair",
        kind: "choice",
        prompt: "Which reply fairly challenges: “We should trim the bus schedule slightly”?",
        options: [
          {
            text: "“Trimming buses is the first step to abandoning them, so no.”",
            whyNot: "That treats “slightly” as the start of “scrap,” which Tomas never said.",
          },
          {
            text: "“You always cut things, so nobody should listen to your plans.”",
            whyNot: "That is about Tomas's habits, not this plan.",
          },
          { text: "“Which routes would you trim, and how many riders use them now?”" },
        ],
        correct: 2,
        hint: "Which reply deals with what is actually proposed?",
        why: "It asks for the details of the proposal, which is exactly what a serious reply to “trim slightly” needs.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "Four replies to the same post. Which one is a fair rebuttal?",
        stimulus:
          "The post: “Our town should trial closing Market Street to cars on Saturdays, for three months, and count shoppers before and after.”",
        options: [
          {
            text: "“Typical of someone who doesn't run a shop to want this.”",
            whyNot: "That's about the poster, not the proposal: an ad hominem.",
          },
          {
            text: "“A summer trial will flatter the count. Compare with the same weeks last year.”",
          },
          {
            text: "“So you want to ban cars from town for good? Shops will close.”",
            whyNot:
              "A strawman: the post proposed a three-month Saturday trial, not a permanent ban.",
          },
          {
            text: "“I respect your view, but banning all traffic everywhere goes too far.”",
            whyNot: "Polite, but still a strawman. Nobody proposed banning all traffic everywhere.",
          },
        ],
        correct: 1,
        hint: "Hold each reply up against the post. Which one deals with the trial as it was actually proposed?",
        why: "It's blunt, but it engages the actual proposal: a three-month trial with a count. The others swap in the poster's job or a bigger, easier claim. Politeness doesn't make a strawman fair.",
      },
    ],
  },

  "fallacies-dilemma-slippery-slope": {
    lessonId: "fallacies-dilemma-slippery-slope",
    takeaway: "Look for the third option, and for the link nobody supported.",
    written: {
      prompt: "Name the problem in the argument and suggest what a fairer version would say.",
      passage:
        "Principal Alder: “Either we ban phones in class entirely, or exam results will collapse. There's no other way. And once one student is allowed to check a message, everyone will, and soon no lesson will happen at all.”",
      guidance: "There are two problems here: one about options, one about a chain of events.",
    },
    steps: [
      {
        id: "either-or",
        kind: "flaw",
        label: "Find the false choice",
        prompt: "Tap the phrase that shuts out other options.",
        passage: [
          {
            text: "Principal: “Either we ban phones in class entirely",
            tappable: true,
            whyNot: "That is one of the two options offered. The trouble is that only two are.",
          },
          {
            text: "or exam results will collapse.",
            tappable: true,
            whyNot: "That is the other option offered. It's the “only two” that's the problem.",
          },
          { text: "There's no other way.”", tappable: true, flaw: true },
        ],
        fallacy: "False dilemma: a hidden third option",
        hint: "Which phrase claims the list is complete?",
        why: "Claiming there's no other way hides everything in between. Phones in bags during lessons, for instance, is neither of the two options.",
      },
      {
        id: "third",
        kind: "choice",
        prompt: "Which is a genuine third option the principal left out?",
        options: [
          {
            text: "Ban phones and also ban tablets and smartwatches.",
            whyNot: "That is a bigger ban, not another route between the two.",
          },
          {
            text: "Let students use their phones whenever they like all day.",
            whyNot: "That is the opposite extreme, not a middle path.",
          },
          { text: "Phones stay in bags during lessons and can be used at break." },
        ],
        correct: 2,
        hint: "Look between “ban entirely” and “no limits.”",
        why: "Most real choices have middle ground. A false dilemma presents two extremes as if nothing lay between them.",
      },
      {
        id: "slope-sort",
        kind: "sort",
        prompt: "Sort each chain of consequences: is every step supported, or just asserted?",
        buckets: [
          { id: "supported", label: "Each step is supported" },
          { id: "asserted", label: "Steps are just asserted" },
        ],
        items: [
          {
            id: "1",
            text: "“Allow one late homework and soon nobody will hand in anything.”",
            bucket: "asserted",
            why: "Nothing shows why one exception leads to the next, or to the end.",
          },
          {
            id: "2",
            text: "“The river rises 20 cm a day. That reaches the wall on Friday and the road on Saturday.”",
            bucket: "supported",
            why: "Each step follows from a measurement anyone can check.",
          },
          {
            id: "3",
            text: "“One extra cake stall means the fair will turn into a supermarket.”",
            bucket: "asserted",
            why: "It jumps to an extreme with no link between the stages.",
          },
          {
            id: "4",
            text: "“Studies link late screen use to later sleep, and less sleep to lower test scores. So a screen habit at midnight will probably hurt scores.”",
            bucket: "supported",
            why: "Each link is backed by evidence, and the conclusion says “probably.”",
          },
        ],
        hint: "Is there a reason for each step, or only a leap?",
        why: "A chain of consequences is fine if each link is backed. The fault is asserting links nobody supports.",
      },
      {
        id: "real-slope",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "“The dam crack widens by 1 mm a week, per the engineers' measurements. Left alone, it will fail within a year.” Is this a fallacious slippery slope?",
        options: [
          {
            text: "Yes: it predicts a disaster after a small start.",
            whyNot:
              "A chain isn't a fallacy just because it ends badly. The steps here rest on measurements.",
          },
          { text: "No: each step rests on measurement, so the chain is supported." },
          {
            text: "Yes: any prediction about the future is a slippery slope.",
            whyNot:
              "Predictions can be well supported. Fallacious slopes are the ones with unsupported links.",
          },
        ],
        correct: 1,
        hint: "Ask whether each step is backed, not how dramatic the end is.",
        why: "Some slopes are real. The fault is unsupported links, not length or a bad outcome.",
      },
      {
        id: "chain",
        kind: "stronger",
        label: "Which chain is better supported?",
        noun: "Chain",
        prompt:
          "Both argue a small change leads to a big one. Which chain of steps is better supported?",
        a: "If students choose their seats, soon they'll choose their lessons, then their exams, and school will end.",
        b: "If the council removes the crossing, more people will cross the busy road, and at similar crossings elsewhere injuries rose when this happened.",
        stronger: "b",
        factor: "Its steps rest on evidence",
        weakerWhy:
          "Each step is simply declared: nothing shows that choosing seats leads to choosing exams, let alone to school ending.",
        hint: "Which one gives a reason for each step?",
        why: "A supported chain gives reasons for the links, often with a comparison. An unsupported one only says it will happen.",
      },
      {
        id: "dilemma-2",
        kind: "flaw",
        label: "Find the false choice",
        prompt: "Tap the line that forces an all-or-nothing choice.",
        passage: [
          {
            text: "Join the chess club",
            tappable: true,
            whyNot: "Joining is a fine suggestion. The problem is the ultimatum after it.",
          },
          { text: "or" },
          { text: "admit you don't enjoy thinking.", tappable: true, flaw: true },
          {
            text: "The club meets on Thursdays.",
            tappable: true,
            whyNot: "A plain fact about the club, not part of the problem.",
          },
        ],
        fallacy: "False dilemma",
        hint: "What other reasons could someone have for not joining?",
        why: "Plenty of people enjoy thinking and still don't join a club: busy evenings, other hobbies, a different kind of game.",
      },
      {
        id: "rewrite",
        kind: "choice",
        prompt: "Which rewrite removes the false dilemma?",
        stimulus: "“Either the council builds a parking lot, or the town center dies.”",
        options: [
          {
            text: "The council must build a parking lot, because otherwise the town center will surely die.",
            whyNot: "Same two options, only reworded. The town center could survive in other ways.",
          },
          {
            text: "A parking lot is one way to help; better buses or cheaper parking nearby might do it too.",
          },
          {
            text: "Only a parking lot, and nothing else, can possibly save the town center.",
            whyNot:
              "That makes the claim stronger, not fairer, and still shuts out the alternatives.",
          },
        ],
        correct: 1,
        hint: "Which version leaves room for other options?",
        why: "A fair version says what a parking lot would do and admits there are other routes to the same goal.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "This message uses a chain and an either/or. What would a fair reply say?",
        stimulus:
          "From the Riverside Tenants' Association: “If we accept the landlord's plan to fit smart meters, next they'll monitor our water use, then they'll fine us for long showers, and before long we'll have no privacy at all. Either we refuse the meters or we give up our privacy for good.”",
        options: [
          {
            text: "The message is right: one change always leads to the next, so refuse.",
            whyNot:
              "“Always” is exactly the unsupported link. Some changes lead on and many don't, and the message gives no reason this one will.",
          },
          {
            text: "The message is wrong, because landlords never misuse tenants' data.",
            whyNot:
              "That's an unsupported claim the other way. The fair move is to ask for support for each link.",
          },
          {
            text: "Each step needs a reason, and meters with limits on data use are an option.",
          },
        ],
        correct: 2,
        hint: "There are two problems here: a chain and an either/or. What would fix each one?",
        why: "The chain jumps from meters to fines with no support for any link, and the either/or hides middle options, such as meters with written limits on data use. A fair reply asks for both.",
      },
    ],
  },

  "fallacies-authority-popularity": {
    lessonId: "fallacies-authority-popularity",
    takeaway: "Good authority is relevant, evidenced and checkable; fame and headcount aren't.",
    written: {
      prompt: "Say which appeals in the passage are good reasoning and which are not, and why.",
      passage:
        "For the new playground surface, the council cites three things. (1) A structural engineers' institute reviewed the design and published its tests. (2) A famous athlete says he “loves it.” (3) “Everyone in town is talking about it, so it must be good.”",
      guidance: "Judge each of the three separately.",
    },
    steps: [
      {
        id: "sort",
        kind: "sort",
        prompt: "Sort each appeal: a good reason to believe, or not.",
        buckets: [
          { id: "good", label: "A good reason" },
          { id: "not", label: "Not a good reason" },
        ],
        items: [
          {
            id: "1",
            text: "Bridge engineers agree the design is safe, and their published analysis is open to review.",
            bucket: "good",
            why: "Relevant expertise plus evidence anyone can check.",
          },
          {
            id: "2",
            text: "A famous athlete says a brand of pills cures back pain.",
            bucket: "not",
            why: "Fame isn't expertise in medicine.",
          },
          {
            id: "3",
            text: "Millions of people use the app, so it must work well.",
            bucket: "not",
            why: "Popularity shows people use it, not that it works.",
          },
          {
            id: "4",
            text: "A dentists' association reviewed 40 studies and recommends fluoride toothpaste.",
            bucket: "good",
            why: "Relevant experts, a review of the evidence, and a stated basis.",
          },
          {
            id: "5",
            text: "Our chief executive is very confident this is safe.",
            bucket: "not",
            why: "Confidence and a job title aren't evidence.",
          },
        ],
        hint: "Is the source relevant to the claim, and does it show its basis?",
        why: "Citing relevant experts who show their work is good reasoning. Citing fame, confidence or headcount isn't.",
      },
      {
        id: "crowd",
        kind: "flaw",
        label: "Find the appeal to the crowd",
        prompt: "Tap the phrase that treats popularity as proof.",
        passage: [
          {
            text: "Everyone at school is buying the Zorbo scooter,",
            tappable: true,
            whyNot: "That may be true. Sales aren't the problem; what is drawn from them is.",
          },
          { text: "so" },
          { text: "it must be the best scooter.", tappable: true, flaw: true },
          {
            text: "Mia has saved up for one.",
            tappable: true,
            whyNot: "A plain fact about Mia, not a reason.",
          },
        ],
        fallacy: "Appeal to popularity",
        hint: "Does buying something show it is good?",
        why: "People buy things for many reasons: advertising, friends, price. Sales show popularity, not quality.",
      },
      {
        id: "field",
        kind: "gap",
        prompt: "What has to be true for the expert's word to settle this?",
        reason: "Dr. Ines, a heart surgeon, says the new sneakers are better for your knees.",
        conclusion: "So the sneakers are better for your knees.",
        options: [
          { text: "Expertise in heart surgery carries over to knees and footwear." },
          {
            text: "Doctors are usually well paid for their long years of work.",
            whyNot: "Pay has nothing to do with knowing about sneakers.",
          },
          {
            text: "Trainers are popular among surgeons in the local hospital.",
            whyNot: "Popularity among surgeons doesn't show the sneakers help knees.",
          },
        ],
        correct: 0,
        hint: "Is her expertise about knees?",
        why: "Expertise is specific. A heart surgeon's word carries weight about hearts, and much less about knees and shoes.",
      },
      {
        id: "engineers",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "A structural engineers' institute publishes tests showing a bridge design is unsafe. Is it reasonable to accept that?",
        options: [
          {
            text: "No: appealing to experts is always a fallacy.",
            whyNot: "It isn't. Citing relevant experts who show their evidence is good reasoning.",
          },
          {
            text: "Yes, without looking at the tests: they are experts.",
            whyNot:
              "Even relevant experts should show their basis. Here they do, so check it rather than skip it.",
          },
          { text: "Yes: they are relevant experts and they show their tests." },
        ],
        correct: 2,
        hint: "Both the field and the evidence matter here.",
        why: "Relevant expertise, plus evidence you can inspect, is a good reason. The fallacy is the empty appeal, not the appeal itself.",
      },
      {
        id: "safe",
        kind: "stronger",
        label: "Which is the better reason?",
        noun: "Reason",
        prompt: "Two reasons for believing a new streetcar is safe. Which is better?",
        a: "The streetcar must be safe: thousands of people ride it every day.",
        b: "The streetcar must be safe: it passed an independent inspection last month.",
        stronger: "b",
        factor: "It shows someone checked",
        weakerWhy:
          "Riders show it's popular, not that anyone tested it. Thousands of people can ride something unsafe without knowing.",
        hint: "Which one tells you someone actually checked?",
        why: "An inspection is evidence about safety. Popularity is evidence about popularity.",
      },
      {
        id: "when",
        kind: "choice",
        prompt: "When is citing an expert good reasoning?",
        options: [
          {
            text: "When the expert is famous and speaks confidently.",
            whyNot: "Fame and confidence say nothing about whether they know this subject.",
          },
          {
            text: "When many people repeat what the expert said.",
            whyNot: "Repetition spreads a claim. It doesn't test it.",
          },
          { text: "When the field matches and other experts broadly agree." },
        ],
        correct: 2,
        hint: "Think field and agreement.",
        why: "Relevant expertise plus broad agreement among other experts is strong. A lone voice from another field isn't.",
      },
      {
        id: "spot",
        kind: "flaw",
        label: "Find the weak appeal",
        prompt: "Tap the phrase that leans on status, not evidence.",
        passage: [
          {
            text: "The Kestrel Labs founder, who once won a business award,",
            tappable: true,
            flaw: true,
          },
          {
            text: "says the new water filter removes all harmful substances.",
            tappable: true,
            whyNot: "That's the claim. The issue is what backs it.",
          },
          {
            text: "The filter costs forty dollars.",
            tappable: true,
            whyNot: "A plain fact about the price.",
          },
        ],
        fallacy: "Appeal to status",
        hint: "Does a business award show knowledge about water?",
        why: "An award for running a business doesn't show expertise in water treatment. The claim needs test results, not a title.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "Three reasons to buy a lawn feed. Which gives you the best grounds to believe it works?",
        stimulus:
          "Verdance lawn feed is the country's bestselling lawn feed. TV gardener Ross Ellery says he uses it on his own lawn. And a trial by the independent Grassland Trials Center found lawns treated with it grew thicker than untreated ones.",
        options: [
          {
            text: "It's the bestselling lawn feed in the country by a long way.",
            whyNot:
              "Sales show popularity. People buy for price, habit and ads, not only for results.",
          },
          {
            text: "An independent trial found thicker growth than untreated lawns.",
          },
          {
            text: "A famous TV gardener says he uses it on his own lawn at home.",
            whyNot:
              "He may know gardening, but one lawn isn't a test, and he may be paid. It's an appeal to status.",
          },
        ],
        correct: 1,
        hint: "Which reason is evidence about lawns, rather than about sales or fame?",
        why: "The trial compared treated and untreated lawns, run by a body with no stake in sales. Popularity and a famous name are reasons the product is known, not reasons it works.",
      },
    ],
  },

  "fallacies-circular-reasoning": {
    lessonId: "fallacies-circular-reasoning",
    takeaway: "If the reason just repeats the conclusion, no new reason has arrived.",
    written: {
      prompt:
        "Explain why the argument is circular, and give a non-circular reason for the same conclusion.",
      passage:
        "“The Almanac of Fenwick is always accurate,” says the librarian. “How do you know?” asks a student. “Because it says on page one that every entry has been checked and is accurate.”",
      guidance: "Point at the step that repeats the conclusion.",
    },
    steps: [
      {
        id: "almanac",
        kind: "flaw",
        label: "Find the circle",
        prompt: "Tap the step that only repeats the conclusion.",
        passage: [
          {
            text: "The Book of Alder is always right,",
            tappable: true,
            whyNot: "That's the conclusion. It's the reason that goes round in a circle.",
          },
          { text: "because" },
          { text: "the Book of Alder says it is always right.", tappable: true, flaw: true },
          {
            text: "So you can trust everything in it.",
            tappable: true,
            whyNot: "That's a further conclusion. The circle is in the reason.",
          },
        ],
        fallacy: "Circular reasoning",
        hint: "Does the reason bring anything new?",
        why: "The reason is the conclusion in a different form. If the book's claim is in doubt, quoting the book settles nothing.",
      },
      {
        id: "which",
        kind: "choice",
        prompt: "Which argument is circular?",
        options: [
          {
            text: "The bridge is safe because it passed an independent inspection.",
            whyNot: "The inspection is a separate reason, so this isn't circular.",
          },
          { text: "Ghosts exist, because I have seen things that only ghosts could explain." },
          {
            text: "The bakery is popular because it opens early and sells cheap bread.",
            whyNot:
              "That gives separate reasons (opening hours and price) for its popularity, so it isn't circular.",
          },
        ],
        correct: 1,
        hint: "Which conclusion is smuggled back into its own reason?",
        why: "“Things only ghosts could explain” already assumes ghosts exist. The reason presupposes the conclusion.",
      },
      {
        id: "new-reason",
        kind: "stronger",
        label: "Which brings a new reason?",
        noun: "Argument",
        prompt: "Both claim a vitamin works. Which argument gives a new reason?",
        a: "This vitamin works because it is effective.",
        b: "In a trial, the vitamin group had 30% fewer colds than the placebo group.",
        stronger: "b",
        factor: "It adds evidence",
        weakerWhy:
          "“Effective” means “works.” The sentence says the same thing twice and adds no reason.",
        hint: "Which one could be checked against anything?",
        why: "A good reason is something that could be true or false independently of the conclusion.",
      },
      {
        id: "sort",
        kind: "sort",
        prompt: "Sort each argument: circular, or a genuine reason?",
        buckets: [
          { id: "circular", label: "Circular" },
          { id: "reason", label: "A genuine reason" },
        ],
        items: [
          {
            id: "1",
            text: "“Our rules are fair because our rules are just.”",
            bucket: "circular",
            why: "“Just” and “fair” mean the same, so nothing new is offered.",
          },
          {
            id: "2",
            text: "“The rules are fair because everyone had a chance to comment before they were set.”",
            bucket: "reason",
            why: "It points to something separate that could be checked.",
          },
          {
            id: "3",
            text: "“This news channel is trustworthy because it never reports anything untrue.”",
            bucket: "circular",
            why: "“Never reports anything untrue” is just “trustworthy” again.",
          },
          {
            id: "4",
            text: "“This channel is trustworthy: independent checkers found 98% of its stories accurate.”",
            bucket: "reason",
            why: "An independent test is a separate reason.",
          },
        ],
        hint: "Would the reason still be there if you doubted the conclusion?",
        why: "A genuine reason gives you something separate to check. A circular one hands the conclusion back in other words.",
      },
      {
        id: "build",
        kind: "builder",
        prompt: "Build the argument with a real reason. One piece just repeats the conclusion.",
        slots: [
          { id: "c", role: "conclusion", label: "The claim" },
          { id: "p", role: "premise", label: "A reason" },
          { id: "e", role: "evidence", label: "Something to check" },
        ],
        pieces: [
          { id: "pc", text: "The corner cafe is hygienic.", role: "conclusion" },
          { id: "pp", text: "It is inspected by the council twice a year.", role: "premise" },
          {
            id: "pe",
            text: "Its last three inspection scores were all 5 out of 5.",
            role: "evidence",
          },
          {
            id: "px",
            text: "It keeps everything clean and hygienic.",
            role: null,
            note: "That repeats the conclusion in other words, so it adds no reason.",
          },
        ],
        hint: "Which piece could be true or false without the conclusion?",
        why: "The inspection scores are separate facts. “Clean and hygienic” only says the conclusion again.",
      },
      {
        id: "sure",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "“Jun is a reliable worker because he can always be relied upon.” What is wrong with it?",
        options: [
          {
            text: "It is too short to be a proper argument at all.",
            whyNot: "Length isn't the issue. Its reason and its conclusion say the same thing.",
          },
          {
            text: "It never mentions what Jun's actual job is.",
            whyNot: "A job would add detail, but that isn't what makes the argument fail.",
          },
          { text: "The reason repeats the conclusion in different words." },
        ],
        correct: 2,
        hint: "Compare “reliable” with “can be relied upon.”",
        why: "“Reliable” and “can be relied upon” mean the same. The argument goes in a circle and gives no separate reason.",
      },
      {
        id: "rewrite",
        kind: "choice",
        prompt: "Which rewrite gives a reason that isn't circular?",
        stimulus: "“The captain is the best leader because she leads the team better than anyone.”",
        options: [
          {
            text: "The captain is the best leader because she is the finest leader on the team.",
            whyNot: "Still the same claim twice, with “finest” swapped for “best.”",
          },
          {
            text: "The captain is the best leader because nobody leads the team better than she does.",
            whyNot: "Different words, same meaning. Nothing new has been offered.",
          },
          {
            text: "The captain is the best leader: the team won 11 of 12 games under her, and players say she listens.",
          },
        ],
        correct: 2,
        hint: "Which version offers facts a stranger could check?",
        why: "Wins and what players say are separate facts. They could support or undermine the conclusion, which is what a reason does.",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt: "A site vouches for itself. What would actually support its claim to be unbiased?",
        stimulus:
          "From a review site's About page: “Our reviews are completely unbiased. You can trust that, because we're an independent site that gives honest, impartial verdicts on every product we cover.”",
        options: [
          {
            text: "The site saying again, more firmly, that its verdicts are impartial.",
            whyNot:
              "Repeating “impartial” is the same claim in other words. Saying it louder adds no reason.",
          },
          {
            text: "Lots of readers saying in the comments that they trust the site.",
            whyNot:
              "That shows readers' trust, not whether the site is biased. It's popularity, not a separate check.",
          },
          {
            text: "The site's long list of five-star reviews for big brands.",
            whyNot:
              "That could fit a biased site as easily as a fair one. It doesn't test the claim.",
          },
          {
            text: "Who funds the site, and whether its ratings match independent tests.",
          },
        ],
        correct: 3,
        hint: "Look for a reason that could be checked separately, and could have turned out badly for the site.",
        why: "“Independent” and “impartial” are just “unbiased” again. A real reason is something separate you could check, like funding and agreement with independent tests, which could have shown bias.",
      },
    ],
  },

  "fallacies-hasty-generalization": {
    lessonId: "fallacies-hasty-generalization",
    takeaway: "A general rule needs enough cases, chosen in a way that could have shown it false.",
    written: {
      prompt: "Explain what is too hasty about the conclusion, and what evidence would justify it.",
      passage:
        "On her first day at Hartley Station, Noor was served by two rude waiters. “Hartley people are all rude,” she told her friends. The next week, she asked three of them; two agreed. “See?” she said. “It's confirmed.”",
      guidance: "Think about how many cases there are and how they were picked.",
    },
    steps: [
      {
        id: "corridor",
        kind: "choice",
        prompt:
          "Ines asked four people in one corridor. Three like the new canteen menu. What can she conclude?",
        options: [
          {
            text: "Most students in the whole school like the new menu.",
            whyNot:
              "Four people in one corridor is too few, and they may not represent the school.",
          },
          {
            text: "Nearly everyone at the school likes the new menu for sure.",
            whyNot:
              "That goes further still. Four answers from one spot can't support “nearly everyone.”",
          },
          { text: "Three of four liked it: too few to say much about the school." },
        ],
        correct: 2,
        hint: "How many cases, and how were they picked?",
        why: "Four people from one corridor are a handful, not a sample of the school. They can't support a claim about everyone.",
      },
      {
        id: "late",
        kind: "flaw",
        label: "Find the hasty step",
        prompt: "Tap the step that jumps from two cases to a rule.",
        passage: [
          {
            text: "Our new hire, from Marlow, was late twice this week,",
            tappable: true,
            whyNot: "That is what happened. It's fine to notice.",
          },
          { text: "so" },
          { text: "people from Marlow are always late.", tappable: true, flaw: true },
          {
            text: "We should stop hiring from there.",
            tappable: true,
            whyNot: "That is the action they want. The problem is the step before it.",
          },
        ],
        fallacy: "Hasty generalization",
        hint: "How many people does the evidence cover?",
        why: "One person's lateness can't tell you about a whole town. There could be many reasons, and none is about where she's from.",
      },
      {
        id: "updater",
        kind: "updater",
        prompt: "Does each piece of evidence make the claim more or less likely?",
        claim: "Most students at Fenwick College prefer online classes.",
        prior: 50,
        cards: [
          {
            id: "a",
            text: "Five friends of the survey's author say they prefer online classes.",
            shift: 3,
            note: "It nudges the claim a little, but five friends of the author are a tiny, hand-picked group.",
          },
          {
            id: "b",
            text: "A random survey of 800 Fenwick students finds 72% prefer online classes.",
            shift: 30,
            note: "A large, random sample of the students themselves moves the claim a lot.",
          },
          {
            id: "c",
            text: "A poll of students already enrolled in online-only courses: 88% prefer online.",
            shift: 0,
            note: "These students chose online courses, so of course they like them. It says almost nothing about students in general.",
          },
          {
            id: "d",
            text: "The students' union runs its own random survey of 600 students: 41% prefer online.",
            shift: -15,
            note: "A second large random sample points the other way, so the first result is less certain than it looked.",
          },
        ],
        hint: "How were the students in each group chosen?",
        why: "How a group was picked matters as much as how big it is. A chosen or self-selected group can't speak for everyone.",
      },
      {
        id: "sort",
        kind: "sort",
        prompt: "Sort each conclusion: fair to generalize, or too hasty?",
        buckets: [
          { id: "fair", label: "Fair to generalize" },
          { id: "hasty", label: "Too hasty" },
        ],
        items: [
          {
            id: "1",
            text: "Tests on 5,000 randomly chosen batteries: 2% failed in a year, so about 2% of this model fail.",
            bucket: "fair",
            why: "A big random sample supports a rough general figure.",
          },
          {
            id: "2",
            text: "I met two rude waiters in Hartley, so Hartley waiters are rude.",
            bucket: "hasty",
            why: "Two cases can't describe all waiters in a town.",
          },
          {
            id: "3",
            text: "A random sample of 1,200 shoppers: 38% prefer the app, so roughly 38% of all shoppers do.",
            bucket: "fair",
            why: "Random and large enough for a rough estimate.",
          },
          {
            id: "4",
            text: "One customer complained, so customers hate the new till.",
            bucket: "hasty",
            why: "One complaint isn't a pattern.",
          },
        ],
        hint: "Enough cases, chosen fairly?",
        why: "Generalizing is fine when there are enough cases and they were chosen in a way that could have shown the rule false.",
      },
      {
        id: "sure",
        kind: "confidence",
        prompt: "Choose, then say how sure you are.",
        question:
          "A random survey of 2,000 residents finds 61% support the new library hours. Is it hasty to say “most residents support them”?",
        options: [
          {
            text: "Yes: you can't generalize from any sample, however big.",
            whyNot:
              "Generalizing from a good sample is how surveys work. The fault is too few or unrepresentative cases.",
          },
          {
            text: "Yes: 61% is not the same as all of the residents.",
            whyNot: "The claim was “most,” not “all,” and 61% supports “most.”",
          },
          { text: "No: a large random sample supports “most” reasonably well." },
        ],
        correct: 2,
        hint: "Is the sample big, and is it random?",
        why: "Not every generalization is hasty. A large random sample is exactly what justifies one.",
      },
      {
        id: "stall",
        kind: "gap",
        prompt: "What has to be true for this to follow?",
        reason: "The first three customers at the new stall bought lemonade.",
        conclusion: "So most customers will buy lemonade.",
        options: [
          {
            text: "Lemonade is a popular drink on warm days in the town.",
            whyNot:
              "It might be, but that's about lemonade, not about whether these three are typical.",
          },
          {
            text: "The stall will be open for many days in a row.",
            whyNot: "How long it stays open doesn't make three early customers representative.",
          },
          { text: "The first three customers are typical of all the customers." },
        ],
        correct: 2,
        hint: "Are the first three likely to be like everyone else?",
        why: "Early customers may be friends, or people drawn by one special offer. The conclusion only follows if they are typical.",
      },
      {
        id: "enough",
        kind: "stronger",
        label: "Which claim is safer?",
        noun: "Claim",
        prompt:
          "After 30 test rides, a bike shop says something about its new tires. Which claim is safer?",
        a: "All of our new tires are unbeatable in wet weather.",
        b: "In 30 test rides in the wet, none of the tires slipped, which is encouraging but a small test.",
        stronger: "b",
        factor: "It claims what the tests can support",
        weakerWhy:
          "“All” and “unbeatable” go far beyond 30 rides. The claim promises more than the test could show.",
        hint: "Which one stays within what was tested?",
        why: "A careful claim matches its evidence. Thirty rides can suggest something; they can't back “all” and “unbeatable.”",
      },
      {
        id: "together",
        label: "Putting it together",
        kind: "choice",
        prompt:
          "Two misses against a month of figures. What's the fairest conclusion about the app?",
        stimulus:
          "After two weeks with the new Wayfarer bus app, Dmitri posts: “This app is useless. Twice it showed my bus as two minutes away and it never came.” Wayfarer's own figures say its arrival times were within two minutes on 88% of trips across the city last month.",
        options: [
          {
            text: "It's usually accurate, though Dmitri's misses suggest checking his route.",
          },
          {
            text: "It's useless, because Dmitri's two bad experiences are first-hand.",
            whyNot:
              "First-hand doesn't make two cases enough. They can't outweigh a month of trips across the city.",
          },
          {
            text: "It's perfect, because the company's own figure settles the matter.",
            whyNot:
              "88% isn't perfect, and the figure comes from the company itself. It's worth checking independently.",
          },
        ],
        correct: 0,
        hint: "How many cases is each side going on? And could the misses support a narrower claim?",
        why: "Two misses can't show the app is useless across the city. But they're still data: if they cluster on one route, that's a narrower claim worth checking. The company's figure deserves a check too.",
      },
    ],
  },
};

export default fallacies;
