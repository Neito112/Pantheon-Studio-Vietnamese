"use client";

/** An organization's secrets: credentials agents use by name, never seeing the value. */

import { useShallow } from "zustand/react/shallow";
import { useCallback, useEffect, useState } from "react";
import { AgentAvatar } from "@/components/agent";
import { Badge, Button, cx, ErrorNote, Field, Input, Modal, Toggle } from "@/components/ui";
import { formatRelative, useLocale, useT } from "@/i18n";
import { api, type SecretInfo, type SecretUse } from "@/lib/api";
import { useOrg } from "@/store/org";

export function SecretsPanel({ orgId }: { orgId: string }) {
  const t = useT();
  const locale = useLocale();
  const [rows, setRows] = useState<SecretInfo[] | null>(null);
  const [usage, setUsage] = useState<SecretUse[]>([]);
  const [editing, setEditing] = useState<SecretInfo | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const load = useCallback(() => {
    api.secrets(orgId).then(setRows).catch((e: Error) => setError(e.message));
    api.secretUsage(orgId).then(setUsage).catch(() => {});
  }, [orgId]);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid gap-3">
      {rows === null ? null : rows.length === 0 ? (
        <div className="text-sm text-ink-3">{t("settings.secret.empty")}</div>
      ) : (
        <div className="divide-y divide-line rounded-md border border-line">
          {rows.map((s) => (
            <div key={s.id} className={cx("flex flex-wrap items-start gap-3 p-3", !s.enabled && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-sm font-semibold">{s.name}</code>
                  {!s.enabled && <Badge>{t("settings.secret.disabled")}</Badge>}
                  {s.allowShell && <Badge tone="warn">shell: ${s.name}</Badge>}
                </div>
                {s.description && <div className="mt-0.5 text-xs text-ink-2">{s.description}</div>}
                <div className="mt-1 text-xs text-ink-3">
                  {t("settings.secret.agents", { agents: s.agents.join(", ") || t("settings.secret.noneYet") })} ·{" "}
                  {t("settings.secret.hosts", { hosts: s.domains.join(", ") || t("settings.secret.noneYet") })}
                  {s.lastUsedAt && ` · ${t("settings.secret.lastUsed", { when: formatRelative(locale, s.lastUsedAt) })}`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle checked={s.enabled} onChange={(v) => act(() => api.updateSecret(s.id, { enabled: v }))} />
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                  {t("common.edit")}
                </Button>
                {confirmDelete === s.id ? (
                  <>
                    <Button size="sm" variant="danger" onClick={() => act(() => api.deleteSecret(s.id)).then(() => setConfirmDelete(null))}>
                      {t("settings.secret.delete", { name: s.name })}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                      {t("common.cancel")}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(s.id)}>
                    {t("settings.secret.deleteEllipsis")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div>
        <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
          {t("settings.secret.add")}
        </Button>
      </div>
      <ErrorNote error={error} />
      {usage.length > 0 && (
        <details className="text-xs text-ink-3">
          <summary className="cursor-pointer select-none text-ink-2">{t("settings.secret.recentUse", { count: usage.length })}</summary>
          <div className="mt-2 grid gap-1">
            {usage.map((u, i) => (
              <div key={i}>
                {u.at ? formatRelative(locale, u.at) : ""} · <b className="text-ink-2">{u.agent}</b>{" "}
                {t("settings.secret.usedSecret", { secret: u.secret, tool: u.tool })}
                {u.target && ` → ${u.target}`}
              </div>
            ))}
          </div>
        </details>
      )}
      <SecretDialog orgId={orgId} secret={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
}

function SecretDialog({ orgId, secret, onClose, onSaved }: { orgId: string; secret: SecretInfo | "new" | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const agents = useOrg(useShallow((s) => Object.values(s.agents).filter((a) => !a.isSupervisor)));
  const isNew = secret === "new";
  const existing = secret && secret !== "new" ? secret : null;
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [hosts, setHosts] = useState("");
  const [shell, setShell] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<typeof secret>(null);
  if (secret !== shown) {
    setShown(secret);
    setName(existing?.name ?? "");
    setValue("");
    setDescription(existing?.description ?? "");
    setMembers(existing?.agentIds ?? []);
    setHosts(existing?.domains.join(", ") ?? "");
    setShell(existing?.allowShell ?? false);
    setError(null);
  }
  const domains = hosts
    .split(/[\s,]+/)
    .map((h) => h.trim())
    .filter(Boolean);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { description, agents: members, domains, allowShell: shell };
      if (isNew) await api.createSecret(orgId, { name, value, ...body });
      else if (existing) await api.updateSecret(existing.id, { ...body, ...(value ? { value } : {}) });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={secret !== null}
      onClose={onClose}
      title={isNew ? t("settings.secret.addTitle") : t("settings.secret.editTitle", { name: existing?.name ?? "" })}
      footer={
        <Button variant="primary" loading={busy} disabled={isNew && (!name.trim() || !value)} onClick={save}>
          {isNew ? t("settings.secret.add") : t("settings.secret.save")}
        </Button>
      }
    >
      <div className="grid gap-4">
        <Field label={t("settings.secret.name")} hint={t("settings.secret.nameHint")}>
          <Input value={name} disabled={!isNew} placeholder="GITHUB_TOKEN" onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))} />
        </Field>
        <Field
          label={isNew ? t("settings.secret.value") : t("settings.secret.replaceValue")}
          hint={isNew ? t("settings.secret.valueHintNew") : t("settings.secret.valueHintExisting")}
        >
          <Input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder={isNew ? "" : "••••••••"} />
        </Field>
        <Field label={t("settings.secret.description")} hint={t("settings.secret.descriptionHint")}>
          <Input value={description} placeholder={t("settings.secret.descriptionPlaceholder")} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div>
          <div className="mb-1.5 text-xs font-medium text-ink-2">{t("settings.secret.agentsMayUse")}</div>
          <div className="flex flex-wrap gap-2">
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => setMembers((m) => (m.includes(a.id) ? m.filter((x) => x !== a.id) : [...m, a.id]))}
                className={cx(
                  "flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs cursor-pointer",
                  members.includes(a.id) ? "border-accent bg-accent/15" : "border-line-2",
                )}
              >
                <AgentAvatar agent={a} size={18} /> {a.name}
              </button>
            ))}
          </div>
        </div>
        <Field label={t("settings.secret.hostsMayBeSent")} hint={t("settings.secret.hostsHint")}>
          <Input value={hosts} placeholder="api.github.com" onChange={(e) => setHosts(e.target.value)} />
        </Field>
        <div>
          <Toggle checked={shell} onChange={setShell} label={t("settings.secret.shellLabel", { name: name || "NAME" })} />
          <div className="mt-1 text-xs text-ink-3">{t("settings.secret.shellNote")}</div>
        </div>
        <ErrorNote error={error} />
      </div>
    </Modal>
  );
}
