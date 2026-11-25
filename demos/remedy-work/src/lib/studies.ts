/**
 * The Labs studies, one per card in "Future state explorations".
 *
 * A Labs card has no Figma file to open — the work is a question, a hypothesis and, where
 * one exists, a prototype loop — so every card here opens a page on this site instead, and
 * its hover affordance reads "Open" rather than "Open in Figma".
 *
 * Ported from the `STUDIES` array in the loblaw-labs-lite repo's `index.html`
 * (github.com/latecheckout/loblaw-labs-lite), which is the source of truth for this
 * material. The spreadsheet still owns the card copy — title, status, description — and
 * this module owns the study behind it. Keyed by the sheet's slug, so the two can only
 * meet on a row that actually exists.
 *
 * Verbatim, punctuation included: this is research copy that was written deliberately, and
 * rewording it here would put the site and the repo quietly out of step. Extracted
 * mechanically rather than retyped, for the same reason.
 *
 * Four fields in the repo are deliberately not carried over. `desk`, `either` and `prove`
 * (what lands on the desk, what we learn either way, how we know we were right) are
 * written for every study but rendered by nothing — the repo's own detail page drops them,
 * so promoting them here would invent a section the research never had. `time` is "TBD" on
 * every study, and `status` is the sheet's job.
 *
 * Six of the thirteen have footage. The rest render without a clip until one exists; their
 * page and prose are complete either way.
 */

export type StudyRun = {
  /** The step, stated as a claim. Rendered as the lead of its paragraph. */
  lead: string;
  detail: string;
};

/** A line from research, quoted as support for the hypothesis above it. */
export type StudyReceipt = {
  quote: string;
  attribution: string;
};

/**
 * The prototype footage. `card` is the short loop the thumbnail plays; `full` is the clip
 * on the page. Both 16:9 and carrying their own background, so they fill their frame edge
 * to edge. Filenames are the repo's own, so a clip's origin stays obvious.
 */
export type StudyVideo = {
  card: string;
  full: string;
  poster: string;
};

export type Study = {
  /** The sheet slug this study belongs to — the join key with `ITEMS`. */
  slug: string;
  /** Its number in the Labs set, as written there: "01", not 1. */
  number: string;
  /** The Labs category the question sits in, e.g. "Earning first use". */
  category: string;
  /** The question itself, which is the page's headline. */
  question: string;
  /** What the study actually measures. */
  testing: string;
  method?: string;
  /** Who it runs with. */
  participants?: string;
  hypothesis: string;
  why: string;
  /** What the prototype does, step by step. Only where one has been built. */
  prototype?: string[];
  run: StudyRun[];
  receipts?: StudyReceipt[];
  video?: StudyVideo;
  /**
   * Runs the card across two columns, with the clip's own 16:9 instead of the grid's 4:3.
   *
   * Nothing sets it at the moment: the loyalty scan study did, because its footage is a
   * room rather than a phone, but three cards to a row reads better than one oversized
   * tile and a hole. Kept because the treatment is built and one line turns it back on.
   */
  wide?: boolean;
};

export const STUDIES: Study[] = [
  {
    slug: "first-hello-test",
    number: "01",
    category: "Earning first use",
    question:
      "How does the agent introduce itself so the first chat starts a relationship?",
    testing:
      "The register of the first minute, warm, clinical, or brisk, measured by what people volunteer in turn two rather than what they say they liked.",
    method: "Register test",
    participants: "New to Remedy Canadians, AI wary quota seated",
    hypothesis:
      "People decide in the first exchange whether this is a someone or a something, and they tell a someone more. In health, warmth has to arrive in the same breath as competence. Charm alone reads as a toy. Pure clinical reads as a form with better manners.",
    why:
      "Onboarding polish was cut from launch and the character explorations never got a verdict, so the first minute is currently running on default. The first hello also sets the ceiling on disclosure for everything after it, which makes it an adoption question wearing a brand costume.",
    run: [
      {
        lead: "Three hellos with identical capability.",
        detail:
          "The professional, credentialed and calm. The companion, warm and on a first name basis. The concierge, brisk and capable. Everyone meets all three in random order.",
      },
      {
        lead: "A disclosure read after each hello,",
        detail:
          "measured by what people volunteer in their next turn rather than by what they say they liked. Volunteering is the honest signal.",
      },
      {
        lead: "A comeback read a day later.",
        detail:
          "Which hello they remember, and whether they describe it as the app or as a someone.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The register, not the copy. The final script is a writing pass that comes after the register is chosen.",
      },
    ],
    video: {
      card: "/demos/remedy-work/labs/agent-intro-card.mp4",
      full: "/demos/remedy-work/labs/agent-intro.mp4",
      poster: "/demos/remedy-work/labs/agent-intro-poster.jpg",
    },
  },
  {
    slug: "loyalty-scan-test",
    number: "02",
    category: "Earning first use",
    question: "How can we turn in-store behaviors into an introduction to the agent?",
    testing:
      "The Optimum scan at checkout as the acquisition moment. Habits people already have in store, turned into first conversations instead of campaigns.",
    method: "Framing test",
    participants: "Optimum members, in and out of SDM",
    hypothesis:
      "The checkout scan is the one second Loblaw already has permission to speak. An introduction framed as something the card just unlocked lands as a perk. The identical message framed as a feature announcement lands as an ad and burns the moment. Same agent, opposite first impression, decided by the frame.",
    why:
      "Ninety percent of Canadians live within ten kilometres of a store, and acquisition is currently imagined as campaigns. If the scan works, the first conversation costs nothing per person and happens at the exact moment of proven loyalty. First frames are also close to impossible to re run. Whatever this moment says, it says once.",
    prototype: [
      "The Optimum card scans at self checkout.",
      "A notification arrives framed as something the card unlocked.",
      "One tap opens the agent mid errand.",
      "The greeting already knows the points balance and the pharmacy.",
    ],
    run: [
      {
        lead: "Two framings of the same moment, traded off by every person.",
        detail:
          "The perk frame speaks in reward language and points context. The feature frame announces an assistant. Everyone sees both at a simulated checkout, in random order.",
      },
      {
        lead: "An intercept read seconds after a real scan,",
        detail:
          "because a lab reaction to a mockup and a real reaction at a real register are different data. We measure open intent and the creepy read right there.",
      },
      {
        lead: "The decline path, tested on purpose.",
        detail:
          "What a no thanks does next, whether it stays quiet or asks again, and how much resentment a re ask earns.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The winning frame and the moment. It does not settle national opt in rates, which need a live pilot. If the frame result warrants it, we will say that is the next study rather than dress this one up as the answer.",
      },
    ],
    video: {
      card: "/demos/remedy-work/labs/pc-one-loyalty-card.mp4",
      full: "/demos/remedy-work/labs/pc-one-loyalty.mp4",
      poster: "/demos/remedy-work/labs/pc-one-loyalty-poster.jpg",
    },
  },
  {
    slug: "prescription-doorway-test",
    number: "03",
    category: "Earning first use",
    question: "How does a new prescription turn into a care plan that brings someone back?",
    testing:
      "The pickup at the counter becomes the first step of a plan. Clinical advice, gentle product recommendations, and a reason to return, starting from the moment they already trust.",
    hypothesis:
      "The pickup becomes the first step of a care plan. The agent turns the prescription into a week, what changes, what to watch for, and when to come back, and folds in clinical advice and gentle product support along the way. The plan is the reason to return, and the return is where the relationship compounds.",
    why:
      "A new prescription is the highest intent moment in the business, and today it ends with a leaflet. The counter already owns the trust, the moment already has the person's attention, and nothing digital continues it.",
    run: [
      {
        lead: "The counter handoff.",
        detail: "A code on the pharmacy slip opens a plan already started.",
      },
      {
        lead: "The first week, laid out.",
        detail: "One step per day, written from the prescription itself.",
      },
      {
        lead: "The return moment.",
        detail: "A check in that brings them back to the counter or the chat.",
      },
    ],
  },
  {
    slug: "family-profile-test",
    number: "04",
    category: "Personalization and memory",
    question: "Can the agent build a family profile without ever showing a form?",
    testing:
      "A kid mentioned in passing becomes a confirmable profile the agent can use. Capture through conversation, with the consent line found rather than guessed.",
    method: "Concept test",
    participants: "Parents and caregivers managing two or more people",
    hypothesis:
      "People will not fill out family forms, but they mention family constantly in passing. If a mention becomes a confirmable card in the moment, my son Adam has diabetes becomes a profile with one tap, then capture feels like being heard instead of being filed.",
    why:
      "Dependents are the highest value context in the product and the hardest thing to ask for directly. Booking for family is one of the top jobs. Forms are historically where family features go to die, and the consent question, who confirms what about whom, has no pattern anywhere to copy.",
    receipts: [
      {
        quote:
          "They also wanted a medication manager, a lab results explainer, proactive condition tracking, and profiles for dependent family care.",
        attribution: "Research finding",
      },
    ],
    prototype: [
      "A parent mentions their son in passing.",
      "An inline card offers to remember him, one tap.",
      "A later booking asks, is this for Adam.",
      "The family view in the menu shows what the agent holds.",
    ],
    run: [
      {
        lead: "The conversational capture prototype in front of real caregivers.",
        detail:
          "Mentions become inline confirmation cards. The first measure is comprehension. Do people know a profile now exists, without being told to check.",
      },
      {
        lead: "The correction moment, staged on purpose.",
        detail:
          "The agent gets one detail wrong. We watch whether fixing it builds trust, which ownership research predicts, or breaks it.",
      },
      {
        lead: "The guardian question.",
        detail:
          "Testing who can see this framing at the moment of creation against the moment of first use, to find where the consent line has to sit.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The capture and confirm pattern. It does not settle the full household permission model, which is deep enough to be its own study.",
      },
    ],
  },
  {
    slug: "connection-test",
    number: "05",
    category: "Personalization and memory",
    question:
      "What value convinces someone to connect their health data, and what do they get back?",
    testing:
      "The value shown before the ask, and the visibly better answers after it. Includes whether people even know which records they have and what connecting does.",
    method: "Ask frame test",
    participants: "Wearable and Apple Health owners who shop SDM",
    hypothesis:
      "The connect ask fails because it arrives before any proof. Show one visibly better answer built on connected data, a preview, a sample, a named wall the agent cannot get past without it, and the tap follows. Value has to be visible before the permission is requested.",
    why:
      "The connection is one tap and almost nobody takes it. Connected labs and vitals change answer quality in a step, not a slope, which makes this single permission moment the growth lever for the entire personalization stage. Nobody has tested what the ask should look like.",
    receipts: [
      {
        quote:
          "Not just Remedy knowing their medications, but really going so far as knowing and incorporating things like their dosage, the timing of their medications, knowing ahead of time if anything with our meds have changed.",
        attribution: "Research finding",
      },
    ],
    prototype: [
      "Mid conversation, the agent names what it cannot see.",
      "A preview shows the shape of a connected answer.",
      "The consent sheet says in plain words what is shared.",
      "The first connected answer proves the trade was worth it.",
    ],
    run: [
      {
        lead: "Three asks, traded off by every person.",
        detail:
          "The cold ask as it exists today. The preview ask, a sample of what connected answers look like. The earned ask, three turns in, where the agent names the wall. With your labs I could answer this properly.",
      },
      {
        lead: "Measure the tap and the comprehension together,",
        detail:
          "because a connection someone does not understand is a revocation waiting to happen. People explain back what is shared and with whom.",
      },
      {
        lead: "A revoke read.",
        detail:
          "Whether knowing exactly how to disconnect raises willingness to connect, which is what autonomy research predicts.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The design of the ask. It does not settle whether people keep the connection over months, which is a live pilot question.",
      },
    ],
    video: {
      card: "/demos/remedy-work/labs/connection-card.mp4",
      full: "/demos/remedy-work/labs/connection.mp4",
      poster: "/demos/remedy-work/labs/connection-poster.jpg",
    },
  },
  {
    slug: "proof-test",
    number: "06",
    category: "Personalization and memory",
    question: "How does an answer feel personalized to you, and still clinically honest?",
    testing:
      "People want it to remember their medications and their history, and they want zero sense of a thumb on the scale. Recall at the right moment, recommendations for you rather than for the store.",
    hypothesis:
      "Personalization that shows its work. Recall arrives inside the task it helps with, is this booking for Adam, and recommendations carry their reasoning, chosen for your history rather than for our shelf. The same surface proves memory and motive at once.",
    why:
      "Research found people testing for memory on purpose and watching for a thumb on the scale. The burden of proof runs both directions, that the agent remembers what matters, and that what it recommends is for the person rather than for the store.",
    receipts: [
      {
        quote:
          "Someone typed, hi AI, do you remember me. They were assessing the responses to see how often it actually brought up something about their past.",
        attribution: "Research finding",
      },
      {
        quote:
          "They want to feel like their recommendations are objective and truly helpful. Not like Remedy is acting for itself.",
        attribution: "Research finding",
      },
    ],
    run: [
      {
        lead: "A booking resurfaces a remembered detail.",
        detail: "At the exact moment it saves effort, never before.",
      },
      {
        lead: "A recommendation explains itself in one line.",
        detail: "Why this, and why for you.",
      },
      {
        lead: "The memory view shows what is held.",
        detail: "Editable, deletable, and never a surprise.",
      },
    ],
  },
  {
    slug: "handoff-test",
    number: "07",
    category: "Unified agent",
    question:
      "When a health question turns into a shopping one, what does a tasteful handoff look like?",
    testing:
      "The Tylenol moment designed instead of feared. The transition, the privacy wall, and the product that arrives as care instead of upsell.",
    hypothesis:
      "The handoff designed instead of feared. The health answer completes first, the product arrives as the means to the plan rather than the point of it, and the privacy wall is visible at the moment it matters. Done tastefully, the moment the strategy fears becomes the moment it pays for itself.",
    why:
      "The stated fear about one agent is the Tylenol moment, a health question answered with a product and read as an upsell. The fear is legitimate, and the current answer is separation, which gives away the very cross pollination the strategy wants.",
    run: [
      {
        lead: "A health question gets a clinically grounded answer.",
        detail: "No product in sight.",
      },
      {
        lead: "The plan needs something, and the product arrives inside the plan.",
        detail: "The means, never the point.",
      },
      {
        lead: "The privacy line is visible right there.",
        detail: "Health data stays on the health side, and says so.",
      },
      {
        lead: "The conversation moves on without ceremony.",
        detail: "The unremarkable exit is the proof.",
      },
    ],
    video: {
      card: "/demos/remedy-work/labs/handoff-card.mp4",
      full: "/demos/remedy-work/labs/handoff.mp4",
      poster: "/demos/remedy-work/labs/handoff-poster.jpg",
    },
  },
  {
    slug: "mode-control-test",
    number: "08",
    category: "Unified agent",
    question:
      "How does someone understand what changes between health and shopping, and stay in control of it?",
    testing:
      "The differentiation a unified agent carries between its health side and its shopping side. Learned in one exposure, switchable by the person, never a trap.",
    method: "First exposure test",
    participants: "New users, no prior mode products required",
    hypothesis:
      "Modes are learned by seeing them happen, not by being told. An auto trigger with a visible, named shift teaches the system in one exposure. A picker, like choosing research in Gemini, is for the second use. And no mode can ever be a trap.",
    why:
      "The mode model has two failure states and the product is exposed to both. Confusion, where people do not know a clinical mode exists or what it protects. And the trap, an incognito style stuck state that people cannot see their way out of. Both leak trust in opposite directions.",
    prototype: [
      "A mode selector sits in the composer, optional.",
      "A clinical question auto triggers the shift instead.",
      "A coach mark names what just happened.",
      "Leaving the mode takes one visible tap.",
    ],
    run: [
      {
        lead: "Three teaching patterns at first exposure.",
        detail:
          "Auto trigger with a visible signal. Picker first. And the hybrid, auto trigger with a coach mark saying you can also choose this.",
      },
      {
        lead: "A comprehension read after one session.",
        detail:
          "Can people name the modes, say what each is for, and describe how to leave one. One exposure is the bar, because nobody rereads onboarding.",
      },
      {
        lead: "The exit test.",
        detail:
          "How visible the way out must be before the trapped feeling disappears, measured, not assumed.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The teaching pattern. It does not settle how many modes should exist, which is a product decision this evidence will inform.",
      },
    ],
    video: {
      card: "/demos/remedy-work/labs/mode-control-card.mp4",
      full: "/demos/remedy-work/labs/mode-control.mp4",
      poster: "/demos/remedy-work/labs/mode-control-poster.jpg",
    },
  },
  {
    slug: "clinical-signal-test",
    number: "09",
    category: "Creating trust",
    question:
      "What tells someone the assessment is clinically real and their data is safe?",
    testing:
      "One calm signal carrying two promises. The plain words that make the protection land, and sourcing that holds up within what the engine can actually show.",
    method: "Signal ladder test",
    participants: "SDM shoppers, mixed AI comfort",
    hypothesis:
      "Two promises have to land in the same moment. This is real medicine, and this stays private. One calm signal can carry both, a visible state change with plain words. Stacked badges and lock icons carry neither, because decoration is what selling looks like.",
    why:
      "A retail surface makes clinical credibility non obvious. The retailer is presumed to be selling until proven otherwise. Overclaiming the assessment is a liability, underclaiming wastes the pharmacy trust the whole product stands on, and the security promise currently has no words at all.",
    receipts: [
      {
        quote:
          "The moment you open your profile, I want to know the data is encrypted. I want you to say something about the protection of the data.",
        attribution: "Research finding",
      },
    ],
    prototype: [
      "A shopping question turns into a symptom question.",
      "The surface visibly shifts state, named in plain words.",
      "Assessment components carry the clinical moment.",
      "The conversation returns to normal, and says so.",
    ],
    run: [
      {
        lead: "A signal ladder with four intensities,",
        detail:
          "from a quiet shift in the chrome to a full banner with credentials. We find where I noticed meets I believe.",
      },
      {
        lead: "The security half in the same moment.",
        detail:
          "The state change runs with and without a plain words data line, and we test which single word actually carries. Private, encrypted, never used for marketing.",
      },
      {
        lead: "The overclaim check.",
        detail:
          "Whether stronger signals raise expectations past what a triage conversation can deliver, which would trade a launch problem for a bigger one.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The signal and the words. It does not settle the legal copy, which routes through privacy review no matter what wins.",
      },
    ],
    video: {
      card: "/demos/remedy-work/labs/clinical-signal-card.mp4",
      full: "/demos/remedy-work/labs/clinical-signal.mp4",
      poster: "/demos/remedy-work/labs/clinical-signal-poster.jpg",
    },
  },
  {
    slug: "canadian-trust-test",
    number: "10",
    category: "Creating trust",
    question:
      "Does advice built for Canada earn more trust than advice built for everyone?",
    testing:
      "Provincial coverage, Canadian guidelines, data that stays in the country, named plainly against what a global assistant says. No receipt yet, and the one card no US product can copy.",
    method: "Provenance test",
    participants: "Canadians who already ask AI health questions",
    hypothesis:
      "Built for here is a trust multiplier the global assistants cannot copy. Provincial coverage, Canadian guidelines, data that stays in the country, named plainly, moves belief more than any generic accuracy claim. If it does not, the flag is decoration.",
    why:
      "The real competitor is already on the phone, and it is not another pharmacy, it is the generic assistant. Sentiment toward AI is the named executive worry. The Canadian card is the one differentiator that costs nothing but placement, if it turns out to carry weight.",
    run: [
      {
        lead: "Same answer, three provenance frames.",
        detail:
          "No provenance. Generic, evidence based. Canadian, with the guideline named, the province acknowledged, and a data residency line.",
      },
      {
        lead: "A live comparator, not a vacuum.",
        detail:
          "Each frame gets judged next to what a global assistant says to the same question, because that is the real bar in the real world.",
      },
      {
        lead: "A which line test.",
        detail:
          "Coverage, guidelines, residency. Which single line does the lifting, so the product leads with the one that works.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The frame and the lead line. It does not settle regulatory copy, which has its own review.",
      },
    ],
  },
  {
    slug: "lifestyle-surface-test",
    number: "11",
    category: "Earning loyalty",
    question: "What makes a health surface worth opening on a day you feel fine?",
    testing:
      "The surface that reflects the person back. Plans mid flight, family, one next step. The reason to open it on the first visit and still on the fifteenth.",
    method: "Week long field test",
    participants: "PC Health users, mixed engagement",
    hypothesis:
      "Symptom less opens come from a surface that reflects the person back. Their plans mid flight, their family, one thing worth doing today. Recognition is the pull, not information. Content feeds are where health apps go to be ignored.",
    why:
      "The retention story depends on healthy day opens, and nothing in the product today gives a healthy person a reason to look. The smart surface work already exists to port, and the feed alternative has failed publicly enough times that testing before building is the whole point.",
    receipts: [
      {
        quote:
          "For most people it didn't feel like it had these really compelling differentiators to draw loyalty yet.",
        attribution: "Research finding",
      },
    ],
    prototype: [
      "The morning surface reflects the household back.",
      "A plan card shows the week mid flight.",
      "A family card holds the next thing for Adam.",
      "One next step, and nothing else asking for attention.",
    ],
    run: [
      {
        lead: "Two surfaces, one week each.",
        detail:
          "The mirror. Your plans, your people, one next step. The feed. Tips, articles, seasonal content. Same participants, both weeks, order randomized.",
      },
      {
        lead: "Count the symptom less opens and what followed.",
        detail:
          "An open that leads to a completed step is worth more than three that lead nowhere.",
      },
      {
        lead: "An emptiness test.",
        detail:
          "What the mirror shows a brand new user before there is anything to reflect, because the cold start is where mirror surfaces usually die.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The surface model. It does not settle the card taxonomy, which follows once the model wins.",
      },
    ],
  },
  {
    slug: "programs-test",
    number: "12",
    category: "Earning loyalty",
    question:
      "What turns one good answer into a program someone follows and comes back to?",
    testing:
      "From starting point to routine. A Shoppers program anchored in medication and condition support, a lifestyle one for sleep or quitting, built so following it becomes the relationship.",
    method: "Longitudinal concept test",
    participants: "People with an active goal, sleep, quitting, a new routine",
    hypothesis:
      "Answers end conversations. Programs continue them. A good answer becomes a followed program when the agent proposes the next seven days unasked, one step per day, with a finish line the person can see. People follow structure they can see the end of.",
    why:
      "The steering outcome for the whole page is goals completed, and the conversion moment from answer to plan is the least understood step in that chain. Two program families fit naturally, a Shoppers program anchored in medication and condition support, and a lifestyle program for sleep or quitting. Neither has a tested front door.",
    receipts: [
      {
        quote:
          "They very much have a mental model that the AI is a starting point. It's not meant to be an absolute answer. It's seven out of ten as a first start internet resource.",
        attribution: "Research finding",
      },
    ],
    run: [
      {
        lead: "The offer moment, three ways.",
        detail:
          "No offer as control. The soft ask, want a plan for this. The assembled offer, here is your week, accept or edit it.",
      },
      {
        lead: "Follow through over ten days,",
        detail:
          "with light check ins, because a program that converts starts and loses everyone by day four has not converted anything.",
      },
      {
        lead: "The edit read.",
        detail:
          "Whether people who edit day one follow longer, which ownership research predicts and which would change how the offer is built.",
      },
      {
        lead: "What this settles, stated plainly.",
        detail:
          "The offer pattern and early follow through. It does not settle clinical program content, which routes through validation.",
      },
    ],
  },
  {
    slug: "head-start-test",
    number: "13",
    category: "Earning loyalty",
    question:
      "What makes switching from ChatGPT feel like an upgrade instead of starting over?",
    testing:
      "Day one context from connection and profile against the incumbent's accumulated memory. The switching story, designed and measured.",
    hypothesis:
      "Day one that feels like year two. Connection and profile give the agent real context before the first question is even finished, the prescriptions, the family, the pharmacy relationship, so the first answer already knows things the incumbent never will. Switching framed as an upgrade, not a restart.",
    why:
      "The switching cost is not features, it is history. Research participants named the incumbent's accumulated memory as the reason to stay, and every month it goes untested, the head start compounds.",
    receipts: [
      {
        quote:
          "They've established a long history of use already. So long history and profile and memory. That's a benefit of using something else that we will be considering when thinking about whether to switch or adopt the habit of using Remedy.",
        attribution: "Research finding",
      },
    ],
    run: [
      {
        lead: "The first conversation opens already knowing the pharmacy context.",
        detail: "No cold start, no interview.",
      },
      {
        lead: "A side by side of the same question.",
        detail: "With the head start and without it.",
      },
      {
        lead: "The moment people notice it knows.",
        detail: "Found and measured, because that moment is the pitch.",
      },
    ],
  },
];

/** The study behind a card, if that card has one. */
export function studyFor(slug: string): Study | undefined {
  return STUDIES.find((study) => study.slug === slug);
}

/** Where a study's page lives. One place to change if the route ever moves. */
export function studyPath(slug: string): string {
  return `/labs/${slug}`;
}
