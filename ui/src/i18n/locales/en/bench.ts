import type { Catalog } from "../../types";

/** Benchmarks: SwarmBench runs on copies of an organization, comparisons and team tuning. */
const bench: Catalog = {
  "bench.run.turnCount": "{count} turns",
  "bench.run.toolCallCount": "{count} tool calls",
  "bench.imports.importJobBench": "Import JobBench",
  "bench.imports.importLab": "Import LAB",
  // ── Trang benchmark ────────────────────────────────────────────────────────
  "bench.title": "Benchmarks",
  "bench.intro":
    "Measure how well an organization works. Each task runs on a temporary copy of the organization (same agents, models, tools and reporting lines, every tool approved automatically) in a fresh work folder; the lead gets the task, and when the team goes quiet SwarmBench grades the folder: with hidden tests, or for imported professional tasks (JobBench, LAB) with a judge that checks each rubric item. Tick runs to compare them.",
  "bench.empty.title": "No benchmark runs yet",
  "bench.empty.body": "Pick an organization and some tasks above.",
  "bench.newRun.title": "New run",
  "bench.organization": "Organization",
  "bench.workflow": "Workflow",
  "bench.workflow.soloHint": "One agent: the solo workflow (team workflows ask for roles it doesn't have)",
  "bench.workflow.compareHint": "To compare with one agent, use the same workflow for both: team workflows ask for extra write-ups, and those are scored",
  "bench.workflow.taskOwn": "Each task's own workflow",
  "bench.workflow.none": "None (their own way)",
  "bench.lead": "Lead",
  "bench.leadHint": "Who gets the task (default: the top of the org chart)",
  "bench.automatic": "automatic",
  "bench.repeats": "Repeats",
  "bench.repeatsHint": "Agents vary; repeat to see the spread",
  "bench.atOnce": "At once",
  "bench.atOnceHint": "Tasks running in parallel (each on its own copy)",
  "bench.timeLimit": "Time limit per task (min)",
  "bench.timeLimitHint": "Default: twice the task's budget",
  "bench.tasks": "Tasks",
  "bench.tasks.all": "all",
  "bench.tasks.none": "none",
  "bench.taskMeta": "{source} · {category} · {difficulty} · ~{minutes} min",
  "bench.start": "Start benchmark",
  "bench.taskRuns": "{count} task run{suffix}, about {minutes} min of budget. Uses your model provider like normal work.",

  // ── Danh sách lượt chạy ────────────────────────────────────────────────────
  "bench.run.compareTitle": "Compare",
  "bench.run.taskWorkflows": "task workflows",
  "bench.run.tasksProgress": "{done}/{total} tasks",
  "bench.run.watchLive": "Watch live ↗",
  "bench.run.hiddenCopy":
    "Tasks run on a hidden copy of {org}, so your own agents stay idle. Use Watch live to see the copy's office, chats and board.",

  // ── Bảng kết quả ──────────────────────────────────────────────────────────
  "bench.results.empty": "No tasks graded yet.",
  "bench.results.colTask": "Task",
  "bench.results.colWorkflow": "Workflow",
  "bench.results.colScore": "Score",
  "bench.results.colChecked": "Checked",
  "bench.results.colAgentTests": "Agent tests",
  "bench.results.colSafety": "Safety",
  "bench.results.colProcess": "Process",
  "bench.results.colTime": "Time",
  "bench.results.colTurns": "Turns",
  "bench.results.colAgents": "Agents",
  "bench.results.colTokens": "Tokens",
  "bench.results.colCost": "Cost",
  "bench.results.colEnded": "Ended",
  "bench.results.workflowNone": "none",
  "bench.results.tests": "{passed}/{total} tests",
  "bench.results.rubricItems": "{met}/{total} rubric items",

  // ── Nhập benchmark chuyên nghiệp ──────────────────────────────────────────
  "bench.imports.title": "Professional benchmarks",
  "bench.imports.desc":
    "JobBench (65 tasks from about 35 professions: reconciliations, reports, analyses) and LAB (Harvey's legal tasks by practice area), both MIT-licensed. A judge on your checker model (or Zeus's) checks each rubric item; the rubrics stay out of the agents' folders, and the hosts where they are public are blocked during runs. LAB is about 2 GB, so import practice areas.",
  "bench.imports.atMost": "At most (tasks)",
  "bench.imports.all": "all",
  "bench.imports.labAreas": "LAB practice areas",
  "bench.imports.importing": "importing {benchmark}",

  // ── Tinh chỉnh đội ─────────────────────────────────────────────────────────
  "bench.tuning.title": "Tune a team",
  "bench.tuning.desc":
    "Runs the organization on one task as it is, has two editors propose changes from what the run showed (one on how the team works, one on the field's know-how as skills), runs both changed teams, adopts the changes the runs support and stores the lesson in the experience library Zeus designs from. About four runs of the task. Your organization changes only when you apply the result. (After harness2, Google Research.)",
  "bench.tuning.task": "Task",
  "bench.tuning.start": "Start tuning",
  "bench.tuning.onTask": "on {task}",
  "bench.tuning.run.base": "As it is",
  "bench.tuning.run.inv": "How it works",
  "bench.tuning.run.dom": "Field know-how",
  "bench.tuning.run.final": "Composed",
  "bench.tuning.minutes": " · {minutes} min",
  "bench.tuning.lesson": "Lesson",
  "bench.tuning.lessonBody": "when {cue}, {lesson}",
  "bench.tuning.apply": "Apply to {org}",
  "bench.tuning.applied": "Applied: {text}",
  "bench.tuning.nothingDiffered": "nothing differed",

  // ── So sánh ────────────────────────────────────────────────────────────────
  "bench.compare.title": "Comparison",
  "bench.compare.clear": "Clear",
  "bench.compare.colTask": "Task",
  "bench.compare.meanScore": "Mean score",
  "bench.compare.fullScores": "Full scores",
  "bench.compare.time": "Time",
  "bench.compare.tokens": "Tokens",
  "bench.compare.cost": "Cost",
  "bench.compare.pointsPerDollar": "Points per $",
  "bench.compare.timeouts": "Timeouts",
  "bench.compare.modelCalls": "Model calls",
  "bench.compare.modelTime": "Model time",
  "bench.compare.fromCache": "From the server's cache",
  "bench.compare.toolCalls": "Tool calls",
  "bench.compare.messages": "Messages",
  "bench.compare.editsFailed": "Edits failed",
  "bench.compare.subagents": "Subagents",
  "bench.compare.acceptanceChecks": "Acceptance checks",
};

export default bench;
