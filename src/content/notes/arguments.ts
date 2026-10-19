import type { LessonNotes } from "@/lib/lesson-notes";

/** Unit 5: Building arguments. All names, places and products are made up. */
const argumentsNotes: Record<string, LessonNotes> = {
  "arguments-premise-conclusion": {
    lessonId: "arguments-premise-conclusion",
    hook: "Arguments in the wild are messy: points out of order, reasons mixed with scene-setting, the conclusion halfway down. Laying one out plainly is the first step to judging it.",
    idea: [
      "An argument is a set of statements where some, the premises, are offered as reasons to accept another, the conclusion. Mapping it means saying which is which, and what supports what. Premises can be general reasons or specific evidence; either way, their job is to support.",
      "Start with the conclusion: what is the writer trying to get you to accept? Then ask what job each sentence does: support the conclusion, support another premise, or only set the scene. Indicator words help: because, since and given that mark premises; so, therefore and which means mark conclusions. Finally, write the premises as a numbered list with the conclusion last.",
    ],
    terms: [
      {
        term: "Premise",
        meaning: "A statement offered as a reason to accept the conclusion.",
      },
      {
        term: "Conclusion",
        meaning: "The statement the premises are meant to support.",
      },
      {
        term: "Indicator word",
        meaning: "A word that signals a premise (because, since) or a conclusion (so, therefore).",
      },
    ],
    example: {
      case: "A staff email at Cobalt Print: “The printer on floor two broke three times this month, and each repair cost $180. A new one costs $900 and comes with a three-year warranty. Our office manager has worked here since 2015. Since repairs are adding up fast, we should replace it rather than keep fixing it.”",
      moves: [
        "Conclusion: we should replace the printer rather than keep fixing it. “Should” marks it, and “since” marks the reason just before it.",
        "Premises: three breakdowns this month at $180 each, and a new printer costs $900 with a warranty.",
        "Background: the manager's start date supports nothing.",
        "Laid out: (1) repairs cost $540 this month; (2) a new printer costs $900 and would be repaired free for three years; so (3) replace it. Now you can ask whether (1) will continue.",
      ],
    },
    subtleties: [
      {
        title: "Arguments have layers",
        body: "A premise can be a conclusion with support of its own: “repairs are adding up fast” is backed by the $540. Mapping the layers shows where an argument rests on one weak point.",
      },
      {
        title: "Some premises go unsaid",
        body: "Most real arguments leave a premise unstated. This one assumes the breakdowns will continue. Writing it down as a numbered premise makes it easy to question, which is the point.",
      },
    ],
    ask: "What's the conclusion, and what is each sentence doing for it?",
    tryIt:
      "Take one persuasive message you receive this week: an email, an ad, a letter. Write it out as numbered premises and a conclusion, and cross out anything that's only background.",
  },

  "arguments-strong-vs-weak": {
    lessonId: "arguments-strong-vs-weak",
    hook: "An argument can have true premises and still fail to support its conclusion. Two quick tests tell you whether the reasons actually do their job.",
    idea: [
      "The first test is relevance: if the premise were true, would it bear on the conclusion at all? “The park cafe has lovely tiles” is true, and irrelevant to whether it should open in winter.",
      "The second is sufficiency: is there enough support, of the right kind, for a claim this size? Three friends liking a plan doesn't show a whole town wants it. A wider survey, a comparison or a number might.",
      "Notice what isn't on the list: whether you like the conclusion. A strong argument can point somewhere unwelcome, and a weak one can point where you hoped. Judge the support, not the destination.",
    ],
    terms: [
      {
        term: "Relevance",
        meaning: "Whether a premise, if true, would make any difference to the conclusion.",
      },
      {
        term: "Sufficiency",
        meaning:
          "Whether there's enough support, of the right kind, for a conclusion of that size.",
      },
      {
        term: "Strong argument",
        meaning: "One whose premises, if they were true, would make the conclusion likely.",
      },
    ],
    example: {
      case: "“The Dalby Road bus should run every 10 minutes instead of every 20. I take it every day and it's often crowded. My neighbor agrees. Buses are better for the environment than cars.”",
      moves: [
        "Relevance: crowding bears on how often buses should run. The environment point bears on it too, if more buses would take cars off the road.",
        "Sufficiency: one rider's impression and one neighbor are thin. How crowded, how often, at what times?",
        "What would make it strong: passenger counts showing full buses at peak times, and what extra buses would cost.",
        "Verdict: relevant reasons, not enough of them yet.",
      ],
    },
    subtleties: [
      {
        title: "Strong isn't the same as true",
        body: "An argument can be strong with false premises: if the passenger counts were invented, the conclusion would still follow from them. Ask two separate questions: would these reasons support it, and are they true?",
      },
      {
        title: "Enough depends on the stakes",
        body: "A small claim, like trying something for a month, needs less support than a big, costly one. Ask what the conclusion commits you to, and match the evidence to that.",
      },
    ],
    ask: "Is each reason relevant, and is there enough for a claim this size?",
    tryIt:
      "Find an argument you agree with this week and test it as hard as you would one you disagree with. Note one reason that's irrelevant, or one place where the support runs out.",
  },

  "arguments-steelmanning": {
    lessonId: "arguments-steelmanning",
    hook: "Beating a weak version of a view proves nothing, because its supporters won't recognize it. To disagree well, first state the view so well its own side would sign it.",
    idea: [
      "A steelman is the strongest honest version of a view: its best reasons, in the terms its supporters would use. It's the opposite of a strawman. Building one means finding out what those reasons are, often by reading or asking people who hold the view, rather than guessing.",
      "A steelman isn't the same as being nice. A gentle restatement that leaves out the best reasons is still weak. The test is whether a thoughtful supporter would say “yes, that's why I think it.” Only then is your disagreement aimed at the real thing, and if your objection survives, it's worth hearing.",
    ],
    terms: [
      {
        term: "Steelman",
        meaning:
          "The strongest, fairest version of a view you disagree with, stated so its supporters would accept it.",
      },
      {
        term: "Strawman",
        meaning:
          "A weakened or distorted version of a view, easier to knock down. The opposite of a steelman.",
      },
    ],
    example: {
      case: "The view: Fenmoor's schools should switch to a four-day week. A weak restatement: “People who want a four-day week just want longer weekends.”",
      moves: [
        "Notice what the weak version does: it swaps the reasons for a motive, and an unflattering one.",
        "Find the real reasons by asking supporters: lower running costs, keeping teachers, and longer days that suit some families' work patterns.",
        "State them as they would: “A four-day week could save on busing and heating and help keep teachers, and some schools that tried it saw no drop in results.”",
        "Check: would a supporter nod? If so, argue with that version.",
      ],
    },
    subtleties: [
      {
        title: "Steelmanning isn't agreeing",
        body: "You can state a view at its strongest and still reject it. Doing so makes your rejection more credible, because nobody can say you didn't understand it.",
      },
      {
        title: "Don't invent reasons nobody holds",
        body: "A steelman uses the best reasons supporters actually give, or would accept. Inventing a cleverer argument than anyone holds, then rebutting it, can still miss what people really think.",
      },
    ],
    ask: "Would someone who holds this view say I've gotten it right?",
    tryIt:
      "Pick a view you disagree with that a friend or relative holds. Write its best case in three sentences, then ask them whether you've gotten it right. Adjust until they say yes.",
  },

  "arguments-counterarguments": {
    lessonId: "arguments-counterarguments",
    hook: "An argument that ignores the obvious objection persuades only people who already agree. Answering the strongest objection directly is what convinces everyone else.",
    idea: [
      "Every interesting claim has objections. The strongest is usually the one a thoughtful opponent would raise first: the cost, the people it leaves out, the evidence it ignores. Facing that one makes a case credible; knocking down an easy one proves little.",
      "A real rebuttal answers the objection on its own terms. If the worry is cost, the answer is about cost: a funding source, a cheaper version, evidence the cost is lower than feared. Restating your claim louder, or changing the subject, leaves the objection standing. Sometimes the honest answer is to concede part of it and narrow your claim.",
    ],
    terms: [
      {
        term: "Counterargument",
        meaning: "A reason to doubt or reject a claim, raised against it.",
      },
      {
        term: "Rebuttal",
        meaning: "A reply that answers a counterargument on its own terms.",
      },
      {
        term: "Concession",
        meaning: "Admitting that part of an objection is right, and adjusting your claim to fit.",
      },
    ],
    example: {
      case: "The claim: Ashgrove Elementary should close the road by its gate to cars at pick-up time. A parent objects: “Some of us work shifts and have ten minutes to get there. This would make us late every day.”",
      moves: [
        "Is this the strongest objection? It's specific, it affects real families, and supporters can't easily wave it away.",
        "A dodge would be: “Cars are bad for children's lungs.” That may be true, but it doesn't answer the time problem.",
        "A real rebuttal answers on time: “A pick-up spot 200 yards away, with staff walking children out to it, adds about three minutes.”",
        "A concession if that isn't enough: “Families with a shift-work permit could still drive to the gate.”",
      ],
    },
    subtleties: [
      {
        title: "Find it before your opponent does",
        body: "The time to look for the strongest objection is while you're building the case. Raising and answering it yourself shows you've thought it through, and it often improves the claim.",
      },
      {
        title: "Not every objection needs an answer",
        body: "Some objections are weak or off the point, and chasing them can bury the real debate. Answer the strongest fully, and say briefly why you're setting the others aside.",
      },
    ],
    ask: "What's the strongest objection, and does my reply answer it on its terms?",
    tryIt:
      "Before you send your next request or proposal, at work or at home, write down the first objection the reader is likely to have. Add one sentence that answers it directly.",
  },

  "arguments-qualifying-claims": {
    lessonId: "arguments-qualifying-claims",
    hook: "“Always” and “never” are easy to attack, and “maybe” is easy to ignore. The claims that hold up say exactly who, how much and how sure.",
    idea: [
      "Qualifiers set a claim's scope and strength: most, often, in this school, for adults over 60, under these conditions, probably. Good qualifying makes a claim fit its evidence. A survey of one school supports a claim about that school, not about every teenager; a small study supports “may,” not “proves.”",
      "Qualifying is different from hedging. A qualified claim is narrower but still takes a risk: “most members who tried the evening class improved their scores” could turn out false. A hedged claim piles on escape words until nothing could count against it. Aim for the narrowest claim your evidence supports, and say how sure you are.",
    ],
    terms: [
      {
        term: "Qualifier",
        meaning:
          "A word or phrase that sets a claim's scope or certainty: most, in this group, probably.",
      },
      {
        term: "Scope",
        meaning: "Who or what a claim covers. It should match who or what the evidence covered.",
      },
      {
        term: "Hedge",
        meaning: "Softening a claim so much that no result could show it false.",
      },
    ],
    example: {
      case: "A cafe owner writes: “Loyalty cards make customers come back more. Since we started ours in March, our regulars visit 30% more often.”",
      moves: [
        "Who: regulars at one cafe, not customers in general.",
        "How much: 30% more visits since March. Say so, rather than just “more.”",
        "How sure: one cafe, no comparison, and spring and summer may bring more visits anyway. Something changed; the card may be part of why.",
        "Qualified: “Since we started loyalty cards in March, our regulars have visited about 30% more often. The cards may be part of the reason.”",
      ],
    },
    subtleties: [
      {
        title: "Too narrow wastes evidence",
        body: "A claim can be qualified until it's trivial: “on Tuesdays in March, two regulars visited more.” If the evidence supports something broader, say it. The aim is a fit, not a retreat.",
      },
      {
        title: "Confidence is a qualifier too",
        body: "“Probably,” “very likely” and “I'd guess” tell the reader how much weight to put on a claim. Use them deliberately, and drop them when the evidence is strong.",
      },
    ],
    ask: "Who exactly, how many, and how sure does the evidence let me be?",
    tryIt:
      "Next time you write a message making a claim, check it for “always,” “never,” “everyone” and “proves.” Replace each with what you can actually back up.",
  },
};

export default argumentsNotes;
