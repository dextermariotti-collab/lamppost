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
          "Our band room needs a new piano. Three keys on the old one stick, the tuner says it won't hold its tuning anymore, and the spring concert is in May.",
        options: [
          {
            text: "The spring concert is in May.",
            whyNot: "That's one of the reasons given. It's there to support the main point.",
          },
          { text: "The band room needs a new piano." },
          {
            text: "Three keys on the old piano stick.",
            whyNot: "That's evidence offered for the main point, not the point itself.",
          },
        ],
        correct: 1,
        why: "Everything else in the post is there to support the new piano. That's the claim.",
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
          "The Brightwater Hotel is a quarter mile from the beach. The rooms are too small to be worth the price, and no hotel should charge for wifi.",
        options: [
          {
            text: "The rooms are too small to be worth the price.",
            whyNot:
              '"Worth the price" is a judgment. Two guests could disagree and both be honest.',
          },
          { text: "The hotel is a quarter mile from the beach." },
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
        stimulus:
          "My dad has gone to loud concerts without earplugs for 30 years and his hearing is fine, so loud music can't really hurt your ears.",
        options: [
          {
            text: "He may have been to fewer concerts than he says.",
            whyNot: "Even if he went to every one, one person's ears still can't show the risk.",
          },
          { text: "One person's story can't show the risk for most people." },
          {
            text: "Concert tickets were much cheaper 30 years ago.",
            whyNot: "Ticket prices have nothing to do with what loud music does to ears.",
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
          'A website called SleepFacts says the Dreamcloud mattress is the best for back pain. In small print at the bottom: "SleepFacts is run by Dreamcloud Inc."',
        options: [
          { text: "The site has a reason to favor what it recommends." },
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
        why: 'The "review" comes from the company selling the product, so it isn\'t an independent judgment.',
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
          { text: "Richer towns may attract cafés, not the other way around." },
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
          "An online poll on a cycling club's website finds 85% of respondents want more bike lanes. A council member says this shows the town wants them.",
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
          "From the city newsletter: Blocks with a community garden have less litter, so next spring the city will plant a garden on every block to cut litter.",
        options: [
          {
            text: "Gardens make a block look nicer.",
            whyNot: "Maybe so, but that isn't another explanation for the link.",
          },
          {
            text: "Street sweepers, not gardens, are the ones clearing litter.",
            whyNot: "True but beside the point. It doesn't explain why the two go together.",
          },
          { text: "Neighbors who start a garden may also keep the block tidy." },
        ],
        correct: 2,
        why: "Blocks where neighbors already pitch in are likelier both to start a garden and to pick up litter. That could explain the link, not the garden itself.",
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
        why: 'An hour less on Sundays became "shut our libraries." That\'s a straw man: easier to knock down than the real idea.',
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
        stimulus: "Ignore Theo's review of the new climbing gym. He failed chemistry last year.",
        options: [
          {
            text: "It complains that the gym is too new to judge fairly.",
            whyNot: "Nothing is said about the gym's age. The target is Theo.",
          },
          { text: "It dismisses the review for who wrote it, not what it says." },
          {
            text: "It doesn't say when the review was written.",
            whyNot: "A date wouldn't fix the problem: the review is rejected for its author.",
          },
        ],
        correct: 1,
        why: "A chemistry grade says nothing about whether Theo's review is accurate. That's an attack on the person.",
      },
      {
        id: "fallacies-a2",
        kind: "choice",
        prompt: "What kind of reasoning is this?",
        stimulus:
          "If we let students use calculators on this test, next they'll want phones, then they'll copy everything, and soon nobody will be able to think.",
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
          'A post in a soccer team\'s group chat: "Rhea is the best goalie in the league, because nobody else in the league is as good in goal."',
        options: [
          { text: "Its reason just restates the conclusion." },
          {
            text: "It only talks about one goalie.",
            whyNot: "Talking about one player is fine. The reason is the problem.",
          },
          {
            text: "It doesn't say how old Rhea is.",
            whyNot: "Her age has nothing to do with whether the reason supports the claim.",
          },
        ],
        correct: 0,
        why: '"Nobody else is as good" is just "the best" said again, so the argument goes in a circle.',
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
          'Mo has spent $40 on upgrades in a phone game he now finds boring. "All that would be wasted if I quit," he says, and buys the $10 season pass too.',
        options: [
          {
            text: "Trusting a friend's opinion too much.",
            whyNot: "No friend is involved. Mo is looking at money already gone.",
          },
          { text: "Letting money already spent decide what he does next." },
          {
            text: "Assuming the game is popular with others.",
            whyNot: "Popularity doesn't come into Mo's reasoning.",
          },
        ],
        correct: 1,
        why: "The $40 is gone whatever he does. Only future costs and benefits should decide. That's the sunk cost trap.",
      },
      {
        id: "biases-b2",
        kind: "choice",
        prompt: "What most likely shaped Ana's sense of a good price?",
        stimulus:
          "A ticket resale site opens on front-row seats at $600. Ana then buys a $250 seat farther back and feels it's a steal, though seats like hers sold for $120 last week.",
        options: [
          { text: "The $600 seats, which made $250 look low." },
          {
            text: "The time of day she was shopping.",
            whyNot: "Nothing suggests the time of day changed what felt like a fair price.",
          },
          {
            text: "A careful check of last week's prices.",
            whyNot: "If she had checked, she'd have known seats like hers sold for $120.",
          },
        ],
        correct: 0,
        why: "The first number she saw became the reference point. That's anchoring.",
      },
      {
        id: "biases-b3",
        kind: "choice",
        prompt: "Why might Sam's judgment be off?",
        stimulus:
          "After seeing three news stories about roller coaster accidents, Sam decides a day at the theme park is more dangerous than the drive there.",
        options: [
          {
            text: "Sam is too nervous to enjoy big rides.",
            whyNot: "Sam's nerves aren't the issue. How Sam judges risk is.",
          },
          {
            text: "News stories about ride accidents are always false.",
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
        prompt: "What should you take from the contractor's track record?",
        stimulus:
          'Asked how long a kitchen job will take, a contractor says, "Three weeks, definitely." Each of his last five kitchens took about twice as long as he said.',
        options: [
          {
            text: "He sounds sure, so three weeks is right.",
            whyNot: "Sounding sure isn't evidence. His record says otherwise.",
          },
          {
            text: "A kitchen always takes exactly three weeks.",
            whyNot: "Nothing supports that, and his own record contradicts it.",
          },
          { text: "His estimates run too confident, so plan for longer." },
        ],
        correct: 2,
        why: "Five kitchens taking twice as long is better evidence than how certain he sounds.",
      },
      {
        id: "biases-a3",
        kind: "choice",
        prompt: "What best explains the difference in donations?",
        stimulus:
          'A charity tests two letters. One says "Many people give $50," the other "Many people give $10." People sent the first letter give more.',
        options: [
          {
            text: "People sent the $50 letter were richer.",
            whyNot: "Letters in a fair test go to similar people. The number is what changed.",
          },
          { text: "The number people see first pulls their choice toward it." },
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
          'Two students argue for water refill stations at school, to cut plastic waste. A: "Everyone I\'ve asked would love them." B: "At 15 schools that added them, sales of bottled water fell by half within a year."',
        options: [
          {
            text: "A, because it shows what students want.",
            whyNot:
              "Wanting something doesn't show it works, and \"everyone I've asked\" is a small, chosen group.",
          },
          { text: "B, because it reports measured results from many schools." },
          {
            text: "Neither, because this is purely a matter of taste.",
            whyNot: "Bottle sales can be measured, so evidence can help here.",
          },
        ],
        correct: 1,
        why: "Measured results from 15 schools are evidence about the outcome. A's reason is only a preference.",
      },
      {
        id: "arguments-b3",
        kind: "choice",
        prompt: "Which version of the claim fits the evidence best?",
        stimulus:
          'Claim: "Sports drinks improve performance." Evidence: a study of 800 runners found a small gain in races over 90 minutes, and none in shorter races.',
        options: [
          { text: "Sports drinks are linked to a small gain in long races." },
          {
            text: "Sports drinks always make runners faster.",
            whyNot: 'The study found no gain in shorter races, so "always" goes too far.',
          },
          {
            text: "Sports drinks make no difference to performance.",
            whyNot: "The study did find a small gain, in races over 90 minutes.",
          },
        ],
        correct: 0,
        why: "A claim should be as strong as the evidence and no stronger: a small gain, and only in long races.",
      },
    ],
    after: [
      {
        id: "arguments-a1",
        kind: "choice",
        prompt: "Which is the strongest, fairest version of their view to answer?",
        stimulus:
          "Some neighbors oppose turning the empty lot on their block into a basketball court.",
        options: [
          {
            text: "They just don't like anything new.",
            whyNot: "That dismisses them rather than stating a reason worth answering.",
          },
          {
            text: "They don't care about kids having places to play.",
            whyNot: "That's an assumption about their motives, not their argument.",
          },
          { text: "Late-night games could keep families nearby awake." },
        ],
        correct: 2,
        why: "Answering the best version of a view (steelmanning) is fairer, and it's the version that actually matters.",
      },
      {
        id: "arguments-a2",
        kind: "choice",
        prompt: "Which counterargument would the author most need to answer?",
        stimulus:
          "Our school should stop selling soda, because sugary drinks harm students' teeth.",
        options: [
          { text: "Students may just buy soda at the store nearby." },
          {
            text: "Soda comes in many flavors and sizes.",
            whyNot: "That has nothing to do with whether it harms teeth.",
          },
          {
            text: "Many students also enjoy the cafeteria's tacos.",
            whyNot: "That isn't a reason against the change.",
          },
        ],
        correct: 0,
        why: "If students can buy soda nearby, ending sales may not protect anyone's teeth. That's a serious objection to answer.",
      },
      {
        id: "arguments-a3",
        kind: "choice",
        prompt: 'What role does "Saturday stalls often sell out" play?',
        stimulus:
          "Riverside Market should open on Sundays. Foot traffic counts show 40% of weekly visitors come on weekends, and Saturday stalls often sell out.",
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
        prompt: "What's the best way to think about the app's answer?",
        stimulus:
          "A bird-ID app almost never misses a real Ashwing warbler, but it also gives that name to about 1 common bird in 100. Only about 1 bird in 1,000 around here is an Ashwing. The app says your photo shows one.",
        options: [
          {
            text: "It's almost certainly an Ashwing: the app rarely misses one.",
            whyNot:
              "With a bird this rare, wrong labels on the 999 common birds outnumber the one real Ashwing.",
          },
          {
            text: "The app's answer tells you nothing at all.",
            whyNot: "It does raise the chance a lot. It just doesn't make it likely yet.",
          },
          { text: "Most such labels are wrong, so check it another way." },
        ],
        correct: 2,
        why: "Out of 1,000 birds about 10 common ones get the rare name, against 1 real Ashwing. The base rate matters.",
      },
      {
        id: "probability-b2",
        kind: "choice",
        prompt: "On average, what is one pack worth?",
        stimulus:
          "A comic shop sells mystery packs for $5. One pack in 100 holds a rare card worth $300; the rest hold common cards worth almost nothing.",
        options: [
          { text: "$3" },
          {
            text: "$5",
            whyNot: "That's what it costs, not what it's worth on average.",
          },
          {
            text: "$300",
            whyNot: "That's the rare card, but only one pack in 100 holds it.",
          },
        ],
        correct: 0,
        why: "$300 spread across 100 packs is $3 each, so a $5 pack loses about $2 on average.",
      },
      {
        id: "probability-b3",
        kind: "choice",
        prompt: "How should you update?",
        stimulus:
          "It's Labor Day. You think it's 50/50 whether the corner store is open today. Its website, last updated a year ago, says it closes on holidays. A neighbor says she bought bread there this morning.",
        options: [
          {
            text: "Probably closed: trust the store's own website.",
            whyNot:
              "A page from a year ago says little about today. A report from this morning says a lot.",
          },
          { text: "Very likely open: a report from today beats an old page." },
          {
            text: "Still 50/50: the two sources cancel each other out.",
            whyNot: "They aren't equally strong, so they don't cancel.",
          },
        ],
        correct: 1,
        why: "Weigh evidence by how much it tells you. A first-hand report from this morning is far stronger than a page a year out of date.",
      },
    ],
    after: [
      {
        id: "probability-a1",
        kind: "choice",
        prompt: "A bill has just been flagged. What is most likely?",
        stimulus:
          "At the store where Jae works, a counterfeit-detecting pen flags about 1 bill in 200 as fake. A truly fake bill turns up about once in 20,000.",
        options: [
          { text: "It is most likely real: flags far outnumber fakes." },
          {
            text: "It is almost certainly a fake, since the pen flagged it.",
            whyNot: "Flags are a hundred times more common than real fakes.",
          },
          {
            text: "The pen must be faulty to flag so many bills.",
            whyNot: "A pen that flags a lot can still be working as designed.",
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
          "At an arcade's prize counter, 100 tickets buy a $5 snack card, or one spin of a wheel that wins a $24 snack card one time in four and nothing otherwise.",
        options: [
          {
            text: "The snack card, because it is guaranteed.",
            whyNot: "Guaranteed is safer, but on average the spin pays more.",
          },
          {
            text: "They pay the same on average.",
            whyNot: "A quarter of $24 is $6, which is more than $5.",
          },
          { text: "The spin, because it averages $6 a try." },
        ],
        correct: 2,
        why: "Expected value is the payoff times its chance: $24 × 1/4 = $6, against a sure $5.",
      },
      {
        id: "probability-a3",
        kind: "choice",
        prompt: "Which ripple effect should the app plan for?",
        stimulus:
          "To win new users, a music-streaming app gives a free month for every friend a user signs up.",
        options: [
          {
            text: "People will listen to more music on rainy days.",
            whyNot: "Nothing links the free months to the weather.",
          },
          { text: "Some users may sign up fake friends for free months." },
          {
            text: "The app's logo will need a fresh design.",
            whyNot: "That isn't caused by the reward for sign-ups.",
          },
        ],
        correct: 1,
        why: "Rewarding something changes what people do to get it. Second-order effects can undo the first one.",
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
            whyNot: 'One small, short-term result is a long way from "makes you smarter."',
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
          "A pizza chain's ad has a bar chart of average delivery times: 29 minutes for the chain and 31 for its rival. The chart's scale begins at 28 minutes.",
        options: [
          { text: "The cut-off axis makes a small gap look huge." },
          {
            text: "Delivery can't be measured in minutes.",
            whyNot: "Minutes are the usual measure. The axis is the trick.",
          },
          {
            text: "The chain's bar should be a brighter color.",
            whyNot: "Color isn't the issue. The scale is.",
          },
        ],
        correct: 0,
        why: "The real gap is 2 minutes. Starting the axis at 28 makes the rival's bar look three times as tall.",
      },
      {
        id: "media-b3",
        kind: "choice",
        prompt: "What's the quickest good check?",
        stimulus:
          'A video in your feed from the "Pet Nutrition Board," with a vet in a white coat, says grain-free dog food is the healthiest choice. You\'ve never heard of the board.',
        options: [
          {
            text: "Watch it again to judge how sure the vet sounds.",
            whyNot: "Sounding sure isn't evidence. The video can only tell its own story.",
          },
          { text: "Search the board's name to see who runs and funds it." },
          {
            text: "Check how many people have liked the video.",
            whyNot: "Likes show how far it spread, not who is behind it.",
          },
        ],
        correct: 1,
        why: "Leaving the video to see what others say about the board (lateral reading) is faster and more reliable.",
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
        prompt: "What is this pop-up trying to do?",
        stimulus:
          'On a recipe site, a pop-up flashes red: "WARNING: Your phone has 3 viruses! Tap now to clean it." A friend sees the same pop-up, word for word, on a brand-new phone.',
        options: [
          { text: "Scare you into tapping with a threat that isn't real." },
          {
            text: "Give you a useful, honest security warning.",
            whyNot: "The same warning on a brand-new phone shows it isn't checking yours.",
          },
          {
            text: "Show how popular the recipe site is.",
            whyNot: "Nothing here is about the site's readers. It's about fear.",
          },
        ],
        correct: 0,
        why: "A scary warning that shows up for everyone is fear used as pressure, to make you tap before you think it over.",
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
          { text: "The post contradicts the article it links to." },
        ],
        correct: 2,
        why: "Click through before sharing. The linked article says the water is safe to drink, the opposite of the post.",
      },
    ],
  },
};

/** How many questions a check asks. */
export const CHECK_LENGTH = 3;
