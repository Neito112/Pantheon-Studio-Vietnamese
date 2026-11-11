"use client";

/** Benchmarks: run SwarmBench tasks on copies of an organization, and compare organizations. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, cx, Empty, ErrorNote, Field, Input, Select, Spinner } from "@/components/ui";
import { formatCurrency, formatDateTime, formatDuration, formatNumber, useLocale, useT, type Locale } from "@/i18n";
import { api, type BenchImport, type BenchResult, type BenchRun, type BenchTask, type BenchWorkflow, type Tuning } from "@/lib/api";
import type { Org } from "@/lib/types";

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "neutral" | "info"> = {
  running: "info",
  done: "ok",
  cancelled: "neutral",
  failed: "bad",
};

/** A dollar amount, or a dash when there is none. */
const money = (locale: Locale, v: number | null | undefined): string => (v ? formatCurrency(locale, v) : "–");
/** A token count, compact. */
const kTokens = (locale: Locale, v: number | null | undefined): string => (v ? formatCompactTokens(locale, v) : "–");
/** A duration in seconds. */
const minutes = (locale: Locale, s: number): string => formatDuration(locale, s);
const scoreColor = (s: number) => (s >= 90 ? "text-ok" : s >= 50 ? "text-warn" : "text-bad");

function formatCompactTokens(locale: Locale, v: number): string {
  if (v >= 1e6) return `${formatNumber(locale, v / 1e6, 1)}M`;
  if (v >= 1e3) return `${formatNumber(locale, Math.round(v / 1e3))}k`;
  return formatNumber(locale, v);
}

export default function BenchmarksPage() {
  const t = useT();
  const [tasks, setTasks] = useState<BenchTask[]>([]);
  const [workflows, setWorkflows] = useState<BenchWorkflow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [runs, setRuns] = useState<BenchRun[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.benchRuns().then(setRuns).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => {
    api.benchTasks().then((c) => {
      setTasks(c.tasks);
      setWorkflows(c.workflows);
    });
    api.orgs().then(setOrgs).catch(() => {});
    load();
  }, [load]);
  const running = runs.some((r) => r.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [running, load]);

  const chosen = runs.filter((r) => compare.includes(r.id));
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-xl font-semibold">{t("bench.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">{t("bench.intro")}</p>
        <ErrorNote error={error} />
        <NewRun tasks={tasks} workflows={workflows} orgs={orgs} onStarted={load} />
        <Imports onImported={() => void api.benchTasks().then((c) => setTasks(c.tasks))} />
        <Tunings tasks={tasks} orgs={orgs} />
        {chosen.length >= 2 && <Compare runs={chosen} onClear={() => setCompare([])} />}
        <div className="mt-6 space-y-2">
          {runs.length === 0 ? (
            <Empty title={t("bench.empty.title")}>{t("bench.empty.body")}</Empty>
          ) : (
            runs.map((r) => (
              <RunRow
                key={r.id}
                run={r}
                open={open === r.id}
                onToggle={() => setOpen(open === r.id ? null : r.id)}
                selected={compare.includes(r.id)}
                onSelect={(on) => setCompare((c) => (on ? [...c, r.id] : c.filter((x) => x !== r.id)))}
                onChanged={load}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NewRun({ tasks, workflows, orgs, onStarted }: { tasks: BenchTask[]; workflows: BenchWorkflow[]; orgs: Org[]; onStarted: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [orgId, setOrgId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [workflowPick, setWorkflow] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(1);
  const [jobs, setJobs] = useState(1);
  const [timeout, setTimeoutMin] = useState("");
  const [lead, setLead] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const org = orgId || orgs[0]?.id || "";
  const solo = (orgs.find((o) => o.id === org)?.agentCount ?? 0) === 1;
  // One agent can't fill a team workflow's roles: default to the solo workflow.
  const workflow = workflowPick ?? (solo ? "solo" : "task");
  const minutesBudget = tasks.filter((t) => picked.includes(t.id)).reduce((s, t) => s + t.minutes, 0) * repeat;

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.startBenchRun({
        orgId: org,
        tasks: picked,
        workflow,
        repeat,
        jobs,
        timeoutMinutes: timeout ? Number(timeout) : undefined,
        lead: lead.trim() || undefined,
      });
      onStarted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-5 space-y-4 p-5 text-sm">
      <div className="font-semibold">{t("bench.newRun.title")}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("bench.organization")}>
          <Select
            value={org}
            onChange={(e) => {
              setOrgId(e.target.value);
              setWorkflow(null);
            }}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("bench.workflow")} hint={solo ? t("bench.workflow.soloHint") : t("bench.workflow.compareHint")}>
          <Select value={workflow} onChange={(e) => setWorkflow(e.target.value)}>
            <option value="task">{t("bench.workflow.taskOwn")}</option>
            <option value="none">{t("bench.workflow.none")}</option>
            {workflows.map((w) => (
              <option key={w.name} value={w.name}>
                {w.name} ({w.roles.join(", ")})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("bench.lead")} hint={t("bench.leadHint")}>
          <Input value={lead} onChange={(e) => setLead(e.target.value)} placeholder={t("bench.automatic")} />
        </Field>
        <Field label={t("bench.repeats")} hint={t("bench.repeatsHint")}>
          <Input type="number" min={1} max={10} value={repeat} onChange={(e) => setRepeat(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
        </Field>
        <Field label={t("bench.atOnce")} hint={t("bench.atOnceHint")}>
          <Input type="number" min={1} max={8} value={jobs} onChange={(e) => setJobs(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
        </Field>
        <Field label={t("bench.timeLimit")} hint={t("bench.timeLimitHint")}>
          <Input type="number" min={1} value={timeout} onChange={(e) => setTimeoutMin(e.target.value)} placeholder={t("bench.automatic")} />
        </Field>
      </div>
      <div>
        <div className="mb-1.5 flex items-center gap-3 text-xs text-ink-3">
          <span>{t("bench.tasks")}</span>
          <button className="text-info hover:underline cursor-pointer" onClick={() => setPicked(tasks.map((t2) => t2.id))}>
            {t("bench.tasks.all")}
          </button>
          <button className="text-info hover:underline cursor-pointer" onClick={() => setPicked([])}>
            {t("bench.tasks.none")}
          </button>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {tasks.map((task) => (
            <label
              key={task.id}
              className={cx("flex cursor-pointer gap-2 rounded-md border px-3 py-2", picked.includes(task.id) ? "border-accent/60 bg-accent/10" : "border-line hover:border-line-2")}
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-[#8b7cff]"
                checked={picked.includes(task.id)}
                onChange={(e) => setPicked((p) => (e.target.checked ? [...p, task.id] : p.filter((x) => x !== task.id)))}
              />
              <span className="min-w-0">
                <span className="font-medium">{task.title}</span>
                <span className="ml-2 text-xs text-ink-3">
                  {t("bench.taskMeta", {
                    source: task.source && task.source !== "SwarmBench" ? `${task.source} · ` : "",
                    category: task.category,
                    difficulty: task.difficulty,
                    minutes: formatNumber(locale, task.minutes),
                  })}
                </span>
                <span className="block text-xs text-ink-3">{task.summary}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <ErrorNote error={error} />
      <div className="flex items-center gap-3">
        <Button variant="primary" loading={busy} disabled={!org || picked.length === 0} onClick={() => void start()}>
          {t("bench.start")}
        </Button>
        {picked.length > 0 && (
          <span className="text-xs text-ink-3">
            {t("bench.taskRuns", {
              count: picked.length * repeat,
              suffix: picked.length * repeat === 1 ? "" : "s",
              minutes: formatNumber(locale, Math.round(minutesBudget / Math.max(1, jobs))),
            })}
          </span>
        )}
      </div>
    </Card>
  );
}

function RunRow({
  run,
  open,
  onToggle,
  selected,
  onSelect,
  onChanged,
}: {
  run: BenchRun;
  open: boolean;
  onToggle: () => void;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onChanged: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const s = run.summary;
  return (
    <Card className="text-sm">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          className="accent-[#8b7cff]"
          title={t("bench.run.compareTitle")}
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer" onClick={onToggle}>
          <span className="truncate font-medium">{run.orgName}</span>
          <Badge tone={STATUS_TONE[run.status] ?? "neutral"}>{run.status}</Badge>
          <span className="text-xs text-ink-3">
            {run.config.workflow === "task" ? t("bench.run.taskWorkflows") : run.config.workflow} ·{" "}
            {t("bench.run.tasksProgress", { done: formatNumber(locale, run.progress.done), total: formatNumber(locale, run.progress.total) })}
            {run.config.repeat > 1 ? ` · ×${run.config.repeat}` : ""}
          </span>
          {run.status === "running" && <Spinner className="size-3.5" />}
        </button>
        <span className={cx("w-16 text-right font-semibold tabular-nums", s.meanScore != null && scoreColor(s.meanScore))}>
          {s.meanScore != null ? formatNumber(locale, s.meanScore, 1) : "–"}
        </span>
        <span className="w-16 text-right tabular-nums text-ink-2">{money(locale, s.costUsd)}</span>
        <span className="w-14 text-right tabular-nums text-ink-3">{kTokens(locale, s.tokens)}</span>
        <span className="w-20 text-right text-xs text-ink-3">{run.createdAt ? formatDateTime(locale, run.createdAt) : ""}</span>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          {run.progress.current.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
              <Spinner className="size-3" /> <b>{a.label}</b> {a.status}: {a.detail} · {minutes(locale, a.seconds)} · {t("bench.run.turnCount", { count: formatNumber(locale, a.metrics.turns ?? 0) })} ·{" "}
              {t("bench.run.toolCallCount", { count: formatNumber(locale, a.metrics.tool_calls ?? 0) })} · {money(locale, a.metrics.cost_usd)}
              {a.cloneId && (
                <Link href={`/org/${a.cloneId}`} target="_blank" className="text-info hover:underline">
                  {t("bench.run.watchLive")}
                </Link>
              )}
            </div>
          ))}
          {run.status === "running" && (
            <div className="text-xs text-ink-3">{t("bench.run.hiddenCopy", { org: run.orgName })}</div>
          )}
          {run.detail && run.status !== "running" && <div className="text-xs text-ink-3">{run.detail}</div>}
          <Results results={run.results} />
          <div className="flex gap-2">
            {run.status === "running" ? (
              <Button size="sm" variant="danger" onClick={() => void api.cancelBenchRun(run.id).then(onChanged)}>
                {t("common.cancel")}
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => void api.deleteBenchRun(run.id).then(onChanged)}>
                {t("common.delete")}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/** What graded the work: hidden tests passed, or a rubric's items fully met. */
function checked(t: (key: string, params?: Record<string, string | number>) => string, locale: Locale, r: BenchResult) {
  const h = r.parts.hidden_tests;
  if (h) return t("bench.results.tests", { passed: formatNumber(locale, h.passed ?? 0), total: formatNumber(locale, h.total ?? 0) });
  const rub = r.parts.rubric as { items_met?: number; items?: unknown[] } | null | undefined;
  return rub
    ? t("bench.results.rubricItems", { met: formatNumber(locale, rub.items_met ?? 0), total: formatNumber(locale, rub.items?.length ?? 0) })
    : "–";
}

function part(r: BenchResult, name: string) {
  const p = r.parts[name];
  return p == null || !(name in r.weights) ? "–" : String(Math.round(p.score * 100));
}

function Results({ results }: { results: BenchResult[] }) {
  const t = useT();
  const locale = useLocale();
  if (!results.length) return <div className="text-xs text-ink-3">{t("bench.results.empty")}</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-ink-3">
          <tr className="text-left">
            {[
              t("bench.results.colTask"),
              t("bench.results.colWorkflow"),
              t("bench.results.colScore"),
              t("bench.results.colChecked"),
              t("bench.results.colAgentTests"),
              t("bench.results.colSafety"),
              t("bench.results.colProcess"),
              t("bench.results.colTime"),
              t("bench.results.colTurns"),
              t("bench.results.colAgents"),
              t("bench.results.colTokens"),
              t("bench.results.colCost"),
              t("bench.results.colEnded"),
            ].map((h) => (
              <th key={h} className="px-2 py-1 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.task_key} className="border-t border-line align-top">
              <td className="px-2 py-1.5">
                <div className="font-medium">{r.title}</div>
                <div className="text-ink-3">{r.task_key}</div>
              </td>
              <td className="px-2 py-1.5 text-ink-2">{r.workflow ?? t("bench.results.workflowNone")}</td>
              <td className={cx("px-2 py-1.5 font-semibold tabular-nums", scoreColor(r.score))}>{formatNumber(locale, r.score, 1)}</td>
              <td className="px-2 py-1.5 tabular-nums">{checked(t, locale, r)}</td>
              <td className="px-2 py-1.5 tabular-nums">{part(r, "agent_tests")}</td>
              <td className="px-2 py-1.5 tabular-nums">{part(r, "safety")}</td>
              <td className="px-2 py-1.5 tabular-nums">{part(r, "process")}</td>
              <td className="px-2 py-1.5 tabular-nums">{minutes(locale, r.run.wall_seconds)}</td>
              <td className="px-2 py-1.5 tabular-nums">{r.metrics.turns != null ? formatNumber(locale, r.metrics.turns) : "–"}</td>
              <td className="px-2 py-1.5 tabular-nums">
                {r.metrics.agents_active != null ? formatNumber(locale, r.metrics.agents_active) : "–"}/
                {r.metrics.agents != null ? formatNumber(locale, r.metrics.agents) : "–"}
              </td>
              <td className="px-2 py-1.5 tabular-nums">{kTokens(locale, (r.metrics.input_tokens ?? 0) + (r.metrics.output_tokens ?? 0))}</td>
              <td className="px-2 py-1.5 tabular-nums">{money(locale, r.metrics.cost_usd)}</td>
              <td className="px-2 py-1.5">
                <Badge tone={r.run.status === "done" ? "ok" : r.run.status === "timeout" ? "warn" : "bad"}>{r.run.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Importing professional benchmarks (JobBench, LAB): their tasks are graded by a rubric. */
function Imports({ onImported }: { onImported: () => void }) {
  const t = useT();
  const [state, setState] = useState<BenchImport | null>(null);
  const [limit, setLimit] = useState("");
  const [areas, setAreas] = useState("contracts");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.benchImport().then(setState).catch(() => {});
  }, []);
  useEffect(() => {
    if (!state?.running) return;
    const t = setInterval(() => void api.benchImport().then(setState), 2000);
    return () => clearInterval(t);
  }, [state?.running]);

  const start = async (benchmark: "jobbench" | "lab") => {
    setError(null);
    const req = api.startBenchImport({ benchmark, limit: limit ? Number(limit) : undefined, areas: benchmark === "lab" ? areas : undefined });
    setState({ running: true, detail: t("bench.imports.importing", { benchmark }), made: [] });
    try {
      setState(await req);
      onImported();
    } catch (e) {
      setError((e as Error).message);
      void api.benchImport().then(setState);
    }
  };

  return (
    <Card className="mt-4 space-y-3 p-5 text-sm">
      <div className="font-semibold">{t("bench.imports.title")}</div>
      <p className="max-w-3xl text-xs text-ink-2">{t("bench.imports.desc")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("bench.imports.atMost")}>
          <Input type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={t("bench.imports.all")} className="w-28" />
        </Field>
        <Button size="sm" loading={state?.running} onClick={() => void start("jobbench")}>
          {t("bench.imports.importJobBench")}
        </Button>
        <Field label={t("bench.imports.labAreas")}>
          <Input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="contracts,tax" className="w-48" />
        </Field>
        <Button size="sm" loading={state?.running} disabled={!areas.trim()} onClick={() => void start("lab")}>
          {t("bench.imports.importLab")}
        </Button>
      </div>
      {state?.detail && <div className="text-xs text-ink-3">{state.detail}</div>}
      <ErrorNote error={error} />
    </Card>
  );
}

const TUNE_TONE: Record<string, "ok" | "warn" | "bad" | "neutral" | "info"> = { ...STATUS_TONE, applied: "ok" };

/** Team tuning (propose, probe, compose): the team as it is, two edited versions, the composed one. */
function Tunings({ tasks, orgs }: { tasks: BenchTask[]; orgs: Org[] }) {
  const t = useT();
  const locale = useLocale();
  const [list, setList] = useState<Tuning[]>([]);
  const [orgId, setOrgId] = useState("");
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string, string>>({});
  const load = useCallback(() => void api.tunings().then(setList).catch(() => {}), []);
  useEffect(load, [load]);
  const running = list.some((t) => t.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [running, load]);
  const org = orgId || orgs[0]?.id || "";
  const pick = task || tasks[0]?.id || "";

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.startTuning({ orgId: org, task: pick });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const apply = async (id: string) => {
    try {
      const r = await api.applyTuning(id);
      setApplied((a) => ({ ...a, [id]: r.changed.join("; ") || t("bench.tuning.nothingDiffered") }));
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Card className="mt-4 space-y-3 p-5 text-sm">
      <div className="font-semibold">{t("bench.tuning.title")}</div>
      <p className="max-w-3xl text-xs text-ink-2">{t("bench.tuning.desc")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("bench.organization")}>
          <Select value={org} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("bench.tuning.task")}>
          <Select value={pick} onChange={(e) => setTask(e.target.value)} className="max-w-sm">
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} ({task.source && task.source !== "SwarmBench" ? task.source : task.category})
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="primary" size="sm" loading={busy} disabled={!org || !pick || running} onClick={() => void start()}>
          {t("bench.tuning.start")}
        </Button>
      </div>
      <ErrorNote error={error} />
      {list.map((t2) => (
        <div key={t2.id} className="space-y-2 rounded-md border border-line px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{t2.org_name}</span>
            <span className="text-xs text-ink-3">{t("bench.tuning.onTask", { task: t2.task_id })}</span>
            <Badge tone={TUNE_TONE[t2.status] ?? "neutral"}>{t2.status === "running" ? t2.stage : t2.status}</Badge>
            {t2.status === "running" && <Spinner className="size-3.5" />}
            <span className="text-xs text-ink-3">{t2.detail}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {(["base", "inv", "dom", "final"] as const)
              .filter((k) => t2.runs[k])
              .map((k) => (
                <span key={k} title={t2.runs[k].detail}>
                  <b>
                    {t(
                      { base: "bench.tuning.run.base", inv: "bench.tuning.run.inv", dom: "bench.tuning.run.dom", final: "bench.tuning.run.final" }[k],
                    )}
                  </b>{" "}
                  <span className={cx("tabular-nums", t2.runs[k].score != null && scoreColor(t2.runs[k].score!))}>
                    {t2.runs[k].score != null ? formatNumber(locale, t2.runs[k].score!, 1) : "…"}
                  </span>
                  {t2.runs[k].minutes != null && <span className="text-ink-3">{t("bench.tuning.minutes", { minutes: formatNumber(locale, t2.runs[k].minutes!) })}</span>}
                </span>
              ))}
          </div>
          {t2.edits.length > 0 && (
            <ul className="space-y-0.5 text-xs">
              {t2.edits.map((e) => (
                <li key={e.id} className={cx(t2.adopted.includes(e.id) ? "text-ink" : "text-ink-3")}>
                  <b>{t2.adopted.includes(e.id) ? "✓" : "·"}</b> {e.id} {e.kind}
                  {e.agent ? ` (${e.agent})` : ""}: {e.summary} {t2.verdicts[e.id] && <span className="text-ink-3">· {t2.verdicts[e.id]}</span>}
                </li>
              ))}
            </ul>
          )}
          {t2.why && <div className="text-xs text-ink-2">{t2.why}</div>}
          {t2.lesson?.lesson && (
            <div className="text-xs text-ink-2">
              <b>{t("bench.tuning.lesson")}</b> ({t2.lesson.confidence ?? "?"}):{" "}
              {t("bench.tuning.lessonBody", { cue: t2.lesson.cue ?? "", lesson: t2.lesson.lesson })}
            </div>
          )}
          <div className="flex items-center gap-2">
            {t2.status === "running" && (
              <Button size="sm" variant="danger" onClick={() => void api.cancelTuning(t2.id).then(load)}>
                {t("common.cancel")}
              </Button>
            )}
            {t2.status === "done" && t2.adopted.length > 0 && (
              <Button size="sm" onClick={() => void apply(t2.id)}>
                {t("bench.tuning.apply", { org: t2.org_name })}
              </Button>
            )}
            {applied[t2.id] && <span className="text-xs text-ok">{t("bench.tuning.applied", { text: applied[t2.id] })}</span>}
          </div>
        </div>
      ))}
    </Card>
  );
}

function Compare({ runs, onClear }: { runs: BenchRun[]; onClear: () => void }) {
  const t = useT();
  const locale = useLocale();
  const taskIds = useMemo(() => [...new Set(runs.flatMap((r) => r.results.map((x) => x.task_id)))].sort(), [runs]);
  const mean = (r: BenchRun, task: string) => {
    const xs = r.results.filter((x) => x.task_id === task).map((x) => x.score);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const best = Math.max(...runs.map((r) => r.summary.meanScore ?? 0), 1);
  return (
    <Card className="mt-5 space-y-4 p-5 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{t("bench.compare.title")}</div>
        <Button size="sm" variant="ghost" onClick={onClear}>
          {t("bench.compare.clear")}
        </Button>
      </div>
      <div className="space-y-1.5">
        {runs.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="w-40 truncate text-xs">
              <b>R{i + 1}</b> {r.orgName}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-panel-2">
              <div className="h-full rounded bg-accent" style={{ width: `${((r.summary.meanScore ?? 0) / best) * 100}%` }} />
            </div>
            <span className="w-12 text-right font-semibold tabular-nums">
              {r.summary.meanScore != null ? formatNumber(locale, r.summary.meanScore, 1) : "–"}
            </span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-ink-3">
            <tr className="text-left">
              <th className="px-2 py-1 font-medium">{t("bench.compare.colTask")}</th>
              {runs.map((r, i) => (
                <th key={r.id} className="px-2 py-1 text-right font-medium" title={r.orgName}>
                  R{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {taskIds.map((t) => {
              const values = runs.map((r) => mean(r, t));
              const top = Math.max(...values.map((v) => v ?? -1));
              return (
                <tr key={t} className="border-t border-line">
                  <td className="px-2 py-1.5">{t}</td>
                  {values.map((v, i) => (
                    <td key={i} className={cx("px-2 py-1.5 text-right tabular-nums", v != null && v === top && "font-semibold text-ok")}>
                      {v == null ? "–" : formatNumber(locale, v, 1)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {(
              [
                [t("bench.compare.meanScore"), (r: BenchRun) => (r.summary.meanScore != null ? formatNumber(locale, r.summary.meanScore, 1) : "–")],
                [t("bench.compare.fullScores"), (r: BenchRun) => `${formatNumber(locale, r.summary.fullScores)}/${formatNumber(locale, r.results.length)}`],
                [t("bench.compare.time"), (r: BenchRun) => minutes(locale, r.summary.wallSeconds)],
                [t("bench.compare.tokens"), (r: BenchRun) => kTokens(locale, r.summary.tokens)],
                [t("bench.compare.cost"), (r: BenchRun) => money(locale, r.summary.costUsd)],
                [
                  t("bench.compare.pointsPerDollar"),
                  (r: BenchRun) =>
                    r.summary.costUsd
                      ? formatNumber(locale, Math.round(r.results.reduce((a, x) => a + x.score, 0) / r.summary.costUsd))
                      : "–",
                ],
                [t("bench.compare.timeouts"), (r: BenchRun) => formatNumber(locale, r.summary.timeouts)],
                [t("bench.compare.modelCalls"), (r: BenchRun) => (r.summary.modelCalls != null ? formatNumber(locale, r.summary.modelCalls) : "–")],
                [
                  t("bench.compare.modelTime"),
                  (r: BenchRun) => (r.summary.modelMinutes != null ? t("bench.tuning.minutes", { minutes: formatNumber(locale, r.summary.modelMinutes) }).trim() : "–"),
                ],
                [
                  t("bench.compare.fromCache"),
                  (r: BenchRun) => (r.summary.cachedPct != null ? `${formatNumber(locale, r.summary.cachedPct)}%` : "–"),
                ],
                [t("bench.compare.toolCalls"), (r: BenchRun) => (r.summary.toolCalls != null ? formatNumber(locale, r.summary.toolCalls) : "–")],
                [t("bench.compare.messages"), (r: BenchRun) => (r.summary.messages != null ? formatNumber(locale, r.summary.messages) : "–")],
                [
                  t("bench.compare.editsFailed"),
                  (r: BenchRun) => (r.summary.edits ? `${formatNumber(locale, r.summary.editFailures)} / ${formatNumber(locale, r.summary.edits)}` : "–"),
                ],
                [t("bench.compare.subagents"), (r: BenchRun) => (r.summary.subagents != null ? formatNumber(locale, r.summary.subagents) : "–")],
                [
                  t("bench.compare.acceptanceChecks"),
                  (r: BenchRun) => (r.summary.acceptanceChecks != null ? formatNumber(locale, r.summary.acceptanceChecks) : "–"),
                ],
              ] as [string, (r: BenchRun) => string][]
            ).map(([label, fn]) => (
              <tr key={label} className="border-t border-line bg-panel-2/40">
                <td className="px-2 py-1.5 font-medium">{label}</td>
                {runs.map((r) => (
                  <td key={r.id} className="px-2 py-1.5 text-right tabular-nums">
                    {fn(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
