import type { ChoiceStep } from "@/lib/steps/types";

/**
 * A short check before and after each unit, to see whether the skill carries over to things
 * the lessons never showed: posts, ads, headlines, emails, chatbot answers. Each check is three
 * fresh questions, different before and after, with no hints, and only the first answer counts.
 * People, places and products are made up, and nothing takes a side on a political issue.
 */
export type UnitCheck = { before: ChoiceStep[]; after: ChoiceStep[] };

export const UNIT_CHECKS: Record<string, UnitCheck> = {
  claims: {
    before: [
      {
        id: "claims-b1",
        kind: "choice",
        prompt: "What is this post trying to get you to accept?",
        stimulus:
          "Our street needs a speed bump. Two cats were hit this year, children walk to school along here, and drivers use it as a shortcut to avoid the lights on Mill Road.",
        options: [
          {
            text: "Drivers use the street as a shortcut.",
            whyNot: "That's one of the reasons given. It's there to support the main point.",
          },
          { text: "The street needs a speed bump." },
          {
            text: "Two cats were hit on the street this year.",
            whyNot: "That's evidence offered for the main point, not the point itself.",
          },
        ],
        correct: 1,
        why: "Everything else in the post is there to support the speed bump. That's the claim.",
      },
      {
        id: "claims-b2",
        kind: "choice",
        prompt: "Which unstated assumption does this gym ad rely on?",
        stimulus:
          "Members who train with a coach lose twice as much weight as members who don't. Book a coach today and double your results.",
        options: [
          { text: "People who pick a coach are otherwise like people who don't." },
          {
            text: "A coach costs less than buying your own equipment.",
            whyNot: "The ad says nothing about price, and its argument doesn't need it.",
          },
          {
            text: "Most members want to lose weight as fast as they can.",
            whyNot: "The ad could be true or false whatever members want.",
          },
        ],
        correct: 0,
        why: "If people who book coaches are already more motivated, the coach may not be what makes the difference.",
      },
      {
        id: "claims-b3",
        kind: "choice",
        prompt: "Which words let this label promise very little while sounding impressive?",
        stimulus: "New Silkline shampoo: clinically shown to make hair up to 70% stronger.",
        options: [
          {
            text: '"New Silkline shampoo"',
            whyNot: "That just names the product. It promises nothing.",
          },
          {
            text: '"Clinically shown"',
            whyNot:
              "It sounds official, but the bigger escape hatch is in the number: how much stronger?",
          },
          { text: '"Up to 70%"' },
        ],
        correct: 2,
        why: '"Up to" covers anything from 0% to 70%, so the label stays true even if most hair barely changes.',
      },
    ],
    after: [
      {
        id: "claims-a1",
        kind: "choice",
        prompt: "What is this email arguing for?",
        stimulus:
          "We should move the weekly meeting to Thursday. Half the team works from home on Mondays, the room is double-booked on Monday mornings, and Thursday's agenda is usually lighter.",
        options: [
          {
            text: "Half the team works from home on Mondays.",
            whyNot: "That's a reason for the proposal, not the proposal.",
          },
          {
            text: "The room is double-booked on Monday mornings.",
            whyNot: "Another reason. The email gives it to support something else.",
          },
          { text: "The weekly meeting should move to Thursday." },
        ],
        correct: 2,
        why: "The three facts all point at one proposal: move the meeting. That's the claim.",
      },
      {
        id: "claims-a2",
        kind: "choice",
        prompt: "Which part of this review could be checked as a plain fact?",
        stimulus:
          "The Brightwater Hotel is 400 metres from the beach. The rooms are too small to be worth the price, and no hotel should charge for wifi.",
        options: [
          {
            text: "The rooms are too small to be worth the price.",
            whyNot:
              '"Worth the price" is a judgement. Two guests could disagree and both be honest.',
          },
          { text: "The hotel is 400 metres from the beach." },
          {
            text: "No hotel should charge for wifi.",
            whyNot: '"Should" makes it a value: what ought to happen, not what is.',
          },
        ],
        correct: 1,
        why: "A distance can be measured. The other two are an opinion and a value.",
      },
      {
        id: "claims-a3",
        kind: "choice",
        prompt: "What's wrong with this reply?",
        stimulus:
          "Prove that my magnetic insoles don't cure back pain. Until you can, I'll keep saying they work.",
        options: [
          {
            text: "It doesn't say how much the insoles cost.",
            whyNot: "The price doesn't affect whether the claim is supported.",
          },
          {
            text: "It talks about back pain, which is hard to measure.",
            whyNot: "Pain can be studied. The problem is who is being asked for evidence.",
          },
          { text: "It asks the doubter to disprove it instead of supporting it." },
        ],
        correct: 2,
        why: "Whoever makes the claim has to back it up. A lack of disproof isn't evidence that something works.",
      },
    ],
  },

  evidence: {
    before: [
      {
        id: "evidence-b1",
        kind: "choice",
        prompt: "What's the main problem with this as evidence?",
        stimulus: "My uncle smoked a pack a day and lived to 94, so smoking can't be that bad.",
        options: [
          {
            text: "The uncle may have got his age wrong.",
            whyNot: "Even if he was exactly 94, one life still can't show the risk.",
          },
          { text: "One person's life can't show the risk for most people." },
          {
            text: "Smoking cost much less when he was young.",
            whyNot: "Price has nothing to do with how harmful smoking is.",
          },
        ],
        correct: 1,
        why: "A single story can't tell you how likely harm is. That takes data on many people.",
      },
      {
        id: "evidence-b2",
        kind: "choice",
        prompt: "Why should you be careful with this recommendation?",
        stimulus:
          'A website called SleepFacts says the Dreamcloud mattress is the best for back pain. In small print at the bottom: "SleepFacts is run by Dreamcloud Ltd."',
        options: [
          { text: "The site has a reason to favour what it recommends." },
          {
            text: "No mattress can make any difference to back pain.",
            whyNot: "That's too strong. The issue is the source, not mattresses in general.",
          },
          {
            text: "The site's name is too short to be taken seriously.",
            whyNot: "A name's length says nothing about whether a source is reliable.",
          },
        ],
        correct: 0,
        why: 'The "review" comes from the company selling the product, so it isn\'t an independent judgement.',
      },
      {
        id: "evidence-b3",
        kind: "choice",
        prompt: "What's the weak step in this argument?",
        stimulus:
          "Towns with more cafés have higher average incomes. So if our town wants to get richer, it should help more cafés open.",
        options: [
          {
            text: "It counts cafés instead of restaurants.",
            whyNot: "Swapping cafés for restaurants would leave the same problem.",
          },
          {
            text: "It compares towns instead of whole countries.",
            whyNot: "The scale isn't the issue. The direction of cause is.",
          },
          { text: "Richer towns may attract cafés, not the other way round." },
        ],
        correct: 2,
        why: "Two things rising together doesn't show which causes which. Here money probably brings the cafés.",
      },
    ],
    after: [
      {
        id: "evidence-a1",
        kind: "choice",
        prompt: "Why can't this poll speak for the whole town?",
        stimulus:
          "An online poll on a cycling club's website finds 85% of respondents want more bike lanes. A councillor says this shows the town wants them.",
        options: [
          {
            text: "85% is too high a figure to be believable.",
            whyNot: "High numbers can be real. The question is who was asked.",
          },
          { text: "Cycling fans are likelier than most to want bike lanes." },
          {
            text: "Online polls always produce made-up numbers.",
            whyNot: '"Always" is too strong. This one is skewed by who answered it.',
          },
        ],
        correct: 1,
        why: "The people who answered chose themselves, and they aren't like the town as a whole.",
      },
      {
        id: "evidence-a2",
        kind: "choice",
        prompt: "What has this company done?",
        stimulus:
          "A company's investor update shows a chart of its share price from March to June, when it rose 40%. Over the full year, the price fell 20%.",
        options: [
          { text: "Shown only the stretch that tells the story it wants." },
          {
            text: "Used a line chart where a bar chart belongs.",
            whyNot: "The chart type is fine. The choice of dates is the problem.",
          },
          {
            text: "Given the share price in the wrong currency.",
            whyNot: "Nothing suggests a currency error. The dates were chosen selectively.",
          },
        ],
        correct: 0,
        why: "Picking a flattering window hides the bigger picture: the year as a whole went down.",
      },
      {
        id: "evidence-a3",
        kind: "choice",
        prompt: "Which other explanation does this newsletter ignore?",
        stimulus:
          "Pupils who eat breakfast get better grades, so from next term the school will give every pupil breakfast to raise grades.",
        options: [
          {
            text: "Breakfast is the most important meal of the day.",
            whyNot: "That's a slogan, not another explanation for the link.",
          },
          {
            text: "Teachers, not breakfasts, are the ones giving grades.",
            whyNot: "True but beside the point. It doesn't explain why the two go together.",
          },
          { text: "Homes that serve breakfast may also help in other ways." },
        ],
        correct: 2,
        why: "Families who make sure children eat may also help with sleep and homework, which could explain the grades.",
      },
    ],
  },

  fallacies: {
    before: [
      {
        id: "fallacies-b1",
        kind: "choice",
        prompt: "What does Lee do?",
        stimulus:
          'Dana: "We could close the library an hour earlier on Sundays to save money." Lee: "So Dana wants to shut our libraries and stop children reading."',
        options: [
          {
            text: "Attacks Dana's character rather than her idea.",
            whyNot: "Lee doesn't insult Dana. He changes what she said.",
          },
          {
            text: "Offers evidence that Sunday hours are popular.",
            whyNot: "Lee gives no evidence at all.",
          },
          { text: "Swaps her small proposal for an extreme one to attack." },
        ],
        correct: 2,
        why: 'An hour less on Sundays became "shut our libraries". That\'s a straw man: easier to knock down than the real idea.',
      },
      {
        id: "fallacies-b2",
        kind: "choice",
        prompt: "What's wrong with this poster's reasoning?",
        stimulus: "Either you support the new stadium, or you don't care about this town's future.",
        options: [
          {
            text: "It doesn't say how much the stadium will cost.",
            whyNot: "Cost matters, but the flaw is in the either-or.",
          },
          { text: "It pretends there are only two possible positions." },
          {
            text: "It is only aimed at people who live in the town.",
            whyNot: "Who it's aimed at doesn't make the reasoning weak.",
          },
        ],
        correct: 1,
        why: "Someone could care about the town and still prefer a park, a pool, or a cheaper stadium.",
      },
      {
        id: "fallacies-b3",
        kind: "choice",
        prompt: "Which mistake is this?",
        stimulus:
          "Over a million people have downloaded the Zenith detox tea app, so its detox plans must work.",
        options: [
          { text: "Treating popularity as proof that something works." },
          {
            text: "Attacking the people who disagree with it.",
            whyNot: "Nobody is attacked here. The reason given is the number of downloads.",
          },
          {
            text: 'Defining "detox" in terms of itself.',
            whyNot: "There is no definition here at all, circular or otherwise.",
          },
        ],
        correct: 0,
        why: "Lots of downloads shows the app is popular, not that it does what it claims.",
      },
    ],
    after: [
      {
        id: "fallacies-a1",
        kind: "choice",
        prompt: "What's the flaw?",
        stimulus:
          "You can't trust Priya's report on the new bus timetable. She doesn't even own a car.",
        options: [
          {
            text: "It assumes buses are better than cars.",
            whyNot: "The argument doesn't compare buses and cars.",
          },
          { text: "It dismisses the report for who wrote it, not what it says." },
          {
            text: "It doesn't say when the report was written.",
            whyNot: "A date wouldn't fix the problem: the report is rejected for its author.",
          },
        ],
        correct: 1,
        why: "Whether Priya drives says nothing about whether her report is accurate. That's an attack on the person.",
      },
      {
        id: "fallacies-a2",
        kind: "choice",
        prompt: "What kind of reasoning is this?",
        stimulus:
          "If we let pupils use calculators in this test, next they'll want phones, then they'll copy everything, and soon nobody will be able to think.",
        options: [
          {
            text: "A fair warning backed by evidence from other schools.",
            whyNot: "No evidence is given for any step in the chain.",
          },
          {
            text: "An appeal to a teacher's authority.",
            whyNot: "No authority is mentioned. It's a chain of predictions.",
          },
          { text: "A chain of unlikely steps presented as certain." },
        ],
        correct: 2,
        why: "Each step is asserted, not shown. That's a slippery slope.",
      },
      {
        id: "fallacies-a3",
        kind: "choice",
        prompt: "Why is this argument weak?",
        stimulus:
          "The Harlow Times is the most trustworthy newspaper, because everything it prints is reliable.",
        options: [
          { text: "Its reason just restates the conclusion." },
          {
            text: "It only names one newspaper.",
            whyNot: "Talking about one paper is fine. The reason is the problem.",
          },
          {
            text: "It doesn't mention the paper's price.",
            whyNot: "Price has nothing to do with trustworthiness.",
          },
        ],
        correct: 0,
        why: '"Reliable" and "trustworthy" mean the same here, so the argument goes in a circle.',
      },
    ],
  },

  biases: {
    before: [
      {
        id: "biases-b1",
        kind: "choice",
        prompt: "Which thinking trap is Mo falling into?",
        stimulus:
          "Mo paid £400 for an evening course he now finds useless. \"I can't quit now, I've already spent so much,\" he says, and books the next term too.",
        options: [
          {
            text: "Trusting a friend's opinion too much.",
            whyNot: "No friend is involved. Mo is looking at money already gone.",
          },
          { text: "Letting money already spent decide what he does next." },
          {
            text: "Assuming the course is popular with others.",
            whyNot: "Popularity doesn't come into Mo's reasoning.",
          },
        ],
        correct: 1,
        why: "The £400 is gone whatever he does. Only future costs and benefits should decide. That's the sunk cost trap.",
      },
      {
        id: "biases-b2",
        kind: "choice",
        prompt: "What most likely shaped Jo's sense of a good price?",
        stimulus:
          'A used car is listed at £15,000, "reduced to £11,000". Jo pays £11,000 and feels she got a bargain, though similar cars sell for £9,500.',
        options: [
          { text: "The high first price, which made £11,000 look low." },
          {
            text: "The colour of the car she chose.",
            whyNot: "Nothing suggests the colour affected the price she accepted.",
          },
          {
            text: "A careful comparison with similar cars.",
            whyNot: "If she had compared, she'd have known similar cars cost £9,500.",
          },
        ],
        correct: 0,
        why: "The first number she saw became the reference point. That's anchoring.",
      },
      {
        id: "biases-b3",
        kind: "choice",
        prompt: "Why might Sam's judgement be off?",
        stimulus:
          "After seeing three news stories about shark attacks, Sam decides swimming in the sea is more dangerous than driving to the beach.",
        options: [
          {
            text: "Sam is not a strong enough swimmer.",
            whyNot: "Sam's swimming isn't the issue. How Sam judges risk is.",
          },
          {
            text: "News stories about sharks are always false.",
            whyNot: "The stories can be true and still make a rare danger feel common.",
          },
          { text: "Vivid stories feel more common than they really are." },
        ],
        correct: 2,
        why: "What comes to mind easily feels likely. Car crashes are far more common but rarely make the news.",
      },
    ],
    after: [
      {
        id: "biases-a1",
        kind: "choice",
        prompt: "What is Ali doing?",
        stimulus:
          "Ali thinks the new park café is overpriced. He reads its reviews, keeps the three that complain about prices, and skips the twenty that don't mention them.",
        options: [
          { text: "Keeping only the evidence that agrees with him." },
          {
            text: "Comparing the café's prices with others nearby.",
            whyNot: "He compares nothing. He filters the reviews.",
          },
          {
            text: "Asking the owner for the real prices.",
            whyNot: "He doesn't ask anyone. He picks the reviews that fit.",
          },
        ],
        correct: 0,
        why: "He started with a belief and kept only what supports it. That's confirmation bias.",
      },
      {
        id: "biases-a2",
        kind: "choice",
        prompt: "What should you take from the builder's track record?",
        stimulus:
          'Asked how long a kitchen job will take, a builder says, "Three weeks, definitely." His last five jobs each took about twice as long as he said.',
        options: [
          {
            text: "He sounds sure, so three weeks is right.",
            whyNot: "Sounding sure isn't evidence. His record says otherwise.",
          },
          {
            text: "Kitchen jobs always take exactly three weeks.",
            whyNot: "Nothing supports that, and his own record contradicts it.",
          },
          { text: "His estimates run too confident, so plan for longer." },
        ],
        correct: 2,
        why: "A record of jobs taking twice as long is better evidence than how certain he sounds.",
      },
      {
        id: "biases-a3",
        kind: "choice",
        prompt: "What best explains the difference in donations?",
        stimulus:
          'A charity tests two letters. One says "Many people give £50", the other "Many people give £10". People sent the first letter give more.',
        options: [
          {
            text: "People sent the £50 letter were richer.",
            whyNot: "Letters in a fair test go to similar people. The number is what changed.",
          },
          { text: "The number people see first pulls their choice towards it." },
          {
            text: "Letters with bigger numbers are easier to read.",
            whyNot: "Readability isn't the difference. The amount mentioned is.",
          },
        ],
        correct: 1,
        why: "The suggested amount acts as an anchor, even though nobody has to give it.",
      },
    ],
  },

  arguments: {
    before: [
      {
        id: "arguments-b1",
        kind: "choice",
        prompt: "Which part is the conclusion?",
        stimulus:
          "Since the bridge closes for repairs next month, and the ferry only runs twice a day, the festival should be moved to the spring.",
        options: [
          {
            text: "The bridge closes for repairs next month.",
            whyNot: "That's a premise: a reason offered for something else.",
          },
          {
            text: "The ferry only runs twice a day.",
            whyNot: 'Another premise. "Since" introduces the reasons.',
          },
          { text: "The festival should be moved to the spring." },
        ],
        correct: 2,
        why: 'The two "since" facts are the reasons; moving the festival is what they are meant to support.',
      },
      {
        id: "arguments-b2",
        kind: "choice",
        prompt: "Which argument gives better support?",
        stimulus:
          'For a four-day week trial. A: "Everyone I\'ve asked would love a four-day week." B: "In a trial at 30 local firms, output held steady and sick days fell by a third."',
        options: [
          {
            text: "A, because it shows what workers want.",
            whyNot:
              "Wanting something doesn't show it works, and \"everyone I've asked\" is a small, chosen group.",
          },
          { text: "B, because it reports measured results from many firms." },
          {
            text: "Neither, because this is purely a matter of taste.",
            whyNot: "Output and sick days can be measured, so evidence can help here.",
          },
        ],
        correct: 1,
        why: "Measured results from 30 firms are evidence about the outcome. A's reason is only a preference.",
      },
      {
        id: "arguments-b3",
        kind: "choice",
        prompt: "Which version of the claim fits the evidence best?",
        stimulus:
          'Claim: "Homework improves test scores." Evidence: a study of 2,000 secondary pupils found a small improvement for up to an hour a night, and none beyond that.',
        options: [
          { text: "Up to an hour a night is linked to a small gain." },
          {
            text: "More homework always means better test scores.",
            whyNot: 'The study found no gain beyond an hour, so "always" goes too far.',
          },
          {
            text: "Homework makes no difference to test scores.",
            whyNot: "The study did find a small gain, up to an hour.",
          },
        ],
        correct: 0,
        why: "A claim should be as strong as the evidence and no stronger: a small gain, up to a limit.",
      },
    ],
    after: [
      {
        id: "arguments-a1",
        kind: "choice",
        prompt: "Which is the strongest, fairest version of their view to answer?",
        stimulus: "Some residents oppose a new bus lane on High Street.",
        options: [
          {
            text: "They just don't like anything new.",
            whyNot: "That dismisses them rather than stating a reason worth answering.",
          },
          {
            text: "They don't care about traffic or pollution.",
            whyNot: "That's an assumption about their motives, not their argument.",
          },
          { text: "Losing a car lane could slow deliveries to shops." },
        ],
        correct: 2,
        why: "Answering the best version of a view (steelmanning) is fairer, and it's the version that actually matters.",
      },
      {
        id: "arguments-a2",
        kind: "choice",
        prompt: "Which counterargument would the author most need to answer?",
        stimulus: "Our school should ban phones in class, because they distract pupils.",
        options: [
          { text: "Some pupils use phones in class for translation." },
          {
            text: "Phones come in many colours and sizes.",
            whyNot: "That has nothing to do with whether they distract.",
          },
          {
            text: "Many pupils also enjoy listening to music.",
            whyNot: "That isn't a reason against the ban.",
          },
        ],
        correct: 0,
        why: "A real use in class is a serious objection: a total ban would take away help some pupils need.",
      },
      {
        id: "arguments-a3",
        kind: "choice",
        prompt: 'What role does "Saturday stalls often sell out" play?',
        stimulus:
          "Riverside Market should open on Sundays. Footfall counts show 40% of weekly visitors come at weekends, and Saturday stalls often sell out.",
        options: [
          {
            text: "It is the main conclusion.",
            whyNot: "The conclusion is that the market should open on Sundays.",
          },
          { text: "It is a reason offered for opening on Sundays." },
          {
            text: "It is an objection the author answers.",
            whyNot: "It supports the author's point. It doesn't push against it.",
          },
        ],
        correct: 1,
        why: "It's a premise: evidence of demand, given to support opening another day.",
      },
    ],
  },

  probability: {
    before: [
      {
        id: "probability-b1",
        kind: "choice",
        prompt: "What's the best way to think about Nia's result?",
        stimulus:
          "A test for a rare condition (1 in 1,000 people have it) is 99% accurate. Nia tests positive.",
        options: [
          {
            text: "She almost certainly has it: the test is 99% accurate.",
            whyNot:
              "With a rare condition, false positives from the healthy 999 outnumber the true one.",
          },
          {
            text: "The result tells her nothing at all.",
            whyNot: "It does raise the chance a lot. It just doesn't make it likely yet.",
          },
          { text: "Most positives here are false; a second test is wise." },
        ],
        correct: 2,
        why: "Out of 1,000 people about 10 healthy ones test positive, against 1 who has it. The base rate matters.",
      },
      {
        id: "probability-b2",
        kind: "choice",
        prompt: "On average, what is one ticket worth?",
        stimulus: "A raffle ticket costs £5. There are 1,000 tickets and one prize of £2,000.",
        options: [
          { text: "£2" },
          {
            text: "£5",
            whyNot: "That's what it costs, not what it's worth on average.",
          },
          {
            text: "£2,000",
            whyNot: "That's the prize, but only one ticket in 1,000 wins it.",
          },
        ],
        correct: 0,
        why: "£2,000 shared across 1,000 tickets is £2 each, so a £5 ticket loses £3 on average.",
      },
      {
        id: "probability-b3",
        kind: "choice",
        prompt: "How should you update?",
        stimulus:
          "You think it's 50/50 whether the corner shop opens on the bank holiday. Its website hasn't been updated for a year, but a neighbour says she bought bread there this morning.",
        options: [
          {
            text: "Trust the website: it's more official.",
            whyNot:
              "A year-old page says little about today. A fresh first-hand report says a lot.",
          },
          { text: "Lean towards open: a fresh report beats an old page." },
          {
            text: "Stay at 50/50: the two cancel out.",
            whyNot: "They aren't equally strong, so they don't cancel.",
          },
        ],
        correct: 1,
        why: "Weigh evidence by how much it tells you. Today's first-hand report is far stronger than a stale website.",
      },
    ],
    after: [
      {
        id: "probability-a1",
        kind: "choice",
        prompt: "A bag has just been flagged. What is most likely?",
        stimulus:
          "A stadium's bag scanner flags about 1 bag in 100. Something truly dangerous turns up in about 1 bag in 100,000.",
        options: [
          { text: "It is most likely harmless; flags far outnumber finds." },
          {
            text: "It almost certainly holds something dangerous.",
            whyNot: "Flags are a thousand times more common than real finds.",
          },
          {
            text: "The scanner must be faulty.",
            whyNot: "A scanner that flags a lot can still be working as designed.",
          },
        ],
        correct: 0,
        why: "When the thing you're looking for is very rare, most alarms are false. The base rate decides.",
      },
      {
        id: "probability-a2",
        kind: "choice",
        prompt: "Which pays more on average, if you could choose many times?",
        stimulus:
          "Option A: a guaranteed £50. Option B: a coin flip that pays £120 on heads and nothing on tails.",
        options: [
          {
            text: "A, because it is guaranteed.",
            whyNot: "Guaranteed is safer, but on average B pays more.",
          },
          {
            text: "They pay the same on average.",
            whyNot: "Half of £120 is £60, which is more than £50.",
          },
          { text: "B, because it averages £60 a go." },
        ],
        correct: 2,
        why: "Expected value is the payoff times its chance: £120 × 0.5 = £60, against a sure £50.",
      },
      {
        id: "probability-a3",
        kind: "choice",
        prompt: "Which knock-on effect should the town plan for?",
        stimulus: "To bring more shoppers into the centre, a town makes all its car parks free.",
        options: [
          {
            text: "Shops will sell more umbrellas on rainy days.",
            whyNot: "Nothing links free parking to umbrella sales.",
          },
          { text: "Commuters may take the free spaces all day long." },
          {
            text: "The car parks will need repainting more often.",
            whyNot: "That isn't caused by the change in price.",
          },
        ],
        correct: 1,
        why: "Making something free changes who uses it. Second-order effects can undo the first one.",
      },
    ],
  },

  media: {
    before: [
      {
        id: "media-b1",
        kind: "choice",
        prompt: "What's the gap between the headline and the study?",
        stimulus:
          'Headline: "Chocolate makes you smarter." The study: 30 adults did slightly better on one memory test two hours after eating dark chocolate.',
        options: [
          {
            text: "The study used milk chocolate, not dark.",
            whyNot: "It used dark chocolate. The problem is how far the headline stretches it.",
          },
          {
            text: "There's no gap; the headline is a fair summary.",
            whyNot: 'One small, short-term result is a long way from "makes you smarter".',
          },
          { text: "It turns one small, short-term result into a sweeping claim." },
        ],
        correct: 2,
        why: "Thirty people, one test, two hours later. The headline claims far more than the study found.",
      },
      {
        id: "media-b2",
        kind: "choice",
        prompt: "What is misleading about this chart?",
        stimulus:
          "A bar chart shows Brand X's battery lasting 10.2 hours and Brand Y's 10.0 hours. The axis starts at 9.9, so X's bar looks three times taller.",
        options: [
          { text: "The cut-off axis makes a tiny gap look huge." },
          {
            text: "Battery life can't be measured in hours.",
            whyNot: "Hours are the usual measure. The axis is the trick.",
          },
          {
            text: "Brand X should be shown in a brighter colour.",
            whyNot: "Colour isn't the issue. The scale is.",
          },
        ],
        correct: 0,
        why: "The real difference is 2%. Starting the axis at 9.9 hides that.",
      },
      {
        id: "media-b3",
        kind: "choice",
        prompt: "What's the quickest good check?",
        stimulus:
          'You find a polished website, "Institute for Healthy Families", arguing against a new food label. You\'ve never heard of the organisation.',
        options: [
          {
            text: "Read the whole site carefully to judge its tone.",
            whyNot: "A site can sound careful and still be one-sided. Look outside it first.",
          },
          { text: "Search its name elsewhere to see who runs and funds it." },
          {
            text: "Check whether the site has a contact form.",
            whyNot: "Almost any site has one. It tells you nothing about who is behind it.",
          },
        ],
        correct: 1,
        why: "Leaving the site to see what others say about it (lateral reading) is faster and more reliable.",
      },
    ],
    after: [
      {
        id: "media-a1",
        kind: "choice",
        prompt: "What's the most likely explanation?",
        stimulus:
          'You ask a chatbot for a source. It replies: "See Ashby & Hale (2019), Journal of Urban Cycling, p. 44." You can\'t find the journal anywhere.',
        options: [
          {
            text: "The journal is too famous to be put online.",
            whyNot: "Well-known journals are the easiest to find, not the hardest.",
          },
          { text: "The chatbot may have made up a real-looking reference." },
          {
            text: "Chatbot references are always checked by experts.",
            whyNot: "They aren't. That's why a reference needs checking.",
          },
        ],
        correct: 1,
        why: "AI tools can produce confident, invented citations. If you can't find a source, don't rely on it.",
      },
      {
        id: "media-a2",
        kind: "choice",
        prompt: "What is this page trying to do?",
        stimulus:
          'An online shop shows: "Only 2 left! 14 people are looking at this now. Offer ends in 09:59." The timer starts again every time you reload the page.',
        options: [
          { text: "Rush you into buying with pressure that isn't real." },
          {
            text: "Give you useful, honest stock information.",
            whyNot: "A timer that resets isn't honest information.",
          },
          {
            text: "Show how popular the shop is locally.",
            whyNot: "Nothing here is about the local area. It's about urgency.",
          },
        ],
        correct: 0,
        why: 'A fake countdown and "only 2 left" are pressure tactics to stop you thinking it over.',
      },
      {
        id: "media-a3",
        kind: "choice",
        prompt: "What should you conclude?",
        stimulus:
          'A viral post: "Scientists confirm the town reservoir is poisoned!" It links to a local news article titled "Reservoir tests find algae; water safe to drink, officials say."',
        options: [
          {
            text: "The reservoir is poisoned: scientists confirmed it.",
            whyNot: "The post's own source says the opposite.",
          },
          {
            text: "The post and the article say the same thing.",
            whyNot: "One says poisoned, the other says safe to drink.",
          },
          { text: "The post exaggerates what its own source says." },
        ],
        correct: 2,
        why: "Click through before sharing. Here the linked article says the water is safe.",
      },
    ],
  },
};

/** How many questions a check asks. */
export const CHECK_LENGTH = 3;
