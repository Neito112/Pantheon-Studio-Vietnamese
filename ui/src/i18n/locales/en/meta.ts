import type { Catalog } from "../../types";

/** The meta agents: Zeus (supervisor), Argus (overseer) and Kronos (engineer). */
const meta: Catalog = {
  // ── Shared chat shell (components/MetaChat.tsx) ─────────────────────────────
  "meta.chat.stop": "■ Stop",
  "meta.chat.runsOnLabel": "Runs on: ",
  "meta.chat.runsOnTitle": "Choose what runs {name}: Pantheon with a model, or an agent such as Claude Code, Codex or Hermes",
  "meta.chat.runsOnDefault": "default",
  "meta.chat.speak": "Speak",
  "meta.chat.reset": "Reset",
  "meta.chat.resetTitle": "Start {name} over with its original settings",
  "meta.chat.thinking": "thinking…",
  "meta.chat.back": "‹ Back",

  // ── Model dialog ──────────────────────────────────────────────────────────
  "meta.model.title": "What runs {name}",
  "meta.model.tabKind": "Kind",
  "meta.model.tabModel": "Model",
  "meta.model.kindHelp":
    "{name} keeps its instructions, its tools and its chat with you whatever runs it. Another agent, such as Claude Code, Codex or Hermes, gets {name}'s tools through Pantheon's MCP bridge.",
  "meta.model.llmHelp":
    "{name} uses the default provider unless you pick one here. A strong model with reliable tool calling works best: {name} builds and changes organizations for you.",
  "meta.model.otherHelp":
    "{name} runs on another agent, which picks its own model on the Kind tab. Pantheon still uses this model for {name}'s quick jobs, such as drafting a new organization.",

  // ── Reset dialog ──────────────────────────────────────────────────────────
  "meta.reset.title": "Reset {name}?",
  "meta.reset.body":
    "This stops what {name} is doing, deletes your chat with {name}, clears its context, and puts its name, instructions, tools, kind, model and limits back to the originals.",
  "meta.reset.forget": "Also forget {name}'s long-term memories",
  "meta.reset.action": "Reset {name}",

  // ── Zeus, the supervisor (app/supervisor/page.tsx) ────────────────────────
  "meta.zeus.subtitle":
    "The Pantheon supervisor. Designs your organizations and spaces, brings in 3D assets, tunes agents, and handles their requests.",
  "meta.zeus.intro": "Tell Zeus what you want your agents to do. It can build whole organizations, and the spaces they live in, for you.",
  "meta.zeus.placeholder": "Describe the organization you need, or ask for changes…",
  "meta.zeus.sideLabel": "Requests",
  "meta.zeus.prompt1":
    "Design an organization for me: a small team that researches competitors and writes a weekly brief.",
  "meta.zeus.prompt2":
    "Build a small town square scene for a social simulation, with a café, a police station and a few residents.",
  "meta.zeus.prompt3": "Triage the open feature requests.",
  "meta.zeus.prompt4":
    "Find a free 3D model of a vending machine online and put it in the kitchen of my first organization.",
  "meta.zeus.prompt5":
    "Hold a standup in the boardroom every morning at 9, and give my agents a way to hand each other coffee.",
  "meta.zeus.tabRequests": "Requests",
  "meta.zeus.tabTools": "Tools",
  "meta.zeus.tabAssets": "Assets & plugins",
  "meta.zeus.tabActivity": "Activity",
  "meta.zeus.requestsEmpty":
    "No requests yet. When an agent needs a tool, access or colleague it doesn't have, it files a request here.",
  "meta.zeus.requestWhy": "Why: {reason}",
  "meta.zeus.resolutionPlaceholder": "Resolution / notes",
  "meta.zeus.update": "Update",
  "meta.zeus.seeRequesterSessions": "See the requester's sessions →",
  "meta.zeus.statusOpen": "open",
  "meta.zeus.statusTriaged": "triaged",
  "meta.zeus.statusAccepted": "accepted",
  "meta.zeus.statusInProgress": "in progress",
  "meta.zeus.statusDone": "done",
  "meta.zeus.statusRejected": "rejected",

  // ── Argus, the overseer (app/argus/page.tsx) ──────────────────────────────
  "meta.argus.subtitle":
    "The overseer. Checks on your organizations on demand, or on a schedule, and tells you what needs attention.",
  "meta.argus.intro": "Ask Argus to check whether your organizations are working as planned, or to keep watch over one.",
  "meta.argus.placeholder": "Ask Argus to check on an organization…",
  "meta.argus.sideLabel": "Watches",
  "meta.argus.prompt1": "Check on all my organizations: is everything proceeding as planned?",
  "meta.argus.prompt2": "Is anyone stuck, looping or failing right now?",
  "meta.argus.prompt3":
    "Keep an eye on my first organization every 30 minutes and alert me if work drifts from its goals.",
  "meta.argus.prompt4": "Compare what each team was asked to do with what they've actually delivered.",
  "meta.argus.tabWatches": "Watches",
  "meta.argus.tabActivity": "What Argus is doing",
  "meta.argus.watchesEmpty":
    "Argus isn't watching anything. Ask it in the chat, or set a watch below — it will check on schedule and raise alerts in the org's inbox.",
  "meta.argus.everyMinutes": "every {count} min",
  "meta.argus.lastCheck": "last check {when}",
  "meta.argus.newWatch": "New watch",
  "meta.argus.organization": "Organization",
  "meta.argus.choose": "Choose…",
  "meta.argus.checkEvery": "Check every (minutes)",
  "meta.argus.focus": "What to watch for",
  "meta.argus.focusHint": "Goals, deadlines, risks — in your words",
  "meta.argus.focusPlaceholder":
    "e.g. the launch checklist is done by Friday; nobody stays blocked for long",
  "meta.argus.watch": "Watch",

  // ── Kronos, the engineer (app/kronos/page.tsx) ────────────────────────────
  "meta.kronos.subtitle":
    "The engineer. Works on your computer: changes Pantheon's own code when Zeus or you need it, and handles files in folders you allow.",
  "meta.kronos.intro":
    "Ask Kronos for a new capability or a fix to Pantheon, or for work with files on your computer. Code changes are tested before they're applied.",
  "meta.kronos.placeholder": "Ask Kronos to build or fix something…",
  "meta.kronos.sideLabel": "Computer",
  "meta.kronos.prompt1": "Add a built-in tool that lets agents read RSS feeds.",
  "meta.kronos.prompt2": "Zeus says agents need a CSV export of the task board. Can you build it?",
  "meta.kronos.prompt3": "What can you reach on my computer right now?",
  "meta.kronos.prompt4": "Summarize the reports in my allowed folder into one document.",
  "meta.kronos.tabComputer": "Computer",
  "meta.kronos.tabActivity": "What Kronos is doing",
  "meta.kronos.thisComputer": "this computer",
  "meta.kronos.pantheonCode": "Pantheon code",
  "meta.kronos.notFromSource":
    "Pantheon is installed, not running from its source, so Kronos can't change its code here.",
  "meta.kronos.changesMergeIntoBranch": "changes merge into branch {branch}, after the checks pass",
  "meta.kronos.allowedFolders": "Folders you allowed",
  "meta.kronos.changesInProgress": "Changes in progress",
  "meta.kronos.noChanges": "None.",
  "meta.kronos.howTitle": "How Kronos changes Pantheon",
  "meta.kronos.howBody":
    "Every change is made on its own git branch in a separate worktree, never in your working copy. Applying it runs lint, type checks and the test suites; only a change that passes is merged into your current branch, and then Pantheon rebuilds itself (a minute or two). If your uncommitted work touches the same files, Kronos stops and asks you first. Shell commands outside these checks need your approval.",
};

export default meta;
