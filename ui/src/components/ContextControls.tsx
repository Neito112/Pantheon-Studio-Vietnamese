"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { tokens } from "@/lib/format";
import { useT } from "@/i18n";
import { useOrg } from "@/store/org";
import { Button, cx } from "./ui";

type Usage = { tokens: number; window?: number; compactAt?: number };

/**
 * An agent's working context: how full it is, and the two ways to shrink it.
 * Auto-compaction summarizes older messages once the context passes the
 * threshold; "Compact" does that now, "Clear" starts the agent fresh.
 */
export function ContextControls({ agentId, name, className }: { agentId: string; name: string; className?: string }) {
  const t = useT();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [summary, setSummary] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"compact" | "clear" | "chat" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Refresh after each turn ends or the context changes.
  const status = useOrg((s) => s.live[agentId]?.status);

  const load = useCallback(() => {
    api
      .agentThread(agentId)
      .then((th) => {
        setUsage(th.context);
        setSummary(th.summary);
      })
      .catch(() => {});
  }, [agentId]);
  useEffect(load, [load, status]);

  const run = async (kind: "compact" | "clear" | "chat") => {
    setBusy(kind);
    setNote(null);
    try {
      if (kind === "chat") {
        await api.clearAgentChat(agentId);
        setNote(t("agents.context.chatCleared", { name }));
      } else if (kind === "clear") {
        await api.resetAgentMemory(agentId);
        setNote(t("agents.context.startsFresh", { name }));
      } else {
        const r = await api.compactAgent(agentId);
        setNote(r.removed ? t("agents.context.summarized", { count: r.removed }) : t("agents.context.nothingToCompact"));
      }
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(null);
      setConfirm(false);
      load();
    }
  };

  const pct = usage?.window ? Math.min(100, (usage.tokens / usage.window) * 100) : 0;
  const autoPct = usage?.window && usage.compactAt ? (usage.compactAt / usage.window) * 100 : 60;
  return (
    <div className={cx("text-xs", className)}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-ink-3">{t("agents.context.label")}</span>
        <div className="relative h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-panel-2" title={t("agents.context.autoCompactTitle", { pct: Math.round(autoPct) })}>
          <div className={cx("h-full rounded-full", pct >= autoPct ? "bg-warn" : "bg-accent")} style={{ width: `${pct}%` }} />
          <div className="absolute inset-y-0 w-px bg-ink-3" style={{ left: `${autoPct}%` }} />
        </div>
        <span className="shrink-0 tabular-nums text-ink-3">
          {usage ? `${tokens(usage.tokens)}${usage.window ? ` / ${tokens(usage.window)}` : ""}` : "…"}
        </span>
        {!confirm && (
          <>
            <Button size="sm" variant="ghost" loading={busy === "compact"} title={t("agents.context.compactHint")} onClick={() => run("compact")}>
              {t("agents.context.compact")}
            </Button>
            <Button size="sm" variant="ghost" title={t("agents.context.clearHint")} onClick={() => setConfirm(true)}>
              {t("common.clear")}
            </Button>
          </>
        )}
      </div>
      {confirm && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-bad/30 bg-bad/10 px-2.5 py-2">
          <span className="text-ink-2">{t("agents.context.confirm", { name })}</span>
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" variant="danger" loading={busy === "clear"} onClick={() => run("clear")}>
              {t("agents.context.clearContext")}
            </Button>
            <Button size="sm" variant="danger" loading={busy === "chat"} onClick={() => run("chat")}>
              {t("agents.context.clearChat")}
            </Button>
          </div>
        </div>
      )}
      {summary && !confirm && (
        <details className="mt-1.5 text-ink-3">
          <summary className="cursor-pointer select-none">{t("agents.context.workingMemory")}</summary>
          <div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-bg p-2 text-ink-2">{summary}</div>
        </details>
      )}
      {note && <div className="mt-1 text-ink-3">{note}</div>}
    </div>
  );
}
