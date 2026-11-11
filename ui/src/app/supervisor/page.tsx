"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Logo } from "@/components/AppShell";
import { AssetsPanel } from "@/components/AssetsPanel";
import { CustomToolsPanel } from "@/components/CustomToolsPanel";
import { MetaChat, MetaLayout, SYSTEM_ORG } from "@/components/MetaChat";
import { Badge, Button, cx, Select, Spinner, Tabs, Textarea } from "@/components/ui";
import { useLocale, useT, formatRelative } from "@/i18n";
import { api } from "@/lib/api";
import type { FeatureRequest, Org } from "@/lib/types";
import { useOrg, useOrgConnection } from "@/store/org";

export default function SupervisorPage() {
  useOrgConnection(SYSTEM_ORG);
  const t = useT();
  const [supId, setSupId] = useState<string | null>(null);
  const [tab, setTab] = useState<"requests" | "tools" | "assets" | "activity">("requests");
  const [side, setSide] = useState(false);
  useEffect(() => {
    api.metaAgent("zeus").then((s) => setSupId(s.agent.id)).catch(() => {});
  }, []);
  const prompts = [t("meta.zeus.prompt1"), t("meta.zeus.prompt2"), t("meta.zeus.prompt3"), t("meta.zeus.prompt4"), t("meta.zeus.prompt5")];
  return (
    <MetaLayout
      sideOpen={side}
      onCloseSide={() => setSide(false)}
      chat={
        supId ? (
          <MetaChat
            agentId={supId}
            fallbackName="Zeus"
            icon={<Logo size={30} />}
            subtitle={t("meta.zeus.subtitle")}
            intro={t("meta.zeus.intro")}
            prompts={prompts}
            placeholder={t("meta.zeus.placeholder")}
            sideLabel={t("meta.zeus.sideLabel")}
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
                { value: "requests", label: t("meta.zeus.tabRequests") },
                { value: "tools", label: t("meta.zeus.tabTools") },
                { value: "assets", label: t("meta.zeus.tabAssets") },
                { value: "activity", label: t("meta.zeus.tabActivity") },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{tab === "requests" ? <FeatureRequests /> : tab === "tools" ? <CustomToolsPanel /> : tab === "assets" ? <AssetsPanel /> : <ActivityFeed />}</div>
        </>
      }
    />
  );
}

const FR_TONE = { open: "info", triaged: "neutral", accepted: "accent", in_progress: "accent", done: "ok", rejected: "bad" } as const;

/** The feature-request status, shown as a badge and in the status picker. */
function frStatus(t: (key: string) => string, status: string): string {
  const key = `meta.zeus.status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return t(key);
}

function FeatureRequests() {
  const t = useT();
  const locale = useLocale();
  const [items, setItems] = useState<FeatureRequest[] | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const feedLen = useOrg((s) => s.feed.length);
  useEffect(() => {
    api.featureRequests().then(setItems).catch(() => setItems([]));
    api.orgs().then(setOrgs).catch(() => {});
  }, [feedLen]);
  if (!items) return <Spinner />;
  if (!items.length)
    return <div className="p-6 text-center text-sm text-ink-3">{t("meta.zeus.requestsEmpty")}</div>;
  const orgName = (id: string | null) => orgs.find((o) => o.id === id)?.name ?? "—";
  return (
    <div className="divide-y divide-line">
      {items.map((fr) => (
        <div key={fr.id} className="p-4">
          <button className="w-full text-left cursor-pointer" onClick={() => setOpen(open === fr.id ? null : fr.id)}>
            <div className="flex items-center gap-2">
              <Badge tone={FR_TONE[fr.status]}>{frStatus(t, fr.status)}</Badge>
              <span className="text-[11px] text-ink-3">
                {orgName(fr.orgId)} · {formatRelative(locale, fr.createdAt)}
              </span>
            </div>
            <div className="mt-1.5 text-sm font-medium">{fr.title}</div>
          </button>
          {open === fr.id && <FrDetail fr={fr} onChange={(n) => setItems((all) => all!.map((x) => (x.id === n.id ? n : x)))} />}
        </div>
      ))}
    </div>
  );
}

function FrDetail({ fr, onChange }: { fr: FeatureRequest; onChange: (fr: FeatureRequest) => void }) {
  const t = useT();
  const [resolution, setResolution] = useState(fr.resolution);
  const [status, setStatus] = useState(fr.status);
  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="whitespace-pre-wrap text-ink-2">{fr.description}</div>
      {fr.rationale && <div className="text-ink-3">{t("meta.zeus.requestWhy", { reason: fr.rationale })}</div>}
      <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
        <Select value={status} onChange={(e) => setStatus(e.target.value as FeatureRequest["status"])}>
          {Object.keys(FR_TONE).map((s) => (
            <option key={s} value={s}>
              {frStatus(t, s)}
            </option>
          ))}
        </Select>
        <Textarea rows={2} placeholder={t("meta.zeus.resolutionPlaceholder")} value={resolution} onChange={(e) => setResolution(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => api.updateFeatureRequest(fr.id, { status, resolution }).then(onChange)}>
          {t("meta.zeus.update")}
        </Button>
        {fr.orgId && (
          <Link href={`/org/${fr.orgId}/sessions?agent=${fr.requesterId}`} className={cx("text-xs text-info hover:underline self-center")}>
            {t("meta.zeus.seeRequesterSessions")}
          </Link>
        )}
      </div>
    </div>
  );
}
