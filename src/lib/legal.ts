/**
 * Legal page scaffolding.
 *
 * IMPORTANT: every section flagged `review: true` is a PLACEHOLDER that must be
 * written or approved by an attorney before launch. It is deliberately written
 * as structure plus factual description of how the app actually behaves, not as
 * finished legal copy.
 */

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
  intro: string;
  sections: LegalSection[];
};

export const LEGAL_CONTACT = "legal@lamppost.app";
export const PRIVACY_CONTACT = "privacy@lamppost.app";
export const SAFETY_CONTACT = "safety@lamppost.app";
export const LEGAL_UPDATED = "Draft — not yet reviewed";

export const PRIVACY: LegalDoc = {
  slug: "privacy",
  route: "/legal/privacy",
  title: "Privacy Policy",
  summary: "What we collect, why, and how to get your data out or deleted.",
  updated: LEGAL_UPDATED,
  intro:
    "This describes the data Lamppost actually stores today, written against the real database schema so it can be reviewed for accuracy rather than adapted from a template.",
  sections: [
    {
      heading: "Data we collect",
      review: true,
      body: [
        "Account data: your email address and sign-in identity (email/password or Google), created when you sign up.",
        "Profile data: display name, handle, invite code, chosen companion character, daily lesson goal, and notification preferences.",
        "Learning data: courses you generate, your course setup answers (length, difficulty, quiz rigor, experience level, focus, and the free-text goal you type), lesson and review progress, streaks, XP, gems, achievements, and per-day activity counts.",
        "Social data: friend requests and friendships, shared streaks, and nudges you send or receive.",
        "Safety data: content reports you file, including the reason, your notes, and an excerpt of the flagged lesson.",
        "Device and technical data: standard request data such as IP address and user agent, used for security and abuse prevention.",
        "We do not ask for health records, precise location, payment details, or government identifiers. If you type health or fitness details into a course setup field, that free text is stored with your course request.",
      ],
    },
    {
      heading: "Why we use it",
      review: true,
      body: [
        {
          list: [
            "To create your account and keep you signed in.",
            "To generate the courses you ask for and remember your progress across devices.",
            "To power streaks, goals, achievements, and friend features you opt into.",
            "To detect abuse, enforce the content rules, and respond to content reports.",
            "To fix bugs and keep the service running.",
          ],
        },
        "We do not use your data to serve behavioural advertising, and we do not sell it.",
      ],
    },
    {
      heading: "AI processing and third parties",
      review: true,
      body: [
        "Course generation runs through an AI provider reached via the Lovable AI Gateway. When you request a course, the text sent off-device is limited to what the request needs: your topic, the setup answers you chose, and your free-text goal. Your email, name, handle, friends, and progress history are not sent to the AI provider.",
        "Accounts, database, and authentication are hosted on our backend provider. These providers process data on our behalf under their own terms.",
        "Avoid typing anything you consider sensitive into the topic or goal fields, since that text is sent to the AI provider to fulfil the request.",
      ],
    },
    {
      heading: "How long we keep it",
      review: true,
      body: [
        "Account, profile, learning, and social data are kept while your account exists. When you delete your account, we delete or irreversibly anonymise it (see below). Content reports and moderation logs are retained in anonymised form so safety decisions remain auditable.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "You can export a machine-readable copy of your data and permanently delete your account from Settings → Legal & your data. Deletion removes your profile, progress, activity history, friendships, shared streaks, and nudges, and detaches your identity from any safety records; it is not a deactivation.",
        "Depending on where you live you may also have rights to correction, restriction, objection, or complaint to a regulator.",
        `For any request you cannot complete in the app, contact ${PRIVACY_CONTACT}.`,
      ],
    },
    {
      heading: "Children's data",
      review: true,
      body: [
        "[LEGAL REVIEW — minimum age must be decided and stated here before launch.] Lamppost is not directed to children under 13, and we do not knowingly collect personal data from them. If we learn that an account belongs to a child under 13, we delete the account and its data.",
        "Because Lamppost generates courses from open-ended prompts, generation is constrained by system-level content rules for a general audience. See the AI-Generated Content notice.",
      ],
    },
    {
      heading: "Security and changes",
      review: true,
      body: [
        "Data is stored with per-user access rules so one account cannot read another's records. No system is perfectly secure.",
        `We will post changes to this policy on this page and update the date above. Questions: ${PRIVACY_CONTACT}.`,
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  slug: "terms",
  route: "/legal/terms",
  title: "Terms of Service",
  summary: "The rules for using Lamppost, plus account and termination terms.",
  updated: LEGAL_UPDATED,
  intro:
    "These terms govern your use of Lamppost. [LEGAL REVIEW — the operating legal entity, governing law, dispute resolution, and liability limits must be filled in by an attorney.]",
  sections: [
    {
      heading: "Your account",
      review: true,
      body: [
        "You need an account to use Lamppost, you must provide accurate information, and you are responsible for activity under your account. [LEGAL REVIEW — insert minimum age; if under the age of majority, a parent or guardian must agree to these terms.]",
      ],
    },
    {
      heading: "Prohibited conduct",
      body: [
        "You agree not to:",
        {
          list: [
            "Prompt the course generator for sexual or adult content, or for anything sexualising or endangering a minor.",
            "Prompt for operational instructions for violence, weapons, explosives, crime, hacking, or drug synthesis.",
            "Use Lamppost to obtain personalised medical, legal, or financial instructions, or present its output as professional advice to others.",
            "Attempt to bypass the content rules, rate limits, or safety systems.",
            "Harass other users through friend requests, handles, display names, or nudges.",
            "Scrape, resell, or redistribute generated content as if it were human-authored or professionally verified.",
          ],
        },
      ],
    },
    {
      heading: "AI-generated content",
      body: [
        "Lessons, quizzes, and programs are generated by AI, may be wrong, and are not professional advice. See the AI-Generated Content notice and, for any training or fitness program, the Health & Fitness Disclaimer, which both form part of these terms.",
      ],
    },
    {
      heading: "Content, ownership, and reporting",
      review: true,
      body: [
        "You keep the rights to the text you type. Generated course content is provided for your personal learning use. Report anything that breaks the rules using the report control on the lesson screen or the Community Guidelines page.",
      ],
    },
    {
      heading: "Suspension and termination",
      review: true,
      body: [
        "We may suspend or terminate accounts that break these terms, particularly the content rules above, with or without notice where the violation is severe. You can delete your account at any time from Settings.",
      ],
    },
    {
      heading: "Disclaimers and liability",
      review: true,
      body: [
        "[LEGAL REVIEW — attorney-drafted warranty disclaimer, limitation of liability, indemnity, governing law, and dispute-resolution clauses go here. Do not ship generated boilerplate.] Lamppost is provided \"as is\", and you use it at your own risk.",
      ],
    },
  ],
};

export const HEALTH: LegalDoc = {
  slug: "health",
  route: "/legal/health",
  title: "Health & Fitness Disclaimer",
  summary: "Read before starting any training, workout, or nutrition program.",
  updated: LEGAL_UPDATED,
  intro:
    "This applies to every training, workout, sprint, stretching, or nutrition program Lamppost generates. It is separate from the general AI disclaimer on purpose.",
  sections: [
    {
      heading: "Talk to a doctor first",
      review: true,
      body: [
        "Consult a qualified physician before starting any new exercise, training, or nutrition program, especially if you are pregnant, under 18, over 65, recovering from injury or surgery, or living with a heart, lung, joint, metabolic, or eating-related condition.",
      ],
    },
    {
      heading: "Not coaching or medical supervision",
      review: true,
      body: [
        "Lamppost is not a coach, trainer, physiotherapist, dietitian, or medical provider, and generated programs are not personalised to your body, history, technique, equipment, or environment. They are not a substitute for in-person instruction or medical supervision.",
      ],
    },
    {
      heading: "Your own risk",
      review: true,
      body: [
        "Physical training carries a risk of serious injury or death. You perform any generated program entirely at your own risk. Stop immediately and seek medical attention if you feel pain, dizziness, chest discomfort, shortness of breath, or faintness.",
        "[LEGAL REVIEW — attorney-drafted assumption of risk, waiver, and liability limitation for injury go here.] To the fullest extent permitted by law, Lamppost and its operator are not liable for injury, illness, or loss resulting from following generated content.",
      ],
    },
    {
      heading: "Emergencies",
      body: ["If you think you are having a medical emergency, call your local emergency number now."],
    },
  ],
};

export const AI_CONTENT: LegalDoc = {
  slug: "ai-content",
  route: "/legal/ai-content",
  title: "AI-Generated Content Notice",
  summary: "How courses are generated, what the limits are, and how to report content.",
  updated: LEGAL_UPDATED,
  intro:
    "Every lesson, quiz, key point, and program in Lamppost is written by an AI model from the topic and setup answers you provide. No human reviews it before you see it.",
  sections: [
    {
      heading: "It can be wrong",
      review: true,
      body: [
        "Generated content may contain factual errors, outdated information, or confident-sounding mistakes. It is not professional, medical, legal, or financial advice. Verify anything important with a primary source or a qualified professional before acting on it.",
      ],
    },
    {
      heading: "Content rules on generation",
      body: [
        "Course requests are screened before anything is written, and the generated text is screened again before it reaches you. Requests for sexual content, content involving minors, operational instructions for violence, weapons, crime, or self-harm, hateful content, and personalised medical dosing or treatment instructions are refused rather than generated.",
        "No automated system is perfect. If something disallowed reaches you, use the report control on the lesson screen — reports are reviewed and used to tighten the rules.",
      ],
    },
    {
      heading: "Fitness and health programs",
      body: [
        "Training and nutrition content carries its own, stricter disclaimer. Read the Health & Fitness Disclaimer before following any program.",
      ],
    },
    {
      heading: "Quizzes and scoring",
      body: [
        "Quiz questions, options, and explanations are also generated. A quiz answer marked correct reflects the model's reasoning, not a graded assessment or certification of any kind.",
      ],
    },
  ],
};

export const COOKIES: LegalDoc = {
  slug: "cookies",
  route: "/legal/cookies",
  title: "Cookies & Tracking",
  summary: "What is stored on your device and why.",
  updated: LEGAL_UPDATED,
  intro:
    "Lamppost keeps this deliberately small: there are no advertising cookies, no ad networks, and no third-party tracking pixels.",
  sections: [
    {
      heading: "What we store on your device",
      review: true,
      body: [
        {
          list: [
            "Authentication storage: keeps you signed in. Required for the app to work.",
            "Local app storage: your generated courses, progress, review schedule, companion choice, and onboarding state, so the app works instantly and offline-first.",
          ],
        },
        "Clearing your browser storage signs you out and removes locally cached courses and progress that has not synced.",
      ],
    },
    {
      heading: "Analytics and advertising",
      review: true,
      body: [
        "Lamppost does not currently run analytics, advertising, or cross-site tracking. [LEGAL REVIEW — if analytics or ads are ever added, this page and the Privacy Policy must be updated first, and consent obtained where required.]",
      ],
    },
  ],
};

export const COMMUNITY: LegalDoc = {
  slug: "community",
  route: "/legal/community",
  title: "Community Guidelines & Reporting",
  summary: "What isn't allowed, and how to report generated content.",
  updated: LEGAL_UPDATED,
  intro:
    "Lamppost has two kinds of content: what the AI generates for you, and the small amount of text people choose (display names, handles, and nudges to friends). Both are covered here.",
  sections: [
    {
      heading: "Not allowed",
      body: [
        {
          list: [
            "Sexual or adult content, and anything sexualising or endangering a minor.",
            "Instructions for violence, weapons, explosives, crime, hacking, or drug synthesis.",
            "Encouragement of self-harm, suicide, or eating disorders.",
            "Hateful content that attacks or dehumanises people.",
            "Harassment of other users through names, handles, or nudges.",
            "Deliberate attempts to jailbreak the generator into producing any of the above.",
          ],
        },
      ],
    },
    {
      heading: "How to report",
      body: [
        "Tap the flag control at the bottom of any lesson to report generated content. You choose a reason, can add details, and we capture which course and lesson it came from plus a short excerpt.",
        `To report a user's name, handle, or nudges, or anything urgent, email ${SAFETY_CONTACT}.`,
      ],
    },
    {
      heading: "What happens next",
      review: true,
      body: [
        "Reports are queued for human review. Confirmed violations lead to tightened generation rules and, where a person deliberately drove the violation, warnings, suspension, or termination of the account.",
        "If you believe there is a risk to someone's safety, contact your local emergency services first — we cannot provide emergency help.",
      ],
    },
  ],
};

export const DMCA: LegalDoc = {
  slug: "dmca",
  route: "/legal/dmca",
  title: "Copyright & DMCA Policy",
  summary: "How to submit a copyright claim and how we respond.",
  updated: LEGAL_UPDATED,
  intro:
    "Lamppost does not host user-uploaded files today. Generated lessons could still reproduce protected material, so this process exists for rights holders.",
  sections: [
    {
      heading: "Submitting a claim",
      review: true,
      body: [
        `Send a notice to ${LEGAL_CONTACT} including:`,
        {
          list: [
            "Identification of the copyrighted work you say was infringed.",
            "The course and lesson where the material appears, with enough detail for us to find it.",
            "Your name, address, phone number, and email.",
            "A statement that you believe in good faith the use is not authorised.",
            "A statement, under penalty of perjury, that your notice is accurate and you are the owner or authorised to act for the owner.",
            "Your physical or electronic signature.",
          ],
        },
      ],
    },
    {
      heading: "Our response and counter-notice",
      review: true,
      body: [
        "[LEGAL REVIEW — designated agent details, jurisdiction, and safe-harbour language must be completed by an attorney.] We remove or restrict material that a valid notice identifies, notify the affected account where possible, and accept counter-notices at the same address. Repeated infringement can end an account.",
      ],
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [
  PRIVACY,
  TERMS,
  HEALTH,
  AI_CONTENT,
  COOKIES,
  COMMUNITY,
  DMCA,
];
