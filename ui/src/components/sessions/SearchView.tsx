"use client";

import { useState } from "react";
import { AgentAvatar } from "@/components/agent";
import { Badge, Button, Empty, Input } from "@/components/ui";
import { formatDateTime, useLocale, useT } from "@/i18n";
import { api } from "@/lib/api";
import { truncate } from "@/lib/format";
import { useOrg } from "@/store/org";

type Results = Awaited<ReturnType<typeof api.search>>;

export function SearchView({ orgId, onOpenTurn }: { orgId: string; onOpenTurn: (turnId: string) => void }) {
  const t = useT();
  const locale = useLocale();
  const agents = useOrg((s) => s.agents);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      setRes(await api.search(orgId, q.trim()));
    } finally {
      setBusy(false);
    }
  };

  const hl = (text: string) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return truncate(text, 240);
    const start = Math.max(0, i - 80);
    const snippet = text.slice(start, i + q.length + 160);
    const j = i - start;
    return (
      <>
        {start > 0 && "…"}
        {snippet.slice(0, j)}
        <mark className="rounded bg-warn/30 px-0.5 text-ink">{snippet.slice(j, j + q.length)}</mark>
        {snippet.slice(j + q.length)}…
      </>
    );
  };

  const section = (title: string, count: number, children: React.ReactNode) =>
    count > 0 && (
      <section>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">
          {t("sessions.search.sectionTitle", { title, count })}
        </div>
        <div className="divide-y divide-line rounded-lg border border-line bg-panel">{children}</div>
      </section>
    );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="flex gap-2">
          <Input autoFocus placeholder={t("sessions.search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} />
          <Button variant="primary" onClick={run} loading={busy}>
            {t("common.search")}
          </Button>
        </div>
        {res && (
          <div className="mt-6 space-y-6">
            {!res.messages.length && !res.turns.length && !res.toolCalls.length && !res.llmCalls.length && <Empty title={t("sessions.search.empty")} />}
            {section(
              t("sessions.search.section.messages"),
              res.messages.length,
              res.messages.map((m) => (
                <div key={m.id} className="flex gap-2.5 px-3 py-2.5">
                  <AgentAvatar agent={agents[m.senderId]} size={22} />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="text-xs text-ink-3">
                      {agents[m.senderId]?.name ?? (m.senderType === "user" ? t("sessions.turn.senderYou") : m.senderId)} · {formatDateTime(locale, m.createdAt)}
                    </div>
                    <div className="mt-0.5 text-ink-2">{hl(m.content)}</div>
                  </div>
                  {m.turnId && (
                    <Button size="sm" variant="ghost" onClick={() => onOpenTurn(m.turnId!)}>
                      {t("sessions.search.openSession")}
                    </Button>
                  )}
                </div>
              )),
            )}
            {section(
              t("sessions.search.section.toolCalls"),
              res.toolCalls.length,
              res.toolCalls.map((tc) => (
                <div key={tc.id} className="flex gap-2.5 px-3 py-2.5">
                  <AgentAvatar agent={agents[tc.agentId]} size={22} />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                      <code className="text-info">{tc.name}</code>
                      <Badge tone={tc.status === "ok" ? "ok" : "bad"}>{tc.status}</Badge>
                      {formatDateTime(locale, tc.createdAt)}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-ink-2">{hl(`${JSON.stringify(tc.args)} → ${tc.result}`)}</div>
                  </div>
                  {tc.turnId && (
                    <Button size="sm" variant="ghost" onClick={() => onOpenTurn(tc.turnId!)}>
                      {t("sessions.search.openSession")}
                    </Button>
                  )}
                </div>
              )),
            )}
            {section(
              t("sessions.search.section.modelOutput"),
              res.llmCalls.length,
              res.llmCalls.map((c) => (
                <div key={c.id} className="flex gap-2.5 px-3 py-2.5">
                  <AgentAvatar agent={agents[c.agentId]} size={22} />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="text-xs text-ink-3">
                      {agents[c.agentId]?.name} · {c.model} · {formatDateTime(locale, c.createdAt)}
                    </div>
                    <div className="mt-0.5 text-ink-2">{hl(`${c.response.content ?? ""} ${c.response.reasoning ?? ""}`)}</div>
                  </div>
                  {c.turnId && (
                    <Button size="sm" variant="ghost" onClick={() => onOpenTurn(c.turnId!)}>
                      {t("sessions.search.openSession")}
                    </Button>
                  )}
                </div>
              )),
            )}
            {section(
              t("sessions.search.section.sessions"),
              res.turns.length,
              res.turns.map((tn) => (
                <button key={tn.id} onClick={() => onOpenTurn(tn.id)} className="flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-panel-2 cursor-pointer">
                  <AgentAvatar agent={agents[tn.agentId]} size={22} />
                  <div className="text-sm text-ink-2">{hl(tn.error ?? tn.summary)}</div>
                </button>
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
