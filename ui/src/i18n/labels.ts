type Translator = (key: string) => string;

const DEFAULT_COLUMNS: Record<string, { name: string; key: string }> = {
  backlog: { name: "Backlog", key: "work.column.backlog" },
  todo: { name: "To do", key: "work.column.todo" },
  in_progress: { name: "In progress", key: "work.column.inProgress" },
  blocked: { name: "Blocked", key: "work.column.blocked" },
  review: { name: "Review", key: "work.column.review" },
  done: { name: "Done", key: "work.column.done" },
};

/** Translate the engine's default names while preserving user-defined columns. */
export function boardColumnLabel(t: Translator, column: { key: string; name: string }): string {
  const preset = DEFAULT_COLUMNS[column.key];
  return preset && column.name === preset.name ? t(preset.key) : column.name;
}

const SESSION_STATUS: Record<string, string> = {
  running: "sessions.status.running",
  completed: "sessions.status.completed",
  failed: "sessions.status.failed",
  awaiting_approval: "sessions.status.awaitingApproval",
  stopped: "sessions.status.stopped",
  ok: "sessions.status.ok",
  error: "sessions.status.error",
  denied: "sessions.status.denied",
};

/** Localize display text only: wire status values remain unchanged. */
export function sessionStatusLabel(t: Translator, status: string): string {
  return SESSION_STATUS[status] ? t(SESSION_STATUS[status]) : status.replace("_", " ");
}
