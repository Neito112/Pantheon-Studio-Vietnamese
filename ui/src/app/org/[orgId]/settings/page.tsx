"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { notifyOrgsChanged } from "@/components/AppShell";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { AgentFiles } from "@/components/Files";
import { DeleteOrgDialog } from "@/components/DeleteOrgDialog";
import { LibraryPicker } from "@/components/LibraryPicker";
import { McpServersPanel } from "@/components/settings/McpServersPanel";
import { SecretsPanel } from "@/components/settings/SecretsPanel";
import { Button, Card, ErrorNote, Field, Input, Select, Textarea } from "@/components/ui";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import { inDesktopApp } from "@/lib/engine";
import { pickFolder } from "@/lib/folders";
import type { Org, Provider } from "@/lib/types";
import { useOrg } from "@/store/org";

export default function OrgSettingsPage() {
  const t = useT();
  const org = useOrg((s) => s.org);
  const router = useRouter();
  const [draft, setDraft] = useState<Org | null>(org);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setDraft(org), [org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.providers().then(setProviders).catch(() => {});
  }, []);
  if (!org || !draft) return null;

  const save = async () => {
    setError(null);
    try {
      const o = await api.updateOrg(org.id, {
        name: draft.name,
        description: draft.description,
        workspace: draft.workspace ?? "",
        settings: draft.settings,
      });
      useOrg.getState().setOrg(o);
      notifyOrgsChanged();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const s = draft.settings;
  const setS = (patch: Partial<Org["settings"]>) => setDraft({ ...draft, settings: { ...s, ...patch } });
  const dm = s.default_model ?? {};
  const provider = providers.find((p) => p.id === dm.provider_id);
  const cm = s.checker_model ?? {};
  const checkerProvider = providers.find((p) => p.id === cm.provider_id);
  // An empty binding clears the setting: the check runs on the agent's own model.
  const setCm = (b: typeof cm) => setS({ checker_model: b.provider_id || b.model ? b : {} });

  const exportJson = async () => {
    const def = await api.exportOrg(org.id);
    const blob = new Blob([JSON.stringify(def, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${org.name.replace(/\W+/g, "-").toLowerCase()}.pantheon.json`;
    a.click();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold">{t("settings.org.title")}</div>
          <div className="grid gap-4">
            <Field label={t("settings.org.name")}>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label={t("settings.org.description")} hint={t("settings.org.descriptionHint")}>
              <Textarea rows={4} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <Field label={t("settings.org.workspaceFolder")} hint={t("settings.org.workspaceHint")}>
              <div className="flex gap-2">
                <Input value={draft.workspace ?? ""} onChange={(e) => setDraft({ ...draft, workspace: e.target.value || null })} placeholder={t("settings.org.workspacePlaceholder")} />
                {inDesktopApp() && (
                  <Button onClick={() => void pickFolder(t("settings.org.chooseFolderTitle")).then((p) => p && setDraft({ ...draft, workspace: p }))}>
                    {t("settings.org.chooseFolder")}
                  </Button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold">{t("settings.org.howTogether")}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.org.howItWorks")} hint={t("settings.org.howItWorksHint")}>
              <Select value={s.mode ?? "team"} onChange={(e) => setS({ mode: e.target.value as "team" | "flow" })}>
                <option value="team">{t("settings.org.modeTeam")}</option>
                <option value="flow">{t("settings.org.modeFlow")}</option>
              </Select>
            </Field>
            <Field label={t("settings.org.communication")}>
              <Select value={s.comm_policy} onChange={(e) => setS({ comm_policy: e.target.value as Org["settings"]["comm_policy"] })}>
                <option value="open">{t("settings.org.commOpen")}</option>
                <option value="structured">{t("settings.org.commStructured")}</option>
              </Select>
            </Field>
            <Field label={t("settings.org.maxChainDepth")} hint={t("settings.org.maxChainDepthHint")}>
              <Input type="number" value={s.max_chain_depth} onChange={(e) => setS({ max_chain_depth: Number(e.target.value) })} />
            </Field>
            <Field label={t("settings.org.dailyTokenBudget")} hint={t("settings.org.dailyTokenBudgetHint")}>
              <Input type="number" value={s.daily_token_budget} onChange={(e) => setS({ daily_token_budget: Number(e.target.value) })} />
            </Field>
            <Field label={t("settings.org.maxConcurrent")} hint={t("settings.org.maxConcurrentHint")}>
              <Input type="number" min={0} max={64} value={s.max_concurrent ?? 0} onChange={(e) => setS({ max_concurrent: Math.max(0, Math.min(64, Math.round(Number(e.target.value) || 0))) })} />
            </Field>
            <Field label={t("settings.org.writingStyle")} hint={t("settings.org.writingStyleHint")}>
              <Select value={s.writing ?? "plain"} onChange={(e) => setS({ writing: e.target.value as "plain" | "ste" })}>
                <option value="plain">{t("settings.org.writingPlain")}</option>
                <option value="ste">{t("settings.org.writingSte")}</option>
              </Select>
            </Field>
            <Field label={t("settings.org.shellCommands")} hint={t("settings.org.shellCommandsHint")}>
              <Select value={s.shell_approval ?? "ask"} onChange={(e) => setS({ shell_approval: e.target.value as "ask" | "auto" })}>
                <option value="ask">{t("settings.org.shellAsk")}</option>
                <option value="auto">{t("settings.org.shellAuto")}</option>
              </Select>
            </Field>
          </div>
          {s.shell_approval === "auto" && (
            <div className="mt-3 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
              {t("settings.org.shellAutoWarning")}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.taskPermissions")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.taskPermissionsNote")}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.org.createTasks")}>
              <Select value={String(s.task_policy?.create ?? true)} onChange={(e) => setS({ task_policy: { ...s.task_policy, create: e.target.value === "true" } })}>
                <option value="true">{t("settings.org.createTasksEveryone")}</option>
                <option value="false">{t("settings.org.createTasksGranted")}</option>
              </Select>
            </Field>
            <Field label={t("settings.org.assignWorkTo")}>
              <Select value={s.task_policy?.assign ?? "anyone"} onChange={(e) => setS({ task_policy: { ...s.task_policy, assign: e.target.value as "anyone" } })}>
                <option value="anyone">{t("settings.org.assignAnyone")}</option>
                <option value="reports">{t("settings.org.assignReports")}</option>
                <option value="self">{t("settings.org.assignSelf")}</option>
              </Select>
            </Field>
            <Field label={t("settings.org.changeTasks")}>
              <Select value={s.task_policy?.edit ?? "any"} onChange={(e) => setS({ task_policy: { ...s.task_policy, edit: e.target.value as "any" } })}>
                <option value="any">{t("settings.org.changeAny")}</option>
                <option value="involved">{t("settings.org.changeInvolved")}</option>
                <option value="assigned">{t("settings.org.changeAssigned")}</option>
              </Select>
            </Field>
            <Field label={t("settings.org.reviewBeforeDone")}>
              <Select value={String(s.task_policy?.require_review ?? true)} onChange={(e) => setS({ task_policy: { ...s.task_policy, require_review: e.target.value === "true" } })}>
                <option value="true">{t("settings.org.reviewRequired")}</option>
                <option value="false">{t("settings.org.reviewOptional")}</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold">{t("settings.org.meetings")}</div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("settings.org.maxParticipants")}>
              <Input type="number" min={2} max={20} value={s.meetings?.max_participants ?? 8} onChange={(e) => setS({ meetings: { ...s.meetings, max_participants: Number(e.target.value) } })} />
            </Field>
            <Field label={t("settings.org.maxRounds")}>
              <Input type="number" min={1} max={6} value={s.meetings?.max_rounds ?? 3} onChange={(e) => setS({ meetings: { ...s.meetings, max_rounds: Number(e.target.value) } })} />
            </Field>
            <Field label={t("settings.org.defaultRounds")}>
              <Input type="number" min={1} max={6} value={s.meetings?.default_rounds ?? 2} onChange={(e) => setS({ meetings: { ...s.meetings, default_rounds: Number(e.target.value) } })} />
            </Field>
            <Field label={t("settings.org.defaultStyle")}>
              <Select value={s.meetings?.default_style ?? "discussion"} onChange={(e) => setS({ meetings: { ...s.meetings, default_style: e.target.value } })}>
                {["discussion", "decision", "brainstorm", "standup", "review"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("settings.org.actionItems")}>
              <Select value={String(s.meetings?.create_tasks ?? false)} onChange={(e) => setS({ meetings: { ...s.meetings, create_tasks: e.target.value === "true" } })}>
                <option value="false">{t("settings.org.actionItemsMinutes")}</option>
                <option value="true">{t("settings.org.actionItemsTasks")}</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.physicalSpace")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.physicalSpaceNote")}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.org.bodiesTools")}>
              <Select value={String(s.world?.enabled ?? true)} onChange={(e) => setS({ world: { ...s.world, enabled: e.target.value === "true" } })}>
                <option value="true">{t("settings.org.bodiesOn")}</option>
                <option value="false">{t("settings.org.bodiesOff")}</option>
              </Select>
            </Field>
            <Field label={t("settings.org.witnessing")} hint={t("settings.org.witnessingHint")}>
              <Select value={String(s.world?.witness ?? false)} onChange={(e) => setS({ world: { ...s.world, witness: e.target.value === "true" } })}>
                <option value="false">{t("settings.org.witnessOff")}</option>
                <option value="true">{t("settings.org.witnessOn")}</option>
              </Select>
            </Field>
          </div>
          <Field label={t("settings.org.worldRules")} hint={t("settings.org.worldRulesHint")}>
            <Textarea
              rows={3}
              value={s.world?.rules ?? ""}
              onChange={(e) => setS({ world: { ...s.world, rules: e.target.value } })}
              placeholder={t("settings.org.worldRulesPlaceholder")}
            />
          </Field>
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.stageLibraries")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.stageLibrariesNote")}</div>
          <LibraryPicker value={s.libraries} onChange={(libraries) => setS({ libraries })} />
        </Card>

        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold">{t("settings.org.defaultModelTitle")}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.org.provider")}>
              <Select value={dm.provider_id ?? ""} onChange={(e) => setS({ default_model: { ...dm, provider_id: e.target.value || undefined, model: undefined } })}>
                <option value="">{t("settings.org.globalDefault")}</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("settings.org.model")}>
              <Input list="org-models" value={dm.model ?? ""} onChange={(e) => setS({ default_model: { ...dm, model: e.target.value || undefined } })} placeholder={provider?.defaultModel ?? t("settings.org.providerDefault")} />
              <datalist id="org-models">
                {(provider?.models ?? []).map((m) => (
                  <option key={m.id} value={m.id} />
                ))}
              </datalist>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.checkerModelTitle")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.checkerModelNote")}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("settings.org.provider")}>
              <Select value={cm.provider_id ?? ""} onChange={(e) => setCm({ ...cm, provider_id: e.target.value || undefined, model: undefined })}>
                <option value="">{t("settings.org.sameAsBuilder")}</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("settings.org.model")}>
              <Input list="checker-models" value={cm.model ?? ""} disabled={!cm.provider_id} onChange={(e) => setCm({ ...cm, model: e.target.value || undefined })} placeholder={checkerProvider?.defaultModel ?? t("settings.org.providerDefault")} />
              <datalist id="checker-models">
                {(checkerProvider?.models ?? []).map((m) => (
                  <option key={m.id} value={m.id} />
                ))}
              </datalist>
            </Field>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={save}>
            {t("settings.org.saveSettings")}
          </Button>
          {saved && <span className="text-sm text-ok">{t("settings.org.saved")}</span>}
          <ErrorNote error={error} />
        </div>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.sharedFiles")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.sharedFilesNote")}</div>
          <AgentFiles orgId={org.id} agentId={null} />
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.activities")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.activitiesNote")}</div>
          <ActivitiesPanel orgId={org.id} />
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.secrets")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.secretsNote")}</div>
          <SecretsPanel orgId={org.id} />
        </Card>

        <Card className="p-5">
          <div className="mb-1 text-sm font-semibold">{t("settings.org.mcpServers")}</div>
          <div className="mb-4 text-xs text-ink-3">{t("settings.org.mcpServersNote")}</div>
          <McpServersPanel orgId={org.id} />
        </Card>

        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold">{t("settings.org.templateTitle")}</div>
          <p className="mb-3 text-sm text-ink-2">{t("settings.org.templateNote")}</p>
          <SaveTemplate orgId={org.id} defaultName={org.name} />
          <div className="mt-3">
            <Button variant="ghost" onClick={exportJson}>
              {t("settings.org.templateDownload")}
            </Button>
          </div>
        </Card>

        <Card className="border-bad/30 p-5">
          <div className="mb-3 text-sm font-semibold text-bad">{t("settings.org.deleteTitle")}</div>
          <p className="mb-3 text-sm text-ink-2">{t("settings.org.deleteNote")}</p>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            {t("settings.org.deleteButton", { name: org.name })}
          </Button>
        </Card>
        <DeleteOrgDialog org={org} open={deleting} onClose={() => setDeleting(false)} onDeleted={() => router.push("/")} />
      </div>
    </div>
  );
}

function SaveTemplate({ orgId, defaultName }: { orgId: string; defaultName: string }) {
  const t = useT();
  const [name, setName] = useState(defaultName);
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const save = () =>
    api.saveAsTemplate(orgId, name.trim()).then(
      (tpl) => setState({ ok: true, text: t("settings.org.templateSaved", { name: tpl.name }) }),
      (e: Error) => setState({ ok: false, text: e.message }),
    );
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.org.templateName")} className="flex-1" />
        <Button variant="primary" onClick={save} disabled={!name.trim()}>
          {t("settings.org.templateSave")}
        </Button>
      </div>
      {state && <div className={state.ok ? "text-sm text-ok" : "text-sm text-bad"}>{state.text}</div>}
    </div>
  );
}
