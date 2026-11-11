"use client";

/**
 * Accounts for command-line agents (engine services/accounts.py): a Claude Code or Codex
 * agent can work with its own sign-in or API key instead of the computer's. Signing in
 * runs the tool's own login; its link and anything it asks to paste back show here.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, ErrorNote, Field, Input, Modal, Select } from "@/components/ui";
import { formatCurrency, formatNumber, formatTime, useLocale, useT } from "@/i18n";
import { api } from "@/lib/api";
import type { Account, AccountSignIn, AccountTool } from "@/lib/types";

export function AccountsPanel() {
  const t = useT();
  const locale = useLocale();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [tools, setTools] = useState<AccountTool[]>([]);
  const [adding, setAdding] = useState(false);
  const [signing, setSigning] = useState<AccountSignIn | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      api
        .accounts()
        .then((r) => {
          setAccounts(r.accounts);
          setTools(r.tools);
        })
        .catch((e) => setError((e as Error).message)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-5 text-sm text-ink-2">
        {t("settings.account.intro")}
        <div className="mt-2 text-xs text-ink-3">{t("settings.account.introNote")}</div>
      </Card>
      {accounts?.map((a) => {
        const cooling = a.coolingUntil ? new Date(a.coolingUntil) : null;
        const method = tools.find((t) => t.id === a.tool)?.methods.find((m) => m.id === a.method);
        return (
          <Card key={a.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{a.name}</span>
              <Badge>{a.toolLabel}</Badge>
              <Badge>{a.methodLabel}</Badge>
              {a.status.signedIn === true && <Badge tone="ok">{t("settings.account.signedIn")}</Badge>}
              {a.status.signedIn === false && <Badge tone="bad">{t("settings.account.notSignedIn")}</Badge>}
              {cooling && <Badge tone="warn">{t("settings.account.atLimit", { time: formatTime(locale, cooling) })}</Badge>}
              <div className="ml-auto flex flex-wrap gap-1.5">
                {method?.signIn && (
                  <Button size="sm" variant="primary" onClick={() => act(a.id, async () => setSigning(await api.signIn(a.id)))} loading={busy === a.id}>
                    {t("settings.account.signIn")}
                  </Button>
                )}
                <Button size="sm" onClick={() => act(a.id, () => api.checkAccount(a.id))} loading={busy === a.id}>
                  {t("settings.account.check")}
                </Button>
                {cooling && (
                  <Button size="sm" variant="ghost" title={t("settings.account.limitOverTitle")} onClick={() => act(a.id, () => api.updateAccount(a.id, { cooling: false }))}>
                    {t("settings.account.limitOver")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(t("settings.account.removeConfirm", { name: a.name }))) void act(a.id, () => api.deleteAccount(a.id));
                  }}
                >
                  {t("common.remove")}
                </Button>
              </div>
            </div>
            <div className="mt-1.5 text-xs text-ink-3">
              {a.status.detail || (a.status.checkedAt ? "" : t("settings.account.notChecked"))}
              {a.agents && a.agents.length > 0 ? ` · ${t("settings.account.usedBy", { agents: a.agents.join(", ") })}` : ` · ${t("settings.account.noAgents")}`}
              {(a.inputTokens > 0 || a.costUsd > 0) &&
                ` · ${t("settings.account.tokensSoFar", {
                  tokens: formatNumber(locale, a.inputTokens + a.outputTokens),
                  cost: a.costUsd > 0 ? t("settings.account.tokensSoFarCost", { cost: formatCurrency(locale, a.costUsd) }) : "",
                })}`}
            </div>
            {cooling && a.coolingReason && <div className="mt-1 text-xs text-warn">{a.coolingReason}</div>}
          </Card>
        );
      })}
      {accounts && accounts.length === 0 && <div className="text-sm text-ink-3">{t("settings.account.empty")}</div>}
      <Button variant="primary" onClick={() => setAdding(true)}>
        {t("settings.account.add")}
      </Button>
      <ErrorNote error={error} />
      {adding && (
        <AddAccount
          tools={tools}
          onClose={async (created) => {
            setAdding(false);
            await load();
            if (created && tools.find((t) => t.id === created.tool)?.methods.find((m) => m.id === created.method)?.signIn) {
              setSigning(await api.signIn(created.id).catch(() => null));
            }
          }}
        />
      )}
      {signing && (
        <SignIn
          start={signing}
          name={accounts?.find((a) => a.id === signing.accountId)?.name ?? "account"}
          onClose={() => {
            setSigning(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function AddAccount({ tools, onClose }: { tools: AccountTool[]; onClose: (created: Account | null) => void }) {
  const t = useT();
  const [tool, setTool] = useState(tools[0]?.id ?? "claude-code");
  const methods = tools.find((t) => t.id === tool)?.methods ?? [];
  const [method, setMethod] = useState(methods[0]?.id ?? "");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = methods.find((m) => m.id === method) ?? methods[0];
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      onClose(await api.createAccount({ tool, method: chosen?.id ?? method, name, key: chosen?.signIn ? undefined : key }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={() => onClose(null)}
      title={t("settings.account.addTitle")}
      footer={
        <Button variant="primary" onClick={() => void save()} loading={busy}>
          {chosen?.signIn ? t("settings.account.addAndSignIn") : t("common.add")}
        </Button>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("settings.account.for")}>
            <Select
              value={tool}
              onChange={(e) => {
                setTool(e.target.value);
                setMethod(tools.find((t) => t.id === e.target.value)?.methods[0]?.id ?? "");
              }}
            >
              {tools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("settings.account.signsInWith")}>
            <Select value={chosen?.id ?? ""} onChange={(e) => setMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("settings.account.name")} hint={t("settings.account.nameHint")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {chosen && !chosen.signIn && (
          <Field label={t("settings.account.apiKey")} hint={t("settings.account.apiKeyHint")}>
            <Input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} />
          </Field>
        )}
        {chosen?.signIn && (
          <div className="text-xs text-ink-3">{t("settings.account.signInNext")}</div>
        )}
        <ErrorNote error={error} />
      </div>
    </Modal>
  );
}

function SignIn({ start, name, onClose }: { start: AccountSignIn; name: string; onClose: () => void }) {
  const t = useT();
  const [s, setS] = useState(start);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const out = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (s.done) return;
    const t = setInterval(() => {
      api
        .signInView(s.id)
        .then(setS)
        .catch((e) => setError((e as Error).message));
    }, 1000);
    return () => clearInterval(t);
  }, [s.id, s.done]);
  useEffect(() => {
    out.current?.scrollTo({ top: out.current.scrollHeight });
  }, [s.output]);
  const send = async () => {
    setError(null);
    try {
      setS(await api.signInInput(s.id, code));
      setCode("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const close = () => {
    if (!s.done) void api.signInCancel(s.id).catch(() => {});
    onClose();
  };
  return (
    <Modal
      open
      wide
      onClose={close}
      title={t("settings.account.signInTitle", { name })}
      footer={
        <Button variant={s.done ? "primary" : "ghost"} onClick={close}>
          {s.done ? t("settings.account.done") : t("settings.account.cancel")}
        </Button>
      }
    >
      <div className="grid gap-3 text-sm">
        {s.urls.length > 0 && (
          <div className="grid gap-1.5">
            <div className="text-ink-2">{t("settings.account.signInHere")}</div>
            {s.urls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">
                {u}
              </a>
            ))}
          </div>
        )}
        <pre ref={out} className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-bg p-3 font-mono text-xs text-ink-2">
          {s.output || t("settings.account.starting")}
        </pre>
        {!s.done ? (
          <div className="flex gap-2">
            <Input value={code} placeholder={t("settings.account.codePlaceholder")} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && code && void send()} />
            <Button onClick={() => void send()} disabled={!code}>
              {t("settings.account.send")}
            </Button>
          </div>
        ) : (
          <div className={s.ok ? "text-ok" : "text-bad"}>{s.ok ? t("settings.account.signedInDone") : t("settings.account.signInFailed")}</div>
        )}
        <ErrorNote error={error} />
      </div>
    </Modal>
  );
}
