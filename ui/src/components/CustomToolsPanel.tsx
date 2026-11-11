"use client";

/** Tools Zeus (or you) created without code. Grant them to agents on the Team tab. */

import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import type { CustomTool } from "@/lib/types";
import { Badge, Button, Spinner } from "./ui";

const KIND_KEY = { action: "settings.customTools.kind.action", http: "settings.customTools.kind.http", prompt: "settings.customTools.kind.prompt" } as const;

export function CustomToolsPanel() {
  const t = useT();
  const [tools, setTools] = useState<CustomTool[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const load = () => api.customTools().then(setTools).catch(() => setTools([]));
  useEffect(() => {
    void load();
  }, []);
  if (!tools) return <Spinner />;
  if (!tools.length)
    return (
      <div className="p-4 text-sm text-ink-3">
        {t("settings.customTools.empty")}
      </div>
    );
  return (
    <div className="divide-y divide-line">
      {tools.map((t2) => (
        <div key={t2.name} className="p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-medium">{t2.name}</span>
            <Badge tone="accent">{t(KIND_KEY[t2.kind])}</Badge>
            <Badge tone={t2.approval === "auto" ? "ok" : "warn"}>{t("settings.customTools.approval", { approval: t2.approval })}</Badge>
            <span className="ml-auto">
              {confirm === t2.name ? (
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                    {t("settings.customTools.keep")}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => api.deleteCustomTool(t2.name).then(() => (setConfirm(null), void load()))}>
                    {t("settings.customTools.delete")}
                  </Button>
                </span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirm(t2.name)}>
                  ✕
                </Button>
              )}
            </span>
          </div>
          <div className="mt-1 text-ink-2">{t2.description}</div>
          <pre className="mt-2 overflow-x-auto rounded bg-bg p-2 text-[11px] text-ink-3">{JSON.stringify(t2.config, null, 1)}</pre>
          <div className="mt-1 text-[11px] text-ink-3">{t("settings.customTools.by", { author: t2.createdBy })}</div>
        </div>
      ))}
    </div>
  );
}
