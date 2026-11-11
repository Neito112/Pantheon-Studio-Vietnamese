"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, useLocale, useT } from "@/i18n";
import type { Message, Task, TaskEvent, TaskStatus } from "@/lib/types";
import { agentName, useOrg } from "@/store/org";
import { AgentAvatar, UserAvatar } from "./agent";
import { Markdown } from "./Markdown";
import { Badge, Button, Drawer, ErrorNote, Field, Select, Spinner, Textarea } from "./ui";

const STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "blocked", "review", "done", "cancelled"];

const STATUS_KEYS: Record<TaskStatus, string> = {
  backlog: "work.statusBacklog",
  todo: "work.statusTodo",
  in_progress: "work.statusInProgress",
  blocked: "work.statusBlocked",
  review: "work.statusReview",
  done: "work.statusDone",
  cancelled: "work.statusCancelled",
};

const PRIORITY_KEYS: Record<Task["priority"], string> = {
  low: "work.priorityLow",
  normal: "work.priorityNormal",
  high: "work.priorityHigh",
  urgent: "work.priorityUrgent",
};

const FIELD_KEYS: Record<string, string> = {
  title: "work.title",
  description: "work.description",
  acceptance: "work.acceptanceCriteria",
  priority: "work.priority",
  status: "common.status",
  assignee: "work.assignee",
};

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const t = useT();
  const live = useOrg((s) => (taskId ? s.tasks[taskId] : undefined));
  const agents = useOrg((s) => s.agents);
  const tasks = useOrg((s) => s.tasks);
  const [detail, setDetail] = useState<(Task & { timeline: TaskEvent[]; messages: Message[] }) | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (taskId) api.task(taskId).then(setDetail).catch((e) => setError(e.message));
  }, [taskId]);
  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);
  useEffect(() => {
    if (live && detail && live.updatedAt !== detail.updatedAt) load();
  }, [live, detail, load]);

  const task = live ?? detail;
  const update = async (patch: Partial<Task> & { comment?: string }) => {
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateTask(task.id, patch);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reporter =
    task?.reporterId === "user" ? t("common.you") : agentName(task?.reporterId);

  return (
    <Drawer open={!!taskId} onClose={onClose} width="w-[560px]">
      {!task ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="border-b border-line p-5">
            <div className="flex items-center gap-2 text-xs text-ink-3">
              <span className="font-mono">{task.ref}</span>
              <span>{t("work.createdBy", { name: reporter })}</span>
              <button className="ml-auto text-ink-3 hover:text-ink cursor-pointer" onClick={onClose}>
                ✕
              </button>
            </div>
            <h2 className="mt-1.5 text-lg font-semibold leading-snug">{task.title}</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Field label={t("common.status")}>
                <Select value={task.status} onChange={(e) => update({ status: e.target.value as TaskStatus })} disabled={busy}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(STATUS_KEYS[s])}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("work.assignee")}>
                <Select value={task.assigneeId ?? ""} onChange={(e) => update({ assigneeId: e.target.value || null })} disabled={busy}>
                  <option value="">{t("work.unassigned")}</option>
                  <option value="user">{t("common.you")}</option>
                  {Object.values(agents)
                    .filter((a) => !a.isSupervisor)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label={t("work.priority")}>
                <Select value={task.priority} onChange={(e) => update({ priority: e.target.value as Task["priority"] })} disabled={busy}>
                  {(["low", "normal", "high", "urgent"] as const).map((p) => (
                    <option key={p} value={p}>
                      {t(PRIORITY_KEYS[p])}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <ErrorNote error={error} />
          </div>
          <div className="space-y-5 p-5">
            <Section title={t("work.description")}>{task.description ? <Markdown>{task.description}</Markdown> : <Muted>{t("common.none")}</Muted>}</Section>
            {task.acceptance && (
              <Section title={t("work.acceptanceCriteria")}>
                <Markdown>{task.acceptance}</Markdown>
              </Section>
            )}
            {task.result && (
              <Section title={t("work.result")}>
                <div className="rounded-md border border-ok/25 bg-ok/5 p-3">
                  <Markdown>{task.result}</Markdown>
                </div>
              </Section>
            )}
            {(task.dependsOn.length > 0 || task.parentId) && (
              <Section title={t("work.links")}>
                <div className="flex flex-wrap gap-2 text-sm">
                  {task.parentId && tasks[task.parentId] && <Badge tone="info">{t("work.parent", { ref: tasks[task.parentId].ref })}</Badge>}
                  {task.dependsOn.map((d) =>
                    tasks[d] ? (
                      <Badge key={d} tone={tasks[d].status === "done" ? "ok" : "warn"}>
                        {t("work.dependsOn", { ref: tasks[d].ref, status: t(STATUS_KEYS[tasks[d].status]) })}
                      </Badge>
                    ) : null,
                  )}
                </div>
              </Section>
            )}
            <Section title={t("common.history")}>
              {!detail ? (
                <Spinner />
              ) : (
                <div className="space-y-3">
                  {detail.timeline.map((ev) => (
                    <TimelineRow key={ev.id} ev={ev} />
                  ))}
                </div>
              )}
            </Section>
            <div>
              <Textarea rows={3} placeholder={t("work.commentPlaceholder")} value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!comment.trim()}
                  loading={busy}
                  onClick={() => update({ comment }).then(() => setComment(""))}
                >
                  {t("work.comment")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function TimelineRow({ ev }: { ev: TaskEvent }) {
  const t = useT();
  const locale = useLocale();
  const agent = useOrg((s) => s.agents[ev.actorId]);
  const who = ev.actorId === "user" ? t("common.you") : (agent?.name ?? ev.actorId);
  const d = ev.data as Record<string, string>;
  const statusOf = (s?: string) => (s && s in STATUS_KEYS ? t(STATUS_KEYS[s as TaskStatus]) : (s ?? "").replace("_", " "));
  const fieldOf = (f?: string) => (f && FIELD_KEYS[f] ? t(FIELD_KEYS[f]) : (f ?? ""));
  const text =
    ev.kind === "created"
      ? t("work.eventCreated")
      : ev.kind === "status"
        ? t("work.eventStatus", { from: statusOf(d.from), to: statusOf(d.to) })
        : ev.kind === "assignee"
          ? d.to
            ? t("work.eventAssignee", { name: d.to === "user" ? t("common.you") : agentName(d.to) })
            : t("work.eventUnassigned")
          : ev.kind === "edit"
            ? t("work.eventEdit", { field: fieldOf(d.field) })
            : t("work.eventCommented");
  return (
    <div className="flex gap-2.5">
      {ev.actorId === "user" ? <UserAvatar size={22} /> : <AgentAvatar agent={agent} size={22} />}
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-medium">{who}</span> <span className="text-ink-2">{text}</span>
          <span className="ml-2 text-[11px] text-ink-3">{formatDateTime(locale, ev.createdAt)}</span>
        </div>
        {ev.kind === "comment" && (
          <div className="mt-1 rounded-md bg-panel-2 px-3 py-2">
            <Markdown>{d.text ?? ""}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-ink-3">{title}</div>
      {children}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-ink-3">{children}</div>;
}
