"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentAvatar, StatusBadge } from "@/components/agent";
import { Markdown } from "@/components/Markdown";
import { Badge, Button, cx, ErrorNote, Field, Input, Select, Tabs, Textarea, Toggle } from "@/components/ui";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import { ContextControls } from "@/components/ContextControls";
import { AgentFiles } from "@/components/Files";
import { LibraryPicker } from "@/components/LibraryPicker";
import { KindTab } from "./KindTab";
import type { Agent, CatalogTool, McpServer, Provider, TaskPolicy, ToolEntry } from "@/lib/types";
import { characterFor, characterGroups, characterLabel, characterThumb } from "@/office/characters";
import { useOfficeReady } from "@/office/registry";
import { useOrg } from "@/store/org";

type Tab = "profile" | "kind" | "model" | "tools" | "files" | "permissions" | "workspace" | "look";

export function AgentEditor({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const t = useT();
  const agent = useOrg((s) => s.agents[agentId]);
  const orgId = useOrg((s) => s.orgId)!;
  const [tab, setTab] = useState<Tab>("profile");
  const [draft, setDraft] = useState<Agent>(agent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(agent), [agentId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => JSON.stringify(pick(draft)) !== JSON.stringify(pick(agent)), [draft, agent]);
  if (!agent) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateAgent(agentId, pick(draft));
      useOrg.setState((s) => ({ agents: { ...s.agents, [agentId]: updated } }));
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof Agent>(k: K, v: Agent[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <AgentAvatar agent={draft} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold">
            {agent.name} <StatusBadge status={agent.runtimeStatus} />
          </div>
          <div className="text-xs text-ink-3">{agent.role}</div>
        </div>
        <button className="text-ink-3 hover:text-ink cursor-pointer" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="px-5 pt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "profile", label: t("team.tabProfile") },
            { value: "kind", label: t("team.tabKind") },
            { value: "model", label: t("team.tabModel") },
            { value: "tools", label: t("team.tabTools", { count: draft.tools.length }) },
            { value: "files", label: t("team.tabFiles") },
            { value: "permissions", label: t("team.tabPermissions") },
            { value: "workspace", label: t("team.tabWorkspace") },
            { value: "look", label: t("team.tabLook") },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "profile" && <ProfileTab draft={draft} set={set} />}
        {tab === "kind" && <KindTab draft={draft} onChange={(kind, runner) => setDraft((d) => ({ ...d, kind, runner }))} />}
        {tab === "model" && <ModelSettings model={draft.model ?? {}} onChange={(m) => set("model", m)} />}
        {tab === "tools" && <ToolsTab draft={draft} set={set} orgId={orgId} />}
        {tab === "files" && <AgentFiles orgId={orgId} agentId={agentId} agentName={draft.name} />}
        {tab === "permissions" && <PermissionsTab draft={draft} set={set} />}
        {tab === "workspace" && <WorkspaceTab draft={draft} set={set} agentId={agentId} onDeleted={onClose} />}
        {tab === "look" && <LookTab draft={draft} set={set} />}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-5 py-3">
        <ErrorNote error={error} />
        {saved && <span className="text-sm text-ok">{t("team.saved")}</span>}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(agent)}>
            {t("team.discard")}
          </Button>
          <Button variant="primary" disabled={!dirty} loading={saving} onClick={save}>
            {t("team.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function pick(a: Agent): Partial<Agent> {
  return {
    name: a.name,
    role: a.role,
    team: a.team,
    persona: a.persona,
    model: a.model,
    tools: a.tools,
    skills: a.skills ?? [],
    worktree: a.worktree,
    limits: a.limits,
    avatar: a.avatar,
    status: a.status,
    permissions: a.permissions,
    libraries: a.libraries ?? null,
    kind: a.kind ?? "llm",
    runner: a.runner ?? {},
  };
}

type SetFn = <K extends keyof Agent>(k: K, v: Agent[K]) => void;

function ProfileTab({ draft, set }: { draft: Agent; set: SetFn }) {
  const t = useT();
  const [preview, setPreview] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("team.agentName")}>
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label={t("team.agentRole")}>
          <Input value={draft.role} onChange={(e) => set("role", e.target.value)} />
        </Field>
        <Field label={t("team.agentTeam")} hint={t("team.profileTeamHint")}>
          <Input value={draft.team} onChange={(e) => set("team", e.target.value)} />
        </Field>
        <Field label={t("team.profileStatus")}>
          <Select value={draft.status} onChange={(e) => set("status", e.target.value as Agent["status"])}>
            <option value="active">{t("team.statusActive")}</option>
            <option value="standby">{t("team.statusStandby")}</option>
            <option value="paused">{t("team.statusPaused")}</option>
            <option value="disabled">{t("team.statusDisabled")}</option>
          </Select>
        </Field>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-2">{t("team.personaTitle")}</span>
          <button className="text-xs text-info hover:underline cursor-pointer" onClick={() => setPreview((v) => !v)}>
            {preview ? t("team.edit") : t("team.preview")}
          </button>
        </div>
        {preview ? (
          <div className="min-h-64 rounded-md border border-line bg-bg p-3">
            <Markdown>{draft.persona || t("team.personaEmpty")}</Markdown>
          </div>
        ) : (
          <Textarea className="min-h-80 font-mono text-[13px]" value={draft.persona} onChange={(e) => set("persona", e.target.value)} />
        )}
        <div className="mt-2">
          <Toggle
            checked={draft.persona.includes("ASD-STE100")}
            onChange={(on) => set("persona", toggleSte(draft.persona, on))}
            label={
              <span>
                {t("team.steToggleLead")} <b>{t("team.steToggleBold")}</b>{" "}
                <span className="text-ink-3">{t("team.steToggleHint")}</span>
              </span>
            }
          />
        </div>
        <div className="mt-1.5 text-xs text-ink-3">{t("team.personaAutoContext")}</div>
      </div>
    </div>
  );
}

/** Provider, model, thinking and limits for one agent (the editor's Model tab; also Zeus and Argus). */
export function ModelSettings({ model, onChange }: { model: Agent["model"]; onChange: (m: Agent["model"]) => void }) {
  const t = useT();
  const [providers, setProviders] = useState<Provider[]>([]);
  const org = useOrg((s) => s.org);
  useEffect(() => {
    api.providers().then(setProviders).catch(() => {});
  }, []);
  const m = model ?? {};
  const upd = (patch: Partial<Agent["model"]>) => onChange({ ...m, ...patch });
  const provider = providers.find((p) => p.id === m.provider_id);
  const orgDefault = org?.settings.default_model;
  return (
    <div className="grid gap-4">
      <Field
        label={t("team.provider")}
        hint={!m.provider_id ? (orgDefault?.provider_id ? t("team.inheritsOrgDefault") : t("team.inheritsGlobalDefault")) : undefined}
      >
        <Select value={m.provider_id ?? ""} onChange={(e) => upd({ provider_id: e.target.value || undefined, model: undefined })}>
          <option value="">{t("team.modelDefault")}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type})
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("common.model")}>
        <Input list="models" value={m.model ?? ""} onChange={(e) => upd({ model: e.target.value || undefined })} placeholder={provider?.defaultModel ?? t("team.modelPlaceholder")} />
        <datalist id="models">
          {(provider?.models ?? []).map((x) => (
            <option key={x.id} value={x.id} />
          ))}
        </datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("team.temperature", { value: m.temperature ?? t("team.providerDefault") })}>
          {m.temperature === undefined ? (
            <Button size="sm" variant="ghost" onClick={() => upd({ temperature: 0.7 })} title={t("team.overrideTemperatureTitle")}>
              {t("team.setTemperature")}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={1.5} step={0.05} value={m.temperature} onChange={(e) => upd({ temperature: Number(e.target.value) })} className="w-full accent-[#8b7cff]" />
              <Button size="sm" variant="ghost" onClick={() => upd({ temperature: undefined })} title={t("team.useProviderTemperature")}>
                {t("team.modelDefault")}
              </Button>
            </div>
          )}
        </Field>
        <Field label={t("team.thinking")} hint={t("team.thinkingHint")}>
          <Select value={m.reasoning_effort ?? ""} onChange={(e) => upd({ reasoning_effort: (e.target.value || undefined) as Agent["model"]["reasoning_effort"] })}>
            <option value="">{t("team.thinkingExtraHigh")}</option>
            <option value="off">{t("team.thinkingOff")}</option>
            <option value="low">{t("team.thinkingLow")}</option>
            <option value="medium">{t("team.thinkingMedium")}</option>
            <option value="high">{t("team.thinkingHigh")}</option>
            <option value="xhigh">{t("team.thinkingExtraHighAlways")}</option>
          </Select>
        </Field>
        <Field label={t("team.maxOutputTokens")}>
          <Input type="number" value={m.max_tokens ?? ""} onChange={(e) => upd({ max_tokens: e.target.value ? Number(e.target.value) : undefined })} placeholder={t("team.maxOutputTokensPlaceholder")} />
        </Field>
        <Field label={t("team.contextWindow")} hint={t("team.contextWindowHint")}>
          <Input type="number" value={m.context_window ?? ""} onChange={(e) => upd({ context_window: e.target.value ? Number(e.target.value) : undefined })} placeholder={t("team.contextWindowPlaceholder")} />
        </Field>
        <Field label={t("team.seesImages")} hint={t("team.seesImagesHint")}>
          <Select value={m.vision === undefined ? "" : String(m.vision)} onChange={(e) => upd({ vision: e.target.value === "" ? undefined : e.target.value === "true" })}>
            <option value="">{t("team.visionFromProvider")}</option>
            <option value="true">{t("team.visionYes")}</option>
            <option value="false">{t("team.visionNo")}</option>
          </Select>
        </Field>
        <Field label={t("team.watchesVideo")} hint={t("team.watchesVideoHint")}>
          <Select value={m.video === undefined ? "" : String(m.video)} onChange={(e) => upd({ video: e.target.value === "" ? undefined : e.target.value === "true" })}>
            <option value="">{t("team.videoFromModel")}</option>
            <option value="true">{t("team.videoYes")}</option>
            <option value="false">{t("team.videoNo")}</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}

/** Skills: know-how the agent opens when a skill's trigger fits (only the triggers are in its prompt). */
function SkillPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useT();
  const [all, setAll] = useState<{ name: string; description: string; builtin: boolean }[]>([]);
  useEffect(() => {
    api.skills().then(setAll).catch(() => {});
  }, []);
  if (!all.length) return null;
  return (
    <section>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">{t("team.skills")}</div>
      <div className="divide-y divide-line rounded-lg border border-line">
        {all.map((s) => (
          <label key={s.name} className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 accent-[#8b7cff]"
              checked={value.includes(s.name)}
              onChange={(e) => onChange(e.target.checked ? [...value, s.name] : value.filter((x) => x !== s.name))}
            />
            <span className="min-w-0">
              <span className="font-medium">{s.name}</span>
              {!s.builtin && <span className="ml-2 text-xs text-ink-3">{t("team.skillYours")}</span>}
              <span className="block text-xs text-ink-3">{s.description}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1.5 text-xs text-ink-3">{t("team.skillHint")}</div>
    </section>
  );
}

function ToolsTab({ draft, set, orgId }: { draft: Agent; set: SetFn; orgId: string }) {
  const t = useT();
  const [catalog, setCatalog] = useState<CatalogTool[]>([]);
  const [servers, setServers] = useState<McpServer[]>([]);
  const orgLibraries = useOrg((s) => s.org?.settings.libraries);
  useEffect(() => {
    api.toolCatalog().then(setCatalog).catch(() => {});
    api.mcpServers(orgId).then(setServers).catch(() => {});
  }, [orgId]);
  const entries = new Map(draft.tools.map((t) => [t.name, t]));
  const setEntry = (name: string, e: ToolEntry | null) => {
    const next = draft.tools.filter((t) => t.name !== name);
    if (e) next.push(e);
    set("tools", next);
  };
  const cats = [...new Set(catalog.map((c) => c.category))];
  const catLabel: Record<string, string> = {
    communication: t("team.catCommunication"),
    tasks: t("team.catTasks"),
    memory: t("team.catMemory"),
    files: t("team.catFiles"),
    shell: t("team.catShell"),
    web: t("team.catWeb"),
    meta: t("team.catSelfImprovement"),
  };
  return (
    <div className="space-y-5">
      <SkillPicker value={draft.skills ?? []} onChange={(skills) => set("skills", skills)} />
      <section>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">{t("team.stageLibraries")}</div>
        <LibraryPicker
          value={draft.libraries}
          onChange={(libraries) => set("libraries", libraries)}
          inherit={{ label: t("team.orgLibraryChoice"), value: orgLibraries }}
        />
      </section>
      {cats.map((cat) => (
        <section key={cat}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">{catLabel[cat] ?? cat}</div>
          <div className="divide-y divide-line rounded-lg border border-line">
            {catalog
              .filter((c) => c.category === cat)
              .map((c) => {
                const e = entries.get(c.name);
                return (
                  <ToolRow
                    key={c.name}
                    name={c.name}
                    description={c.description.split("\n")[0]}
                    enabled={!!e}
                    approval={e?.approval ?? c.defaultApproval}
                    risky={c.sideEffects}
                    onToggle={(on) => setEntry(c.name, on ? { name: c.name, approval: c.defaultApproval } : null)}
                    onApproval={(a) => setEntry(c.name, { name: c.name, approval: a })}
                  />
                );
              })}
          </div>
        </section>
      ))}
      <section>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">{t("team.mcpServers")}</div>
        {servers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-2 p-4 text-sm text-ink-3">{t("team.noMcpServers")}</div>
        ) : (
          <div className="divide-y divide-line rounded-lg border border-line">
            {servers.map((s) => {
              const key = `mcp:${s.name}:*`;
              const e = entries.get(key);
              return (
                <ToolRow
                  key={s.id}
                  name={t("team.mcpAllTools", { name: s.name })}
                  description={`${s.transport} · ${s.description || s.command || s.url || ""}`}
                  enabled={!!e}
                  approval={e?.approval ?? "auto"}
                  onToggle={(on) => setEntry(key, on ? { name: key, approval: "auto" } : null)}
                  onApproval={(a) => setEntry(key, { name: key, approval: a })}
                  badge={<Badge tone={s.status === "ready" ? "ok" : s.status === "error" ? "bad" : "neutral"}>{s.status}</Badge>}
                />
              );
            })}
          </div>
        )}
      </section>
      <div className="text-xs text-ink-3">
        <b>{t("team.approvalAskLabel")}</b> {t("team.toolsAskNote")}
      </div>
    </div>
  );
}

function ToolRow({
  name,
  description,
  enabled,
  approval,
  risky,
  onToggle,
  onApproval,
  badge,
}: {
  name: string;
  description: string;
  enabled: boolean;
  approval: "auto" | "ask" | "deny";
  risky?: boolean;
  onToggle: (on: boolean) => void;
  onApproval: (a: "auto" | "ask") => void;
  badge?: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className={cx("flex items-center gap-3 px-3 py-2.5", !enabled && "opacity-60")}>
      <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="size-4 accent-[#8b7cff]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs font-semibold">{name}</code>
          {risky && <Badge tone="warn">{t("team.sideEffects")}</Badge>}
          {badge}
        </div>
        <div className="truncate text-xs text-ink-3">{description}</div>
      </div>
      {enabled && (
        <Select className="h-7 w-28 text-xs" value={approval === "deny" ? "auto" : approval} onChange={(e) => onApproval(e.target.value as "auto" | "ask")}>
          <option value="auto">{t("team.approvalAuto")}</option>
          <option value="ask">{t("team.approvalAskMe")}</option>
        </Select>
      )}
    </div>
  );
}

function WorkspaceTab({ draft, set, agentId, onDeleted }: { draft: Agent; set: SetFn; agentId: string; onDeleted: () => void }) {
  const t = useT();
  const org = useOrg((s) => s.org);
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div className="grid gap-5">
      <Field
        label={t("team.worktree")}
        hint={t("team.worktreeHint", { path: org?.workspace ? ` (${org.workspace})` : "" })}
      >
        <Input value={draft.worktree ?? ""} onChange={(e) => set("worktree", e.target.value || null)} placeholder={t("team.worktreePlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("team.maxStepsPerTurn")} hint={t("team.maxStepsPerTurnHint")}>
          <Input type="number" value={draft.limits.max_steps_per_turn ?? ""} placeholder="600" onChange={(e) => set("limits", { ...draft.limits, max_steps_per_turn: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <Field label={t("team.maxTurnsPerHour")} hint={t("team.maxTurnsPerHourHint")}>
          <Input type="number" value={draft.limits.max_turns_per_hour ?? ""} placeholder="120" onChange={(e) => set("limits", { ...draft.limits, max_turns_per_hour: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
      </div>
      <section className="rounded-lg border border-line p-4">
        <div className="mb-2 text-sm font-semibold">{t("team.workingContext")}</div>
        <ContextControls agentId={agentId} name={draft.name} />
      </section>
      <section className="rounded-lg border border-bad/30 p-4">
        <div className="text-sm font-semibold text-bad">{t("team.dangerZone")}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="danger" size="sm" onClick={() => setConfirm("delete")}>
            {t("team.removeAgent")}
          </Button>
        </div>
        {confirm && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-ink-2">{t("team.removeAgentConfirm")}</span>
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                await api.deleteAgent(agentId);
                onDeleted();
                setConfirm(null);
              }}
            >
              {t("common.confirm")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function LookTab({ draft, set }: { draft: Agent; set: SetFn }) {
  const t = useT();
  const ready = useOfficeReady(); // the characters come from the office packs
  const av = draft.avatar;
  const current = characterFor(draft);
  if (!ready) return <div className="text-sm text-ink-3">{t("team.loadingCharacters")}</div>;
  return (
    <div className="grid gap-4">
      <div>
        <div className="mb-2 text-xs font-medium text-ink-2">{t("team.characterInOffice")}</div>
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {characterGroups().map((g) => (
            <div key={g.label}>
              <div className="mb-1 text-[11px] uppercase tracking-wider text-ink-3">{g.label}</div>
              <div className="grid grid-cols-6 gap-1.5">
                {g.keys.map((k) => (
                  <button
                    key={k}
                    onClick={() => set("avatar", { ...av, character: k })}
                    className={cx(
                      "flex aspect-square items-center justify-center rounded-lg border bg-white/90 transition-colors cursor-pointer",
                      current === k ? "border-accent ring-2 ring-accent/50" : "border-line-2 hover:border-ink-3",
                    )}
                    title={characterLabel(k)}
                  >
                    {characterThumb(k) ? (
                      <img src={characterThumb(k)} alt={characterLabel(k)} className="h-full w-full object-contain p-1" loading="lazy" />
                    ) : (
                      <span className="text-2xl font-semibold text-[#1b1d22]">{k === "robot" ? "🤖" : characterLabel(k).charAt(0)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <AgentAvatar agent={draft} size={48} />
        <div className="grid flex-1 grid-cols-2 gap-3">
          <Field label={t("team.color")} hint={t("team.colorHint")}>
            <input type="color" className="h-9 w-full cursor-pointer rounded-md border border-line-2 bg-bg" value={av.outfit ?? "#6d5dfc"} onChange={(e) => set("avatar", { ...av, outfit: e.target.value })} />
          </Field>
          <Field label={t("team.accent")}>
            <input type="color" className="h-9 w-full cursor-pointer rounded-md border border-line-2 bg-bg" value={av.accent ?? "#ffffff"} onChange={(e) => set("avatar", { ...av, accent: e.target.value })} />
          </Field>
        </div>
      </div>
      <VoicePicker value={av.voice ?? ""} onChange={(v) => set("avatar", { ...av, voice: v || undefined })} />
      <Button
        size="sm"
        className="w-fit"
        onClick={() => {
          // Plays the voice as chosen here, not the one last saved.
          void import("@/lib/voice").then((v) => v.speak(`Hi, I'm ${draft.name}, ${draft.role}.`, draft.id, av.voice));
        }}
      >
        {t("team.previewVoice")}
      </Button>
    </div>
  );
}

function PermissionsTab({ draft, set }: { draft: Agent; set: SetFn }) {
  const t = useT();
  const org = useOrg((s) => s.org);
  const orgPolicy = { create: true, assign: "anyone", edit: "any", require_review: true, ...(org?.settings.task_policy ?? {}) };
  const own = draft.permissions?.tasks ?? {};
  const upd = (patch: Partial<TaskPolicy> | null, key?: keyof TaskPolicy) => {
    const next: TaskPolicy = { ...own };
    if (patch === null && key) delete next[key];
    else Object.assign(next, patch);
    set("permissions", { ...(draft.permissions ?? {}), tasks: next });
  };
  const row = (key: keyof TaskPolicy, label: string, hint: string, options: { value: string; label: string }[]) => {
    const value = own[key];
    const inherited = orgPolicy[key];
    return (
      <Field label={label} hint={hint}>
        <Select
          value={value === undefined ? "" : String(value)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") upd(null, key);
            else upd({ [key]: v === "true" ? true : v === "false" ? false : v } as Partial<TaskPolicy>);
          }}
        >
          <option value="">
            {t("team.permissionOrgDefault", { value: options.find((o) => o.value === String(inherited))?.label ?? String(inherited) })}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  };
  return (
    <div className="grid gap-4">
      <p className="text-xs text-ink-3">{t("team.permissionsIntro")}</p>
      {row("create", t("team.permissionCreateTasks"), t("team.permissionCreateTasksHint"), [
        { value: "true", label: t("team.optionAllowed") },
        { value: "false", label: t("team.optionNotAllowed") },
      ])}
      {row("assign", t("team.permissionAssignWorkTo"), t("team.permissionAssignWorkToHint"), [
        { value: "anyone", label: t("team.optionAnyone") },
        { value: "reports", label: t("team.optionItselfAndReports") },
        { value: "self", label: t("team.optionOnlyItself") },
      ])}
      {row("edit", t("team.permissionChangeTasks"), t("team.permissionChangeTasksHint"), [
        { value: "any", label: t("team.optionAnyTask") },
        { value: "involved", label: t("team.optionInvolvedTasks") },
        { value: "assigned", label: t("team.optionOnlyAssigned") },
      ])}
      {row("require_review", t("team.permissionReviewBeforeDone"), t("team.permissionReviewBeforeDoneHint"), [
        { value: "true", label: t("team.optionRequired") },
        { value: "false", label: t("team.optionNotRequired") },
      ])}
    </div>
  );
}
/** The agent's voice: one of the speech server's voices, or one of this browser's. */
function VoicePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [info, setInfo] = useState<{ voices: string[]; default: string; error?: string } | null>(null);
  const [local, setLocal] = useState<{ name: string; lang: string }[]>([]);
  useEffect(() => {
    api.voiceVoices().then(setInfo).catch(() => setInfo({ voices: [], default: "" }));
    void import("@/lib/voice").then((v) => v.browserVoices()).then((all) => setLocal(all.map((x) => ({ name: x.name, lang: x.lang }))));
  }, []);
  const listed = info?.voices ?? [];
  const known = [...listed, ...local.map((v) => `browser:${v.name}`)];
  if (!listed.length && !local.length) {
    return (
      <Field label={t("team.voice")} hint={t("team.voiceHint")}>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t("team.voicePlaceholder")} />
      </Field>
    );
  }
  return (
    <Field
      label={t("team.voice")}
      hint={listed.length ? t("team.voiceUsedWhen") : t("team.voiceNoServer")}
    >
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">
          {t("team.defaultVoice")}
          {info?.default ? ` (${info.default})` : ""}
        </option>
        {value && !known.includes(value) && (
          <option value={value}>
            {value.replace(/^browser:/, "")} ({t("team.notAvailableHere")})
          </option>
        )}
        {listed.length > 0 && (
          <optgroup label={t("team.speechServer")}>
            {listed.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </optgroup>
        )}
        {local.length > 0 && (
          <optgroup label={t("team.thisBrowser")}>
            {local.map((v) => (
              <option key={v.name} value={`browser:${v.name}`}>
                {v.name} ({v.lang})
              </option>
            ))}
          </optgroup>
        )}
      </Select>
    </Field>
  );
}

export const STE_LINE = "Always write in ASD-STE100 Simplified Technical English (STE).";

/** Add or remove the persona line that asks for ASD-STE100 Simplified Technical English. */
export function toggleSte(persona: string, on: boolean): string {
  const without = persona
    .split("\n")
    .filter((l) => !l.includes("ASD-STE100"))
    .join("\n")
    .trimEnd();
  return on ? `${without}${without ? "\n\n" : ""}${STE_LINE}` : without;
}
