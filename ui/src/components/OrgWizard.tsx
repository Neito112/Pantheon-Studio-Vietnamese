"use client";

/**
 * The new-organization wizard: say what the organization is for, let Zeus draft the team
 * (or start from a template, or blank), then edit each agent's prompt, tools and what runs
 * it, and the organization's settings, before anything is created. Everything a template
 * sets is visible and editable here, instead of hidden in settings after the fact.
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { notifyOrgsChanged } from "@/components/AppShell";
import { KindTab } from "@/components/team/KindTab";
import { useT } from "@/i18n";
import { DEFAULT_WORKSPACE, WorkspaceSetup, workspaceReady, type WorkspaceSpec } from "@/components/WorkspaceSetup";
import { Badge, Button, cx, ErrorNote, Field, Input, Modal, Select, Textarea, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import type { Agent, Provider, Template, WizardAgent, WizardTools } from "@/lib/types";

type Kind = "solo" | "team" | "flow";
type Runner = Record<string, unknown>;
type Def = Record<string, unknown>;

interface DraftAgent extends WizardAgent {
  key: string;
  kind: string;
  runner: Runner;
  /** Approval per tool, kept from a template ("ask" for the shell otherwise). */
  approvals: Record<string, string>;
  /** Everything else a template's agent carried (skills, avatar, permissions…), passed through. */
  raw: Def;
}

interface Draft {
  name: string;
  description: string;
  agents: DraftAgent[];
  maxConcurrent: number;
  shell: "ask" | "auto";
  loadout: "lean" | "all";
  writing: "plain" | "ste";
  model: string; // "providerId::model", or "" for the platform default
  /** The template's own definition (channels, flows, relationships, world…), when started from one. */
  base: Def | null;
}

const STEPS = ["purpose", "agents", "settings", "review"] as const;

let seq = 0;
const newKey = () => `a${++seq}`;

function toAgent(a: WizardAgent, extra?: Partial<DraftAgent>): DraftAgent {
  return { kind: "llm", runner: {}, approvals: {}, raw: {}, ...extra, ...a, key: newKey() };
}

function emptyDraft(): Draft {
  return { name: "", description: "", agents: [], maxConcurrent: 4, shell: "ask", loadout: "lean", writing: "plain", model: "", base: null };
}

/** A template's definition as an editable draft. */
function fromTemplate(def: Def, base: string[]): Draft {
  const settings = (def.settings ?? {}) as Record<string, unknown>;
  const rels = (def.relationships ?? []) as { from: string; kind?: string }[];
  const leads = new Set(rels.filter((r) => (r.kind ?? "manages") === "manages").map((r) => r.from));
  const model = settings.default_model as { provider_id?: string; model?: string } | undefined;
  return {
    name: String(def.name ?? ""),
    description: String(def.description ?? ""),
    agents: ((def.agents ?? []) as Def[]).map((a) => {
      const entries = ((a.tools as unknown[] | undefined) ?? base).map((t) =>
        typeof t === "string" ? { name: t, approval: "auto" } : (t as { name: string; approval?: string }),
      );
      const { name, role, persona, tools: _t, kind, runner, ...raw } = a;
      void _t;
      return toAgent(
        { name: String(name ?? ""), role: String(role ?? ""), persona: String(persona ?? ""), lead: leads.has(String(name)), tools: entries.map((e) => e.name) },
        { kind: String(kind ?? "llm"), runner: (runner ?? {}) as Runner, approvals: Object.fromEntries(entries.map((e) => [e.name, e.approval ?? "auto"])), raw },
      );
    }),
    maxConcurrent: Number(settings.max_concurrent ?? 4) || 4,
    shell: settings.shell_approval === "auto" ? "auto" : "ask",
    loadout: settings.tools === "all" ? "all" : "lean",
    writing: settings.writing === "ste" ? "ste" : "plain",
    model: model?.provider_id && model.model ? `${model.provider_id}::${model.model}` : "",
    base: def,
  };
}

/** The draft as an organization definition (the export format POST /orgs takes). */
function toDefinition(d: Draft, kind: Kind): Def {
  const base = d.base ?? { version: 1 };
  const names = new Set(d.agents.map((a) => a.name));
  const baseSettings = (base.settings ?? {}) as Record<string, unknown>;
  const [provider_id, model] = d.model ? d.model.split("::") : [];
  const rels = ((base.relationships ?? []) as { from: string; to: string; kind?: string }[]).filter((r) => names.has(r.from) && names.has(r.to));
  const lead = d.agents.find((a) => a.lead);
  if (lead && d.agents.length > 1) {
    for (const a of d.agents) {
      if (a.name === lead.name || rels.some((r) => r.to === a.name && (r.kind ?? "manages") === "manages")) continue;
      rels.push({ from: lead.name, to: a.name, kind: "manages" });
    }
  }
  return {
    ...base,
    name: d.name,
    description: d.description,
    settings: {
      ...baseSettings,
      mode: kind === "flow" ? "flow" : "team",
      max_concurrent: d.maxConcurrent,
      shell_approval: d.shell,
      tools: d.loadout,
      writing: d.writing,
      ...(provider_id ? { default_model: { provider_id, model } } : {}),
    },
    agents: d.agents.map((a) => ({
      ...a.raw,
      name: a.name,
      role: a.role,
      persona: a.persona,
      kind: a.kind,
      runner: a.runner,
      tools: a.tools.map((n) => ({ name: n, approval: a.approvals[n] ?? (n === "run_command" ? "ask" : "auto") })),
    })),
    relationships: rels,
  };
}

export function OrgWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [kind, setKind] = useState<Kind>("solo");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [workspace, setWorkspace] = useState<WorkspaceSpec>(DEFAULT_WORKSPACE);
  const [catalog, setCatalog] = useState<WizardTools | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState("");

  useEffect(() => {
    if (!open) return;
    api.wizardTools().then(setCatalog).catch(() => {});
    api.templates().then(setTemplates).catch(() => {});
    api.providers().then(setProviders).catch(() => {});
  }, [open]);

  const reset = () => {
    setStep(0);
    setGoal("");
    setKind("solo");
    setDraft(emptyDraft());
    setWorkspace(DEFAULT_WORKSPACE);
    setError(null);
    setAsk("");
  };
  const close = () => {
    onClose();
    reset();
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const zeusDraft = (revise: boolean) =>
    run(revise ? "revise" : "draft", async () => {
      const current = revise ? toDefinition(draft, kind) : undefined;
      const out = await api.wizardDraft<{ name: string; description: string; agents: WizardAgent[]; settings: { max_concurrent?: number } }>({
        goal,
        kind,
        current,
        ask: revise ? ask : "",
      });
      setDraft((d) => ({
        ...d,
        name: out.name || d.name,
        description: out.description || d.description,
        agents: out.agents.map((a) => {
          const was = d.agents.find((x) => x.name === a.name);
          return toAgent(a, was ? { kind: was.kind, runner: was.runner, approvals: was.approvals, raw: was.raw } : {});
        }),
        maxConcurrent: out.settings.max_concurrent ?? Math.min(Math.max(out.agents.length, 1), 4),
      }));
      setAsk("");
      setStep(1);
    });

  const pickTemplate = (tpl: Template) =>
    run("template", async () => {
      const def = await api.template(tpl.key);
      setDraft(fromTemplate(def, catalog?.base ?? []));
      setKind(tpl.mode === "flow" ? "flow" : tpl.agents.length > 1 ? "team" : "solo");
      setWorkspace((w) => ({ ...w, git: tpl.workspace?.git ?? w.git, worktrees: tpl.workspace?.worktrees ?? w.worktrees }));
      setStep(1);
    });

  const blank = () => {
    setDraft({ ...emptyDraft(), name: draft.name, agents: [toAgent({ name: "Atlas", role: "Assistant", lead: false, persona: "", tools: catalog?.base ?? [] })] });
    setStep(1);
  };

  const create = () =>
    run("create", async () => {
      const org = await api.createOrg({ definition: toDefinition(draft, kind), name: draft.name || undefined, setup: workspace });
      notifyOrgsChanged();
      close();
      router.push(`/org/${org.id}`);
    });

  const setAgent = (key: string, patch: Partial<DraftAgent>) => setDraft((d) => ({ ...d, agents: d.agents.map((a) => (a.key === key ? { ...a, ...patch } : a)) }));
  const names = draft.agents.map((a) => a.name.trim().toLowerCase());
  const problems = [
    !draft.name.trim() && t("org.problemName"),
    draft.agents.length === 0 && t("org.problemNoAgents"),
    names.some((n) => !n) && t("org.problemAgentName"),
    new Set(names).size !== names.length && t("org.problemDuplicateName"),
    !workspaceReady(workspace) && t("org.problemWorkspace"),
  ].filter(Boolean) as string[];

  const footer = (
    <>
      <span className="mr-auto self-center text-xs text-ink-3">
        {t("org.stepOf", { step: step + 1, total: STEPS.length })}
      </span>
      {step > 0 && (
        <Button variant="ghost" onClick={() => setStep(step - 1)}>
          {t("common.back")}
        </Button>
      )}
      {step === 0 ? null : step < STEPS.length - 1 ? (
        <Button variant="primary" onClick={() => setStep(step + 1)} disabled={draft.agents.length === 0}>
          {t("common.next")}
        </Button>
      ) : (
        <Button variant="primary" onClick={create} loading={busy === "create"} disabled={problems.length > 0 || busy !== null}>
          {t("org.createOrganization")}
        </Button>
      )}
    </>
  );

  const kindCards: [Kind, string, string][] = [
    ["solo", t("org.kindSolo"), t("org.kindSoloHint")],
    ["team", t("org.kindTeam"), t("org.kindTeamHint")],
    ["flow", t("org.kindFlow"), t("org.kindFlowHint")],
  ];

  return (
    <Modal open={open} onClose={close} title={t("org.wizardTitle")} wide footer={footer}>
      <Stepper step={step} reached={draft.agents.length > 0 ? STEPS.length - 1 : 0} onStep={setStep} />
      <div className="mt-5">
        {step === 0 && (
          <div className="grid gap-5">
            <Field label={t("org.whatShouldItDo")} hint={t("org.whatShouldItDoHint")}>
              <Textarea
                rows={4}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder={t("org.goalPlaceholder")}
              />
            </Field>
            <Field label={t("org.kind")}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {kindCards.map(([id, label, hint]) => (
                  <button key={id} type="button" onClick={() => setKind(id)} className={cardClass(kind === id)}>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="mt-1 text-xs text-ink-3">{hint}</div>
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => zeusDraft(false)} loading={busy === "draft"} disabled={!goal.trim() || busy !== null}>
                {t("org.draftWithZeus")}
              </Button>
              <Button variant="ghost" onClick={blank} disabled={busy !== null}>
                {t("org.startBlank")}
              </Button>
              {busy === "draft" && <span className="text-xs text-ink-3">{t("org.zeusDrafting")}</span>}
            </div>
            <ErrorNote error={error} />
            <TemplateList templates={templates} onPick={pickTemplate} onChanged={() => api.templates().then(setTemplates)} busy={busy === "template"} />
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            {goal.trim() && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel-2 p-2">
                <Input className="min-w-0 flex-1" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={t("org.askZeusPlaceholder")} />
                <Button size="sm" onClick={() => zeusDraft(true)} loading={busy === "revise"} disabled={!ask.trim() || busy !== null}>
                  {t("org.revise")}
                </Button>
              </div>
            )}
            <ErrorNote error={error} />
            {draft.agents.map((a) => (
              <AgentCard
                key={a.key}
                agent={a}
                team={draft.agents.length > 1}
                catalog={catalog}
                onChange={(p) => setAgent(a.key, p)}
                onLead={() => setDraft((d) => ({ ...d, agents: d.agents.map((x) => ({ ...x, lead: x.key === a.key })) }))}
                onRemove={() => setDraft((d) => ({ ...d, agents: d.agents.filter((x) => x.key !== a.key) }))}
                improve={(instruction) =>
                  run(`improve:${a.key}`, async () => {
                    const out = await api.wizardDraft<WizardAgent>({
                      org: { goal, name: draft.name, description: draft.description },
                      agent: { name: a.name, role: a.role, lead: a.lead, persona: a.persona, tools: a.tools },
                      ask: instruction,
                    });
                    setAgent(a.key, { role: out.role || a.role, persona: out.persona || a.persona, tools: out.tools });
                  })
                }
                improving={busy === `improve:${a.key}`}
              />
            ))}
            <div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDraft((d) => ({ ...d, agents: [...d.agents, toAgent({ name: "", role: "", lead: false, persona: "", tools: catalog?.base ?? [] })] }))
                }
              >
                {t("org.addAgent")}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <Field label={t("org.name")}>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t("org.namePlaceholder")} />
            </Field>
            <Field label={t("org.description")} hint={t("org.descriptionHint")}>
              <Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("common.model")} hint={t("org.modelHint")}>
                <Select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
                  <option value="">{t("org.platformDefault")}</option>
                  {providers.flatMap((p) =>
                    p.models.map((m) => (
                      <option key={`${p.id}::${m.id}`} value={`${p.id}::${m.id}`}>
                        {p.name} · {m.id}
                      </option>
                    )),
                  )}
                </Select>
              </Field>
              <Field label={t("org.shellCommands")} hint={t("org.shellHint")}>
                <Select value={draft.shell} onChange={(e) => setDraft({ ...draft, shell: e.target.value as Draft["shell"] })}>
                  <option value="ask">{t("org.shellAsk")}</option>
                  <option value="auto">{t("org.shellAuto")}</option>
                </Select>
              </Field>
              <Field label={t("org.agentsAtOnce")} hint={t("org.agentsAtOnceHint")}>
                <Input type="number" min={1} max={8} value={draft.maxConcurrent} onChange={(e) => setDraft({ ...draft, maxConcurrent: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })} />
              </Field>
              <Field label={t("org.toolsOffered")} hint={t("org.toolsOfferedHint")}>
                <Select value={draft.loadout} onChange={(e) => setDraft({ ...draft, loadout: e.target.value as Draft["loadout"] })}>
                  <option value="lean">{t("org.loadoutLean")}</option>
                  <option value="all">{t("org.loadoutAll")}</option>
                </Select>
              </Field>
            </div>
            <Toggle checked={draft.writing === "ste"} onChange={(v) => setDraft({ ...draft, writing: v ? "ste" : "plain" })} label={t("org.steToggle")} />
            <Field label={t("org.workspace")} hint={t("org.workspaceHint")}>
              <WorkspaceSetup value={workspace} onChange={setWorkspace} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 text-sm">
            <div>
              <div className="text-base font-semibold">{draft.name || t("org.unnamedOrganization")}</div>
              <div className="mt-1 text-ink-2">{draft.description || t("org.noDescriptionShort")}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="accent">{kindCards.find((k) => k[0] === kind)?.[1]}</Badge>
                <Badge>{t("org.atOnceBadge", { count: draft.maxConcurrent })}</Badge>
                <Badge tone={draft.shell === "auto" ? "warn" : "neutral"}>
                  {draft.shell === "auto" ? t("org.shellRunsBadge") : t("org.shellAsksBadge")}
                </Badge>
                <Badge>{t("org.toolsBadge", { count: draft.loadout === "all" ? "all" : "lean" })}</Badge>
                {draft.writing === "ste" && <Badge>STE</Badge>}
                <Badge>{draft.model ? draft.model.split("::")[1] : t("org.defaultModelBadge")}</Badge>
              </div>
            </div>
            <div className="grid gap-2">
              {draft.agents.map((a) => (
                <div key={a.key} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.name || t("org.noName")}</span>
                    <span className="text-ink-3">{a.role}</span>
                    {a.lead && draft.agents.length > 1 && <Badge tone="accent">{t("org.leadBadge")}</Badge>}
                    {a.kind !== "llm" && <Badge tone="info">{String(a.runner.preset || a.runner.command || a.kind)}</Badge>}
                    <span className="ml-auto text-xs text-ink-3">{t("org.toolCount", { count: a.tools.length })}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-ink-3">{a.persona || t("org.noPromptYet")}</div>
                </div>
              ))}
            </div>
            {problems.length > 0 && (
              <ul className="list-disc pl-5 text-warn">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            {kind === "flow" && <div className="text-ink-3">{t("org.flowHintAfterCreate")}</div>}
            <ErrorNote error={error} />
          </div>
        )}
      </div>
    </Modal>
  );
}

const cardClass = (active: boolean) =>
  cx("relative rounded-lg border p-3 text-left transition-colors cursor-pointer", active ? "border-accent bg-accent/10" : "border-line hover:border-line-2");

function Stepper({ step, reached, onStep }: { step: number; reached: number; onStep: (n: number) => void }) {
  const t = useT();
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {STEPS.map((s, i) => (
        <li key={s}>
          <button
            type="button"
            disabled={i > reached}
            onClick={() => onStep(i)}
            className={cx(
              "rounded-full px-3 py-1 transition-colors",
              i === step ? "bg-accent/15 font-medium text-accent" : "text-ink-3",
              i <= reached && i !== step && "cursor-pointer hover:text-ink",
              i > reached && "opacity-50",
            )}
          >
            {i + 1}. {t(`org.step${s.charAt(0).toUpperCase()}${s.slice(1)}` as string)}
          </button>
        </li>
      ))}
    </ol>
  );
}

function AgentCard({
  agent,
  team,
  catalog,
  onChange,
  onLead,
  onRemove,
  improve,
  improving,
}: {
  agent: DraftAgent;
  team: boolean;
  catalog: WizardTools | null;
  onChange: (p: Partial<DraftAgent>) => void;
  onLead: () => void;
  onRemove: () => void;
  improve: (instruction: string) => void;
  improving: boolean;
}) {
  const [open, setOpen] = useState(!agent.persona);
  const [panel, setPanel] = useState<"prompt" | "tools" | "runs">("prompt");
  const [instruction, setInstruction] = useState("");
  const external = agent.kind !== "llm";
  const t = useT();
  return (
    <div className="rounded-lg border border-line">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left cursor-pointer">
        <span className="text-ink-3">{open ? "▾" : "▸"}</span>
        <span className="font-medium">{agent.name || t("org.newAgent")}</span>
        <span className="text-sm text-ink-3">{agent.role}</span>
        {team && agent.lead && <Badge tone="accent">{t("org.leadBadge")}</Badge>}
        {external && <Badge tone="info">{String(agent.runner.preset || agent.runner.command || agent.kind)}</Badge>}
        <span className="ml-auto text-xs text-ink-3">{t("org.toolCount", { count: agent.tools.length })}</span>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-line p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("org.name")}>
              <Input value={agent.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={t("org.agentNamePlaceholder")} />
            </Field>
            <Field label={t("team.agentRole")}>
              <Input value={agent.role} onChange={(e) => onChange({ role: e.target.value })} placeholder={t("org.rolePlaceholder")} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {team && <Toggle checked={agent.lead} onChange={(v) => v && onLead()} label={t("org.leadsTheTeam")} />}
            <div className="ml-auto flex gap-1">
              {(
                [
                  ["prompt", t("org.tabPrompt")],
                  ["tools", t("org.tabTools")],
                  ["runs", t("org.tabRunsOn")],
                ] as const
              ).map(([id, label]) => (
                <Button key={id} size="sm" variant={panel === id ? "secondary" : "ghost"} onClick={() => setPanel(id)}>
                  {label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={onRemove} title={t("org.removeAgentTitle")}>
                {t("org.remove")}
              </Button>
            </div>
          </div>

          {panel === "prompt" && (
            <>
              <Textarea
                rows={10}
                value={agent.persona}
                onChange={(e) => onChange({ persona: e.target.value })}
                placeholder={t("org.personaPlaceholder")}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Input className="min-w-0 flex-1" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={t("org.improvePlaceholder")} />
                <Button size="sm" onClick={() => improve(instruction)} loading={improving}>
                  {agent.persona ? t("org.improveWithZeus") : t("org.writeWithZeus")}
                </Button>
              </div>
            </>
          )}
          {panel === "tools" && <ToolPicker value={agent.tools} catalog={catalog} onChange={(tools) => onChange({ tools })} />}
          {panel === "runs" && (
            <div className="grid gap-2">
              <div className="text-xs text-ink-3">{t("org.runsOnHint")}</div>
              <KindTab draft={{ kind: agent.kind, runner: agent.runner } as unknown as Agent} onChange={(kind, runner) => onChange({ kind, runner })} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolPicker({ value, catalog, onChange }: { value: string[]; catalog: WizardTools | null; onChange: (v: string[]) => void }) {
  const [filter, setFilter] = useState("");
  const t = useT();
  const chosen = new Set(value);
  const base = new Set(catalog?.base ?? []);
  const groups = useMemo(() => {
    const out = new Map<string, WizardTools["tools"]>();
    const f = filter.trim().toLowerCase();
    for (const tool of catalog?.tools ?? []) {
      if (base.has(tool.name) || (f && !`${tool.name} ${tool.summary}`.toLowerCase().includes(f))) continue;
      out.set(tool.category, [...(out.get(tool.category) ?? []), tool]);
    }
    return [...out.entries()].sort(([a], [b]) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, filter]);
  if (!catalog) return <div className="text-sm text-ink-3">{t("org.loadingTools")}</div>;
  const toggle = (n: string) => onChange(chosen.has(n) ? value.filter((x) => x !== n) : [...value, n]);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1">
        <span className="mr-1 text-xs text-ink-3">{t("org.alwaysLabel")}</span>
        {catalog.base.map((n) => (
          <Badge key={n} tone="accent">
            {n}
          </Badge>
        ))}
      </div>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("org.findToolPlaceholder")} />
      <div className="grid max-h-80 gap-3 overflow-y-auto pr-1">
        {groups.map(([cat, tools]) => (
          <div key={cat}>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-3">
              {cat} · {tools.filter((tool) => chosen.has(tool.name)).length}/{tools.length}
              <button
                type="button"
                className="ml-2 normal-case tracking-normal text-accent hover:underline cursor-pointer"
                onClick={() => {
                  const all = tools.every((tool) => chosen.has(tool.name));
                  const names = new Set(tools.map((tool) => tool.name));
                  onChange(all ? value.filter((n) => !names.has(n)) : [...new Set([...value, ...names])]);
                }}
              >
                {tools.every((tool) => chosen.has(tool.name)) ? t("org.selectNone") : t("org.selectAll")}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {tools.map((tool) => (
                <label key={tool.name} className={cx("flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5", chosen.has(tool.name) ? "border-accent/50 bg-accent/5" : "border-line")}>
                  <input type="checkbox" className="mt-0.5" checked={chosen.has(tool.name)} onChange={() => toggle(tool.name)} />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">
                      {tool.name}
                      {tool.sideEffects && <span className="ml-1 text-warn">{t("org.actsOutside")}</span>}
                    </span>
                    <span className="block text-[11px] text-ink-3">{tool.summary}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateList({ templates, onPick, onChanged, busy }: { templates: Template[]; onPick: (tpl: Template) => void; onChanged: () => void; busy: boolean }) {
  const [note, setNote] = useState<string | null>(null);
  const t = useT();
  const groups: [string, Template[]][] = [
    [t("org.templatesGroup"), templates.filter((tpl) => tpl.source === "builtin")],
    [t("org.templatesMineGroup"), templates.filter((tpl) => tpl.source === "mine")],
    [t("org.templatesPackGroup"), templates.filter((tpl) => tpl.source === "pack")],
  ];
  const importFile = (f: File) =>
    f
      .text()
      .then((text) => api.addTemplate(JSON.parse(text)))
      .then((tpl) => {
        setNote(t("org.templateAdded", { name: tpl.name }));
        onChanged();
        onPick(tpl);
      })
      .catch((e: Error) => setNote(e instanceof SyntaxError ? t("org.templateNotJson") : e.message));
  return (
    <div className="grid gap-4 border-t border-line pt-4">
      <div className="text-sm text-ink-2">
        {t("org.templatesIntro")}
        {busy && t("org.templatesLoading")}
      </div>
      {groups.map(
        ([label, list]) =>
          list.length > 0 && (
            <div key={label}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">{label}</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {list.map((tpl) => (
                  <button key={tpl.key} onClick={() => onPick(tpl)} className={cardClass(false)}>
                    <div className="flex items-center gap-2 pr-5 text-sm font-medium">
                      {tpl.name}
                      {tpl.mode === "flow" && <Badge tone="info">{t("org.templateFlowBadge")}</Badge>}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-ink-3">{tpl.description}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tpl.agents.map((a) => (
                        <Badge key={a.name}>{a.name}</Badge>
                      ))}
                    </div>
                    {tpl.source === "mine" && (
                      <span
                        role="button"
                        title={t("org.templateDeleteTitle")}
                        onClick={(e) => {
                          e.stopPropagation();
                          void api.deleteTemplate(tpl.key).then(onChanged);
                        }}
                        className="absolute right-2 top-2 rounded px-1 text-ink-3 hover:bg-bad/15 hover:text-bad"
                      >
                        ✕
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ),
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
        <label className="cursor-pointer text-accent hover:underline">
          {t("org.importTemplateFile")}
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void importFile(f);
            }}
          />
        </label>
        <span>{t("org.templatesPacksNote")}</span>
        {note && <span className="text-ink-2">{note}</span>}
      </div>
    </div>
  );
}
