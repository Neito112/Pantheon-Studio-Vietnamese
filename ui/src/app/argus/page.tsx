"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { MetaChat, MetaLayout, SYSTEM_ORG } from "@/components/MetaChat";
import { Button, ErrorNote, Field, Input, Select, Spinner, Tabs, Textarea } from "@/components/ui";
import { useLocale, useT, formatRelative } from "@/i18n";
import { api } from "@/lib/api";
import type { ArgusWatch, Org } from "@/lib/types";
import { useOrg, useOrgConnection } from "@/store/org";

function ArgusIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#ag)" />
      <path d="M6 16s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="3" fill="white" />
      <defs>
        <linearGradient id="ag" x1="2" y1="2" x2="30" y2="30">
          <stop stopColor="#4fb3e8" />
          <stop offset="1" stopColor="#2f5f9f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ArgusPage() {
  useOrgConnection(SYSTEM_ORG);
  const t = useT();
  const [argusId, setArgusId] = useState<string | null>(null);
  const [tab, setTab] = useState<"watches" | "activity">("watches");
  const [side, setSide] = useState(false);
  useEffect(() => {
    api.metaAgent("argus").then((s) => setArgusId(s.agent.id)).catch(() => {});
  }, []);
  const prompts = [t("meta.argus.prompt1"), t("meta.argus.prompt2"), t("meta.argus.prompt3"), t("meta.argus.prompt4")];
  return (
    <MetaLayout
      sideOpen={side}
      onCloseSide={() => setSide(false)}
      chat={
        argusId ? (
          <MetaChat
            agentId={argusId}
            fallbackName="Argus"
            icon={<ArgusIcon />}
            subtitle={t("meta.argus.subtitle")}
            intro={t("meta.argus.intro")}
            prompts={prompts}
            placeholder={t("meta.argus.placeholder")}
            sideLabel={t("meta.argus.sideLabel")}
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
                { value: "watches", label: t("meta.argus.tabWatches") },
                { value: "activity", label: t("meta.argus.tabActivity") },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{tab === "watches" ? <Watches /> : <ActivityFeed />}</div>
        </>
      }
    />
  );
}

function Watches() {
  const t = useT();
  const locale = useLocale();
  const [watches, setWatches] = useState<ArgusWatch[] | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [every, setEvery] = useState(30);
  const [focus, setFocus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const feedLen = useOrg((s) => s.feed.length);
  const load = () => api.argusWatches().then(setWatches).catch(() => setWatches([]));
  useEffect(() => {
    void load();
    api.orgs().then(setOrgs).catch(() => {});
  }, [feedLen]);
  if (!watches) return <Spinner />;
  const add = async () => {
    setError(null);
    try {
      await api.setArgusWatch(orgId, { everyMinutes: every, focus });
      setFocus("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="space-y-5 p-4 text-sm">
      {watches.length === 0 ? (
        <div className="text-ink-3">{t("meta.argus.watchesEmpty")}</div>
      ) : (
        <div className="space-y-2">
          {watches.map((w) => (
            <div key={w.orgId} className="rounded-lg border border-line p-3">
              <div className="flex items-center gap-2">
                <Link href={`/org/${w.orgId}`} className="font-medium hover:underline">
                  {w.orgName}
                </Link>
                <span className="text-xs text-ink-3">{t("meta.argus.everyMinutes", { count: w.everyMinutes })}</span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => api.removeArgusWatch(w.orgId).then(load)}>
                  {t("common.stop")}
                </Button>
              </div>
              {w.focus && <div className="mt-1 text-xs text-ink-2">{w.focus}</div>}
              <div className="mt-1 text-[11px] text-ink-3">{t("meta.argus.lastCheck", { when: formatRelative(locale, w.lastCheck) })}</div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-line p-3">
        <div className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">{t("meta.argus.newWatch")}</div>
        <div className="grid gap-3">
          <Field label={t("meta.argus.organization")}>
            <Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">{t("meta.argus.choose")}</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("meta.argus.checkEvery")}>
            <Input type="number" min={5} value={every} onChange={(e) => setEvery(Number(e.target.value))} />
          </Field>
          <Field label={t("meta.argus.focus")} hint={t("meta.argus.focusHint")}>
            <Textarea rows={2} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder={t("meta.argus.focusPlaceholder")} />
          </Field>
          <ErrorNote error={error} />
          <Button variant="primary" disabled={!orgId} onClick={add}>
            {t("meta.argus.watch")}
          </Button>
        </div>
      </div>
    </div>
  );
}
