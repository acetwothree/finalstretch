import { launchTemplateName } from "./classify";
import { clamp } from "./utils";
import type {
  AnalysisResult,
  Answers,
  AppBrief,
  ChecklistResult,
  ChecklistTask,
  CopilotPayload,
  ExecuteResult,
  Platform,
  ProjectMeta,
} from "./types";

function cp(
  summary: string,
  steps: [string, string][],
  extra?: { codeDiff?: string; language?: string; manual?: string },
): CopilotPayload {
  return {
    summary,
    steps: steps.map(([title, detail]) => ({ title, detail })),
    ...extra,
  };
}

const clip = (mins: number) => clamp(mins, 5, 480);

/* ------------------------------- analysis -------------------------------- */

export function mockAnalysis(meta: ProjectMeta): AnalysisResult {
  const noteCount = meta.notes.filter((n) => !n.startsWith("Structure looks")).length;
  const readiness = clamp((meta.builtPercent ?? 78) - noteCount * 2, 55, 92);

  const DEFER = "Not sure — you decide";

  const targetOptions: Record<Platform, string[]> = {
    ios: [
      "Put it on the App Store for anyone",
      "Share with a small test group first",
      DEFER,
    ],
    android: [
      "Put it on Google Play for anyone",
      "Share with a small test group first",
      DEFER,
    ],
    game: ["Sell it on Steam", "Put it on itch.io", DEFER],
    web: [
      "Open to anyone on the web",
      "Private / invite-only for now",
      "Just me or my team",
      DEFER,
    ],
    python: [
      "A website or API anyone can use",
      "A tool other people install and run",
      "Runs quietly in the background on a schedule",
      DEFER,
    ],
    cli: [
      "Other people install it from a package manager",
      "A file people download from GitHub",
      DEFER,
    ],
    desktop: [
      "A download anyone can install",
      "Through an app store",
      DEFER,
    ],
  };

  return {
    summary: `Triage: ${meta.name} is a ${meta.detectedType} sitting at roughly ${
      meta.builtPercent ?? readiness
    }% done. The build works — what's missing is the last-mile: ${
      meta.platform === "ios"
        ? "App Store compliance, screenshots, and a TestFlight pass"
        : meta.platform === "game"
          ? "Steam store setup, capsule art, and a review submission"
          : "deploy wiring, legal pages, and launch assets"
    }. That's a weekend, not a rewrite.`,
    readiness,
    questions: [
      {
        id: "target",
        question: "Who gets to use this, and how do they get it?",
        hint: "Not sure? Pick the last option and FinalStretch assumes the most common choice for this kind of project.",
        options: targetOptions[meta.platform] ?? targetOptions.web,
        allowCustom: true,
      },
      {
        id: "database",
        question:
          "When someone closes your app and comes back later, should their stuff still be there?",
        hint: "This tells FinalStretch whether you still need somewhere to store data.",
        options: [
          "Yes — accounts and data need to be saved",
          "No — it doesn't need to remember anything",
          "It already saves data and that part works",
          "Not sure — you check the code",
        ],
      },
      {
        id: "assets",
        question:
          "How ready are the things people see first — your icon, screenshots, and description?",
        hint: "The words and images on your store page or landing page. Guessing is fine.",
        options: [
          "Haven't started them",
          "Rough drafts exist",
          "Pretty much done",
          "Not sure — you check",
        ],
      },
    ],
  };
}

/* ------------------------------- checklist ------------------------------- */

type Draft = Omit<ChecklistTask, "done">;

const DEFAULT_TARGET: Record<Platform, string> = {
  ios: "the App Store",
  android: "Google Play",
  game: "Steam",
  web: "a public web launch",
  python: "a public web service",
  cli: "a package-manager release",
  desktop: "a signed public download",
};

function isDefer(answer: string | undefined) {
  return !answer || /not sure|you (decide|check|pick)/i.test(answer);
}

type GoalKind = "sales" | "growth" | "customers" | "polish" | "live";

function goalKindOf(brief: AppBrief | null, answers: Answers): GoalKind {
  const g = `${brief?.goal ?? ""} ${answers.goal ?? ""}`.toLowerCase();
  if (/sell|copies|revenue|paid download|purchase|buyers/.test(g)) return "sales";
  if (/first (paying )?customer|first sale|validate|early adopter/.test(g)) return "customers";
  if (/signup|sign-up|retention|growth|free|viral|dau|mau|audience/.test(g)) return "growth";
  if (/polish|quality|portfolio|proud|showcase|resume/.test(g)) return "polish";
  return "live";
}

export function mockChecklist(
  meta: ProjectMeta,
  answers: Answers,
  brief: AppBrief | null = null,
): ChecklistResult {
  const dbAnswer = answers.database ?? "";
  const dbDetected = /prisma|supabase|firebase|drizzle|postgres|sqlite|mongo/i.test(
    meta.detectedStack.join(" "),
  );
  const needsSaving = /saved|accounts and data/i.test(dbAnswer);
  // add the "provision a datastore" task when they need persistence and none is wired up
  const noDb =
    (needsSaving || isDefer(dbAnswer) || /still mocked|nothing yet/i.test(dbAnswer)) &&
    !/already saves/i.test(dbAnswer) &&
    !dbDetected;
  const assetsEarly = /haven't|not started|rough|not sure/i.test(answers.assets ?? "");
  const secretLeak = meta.notes.some((n) => /secret leak|rotate those keys|raw \.env/i.test(n));
  const noCi = meta.notes.some((n) => /no ci/i.test(n));
  const target = isDefer(answers.target)
    ? DEFAULT_TARGET[meta.platform] ?? "a public launch"
    : answers.target!;

  const tasks: Draft[] = [];
  const add = (t: Draft) => tasks.push(t);

  /* ---------- Critical Code Fixes ---------- */
  add({
    id: "secrets",
    title: "Get every secret out of the source tree",
    description: "A committed key is a stranger spending your money. This blocks launch, full stop.",
    category: "Critical Code Fixes",
    severity: secretLeak ? "critical" : "high",
    estMinutes: 35,
    copilot: cp(
      "Done = no credential anywhere in the repo or its git history, and the leaked ones are rotated.",
      [
        ["Hunt", "Search the whole repo and history for `API_KEY`, `SECRET`, `token`, `sk-`, `AKIA`, and long base64 blobs."],
        ["Move", "Put each value in `.env.local` (gitignored) and read it via `process.env.*`. Never at module top level without a guard."],
        ["Template", "Commit a keys-only `.env.example` so the next person knows what to set."],
        ["Rotate", "Regenerate anything that ever hit a commit. Assume it's burned."],
      ],
      {
        language: "diff",
        codeDiff: [
          "--- a/src/lib/client.ts",
          "+++ b/src/lib/client.ts",
          '-const API_KEY = "sk-live-1a2b3c4d5e6f";',
          "+const API_KEY = process.env.SERVICE_API_KEY;",
          '+if (!API_KEY) throw new Error("SERVICE_API_KEY is not set");',
        ].join("\n"),
      },
    ),
  });
  add({
    id: "todos",
    title: "Close the TODO/FIXME blockers on the main path",
    description: "The stuck-at-80% trap is half-wired branches in the one flow users actually take.",
    category: "Critical Code Fixes",
    severity: "high",
    estMinutes: 90,
    copilot: cp(
      "Done = zero `[block]` TODOs left in the primary user flow. Everything else becomes an issue.",
      [
        ["List", "Search `TODO|FIXME|HACK|XXX`, dump results into a scratch file."],
        ["Triage", "Tag each `[block]`, `[later]`, or `[cut]`. Be brutal — most are `[later]`."],
        ["Fix blockers only", "Work the `[block]` list top-down. File `[later]` items as issues so they leave your head."],
      ],
    ),
  });
  add({
    id: "states",
    title: "Add loading / empty / error states to the primary screen",
    description: "A white flash or an unhandled rejection on first load reads as 'broken' to a new user.",
    category: "Critical Code Fixes",
    severity: "medium",
    estMinutes: 60,
    copilot: cp(
      "Done = the main async view renders something deliberate in all three non-success states.",
      [
        ["Loading", "Skeleton or spinner while the first request is in flight — not `null`."],
        ["Empty", "Zero-data view with one line of explanation and the next action."],
        ["Error", "Catch, show a retry, and log the real error somewhere you can see it."],
      ],
    ),
  });
  if (noDb) {
    add({
      id: "provision-db",
      title: "Set up somewhere real to store data, and load it once",
      description:
        "Your app needs to remember things between visits, and nothing durable is wired up yet. State has to survive a refresh before you ship.",
      category: "Critical Code Fixes",
      severity: "critical",
      estMinutes: 75,
      copilot: cp(
        "Done = the deployed app reads and writes a hosted database, mocks deleted.",
        [
          ["Create it", "Spin up a free Neon or Supabase Postgres. Copy the pooled connection string."],
          ["Wire it", "Set `DATABASE_URL` in `.env.local` and in the host's env settings."],
          ["Migrate", "Run your ORM's migrate command against the new URL, seed one row."],
          ["Swap mocks", "Replace the in-memory layer with real queries behind the same function signatures."],
        ],
        { language: "bash", manual: "npx prisma migrate deploy   # or drizzle-kit push / alembic upgrade head" },
      ),
    });
  }

  /* ---------- Deployment & Compliance (platform-specific) ---------- */
  platformDeployTasks(meta.platform, meta).forEach(add);

  add({
    id: "legal-pages",
    title: "Publish a Privacy Policy and Terms",
    description: "App stores, ad networks, and Stripe all block you without them. Non-negotiable.",
    category: "Deployment & Compliance",
    severity: "high",
    estMinutes: 40,
    copilot: cp(
      "Done = both live at stable URLs and linked from the footer, sign-up, and store listing.",
      [
        ["Generate", "Use a generator (Termly / iubenda / privacypolicies.com), then edit to match what you ACTUALLY collect."],
        ["Host", meta.platform === "ios" || meta.platform === "game"
          ? "Put them on a plain web page you control — the store listing needs a public URL."
          : "Add `/privacy` and `/terms` routes."],
        ["Link", "Footer + sign-up screen + store metadata all point at them."],
      ],
      {
        manual: [
          "1. Go to termly.io → Create Free Policy → Privacy Policy.",
          "2. Answer the wizard truthfully: analytics? auth? payments? third-party SDKs?",
          "3. Copy the generated text. Paste-ready intro clause if you need a stopgap:",
          '   "We collect the minimum data needed to run <APP>: your email for sign-in, and anonymous usage analytics. We do not sell personal data. Contact <EMAIL> to request deletion."',
          "4. Publish at https://<yourdomain>/privacy and /terms.",
          "5. Add both URLs to your store listing and app footer.",
        ].join("\n"),
      },
    ),
  });
  if (noCi) {
    add({
      id: "ci",
      title: "Add CI that builds + tests on every push",
      description: "One broken merge on launch day is a bad week instead of a bad hour.",
      category: "Deployment & Compliance",
      severity: "medium",
      estMinutes: 45,
      copilot: cp(
        "Done = a required green check on `main` before anything merges.",
        [
          ["Workflow", "`.github/workflows/ci.yml`, triggered on push + pull_request."],
          ["Steps", "checkout → setup runtime → install → build → test."],
          ["Protect", "Settings → Branches → require the check to pass."],
        ],
        {
          language: "yaml",
          codeDiff: [
            "--- /dev/null",
            "+++ b/.github/workflows/ci.yml",
            "+name: CI",
            "+on: [push, pull_request]",
            "+jobs:",
            "+  build:",
            "+    runs-on: ubuntu-latest",
            "+    steps:",
            "+      - uses: actions/checkout@v4",
            "+      - uses: actions/setup-node@v4",
            "+        with: { node-version: 20, cache: npm }",
            "+      - run: npm ci",
            "+      - run: npm run build",
            "+      - run: npm test --if-present",
          ].join("\n"),
        },
      ),
    });
  }

  /* ---------- Marketing & Assets ---------- */
  add({
    id: "pitch",
    title: "Write the one-line pitch + 3 benefit bullets",
    description: "If you can't say it in a sentence, the landing copy and store description stay stuck too.",
    category: "Marketing & Assets",
    severity: assetsEarly ? "high" : "medium",
    estMinutes: 30,
    copilot: cp(
      "Done = one sentence and three outcome bullets you'd say out loud without cringing.",
      [
        ["Sentence", "'<Product> helps <who> <do X> without <the annoying part>.'"],
        ["Bullets", "Outcomes, not features. What the user gets, not what you built."],
        ["Test it", "Say it to someone outside the project. If they can repeat it back, it's done."],
      ],
      {
        manual:
          "Fill this in and stop editing:\nPitch: ____ helps ____ ____ without ____.\n• ____\n• ____\n• ____\nThis exact text goes on the landing hero AND the store description.",
      },
    ),
  });
  add({
    id: "store-visuals",
    title:
      meta.platform === "ios"
        ? "Produce the App Store screenshot set"
        : meta.platform === "game"
          ? "Cut the Steam capsule + header art"
          : "Design the hero image + OG card",
    description: "The first visual does 80% of the convincing before anyone reads a word.",
    category: "Marketing & Assets",
    severity: assetsEarly ? "high" : "medium",
    estMinutes: 90,
    copilot: cp(
      "Done = the money shot, framed, captioned, exported at every required size.",
      [
        ["Pick the shot", "The one screen that makes the value obvious. Lead with it."],
        ["Frame + caption", "Device/browser frame plus a 3-5 word caption per image."],
        [
          "Export",
          meta.platform === "ios"
            ? "6.7\" (1290x2796) and 6.5\" (1242x2688) iPhone sets; 12.9\" iPad if universal."
            : meta.platform === "game"
              ? "See the manual steps for exact Steam sizes."
              : "1200x630 OG image + a 2x hero.",
        ],
      ],
      meta.platform === "game"
        ? {
            manual: [
              "Steam art sizes (export PNG, no alpha):",
              "• Header capsule: 460 x 215",
              "• Small capsule: 231 x 87  (readable at thumbnail size — big logo, few words)",
              "• Main capsule: 616 x 353",
              "• Vertical / library capsule: 600 x 900",
              "• Library hero: 3840 x 1240",
              "• Page background: 1438 x 810",
              "Upload under Steamworks → your app → Store Presence → Graphical Assets. Then Publish to the store.",
            ].join("\n"),
          }
        : meta.platform === "ios"
          ? {
              manual: [
                "1. Xcode → Simulator, run the app on iPhone 15 Pro Max (6.7\") and iPhone 8 Plus (6.5\").",
                "2. Cmd+S in the simulator captures at the exact required pixel size.",
                "3. Frame + caption them (Screenshots.pro, Previewed, or Figma).",
                "4. App Store Connect → your app → [version] → App Preview and Screenshots → drag the 6.7\" set (others auto-scale).",
                "5. Minimum 3, ideally 5-6. First two matter most — they show in search.",
              ].join("\n"),
            }
          : undefined,
    ),
  });
  add({
    id: "launch-post",
    title: "Draft the launch post",
    description: "Product Hunt / r/SideProject / X reward a specific story, not a feature dump.",
    category: "Marketing & Assets",
    severity: "medium",
    estMinutes: 45,
    copilot: cp(
      "Done = a post with a hook, a 20-second demo clip, and one clear ask.",
      [
        ["Hook", "One sentence of tension: the problem you kept hitting."],
        ["Show", "A GIF or short screen recording of the core loop."],
        ["Ask", "End with one call to action and the link. Nothing else."],
      ],
      {
        manual: [
          "Product Hunt: log in the night before, schedule for 12:01am PT. Fields:",
          "• Tagline (≤60 chars): the pitch sentence, trimmed.",
          "• First comment (you post it): 'I built this because ____. It does ____. Would love feedback on ____.'",
          "• Gallery: the OG image first, then 2-3 screenshots.",
          "Reddit r/SideProject: title = what it is + what's done. Body = the story + link. No hype words.",
        ].join("\n"),
      },
    ),
  });
  add({
    id: "landing-capture",
    title: "Ship a landing page with email capture",
    description: "Launch traffic is a one-time event. Catch it so a quiet week isn't a dead one.",
    category: "Marketing & Assets",
    severity: "low",
    estMinutes: 60,
    copilot: cp(
      "Done = one page: pitch, visual, one input, one button, wired to a real list.",
      [
        ["Form", "Point the email field at Buttondown / ConvertKit / a Resend audience."],
        ["Fold", "Pitch + visual + CTA visible with no scrolling on a laptop."],
        ["Count", "Add a privacy-friendly analytics tag so you know what launch day did."],
      ],
    ),
  });

  /* ---------- Product & Growth (aligned to the stated goal) ---------- */
  const goal = goalKindOf(brief, answers);
  const GOAL_LABEL: Record<GoalKind, string> = {
    sales: "selling as many copies as possible",
    growth: "maximising signups and keeping people coming back",
    customers: "landing your first paying customers",
    polish: "shipping something you're proud to show",
    live: "just getting it live in front of real users",
  };

  add({
    id: "cut-bloat",
    title: "Cut one feature that isn't earning its place",
    description: `You're aiming at ${GOAL_LABEL[goal]}. Every half-built extra dilutes that and adds launch risk.`,
    category: "Product & Growth",
    severity: "medium",
    estMinutes: 40,
    copilot: cp(
      "Done = one feature is removed or hidden behind a flag, and the app still does its core job.",
      [
        ["List", "Write every distinct feature/screen. Star the ONE the whole app exists for."],
        ["Score", "For each non-starred one: does it move you toward the goal in the first week? If not → cut."],
        ["Cut", "Delete it or hide it behind a `NEXT_PUBLIC_FEATURE_*` flag defaulted off. Ship narrower."],
      ],
      {
        manual:
          "Ruthless version: if you can't explain in one sentence why a feature helps you " +
          GOAL_LABEL[goal] +
          ", it doesn't ship in v1. Move it to a 'later' list and tell nobody it's gone.",
      },
    ),
  });
  add({
    id: "onboarding",
    title: "Fix the first 60 seconds",
    description:
      "Most drop-off happens before anyone sees the value. The first run has to reach the 'aha' fast.",
    category: "Product & Growth",
    severity: "high",
    estMinutes: 75,
    copilot: cp(
      "Done = a brand-new user reaches the core payoff within ~60 seconds, with no dead ends.",
      [
        ["Time it", "Open the app as a stranger. Count seconds to the first moment it's obviously useful."],
        ["Remove steps", "Kill every screen between open and value: pre-fill, skip, defer account creation if you can."],
        ["Seed it", "Ship with sample data / a demo mode so an empty account still shows the point."],
        ["One nudge", "A single inline hint at the first action. Not a 5-slide tour."],
      ],
    ),
  });

  const growthExtras: Record<GoalKind, Draft[]> = {
    sales: [
      {
        id: "price-block",
        title: "Put a clear price + 'what you get' block on the page",
        description: "People won't buy what they can't price. Ambiguity kills conversion.",
        category: "Product & Growth",
        severity: "high",
        estMinutes: 45,
        copilot: cp(
          "Done = the price, what's included, and the buy button are visible without scrolling.",
          [
            ["Decide", "One number. If unsure, price higher than feels comfortable — you can discount later."],
            ["Show", "Price + 3-5 bullets of exactly what they get + the CTA, above the fold."],
            ["Reassure", "One line: refund policy or 'cancel anytime'. Removes the last hesitation."],
          ],
          {
            manual:
              "Copy skeleton:\n$__ one-time (or /mo)\n✓ ____\n✓ ____\n✓ ____\n[ Buy now ]\n30-day refund, no questions.",
          },
        ),
      },
      {
        id: "purchase-event",
        title: "Instrument the buy funnel",
        description: "If you can't see where buyers drop, you're flying blind on launch day.",
        category: "Product & Growth",
        severity: "medium",
        estMinutes: 40,
        copilot: cp(
          "Done = events fire for page view → checkout opened → purchase completed.",
          [
            ["Pick a tool", "Plausible/PostHog/Umami — anything with custom events."],
            ["Three events", "`landing_view`, `checkout_open`, `purchase_success`. That's the whole funnel."],
            ["Verify", "Do a test purchase and confirm all three land."],
          ],
        ),
      },
    ],
    growth: [
      {
        id: "value-before-signup",
        title: "Let people use the core thing before signing up",
        description: "A signup wall in front of unproven value is the biggest growth leak there is.",
        category: "Product & Growth",
        severity: "high",
        estMinutes: 90,
        copilot: cp(
          "Done = a visitor can do the main action once (or in a sandbox) with zero account.",
          [
            ["Gate later", "Move auth to the moment they'd lose work — save, export, share — not the front door."],
            ["Local state", "Hold their work in localStorage until they sign up, then migrate it."],
            ["Prompt at value", "Ask for the email right after the 'aha', framed as 'save this'."],
          ],
        ),
      },
      {
        id: "retention-hook",
        title: "Add one reason to come back tomorrow",
        description: "Acquisition without a return reason is a leaky bucket. Pick ONE hook.",
        category: "Product & Growth",
        severity: "high",
        estMinutes: 120,
        copilot: cp(
          "Done = one lightweight mechanic that gives a reason to reopen — shipped, not planned.",
          [
            ["Choose one", "A streak, a weekly digest email, saved history, or a 'what's new since you left'."],
            ["Smallest version", "Digest = a cron + one templated email. Streak = a counter + a date check."],
            ["Measure", "Track day-1 and day-7 return rate so you know if it works."],
          ],
        ),
      },
      {
        id: "share-moment",
        title: "Add a share/invite affordance at the win moment",
        description: "The best time to ask for a share is the second something good happens.",
        category: "Product & Growth",
        severity: "medium",
        estMinutes: 50,
        copilot: cp(
          "Done = a 'share this' / 'invite a friend' button appears right after a success.",
          [
            ["Find the moment", "The exact screen where the user just got value."],
            ["One button", "Pre-filled share text + link, or an invite that gives both sides something."],
            ["Attribute", "Tag the link so you can see shares that convert."],
          ],
        ),
      },
    ],
    customers: [
      {
        id: "talk-to-users",
        title: "Add a 'talk to the founder' path",
        description: "Your first 5 customers come from conversations, not a checkout flow.",
        category: "Product & Growth",
        severity: "high",
        estMinutes: 30,
        copilot: cp(
          "Done = an obvious way for an interested visitor to reach you within one click.",
          [
            ["Add it", "A 'Book 15 min' (Cal.com) link or a visible email in the header/footer."],
            ["Trigger", "Also surface it after they hit a limit or an empty state."],
            ["Follow up", "Reply within hours during launch week. Speed closes early deals."],
          ],
        ),
      },
      {
        id: "why-now",
        title: "Write the one-paragraph 'why pay now'",
        description: "Early customers need a reason not to wait. Give them one.",
        category: "Product & Growth",
        severity: "medium",
        estMinutes: 30,
        copilot: cp(
          "Done = a short paragraph on the page: the pain, your fix, and why now beats later.",
          [
            ["Pain", "One sentence naming the expensive problem in their words."],
            ["Fix", "One sentence on what changes with your tool."],
            ["Now", "Founder pricing / lifetime deal / hands-on onboarding for the first N."],
          ],
        ),
      },
    ],
    polish: [
      {
        id: "rough-edges",
        title: "Kill the top 3 things you keep apologizing for",
        description: "You know the rough spots. A viewer notices them in the first 20 seconds.",
        category: "Product & Growth",
        severity: "high",
        estMinutes: 90,
        copilot: cp(
          "Done = the three embarrassing bits are fixed or hidden.",
          [
            ["Name them", "Write the three things you'd caveat before a demo."],
            ["Triage", "Fix the cheap ones. Hide the expensive ones for v1."],
            ["Re-demo", "Walk it again cold. If you still caveat, it's not done."],
          ],
        ),
      },
      {
        id: "demo-gif",
        title: "Record a 30-60s demo of the core loop",
        description: "For a portfolio/showcase launch, the clip IS the product.",
        category: "Product & Growth",
        severity: "medium",
        estMinutes: 45,
        copilot: cp(
          "Done = a short, captioned screen recording of the best 30 seconds.",
          [
            ["Script it", "3 beats: the problem, the action, the payoff. No intro."],
            ["Record clean", "Hide bookmarks, use seeded data, 1x speed."],
            ["Caption", "2-4 word text overlays. Export as MP4 + GIF."],
          ],
        ),
      },
    ],
    live: [
      {
        id: "pick-one",
        title: "Pick the ONE feature to finish; shelve the rest",
        description: "Stuck-at-80% is usually three things at 60%. Finish one completely.",
        category: "Product & Growth",
        severity: "high",
        estMinutes: 30,
        copilot: cp(
          "Done = a written decision: the one feature v1 ships with, and what's explicitly deferred.",
          [
            ["List", "Every in-progress feature and its honest % done."],
            ["Choose", "The one the app can't exist without. Everything else → 'later'."],
            ["Announce it", "A 'known limitations' note so early users aren't surprised."],
          ],
        ),
      },
      {
        id: "limitations-note",
        title: "Add a short 'what's not done yet' note",
        description: "Early users forgive gaps they were warned about. They churn on surprises.",
        category: "Product & Growth",
        severity: "low",
        estMinutes: 20,
        copilot: cp(
          "Done = a visible, honest list of current limitations near the entry point.",
          [
            ["Write 3-5 bullets", "Plain: 'no mobile app yet', 'exports are CSV only', etc."],
            ["Place it", "On the landing page or a first-run card — not buried in docs."],
          ],
        ),
      },
    ],
  };
  growthExtras[goal].forEach(add);

  // extra low-stakes "nice to have" ideas — surfaced widely, easy to dismiss
  const niceToHave: Draft[] = [
    {
      id: "social-proof",
      title: "Add a social-proof slot (even one quote)",
      description: "One real sentence from a user beats a page of your own copy.",
      category: "Product & Growth",
      severity: "low",
      estMinutes: 20,
      copilot: cp("Done = at least one testimonial or logo visible near the CTA.", [
        ["Ask", "DM 3 people who've used it for one sentence you can quote."],
        ["Placeholder", "Until then: '“Finally shipped mine in a weekend.” — early user'."],
      ]),
    },
    {
      id: "is-this-for-me",
      title: "Write an 'is this for you?' section",
      description: "Qualifying visitors fast raises conversion and cuts bad-fit support.",
      category: "Product & Growth",
      severity: "low",
      estMinutes: 20,
      copilot: cp("Done = a short 'great if… / not for you if…' block on the page.", [
        ["Two lists", "3 bullets each: who it's perfect for, who should skip it."],
      ]),
    },
    {
      id: "changelog",
      title: "Add a tiny changelog / 'what's new'",
      description: "Cheap signal that the project is alive and maintained.",
      category: "Product & Growth",
      severity: "low",
      estMinutes: 25,
      copilot: cp("Done = a dated list of the last few changes, linked in the footer.", [
        ["Format", "Just `## 2024-xx-xx` headings with 1-3 bullets. Markdown is fine."],
      ]),
    },
    {
      id: "empty-state-cta",
      title: "Turn the empty state into a next step",
      description: "The blank first screen is prime real estate you're wasting.",
      category: "Product & Growth",
      severity: "low",
      estMinutes: 30,
      copilot: cp("Done = the zero-data view has a one-line pitch + one button.", [
        ["Copy", "Say what they'll get, then the single action to get there."],
        ["Sample", "Offer a 'load an example' button so it's never truly empty."],
      ]),
    },
    {
      id: "shortcut",
      title: "Add a keyboard shortcut for the main action",
      description: "Small thing power users notice and tell people about.",
      category: "Product & Growth",
      severity: "low",
      estMinutes: 30,
      copilot: cp("Done = the primary action has a hotkey, hinted in the UI.", [
        ["Pick", "Cmd/Ctrl+Enter for submit, `/` for search — follow convention."],
        ["Hint", "Show the key in the button tooltip or next to it."],
      ]),
    },
    {
      id: "feedback-link",
      title: "Add a one-click feedback link",
      description: "Early feedback compounds. Make it frictionless.",
      category: "Product & Growth",
      severity: "low",
      estMinutes: 15,
      copilot: cp("Done = a 'Feedback' link that opens email or a 2-field form.", [
        ["Simplest", "`mailto:` with a prefilled subject. Upgrade to a form later."],
      ]),
    },
  ];
  niceToHave.forEach(add);

  const base = clamp(
    (meta.builtPercent ?? 78) - meta.notes.length * 2 - (noDb ? 6 : 0),
    55,
    88,
  );

  return {
    projectSummary: `${meta.name} — ${meta.detectedType}. Goal: ${
      GOAL_LABEL[goal]
    }. Shipping to ${target}. ${tasks.length} steps between you and live.`,
    launchReadiness: base,
    tasks: tasks.map((t) => ({ ...t, estMinutes: clip(t.estMinutes), done: false })),
  };
}

/* ---------------------------- brief + execute --------------------------- */

export function mockBrief(meta: ProjectMeta, answers: Answers): AppBrief {
  const goal = goalKindOf(null, answers);
  const GOAL: Record<GoalKind, string> = {
    sales: "Sell as many copies/licenses as possible at launch.",
    growth: "Maximise free signups and keep people coming back.",
    customers: "Land the first handful of paying customers.",
    polish: "Ship a version polished enough to show off.",
    live: "Get it live in front of real users, fast.",
  };
  const feature =
    meta.detectedStack.includes("Next.js") || meta.platform === "web"
      ? "a web app"
      : meta.platform === "ios" || meta.platform === "android"
        ? "a mobile app"
        : meta.platform === "game"
          ? "a game"
          : meta.platform === "cli"
            ? "a command-line tool"
            : "a software project";
  return {
    description: `${meta.name} looks like ${feature} built with ${
      meta.detectedStack.slice(0, 2).join(" and ") || meta.languages[0] || "a modern stack"
    }, roughly ${meta.builtPercent ?? 80}% done — correct me if that's off.`,
    goal: GOAL[goal],
    audience: "The people it's built for.",
    plan: `Get it deployable, close the gaps (${
      meta.notes.slice(0, 2).join(", ").toLowerCase() || "final launch wiring"
    }), and prep what people see before launch.`,
    unsure: meta.detectedType === "GitHub Repository" || !meta.detectedStack.length,
  };
}

export function mockExecute(task: ChecklistTask, _meta: ProjectMeta): ExecuteResult {
  return {
    summary: `Couldn't generate the change automatically for "${task.title}".`,
    files: [
      {
        path: "FINALSTRETCH_TASK.md",
        action: "create",
        contents: [
          `# ${task.title}`,
          "",
          task.description,
          "",
          "## The plan",
          task.copilot?.summary ?? "See the co-pilot summary for this task.",
          "",
          ...(task.copilot?.steps ?? []).map(
            (s, i) => `${i + 1}. **${s.title}** — ${s.detail}`,
          ),
        ].join("\n"),
      },
    ],
    commands: [],
    runLocally:
      "This is a fallback. Re-run “Make the change” (optionally tweak the instructions first). If it keeps failing, the model may be timing out on a large file set — try a more focused task.",
  };
}

/* --------------------- platform-specific deploy tasks -------------------- */

function platformDeployTasks(platform: Platform, meta: ProjectMeta): Draft[] {
  const expo = /expo|react native/i.test(meta.detectedType);

  if (platform === "ios" || platform === "android") {
    const list: Draft[] = [
      {
        id: "info-plist",
        title: "Fill in Info.plist usage descriptions & version",
        description: "A missing NSCameraUsageDescription or a stale build number is an instant reject.",
        category: "Deployment & Compliance",
        severity: "critical",
        estMinutes: 30,
        copilot: cp(
          "Done = every permission your code touches has a human-readable purpose string, and the build number is bumped.",
          [
            ["Audit", "List every system capability you use: camera, mic, photos, location, contacts, notifications, tracking."],
            ["Add strings", "For each, add the matching `NS*UsageDescription` key with a specific sentence (not 'we need this')."],
            ["Bump", "Increment CFBundleVersion (build) and CFBundleShortVersionString (marketing) so the upload isn't a duplicate."],
          ],
          {
            language: "xml",
            codeDiff: [
              "--- a/App/Info.plist",
              "+++ b/App/Info.plist",
              "+  <key>NSCameraUsageDescription</key>",
              "+  <string>Scan a receipt to attach it to an expense.</string>",
              "+  <key>NSPhotoLibraryUsageDescription</key>",
              "+  <string>Pick an existing photo to attach to a note.</string>",
              "+  <key>ITSAppUsesNonExemptEncryption</key>",
              "+  <false/>",
            ].join("\n"),
          },
        ),
      },
      {
        id: "signing",
        title: "Sort signing & provisioning for a release build",
        description: "Debug-signed builds don't upload. This is where most first submissions die.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 40,
        copilot: cp(
          "Done = Xcode archives cleanly with a Distribution certificate and an App Store provisioning profile.",
          [
            ["Team", "Xcode → Signing & Capabilities → set your team, turn on 'Automatically manage signing' for the first pass."],
            ["Identifiers", "developer.apple.com → Certificates, IDs & Profiles → confirm the App ID matches your bundle id and has the right capabilities."],
            ["Archive", "Select 'Any iOS Device', Product → Archive. In the Organizer, Validate App, fix every warning, then Distribute."],
          ],
          {
            manual: [
              "1. developer.apple.com → Account → Certificates, IDs & Profiles.",
              "2. Identifiers → your App ID → tick the capabilities your code uses (Push, Sign in with Apple, etc.). Save.",
              "3. Xcode → Settings → Accounts → Download Manual Profiles.",
              "4. Target → Signing & Capabilities → Release → Provisioning Profile → pick the App Store profile.",
              "5. Product → Archive → Organizer → Validate App. Green check = you can upload.",
            ].join("\n"),
          },
        ),
      },
      {
        id: "privacy-manifest",
        title: "Add PrivacyInfo.xcprivacy + App Privacy answers",
        description: "Apple now rejects apps with no privacy manifest and blocks release with unanswered App Privacy.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 45,
        copilot: cp(
          "Done = the privacy manifest is in the bundle and the App Store Connect 'App Privacy' section is fully answered.",
          [
            ["Manifest", "Add a `PrivacyInfo.xcprivacy` at the target root declaring collected data types and required-reason API usage."],
            ["SDK check", "Every third-party SDK (analytics, ads, crash) has a documented data-collection profile — match yours to it."],
            ["Questionnaire", "App Store Connect → App Privacy → declare data types, whether they're linked to identity, and tracking."],
          ],
          {
            manual: [
              "1. Xcode → File → New → File → App Privacy File → name it PrivacyInfo.xcprivacy, add to the app target.",
              "2. Add NSPrivacyCollectedDataTypes rows for what you collect (e.g. Email Address, Product Interaction).",
              "3. Add NSPrivacyAccessedAPITypes for required-reason APIs (UserDefaults reason CA92.1, file timestamp C617.1, etc.).",
              "4. App Store Connect → your app → App Privacy → Edit → answer every category. 'Data Not Collected' is a valid answer if true.",
              "5. Save. The green 'Ready to Submit' only appears once this is complete.",
            ].join("\n"),
          },
        ),
      },
      {
        id: "testflight",
        title: "Push a build to TestFlight and run it on a real device",
        description: "Simulator-green means nothing. Ship it to TestFlight and open it on a phone that isn't yours.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 50,
        copilot: cp(
          "Done = a TestFlight build installed on an external device, core loop verified, no crash on launch.",
          [
            ["Upload", "Xcode Organizer → Distribute App → App Store Connect → Upload. Wait for processing (~10-30 min)."],
            ["Test info", "Fill 'What to Test' and the beta description so the build isn't stuck in review limbo."],
            ["Invite", "Add an external tester group, send the link, install, run the golden path once."],
          ],
          {
            manual: [
              "1. App Store Connect → your app → TestFlight → wait for the build to finish processing.",
              "2. Click the build → provide export-compliance answer (usually 'No' if you set ITSAppUsesNonExemptEncryption false).",
              "3. TestFlight → Test Information → 'What to Test' paste:",
              '   "First release candidate. Please: sign in, complete <core action>, and force-close/reopen. Report anything that stalls."',
              "4. Add an External Group → add testers by email → enable the public link.",
              "5. Install on a physical device, run the core loop, confirm no launch crash.",
            ].join("\n"),
          },
        ),
      },
      {
        id: "asc-listing",
        title: "Complete the App Store Connect listing",
        description: "Incomplete metadata is rejected before a human opens the build.",
        category: "Marketing & Assets",
        severity: "high",
        estMinutes: 60,
        copilot: cp(
          "Done = every required field filled, screenshots uploaded, reviewer given a way in.",
          [
            ["Copy", "Name (30 chars), subtitle (30), promo text (170), description, keywords (100, comma-separated, no spaces)."],
            ["Screens", "The 6.7\" set from the screenshots task."],
            ["Review notes", "Add a demo account (user + pass) and one paragraph on what the app does."],
          ],
          {
            manual: [
              "App Store Connect → your app → [version] → fill:",
              "• Subtitle: your pitch sentence trimmed to 30 chars.",
              "• Keywords: comma-separated, no spaces, no brand names you don't own — e.g. 'expense,receipt,mileage,tax,freelance'.",
              "• Description: paragraph 1 = the pitch, paragraph 2 = 3 benefit bullets, paragraph 3 = how to start.",
              "• App Review Information → Sign-In required → add a working demo account.",
              "• Notes: 'Tap X on the home screen to reach the main feature. Demo data is pre-loaded.'",
            ].join("\n"),
          },
        ),
      },
    ];
    if (expo) {
      list.push({
        id: "eas-build",
        title: "Configure EAS build profiles for store binaries",
        description: "`expo start` isn't a release. You need signed .ipa/.aab from EAS.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 40,
        copilot: cp(
          "Done = `eas build --platform all --profile production` produces store-ready binaries.",
          [
            ["eas.json", "Add a `production` profile; set `distribution: store` and the right bundle identifiers."],
            ["Credentials", "Run `eas credentials` and let EAS manage signing, or upload your own."],
            ["Submit", "`eas submit -p ios` / `-p android` pushes straight to the store portals."],
          ],
          { language: "bash", manual: "npx eas-cli build --platform all --profile production\nnpx eas-cli submit -p ios" },
        ),
      });
    }
    return list;
  }

  if (platform === "game") {
    return [
      {
        id: "steam-appid",
        title: "Put steam_appid.txt in the build output",
        description: "Without it the Steam API never initialises — achievements, overlay, and cloud all silently fail in a real build.",
        category: "Critical Code Fixes",
        severity: "critical",
        estMinutes: 15,
        copilot: cp(
          "Done = a `steam_appid.txt` containing just your numeric App ID sits next to the shipped executable.",
          [
            ["Create", "Make `steam_appid.txt`, contents = your App ID and nothing else (e.g. `480` for Spacewar while testing)."],
            ["Place", "Same folder as the built game binary, and in your build/packaging script so it ships."],
            ["Verify", "Launch the build; `SteamAPI_Init()` should return true and the overlay should open with Shift+Tab."],
          ],
          {
            manual: [
              "1. In your project, create build/steam_appid.txt with one line: your App ID.",
              "2. Add it to your packaging step so it lands beside Game.exe in the depot.",
              "3. Remove it from version control's ignore list if needed — it must be in the shipped folder, not just locally.",
              "4. Run the packaged build: the Steam overlay (Shift+Tab) confirms init worked.",
            ].join("\n"),
          },
        ),
      },
      {
        id: "steam-depots",
        title: "Configure depots, branches, and a SteamPipe upload script",
        description: "A misconfigured depot ships an empty or unplayable build to buyers on launch day.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 60,
        copilot: cp(
          "Done = `steamcmd` uploads a working build to a password-locked beta branch with one command.",
          [
            ["Depots", "One depot per platform; map it to your build output folder in the app admin."],
            ["Branches", "Create a password-protected `beta` branch. Keep `default` unpublished until launch."],
            ["Script", "Write `app_build_XXX.vdf` + `depot_build_XXX.vdf` and upload with `steamcmd +run_app_build`."],
          ],
          {
            manual: [
              "1. Steamworks → your app → SteamPipe → Depots: confirm a depot exists per OS.",
              "2. Builds → download the Content Builder (steamcmd + scripts template).",
              "3. Edit scripts/app_build_<appid>.vdf: set ContentRoot to your build folder, set 'desc' to the version.",
              "4. Run: steamcmd +login <builder_account> +run_app_build ../scripts/app_build_<appid>.vdf +quit",
              "5. Steamworks → Builds → set the new build live on the 'beta' branch (add a password under Betas).",
            ].join("\n"),
          },
        ),
      },
      {
        id: "steam-review",
        title: "Submit the store page for Valve review",
        description: "Store pages need Valve approval (3-5 business days). You cannot set a release date until it passes.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 50,
        copilot: cp(
          "Done = the store page is submitted, and the build passes Valve's pre-release checklist.",
          [
            ["Page", "Short description (≤300 chars), About, 5+ tags, a trailer, the capsule art from the assets task."],
            ["Checklist", "Achievements fire, cloud saves sync, controller + keyboard both work from a cold start."],
            ["Submit", "Store Presence → 'Prepare for release' → submit page and build for review."],
          ],
          {
            manual: [
              "1. Steamworks → your app → Store Presence → Basic Info: fill Short Description, About, tags, and add the trailer.",
              "2. Store Presence → Graphical Assets: upload every capsule size from the assets task.",
              "3. Publish → Store Presence → submit for review (button turns available once required fields are green).",
              "4. Separately: App Admin → 'Prepare for release' checklist → tick every item, then request the build review.",
              "5. Both reviews run in parallel; budget a week before you announce a date.",
            ].join("\n"),
          },
        ),
      },
    ];
  }

  if (platform === "python") {
    return [
      {
        id: "pin-deps",
        title: "Pin dependencies and add a real runtime",
        description: "'Works on my machine' with unpinned deps is not a deployment.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 40,
        copilot: cp(
          "Done = a lockfile plus a Dockerfile that runs a production server, not the dev server.",
          [
            ["Lock", "`pip freeze > requirements.txt` (or `poetry lock`). Commit it."],
            ["Server", "Add gunicorn/uvicorn to deps. Dockerfile `CMD` runs it, non-root user, slim base image."],
            ["Config", "Read host/port/DB from `os.environ` with a startup check that fails loudly."],
          ],
          {
            language: "docker",
            codeDiff: [
              "--- /dev/null",
              "+++ b/Dockerfile",
              "+FROM python:3.12-slim",
              "+WORKDIR /app",
              "+COPY requirements.txt .",
              "+RUN pip install --no-cache-dir -r requirements.txt",
              "+COPY . .",
              "+RUN useradd -m app && chown -R app /app",
              "+USER app",
              '+CMD ["gunicorn", "app:app", "-b", "0.0.0.0:8000", "-w", "2"]',
            ].join("\n"),
          },
        ),
      },
      {
        id: "deploy-service",
        title: "Deploy to a host with a health check",
        description: "Pick one platform, wire a health endpoint, and get a public URL.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 50,
        copilot: cp(
          "Done = the service responds on a public URL and the host reports it healthy.",
          [
            ["Pick", "Fly.io, Railway, or Render. All read the Dockerfile."],
            ["Health", "Add `GET /healthz` returning 200. Point the host's health check at it."],
            ["Env", "Set every secret in the host dashboard, not in the image."],
          ],
          {
            manual: [
              "Fly.io: `fly launch` (detects the Dockerfile) → `fly secrets set DATABASE_URL=... API_KEY=...` → `fly deploy`.",
              "Then `fly open` for the URL. Check `fly logs` for the first request.",
            ].join("\n"),
          },
        ),
      },
    ];
  }

  if (platform === "cli" || platform === "desktop") {
    return [
      {
        id: "release-artifact",
        title: "Produce a distributable artifact + publish step",
        description: "A repo isn't a release. Users need something they can install in one command.",
        category: "Deployment & Compliance",
        severity: "high",
        estMinutes: 50,
        copilot: cp(
          "Done = a versioned artifact users can install, plus the exact command to cut the next one.",
          [
            ["Version", "Bump the version in the manifest. Tag the commit `vX.Y.Z`."],
            ["Build", "Produce the artifact: `npm pack` / `python -m build` / `cargo build --release` / signed installer."],
            ["Publish", "`npm publish` / `twine upload dist/*` / `cargo publish` / attach binaries to a GitHub Release."],
          ],
          {
            manual: [
              "GitHub Release: `git tag v1.0.0 && git push --tags` → repo → Releases → Draft a new release → pick the tag → drag in the built binaries → Publish.",
              "Add install instructions to the README that reference the release URL.",
            ].join("\n"),
          },
        ),
      },
      {
        id: "clean-install-test",
        title: "Smoke-test from a clean install",
        description: "The classic miss: it only runs inside your dev checkout.",
        category: "Critical Code Fixes",
        severity: "high",
        estMinutes: 30,
        copilot: cp(
          "Done = installing the published artifact in a fresh environment and running the main command works.",
          [
            ["Fresh env", "New container or a temp virtualenv/directory — nothing from your dev setup."],
            ["Install", "Install the artifact the way a user would (`npx`, `pipx install`, download the binary)."],
            ["Run", "Execute the primary command with `--help` and one real invocation. Fix whatever's missing from the package manifest."],
          ],
        ),
      },
    ];
  }

  // web (default)
  return [
    {
      id: "prod-env",
      title: "Wire production env vars in the host and fail loud on missing ones",
      description: "The #1 cause of a green local build that 500s the moment it's live.",
      category: "Deployment & Compliance",
      severity: "critical",
      estMinutes: 30,
      copilot: cp(
        "Done = every `process.env.*` key is set in Production + Preview, and a missing one throws at boot.",
        [
          ["List", "Grep every `process.env.` reference. Put the names in `.env.example`."],
          ["Set", "Add each to Production and Preview in the host dashboard."],
          ["Guard", "Validate required keys at startup so a bad deploy fails fast, not silently."],
        ],
        {
          language: "diff",
          codeDiff: [
            "--- a/src/env.ts",
            "+++ b/src/env.ts",
            "+const required = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'NEXT_PUBLIC_APP_URL'];",
            "+for (const k of required) {",
            "+  if (!process.env[k]) throw new Error(`Missing env var: ${k}`);",
            "+}",
          ].join("\n"),
        },
      ),
    },
    {
      id: "domain-https",
      title: "Connect the custom domain with HTTPS",
      description: "Launching on a *.vercel.app URL costs credibility at the worst possible moment.",
      category: "Deployment & Compliance",
      severity: "medium",
      estMinutes: 25,
      copilot: cp(
        "Done = the real domain serves the app over HTTPS with the HTTP→HTTPS redirect on.",
        [
          ["Add", "Host → Domains → add `example.com` and `www.example.com`."],
          ["DNS", "Set the A / CNAME records the host shows you at your registrar."],
          ["Force", "Enable automatic HTTPS redirect + HSTS."],
        ],
        {
          manual: [
            "1. Vercel → Project → Settings → Domains → add your domain.",
            "2. At your registrar (Namecheap/Cloudflare/etc.) add the exact records Vercel lists — usually an A record to 76.76.21.21 and a CNAME for www.",
            "3. Wait for the cert (usually <10 min). Confirm the padlock and that http:// redirects to https://.",
          ].join("\n"),
        },
      ),
    },
    {
      id: "monitoring",
      title: "Add error monitoring and verify one event lands",
      description: "If you can't see production exceptions, your users are your logging system.",
      category: "Deployment & Compliance",
      severity: "medium",
      estMinutes: 30,
      copilot: cp(
        "Done = a thrown error in production shows up in a dashboard within a minute, with a readable stack.",
        [
          ["Install", "Add Sentry (or similar), wrap the app, low `tracesSampleRate` for now."],
          ["Source maps", "Upload them in the build step so traces aren't minified garbage."],
          ["Test", "Throw once on purpose, confirm it appears, then remove the throw."],
        ],
      ),
    },
    {
      id: "seo-meta",
      title: "Add OG/meta tags, robots.txt and a sitemap",
      description: "Shared links with no preview card get half the clicks. Uncrawlable pages get none.",
      category: "Marketing & Assets",
      severity: "medium",
      estMinutes: 35,
      copilot: cp(
        "Done = a link preview renders a title, description, and image, and search engines can crawl you.",
        [
          ["Meta", "Set title, description, and an `og:image` (1200x630) on the main pages."],
          ["robots.txt", "Allow crawling and point at the sitemap."],
          ["Sitemap", "Generate `sitemap.xml` (framework plugin or a 10-line script) and reference it in robots.txt."],
        ],
      ),
    },
  ];
}

/* -------------------------------- copilot -------------------------------- */

export function mockCopilot(task: ChecklistTask): CopilotPayload {
  if (task.copilot) return task.copilot;
  const manualish =
    task.category !== "Critical Code Fixes" ||
    /policy|listing|store|screenshot|domain|dns|submit|review|asset|account/i.test(task.title);
  return cp(
    `Done = "${task.title}" is verified in the real environment, not just locally.`,
    [
      ["Scope it", "Write the smallest version of this that counts as shipped. Ignore everything bigger."],
      ["Do it", task.description],
      ["Verify", "Prove it from a clean state — fresh clone, fresh browser, or someone else's device."],
    ],
    manualish
      ? {
          manual:
            "This is a manual step — no code change. Open the relevant portal/dashboard, make the change, and check it off only once you've confirmed it live.",
        }
      : undefined,
  );
}
