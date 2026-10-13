/**
 * Legal pages.
 *
 * IMPORTANT: this is a plain-English DRAFT written against what the code actually does, so a
 * lawyer can review it for accuracy instead of adapting a template. Anything in [SQUARE BRACKETS]
 * is a placeholder for a fact only the owner can supply (see legal-config.ts). Sections flagged
 * `review: true` need a lawyer's approval before launch.
 */

import {
  APP_NAME,
  COMPANY_NAME,
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
  GOVERNING_STATE,
  MAILING_ADDRESS,
  MIN_ACCOUNT_AGE,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "./legal-config";

export type LegalSection = {
  heading: string;
  /** Paragraphs and bullet lists, in order. */
  body: Array<string | { list: string[] }>;
  /** True when the wording still needs attorney drafting/approval. */
  review?: boolean;
};

export type LegalDoc = {
  slug: string;
  route: string;
  title: string;
  /** Short line shown in the legal index and in settings. */
  summary: string;
  updated: string;
  /** Which revision of the text this is (only the privacy policy and terms are versioned). */
  version?: string;
  intro: string;
  sections: LegalSection[];
};

/** Kept as names other files already import; they all point at the one configured address. */
export const LEGAL_CONTACT = CONTACT_EMAIL;
export const PRIVACY_CONTACT = CONTACT_EMAIL;
export const SAFETY_CONTACT = CONTACT_EMAIL;
export const LEGAL_UPDATED = EFFECTIVE_DATE;

export const PRIVACY: LegalDoc = {
  slug: "privacy",
  route: "/legal/privacy",
  title: "Privacy Policy",
  summary: "What we collect, why, who helps us run it, and how to get your data out or deleted.",
  updated: LEGAL_UPDATED,
  version: PRIVACY_VERSION,
  intro: `${APP_NAME} is run by ${COMPANY_NAME} ("we", "us"). This page explains, in plain English, what happens to your information. It describes what the app does today.`,
  sections: [
    {
      heading: "The short version",
      body: [
        {
          list: [
            "You can use most of Lamppost without an account. Your progress then stays on your device.",
            "If you make an account, we keep your progress, your friends and your settings so they follow you to other devices.",
            "We don't show ads, we don't sell your data, and we don't run analytics or tracking tools.",
            "Some features send what you type to an AI service so it can reply. That is explained below.",
            "You can download your data or delete your account yourself, any time, in Settings.",
          ],
        },
      ],
    },
    {
      heading: "What we collect, and why",
      review: true,
      body: [
        "Only what the features need:",
        {
          list: [
            "Account details: your email address, and whether you sign in with a password or with Google. If you use Google, we also receive the name on your Google account. We use these to create your account and keep you signed in.",
            "Your age band and permission: when you sign up we ask your date of birth to check that you are old enough. We do not keep the date. We keep only whether you are 13 to 17 or 18 and over, and, for 13 to 17, that you confirmed a parent or guardian allows it.",
            "Your agreement: the time you accepted our Terms and Privacy Policy, and which version. This is our record that you agreed.",
            "Profile: your display name, a handle, an invite code, your companion's look, your daily goal, your notification choices, and who can see your progress.",
            "Progress: XP, streak, streak freezes, badges, which lessons you have finished, and how much you did each day and each week. This runs the streak, the friends league and the weekly recap, and shows the same map on each of your devices. Earlier versions of the app also had gems, hint tokens, companion cosmetics and reward chests; those are no longer used, and anything recorded then stays with your account (and in your data download) until you delete it.",
            "Your writing: if you are signed in, the short arguments you write for grading and your explain-it-back conversations are saved to your account, with their scores, so you can look back at them. Guests' writing is graded but not saved to any account.",
            "Friends: friend requests, friendships, invite links you use, shared streaks, nudges, debates and friends-league results.",
            "Safety records: reports you make about content or about other people, people you block, and a log of requests we had to refuse.",
            "Technical data: your network address and browser details are seen by our hosting when you connect. To limit abuse we count requests per person; for signed-out visitors that count is keyed to a scrambled (hashed) version of the network address, never the address itself.",
          ],
        },
        "Answers to drills, your hint and review schedule, your before-and-after unit check results, and your local settings are kept on your device (in your browser's storage). They are not on our servers unless a feature above says so.",
        "We don't ask for your location, contacts, photos, health information, payment card or government ID.",
      ],
    },
    {
      heading: "What is sent to AI",
      review: true,
      body: [
        `Some ${APP_NAME} features are powered by an AI model: the companion's follow-up questions, the explain-it-back chat, feedback on your written arguments, debates, Check something you saw, and the extra practice drills used in reviews. When you use one, the text you typed or pasted for it and the small amount of lesson context it needs are sent to an AI service, which sends a reply back. Text you paste into Check something you saw is used for that one reply and is not saved by Lamppost. Once you've read every daily case written for the app, new daily cases are written by an AI too; nothing about you is sent to write them.`,
        `We send it through the Lovable AI Gateway, which at the time of writing routes to a Google Gemini model. We don't send your email, name, handle, friends or account history. Please don't type anything private into these features (for example a full name, an address, or a health detail): what you type there leaves the app.`,
        "The lessons themselves are written in advance and are not generated for you. AI-written replies are labelled in the app.",
        "[CONFIRM: whether the AI provider keeps or trains on requests sent through the gateway. Update this paragraph once confirmed.]",
      ],
    },
    {
      heading: "Who else handles your information",
      review: true,
      body: [
        "These companies handle some information so the app works. We don't sell your information and we show no ads; what each company does with what it receives is governed by its own terms.",
        {
          list: [
            "Lovable (Lovable Cloud): runs our database, sign-in and servers, and the AI gateway described above. Database and sign-in are built on Supabase.",
            "Google: if you choose Continue with Google, Google signs you in. Separately, this app loads its text fonts from Google Fonts, so when a page loads, your browser contacts Google's font servers and Google sees your network address and browser details. We do not choose what Google does with that.",
            "QR code service (only if you ask for it): if you tap Show QR code on the Friends screen, your invite link is sent to api.qrserver.com so it can draw the code. Nothing is sent unless you tap.",
            "Email delivery: confirmation emails are sent through our sign-in provider.",
          ],
        },
        "We may also share information if the law requires it, or to protect someone's safety.",
        "[CONFIRM: any other processors, such as error tracking, an email service, or a payments provider, before launch.]",
      ],
    },
    {
      heading: "Who can see what about you",
      body: [
        "By default your profile is minimal: other people can see your display name and your companion, and nothing else.",
        "If you turn on \"Share my progress with friends\" (in Settings or on the Friends screen), people you have accepted as friends can also see your streak, XP, badges and league tier, and you appear in your friends' weekly league. People you haven't accepted as friends never see them.",
        "When you start a shared streak with a friend, that friend sees the streak and whether you have done something today, even if you don't share your progress more widely.",
        "If someone blocks you, you can no longer find or add them, and you aren't told. If someone reports you, a person at [COMPANY NAME] reads the report; we don't tell you who sent it.",
        "You can remove a friend, block someone, or report someone at any time. There is no messaging. The only text of yours another person can see is your case in a debate you chose to take part in, and only once both sides have written theirs.",
      ],
    },
    {
      heading: "How long we keep it",
      review: true,
      body: [
        "We keep your account information while your account exists. When you delete your account we delete your profile, progress, rewards, friendships, writing, conversations and results. Reports you filed are kept for safety records but no longer linked to you, reports other people made about you are deleted with your account, and refusal logs are kept without your identity.",
        "Request counters used to limit abuse are removed after about three days.",
        "[CONFIRM: how long the hosting provider keeps database backups, and say so here.]",
        "If you never make an account, we hold no account data about you.",
      ],
    },
    {
      heading: "Your choices and rights",
      body: [
        {
          list: [
            "See and download your data: Settings → Your data → Download my data.",
            "Delete your account and data: Settings → Your data → Delete my account. It is permanent.",
            `Ask us to do either by email at ${CONTACT_EMAIL}.`,
            "Change who sees your progress, or block or report someone, in the app.",
            "Sign out or clear your browser storage to remove what is kept on a device.",
          ],
        },
        "Depending on where you live, you may also have the right to correct your data, object to how we use it, or complain to a data-protection authority. Ask us and we will help.",
      ],
    },
    {
      heading: "Children and teens",
      review: true,
      body: [
        `${APP_NAME} accounts are for people aged ${MIN_ACCOUNT_AGE} and over. If you tell us you are younger, we don't create an account and we don't keep what you entered. If we find out an account belongs to someone under ${MIN_ACCOUNT_AGE}, we delete it.`,
        "If you are 13 to 17, you need a parent or guardian's permission, and we ask you to confirm that when you sign up. Teen accounts start with the minimal profile described above, and there are no ads.",
        "Parents and guardians can contact us to review or delete a teen's account.",
        "[LEGAL REVIEW: confirm the age rules that apply in each place you will launch, and whether the signed-out AI features (which need no account and no age check) are acceptable for younger visitors.]",
      ],
    },
    {
      heading: "Security",
      body: [
        "Each person's data is protected by database rules so one account can't read another's, and the parts that decide XP, gems and rewards can only be changed by our servers. No system is perfectly secure. If something goes wrong that affects you, we will tell you as the law requires.",
      ],
    },
    {
      heading: "Changes to this policy",
      review: true,
      body: [
        `If we change this policy in a way that matters, we will tell you inside the app and ask you to look at it again before you keep using your account. The date and version at the top show which text is current. This is version ${PRIVACY_VERSION}.`,
      ],
    },
    {
      heading: "Contact",
      body: [
        `${COMPANY_NAME}, ${MAILING_ADDRESS}. Email: ${CONTACT_EMAIL}.`,
        "[LEGAL REVIEW: add a data-protection contact or representative if the law of a place you launch in requires one.]",
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  slug: "terms",
  route: "/legal/terms",
  title: "Terms of Service",
  summary: "The rules for using Lamppost, in plain English.",
  updated: LEGAL_UPDATED,
  version: TERMS_VERSION,
  intro: `These terms are the agreement between you and ${COMPANY_NAME} ("we", "us") about using ${APP_NAME}. By making an account you agree to them and to the Privacy Policy. If you use ${APP_NAME} without an account, these terms still apply to that use.`,
  sections: [
    {
      heading: "Who can use Lamppost",
      review: true,
      body: [
        `You must be at least ${MIN_ACCOUNT_AGE} to have an account. If you are under 18 (or under the age of adulthood where you live), you must have a parent or guardian's permission, and by signing up you confirm that you do. A parent or guardian who allows this agrees to these terms for the young person.`,
        "You must give accurate information, keep your sign-in details to yourself, and tell us if you think someone else is using your account. You are responsible for what happens under your account.",
      ],
    },
    {
      heading: "What Lamppost is, and isn't",
      body: [
        `${APP_NAME} is an educational app that helps you practise critical thinking. It is for learning and practice only.`,
        "It is not professional advice of any kind: not medical, legal, financial, mental-health or safety advice. Don't rely on it for decisions like those.",
        "We don't promise that using Lamppost will improve your grades, your job prospects or your judgement. What you get out of it depends on you.",
      ],
    },
    {
      heading: "AI-written content",
      body: [
        "Some replies in Lamppost are written by an AI model, including the companion's questions, feedback on your writing, debates, and some practice drills. These are labelled. AI can be wrong, can sound sure when it isn't, and can miss things. The scores it gives are practice feedback, not an official assessment or qualification.",
        "The lessons are written in advance and checked by automated tests, but they can still contain mistakes. If you spot one, use the report button.",
        "Check anything important against a reliable source.",
      ],
    },
    {
      heading: "How to behave",
      body: [
        "Please don't:",
        {
          list: [
            "harass, threaten, impersonate or target other people, including through names, handles or friend requests;",
            "try to get sexual, violent, hateful or dangerous content out of the AI features, or try to get around the safety rules;",
            "share other people's private information;",
            "cheat the rewards system, use bots or scripts, or try to break, overload or gain unauthorised access to the service;",
            "copy the service or its content to resell it;",
            "use Lamppost in a way that breaks the law.",
          ],
        },
        "You can report a person or a piece of content in the app, and block people you don't want to hear from.",
      ],
    },
    {
      heading: "Your content",
      review: true,
      body: [
        "You own what you write. To run the service you give us a limited licence to store it, process it, send it to the AI service that responds to it, and show it to the people you chose to share it with (for example, your opponent in a debate).",
        "Don't write anything you don't have the right to share.",
      ],
    },
    {
      heading: "Our content",
      body: [
        `${APP_NAME}'s lessons, design and companion characters belong to us or our licensors. You may use them for your own personal, non-commercial learning. You may not copy, sell or republish them.`,
      ],
    },
    {
      heading: "Streaks, XP and badges",
      body: [
        "Streaks, streak freezes, XP and badges are a record of your practice. They have no cash value, can't be sold or transferred, and can't be bought with money. Earlier versions of the app had gems, reward chests, hint tokens and companion cosmetics; those have been retired, and every companion colour and accessory is now free.",
      ],
    },
    {
      heading: "Paid features",
      review: true,
      body: [
        "[If paid plans are offered, describe pricing, renewal, cancellation, refunds and taxes here. At the time of writing, payments are not turned on.]",
      ],
    },
    {
      heading: "Ending your account",
      review: true,
      body: [
        "You can delete your account any time in Settings. We may suspend or end an account that breaks these terms or puts others at risk, and we will say why unless the law or safety stops us. Sections that by their nature should continue (like the disclaimers and limits below) continue after an account ends.",
      ],
    },
    {
      heading: "No warranty",
      review: true,
      body: [
        `${APP_NAME} is provided "as is" and "as available". To the fullest extent the law allows, we give no promise that it will be accurate, complete, uninterrupted or error-free, or fit for a particular purpose.`,
        "[LEGAL REVIEW: attorney-drafted warranty disclaimer.]",
      ],
    },
    {
      heading: "Limit on our responsibility",
      review: true,
      body: [
        "To the fullest extent the law allows, we are not responsible for indirect or consequential losses, or for losses that come from relying on lesson content or AI replies. Nothing in these terms limits responsibility that the law doesn't allow us to limit.",
        "[LEGAL REVIEW: attorney-drafted limitation of liability, including a cap and how it applies to consumers and to minors.]",
      ],
    },
    {
      heading: "Which law applies",
      review: true,
      body: [
        `These terms are governed by the laws of ${GOVERNING_STATE}, without regard to conflict-of-law rules. [LEGAL REVIEW: where disputes are heard, whether there is arbitration, and consumer rights that can't be waived.]`,
      ],
    },
    {
      heading: "Changes to these terms",
      review: true,
      body: [
        `We may update these terms. For a change that matters, we will tell you in the app (and by email if we have your address) before it takes effect, and ask you to accept the new version before you keep using your account. If you don't agree, you can delete your account. This is version ${TERMS_VERSION}, effective ${EFFECTIVE_DATE}.`,
      ],
    },
    {
      heading: "Contact",
      body: [`${COMPANY_NAME}, ${MAILING_ADDRESS}. Email: ${CONTACT_EMAIL}.`],
    },
  ],
};

export const HEALTH: LegalDoc = {
  slug: "health",
  route: "/legal/health",
  title: "Not Professional Advice",
  summary: "Lamppost is for learning and practice only.",
  updated: LEGAL_UPDATED,
  intro: `${APP_NAME} teaches ways of reasoning. It is educational and is not a substitute for a professional.`,
  sections: [
    {
      heading: "Educational use only",
      review: true,
      body: [
        "Lessons, drills, examples and AI replies are there to help you practise thinking clearly. They are not medical, legal, financial, mental-health, or safety advice, and they are not tailored to your situation.",
        "Examples use made-up people, companies and products. Any resemblance to real ones is accidental.",
      ],
    },
    {
      heading: "If it matters, ask someone qualified",
      body: [
        "For anything about your health, money, legal position or safety, talk to a qualified professional.",
        "If you think you or someone else is in danger, or you are thinking about harming yourself, contact your local emergency number or a crisis line now. Lamppost can't help in an emergency.",
      ],
    },
  ],
};

export const AI_CONTENT: LegalDoc = {
  slug: "ai-content",
  route: "/legal/ai-content",
  title: "AI-Generated Content",
  summary: "Where AI is used in Lamppost, and what its limits are.",
  updated: LEGAL_UPDATED,
  intro:
    "Some parts of Lamppost are written by an AI model as you use them. This page says which, and what to keep in mind.",
  sections: [
    {
      heading: "Where AI is used",
      body: [
        {
          list: [
            "The companion's short follow-up questions and comments after a drill.",
            "The explain-it-back chat after a lesson.",
            "Feedback and scores on the short arguments you write.",
            "Debate topics and the scoring of both sides.",
            "Extra practice drills in reviews and the placement check.",
            "Check something you saw: the questions about a text you paste in.",
            "Daily cases, once you've read every case written for the app.",
          ],
        },
        'These are marked with an "AI-generated" label. The lessons themselves are written in advance and are not generated as you use the app.',
      ],
    },
    {
      heading: "It can be wrong",
      review: true,
      body: [
        "AI can state mistakes confidently, miss context, and be inconsistent. Its scores are practice feedback, not an assessment or a qualification. Check anything important with a reliable source.",
        "The AI features are told to stay on critical thinking, to refuse harmful or explicit requests, and not to give medical, legal or financial advice. No safety system is perfect. If a reply is wrong or unsuitable, please report it.",
      ],
    },
    {
      heading: "What is sent",
      body: [
        "To reply, the text you type or paste and a little lesson context are sent to an AI service (see the Privacy Policy). What you paste into Check something you saw is used for that reply and isn't saved. Don't type or paste private details into these features.",
      ],
    },
    {
      heading: "Reporting",
      body: [
        "Use the report button on a lesson or drill to flag a mistake or an unsuitable reply. Reports are reviewed and used to make the app better.",
      ],
    },
  ],
};

export const COOKIES: LegalDoc = {
  slug: "cookies",
  route: "/legal/cookies",
  title: "Cookies & Local Storage",
  summary: "What is stored on your device and why.",
  updated: LEGAL_UPDATED,
  intro: `${APP_NAME} keeps this small. There are no advertising cookies, no ad networks and no tracking pixels.`,
  sections: [
    {
      heading: "What is stored on your device",
      review: true,
      body: [
        {
          list: [
            "Sign-in: keeps you signed in if you have an account. Needed for the app to work.",
            "Your progress and settings: streak, XP, drill answers, the review schedule, your before-and-after unit check results, your companion and preferences, stored in your browser so the app works offline-first and without an account.",
            "Small flags: for example that you have seen the welcome screens.",
          ],
        },
        "Clearing your browser's site data removes these. If you weren't signed in, that also removes your progress.",
      ],
    },
    {
      heading: "Third-party requests",
      review: true,
      body: [
        "The app loads its fonts from Google Fonts. That is a request from your browser to Google, which sees your network address and browser details. If you use Continue with Google, Google's sign-in page is involved as well.",
        "[CONFIRM: if analytics, ads or other third-party scripts are ever added, update this page and the Privacy Policy first, and get consent where the law requires it.]",
      ],
    },
  ],
};

export const COMMUNITY: LegalDoc = {
  slug: "community",
  route: "/legal/community",
  title: "Community Guidelines & Reporting",
  summary: "How to behave, and how to report or block someone.",
  updated: LEGAL_UPDATED,
  intro: `${APP_NAME} is a place to practise thinking with friends. It works when people are kind. Friends can see your name and companion, nudge you, and take part in streaks, debates and the league, and that's all: there is no messaging, and no way for a stranger to contact you.`,
  sections: [
    {
      heading: "Not allowed",
      body: [
        {
          list: [
            "Harassing, bullying, threatening or impersonating anyone.",
            "Offensive display names or handles.",
            "Sexual content, and anything that sexualises or endangers a minor.",
            "Hateful content that attacks or dehumanises people.",
            "Encouraging self-harm.",
            "Instructions for violence, weapons or crime.",
            "Trying to get the AI to produce any of the above.",
          ],
        },
      ],
    },
    {
      heading: "Tools you control",
      body: [
        {
          list: [
            "Remove a friend: they are no longer connected to you.",
            "Block someone: they can't find you, send you a request, or see anything about you, and you no longer see them. You can undo it in Settings.",
            "Report someone: tell us what happened. Reports go to a review queue.",
            "Report content: use the report button on a lesson, drill or AI reply.",
            "Choose what friends see: your profile is minimal by default.",
          ],
        },
      ],
    },
    {
      heading: "What happens next",
      review: true,
      body: [
        "Reports are reviewed by a person. We may warn, restrict or end the accounts of people who break these rules, and we may remove content.",
        `For anything urgent or that can't be done in the app, email ${CONTACT_EMAIL}. If someone is in danger, contact your local emergency services first: we can't provide emergency help.`,
      ],
    },
  ],
};

export const DMCA: LegalDoc = {
  slug: "dmca",
  route: "/legal/dmca",
  title: "Copyright Complaints",
  summary: "How to tell us about copyrighted material in Lamppost.",
  updated: LEGAL_UPDATED,
  intro: `Lamppost doesn't host files that users upload. If you think something in the app copies your work, tell us.`,
  sections: [
    {
      heading: "Sending a notice",
      review: true,
      body: [
        `Email ${CONTACT_EMAIL} with:`,
        {
          list: [
            "what your work is, and where you say it is copied;",
            "where in the app it appears, in enough detail for us to find it;",
            "your name, address, phone number and email;",
            "a statement that you believe in good faith that the use isn't allowed;",
            "a statement that your notice is accurate and that you own the work or may act for the owner;",
            "your signature, typed or written.",
          ],
        },
      ],
    },
    {
      heading: "What we do",
      review: true,
      body: [
        "[LEGAL REVIEW: designated agent details, jurisdiction and safe-harbour language must be completed by a lawyer.] We look into valid notices, remove or restrict material where appropriate, and accept a reply from the person affected.",
      ],
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [
  PRIVACY,
  TERMS,
  AI_CONTENT,
  COOKIES,
  COMMUNITY,
  HEALTH,
  DMCA,
];
