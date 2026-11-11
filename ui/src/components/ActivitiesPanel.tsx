"use client";

/** An organization's scheduled activities (made by you or by Zeus). */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime, formatRelative, useLocale, useT } from "@/i18n";
import type { Activity } from "@/lib/types";
import { useOrg } from "@/store/org";
import { Badge, Button, ErrorNote, Field, Input, Select, Spinner, Textarea, Toggle } from "./ui";

export function ActivitiesPanel({ orgId }: { orgId: string }) {
  const t = useT();
  const locale = useLocale();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [adding, setAdding] = useState(false);
  const agents = useOrg((s) => s.agents);
  const load = () => api.activities(orgId).then(setItems).catch(() => setItems([]));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);
  if (!items) return <Spinner />;
  const names = (ids: string[]) => (ids.length ? ids.map((i) => agents[i]?.name ?? i).join(", ") : t("work.everyone"));
  const when = (a: Activity) =>
    a.schedule.every_minutes
      ? t("work.scheduleEvery", { count: a.schedule.every_minutes })
      : a.schedule.daily_at
        ? t("work.scheduleDaily", { time: a.schedule.daily_at })
        : t("work.scheduleOnDemand");
  return (
    <div className="space-y-3 text-sm">
      {items.length === 0 && <div className="text-ink-3">{t("work.noActivities")}</div>}
      {items.map((a) => (
        <div key={a.id} className="rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{a.title}</span>
            <Badge>{when(a)}</Badge>
            {a.room && <Badge tone="info">{a.room}</Badge>}
            <span className="ml-auto flex items-center gap-2">
              <Toggle checked={a.enabled} onChange={(v) => api.updateActivity(a.id, { enabled: v }).then(load)} />
              <Button size="sm" variant="ghost" onClick={() => api.runActivity(a.id).then(load)}>
                {t("work.runNow")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => api.deleteActivity(a.id).then(load)}>
                ✕
              </Button>
            </span>
          </div>
          {a.instructions && <div className="mt-1 whitespace-pre-wrap text-xs text-ink-2">{a.instructions}</div>}
          <div className="mt-1 text-[11px] text-ink-3">
            {names(a.participants)} · {t("work.by", { name: a.createdBy })}
            {a.lastRunAt && ` · ${t("work.lastRan", { ago: formatRelative(locale, a.lastRunAt) })}`}
            {a.enabled && a.nextRunAt && ` · ${t("work.nextRun", { time: formatDateTime(locale, a.nextRunAt) })}`}
          </div>
        </div>
      ))}
      {adding ? (
        <NewActivity orgId={orgId} onDone={() => (setAdding(false), void load())} />
      ) : (
        <Button size="sm" onClick={() => setAdding(true)}>
          {t("work.addActivity")}
        </Button>
      )}
    </div>
  );
}

function NewActivity({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [room, setRoom] = useState("");
  const [mode, setMode] = useState<"daily" | "every" | "manual">("daily");
  const [daily, setDaily] = useState("09:00");
  const [every, setEvery] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<string[]>([]);
  useEffect(() => {
    api.world(orgId).then((w) => setRooms(w.rooms.map((r) => r.name))).catch(() => {});
  }, [orgId]);
  const save = async () => {
    setError(null);
    try {
      await api.createActivity(orgId, {
        title,
        instructions,
        room: room || null,
        schedule: mode === "daily" ? { daily_at: daily } : mode === "every" ? { every_minutes: every } : {},
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="grid gap-3 rounded-lg border border-line p-3">
      <Field label={t("common.title")}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("work.activityTitlePlaceholder")} />
      </Field>
      <Field label={t("work.whatHappens")} hint={t("work.whatHappensHint")}>
        <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={t("work.activityInstructionsPlaceholder")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("work.where")}>
          <Select value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="">{t("work.whereverTheyAre")}</option>
            {rooms.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("work.when")}>
          <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="daily">{t("work.dailyAtUtc")}</option>
            <option value="every">{t("work.everyNMinutes")}</option>
            <option value="manual">{t("work.onlyWhenRun")}</option>
          </Select>
        </Field>
        {mode === "daily" ? (
          <Field label={t("work.timeUtc")}>
            <Input type="time" value={daily} onChange={(e) => setDaily(e.target.value)} />
          </Field>
        ) : mode === "every" ? (
          <Field label={t("work.minutes")}>
            <Input type="number" min={5} value={every} onChange={(e) => setEvery(Number(e.target.value))} />
          </Field>
        ) : null}
      </div>
      <ErrorNote error={error} />
      <div className="flex gap-2">
        <Button variant="primary" disabled={!title.trim()} onClick={save}>
          {t("common.add")}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
