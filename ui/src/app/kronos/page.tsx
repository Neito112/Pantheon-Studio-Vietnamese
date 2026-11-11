"use client";

import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { MetaChat, MetaLayout, SYSTEM_ORG } from "@/components/MetaChat";
import { HostFolders, useHostStatus } from "@/components/HostStatus";
import { Badge, Spinner, Tabs } from "@/components/ui";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import { useOrgConnection } from "@/store/org";

function KronosIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#kr)" />
      <circle cx="16" cy="16" r="8.5" stroke="white" strokeWidth="2" />
      <path d="M16 11v5.2l3.4 2.2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="kr" x1="2" y1="2" x2="30" y2="30">
          <stop stopColor="#d9a35b" />
          <stop offset="1" stopColor="#6b4a2f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function KronosPage() {
  useOrgConnection(SYSTEM_ORG);
  const t = useT();
  const [kronosId, setKronosId] = useState<string | null>(null);
  const [tab, setTab] = useState<"computer" | "activity">("computer");
  const [side, setSide] = useState(false);
  useEffect(() => {
    api.metaAgent("kronos").then((s) => setKronosId(s.agent.id)).catch(() => {});
  }, []);
  const prompts = [t("meta.kronos.prompt1"), t("meta.kronos.prompt2"), t("meta.kronos.prompt3"), t("meta.kronos.prompt4")];
  return (
    <MetaLayout
      sideOpen={side}
      onCloseSide={() => setSide(false)}
      chat={
        kronosId ? (
          <MetaChat
            agentId={kronosId}
            fallbackName="Kronos"
            icon={<KronosIcon />}
            subtitle={t("meta.kronos.subtitle")}
            intro={t("meta.kronos.intro")}
            prompts={prompts}
            placeholder={t("meta.kronos.placeholder")}
            sideLabel={t("meta.kronos.sideLabel")}
            onShowSide={() => setSide(true)}
          />
        ) : (
          <Spinner />
        )
      }
      side={
        <>
          <div className="border-b border-line p-3">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: "computer", label: t("meta.kronos.tabComputer") },
                { value: "activity", label: t("meta.kronos.tabActivity") },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{tab === "computer" ? <Computer /> : <ActivityFeed />}</div>
        </>
      }
    />
  );
}

function Computer() {
  const t = useT();
  const status = useHostStatus();
  if (!status) return <Spinner />;
  const info = status.info;
  return (
    <div className="space-y-5 p-4 text-sm">
      {info?.host && (
        <div className="flex items-center gap-2">
          <Badge tone="ok">{t("meta.kronos.thisComputer")}</Badge>
          <span className="text-xs text-ink-3">{info.host}</span>
        </div>
      )}

      {info && (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">{t("meta.kronos.pantheonCode")}</div>
            <div className="break-all text-xs text-ink-2">{info.repo ?? t("meta.kronos.notFromSource")}</div>
            {info.branch && <div className="mt-0.5 text-xs text-ink-3">{t("meta.kronos.changesMergeIntoBranch", { branch: info.branch })}</div>}
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">{t("meta.kronos.allowedFolders")}</div>
            <HostFolders allowed={info.allowed ?? []} compact />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">{t("meta.kronos.changesInProgress")}</div>
            {info.openChanges?.length ? (
              <ul className="space-y-1.5">
                {info.openChanges.map((c) => (
                  <li key={c.id} className="rounded-md border border-line px-2.5 py-1.5">
                    <div className="text-xs font-medium">{c.title}</div>
                    <div className="font-mono text-[11px] text-ink-3">kronos/{c.id}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-ink-3">{t("meta.kronos.noChanges")}</div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-line p-3 text-xs leading-relaxed text-ink-2">
        <div className="mb-1 font-medium text-ink">{t("meta.kronos.howTitle")}</div>
        {t("meta.kronos.howBody")}
      </div>
    </div>
  );
}
