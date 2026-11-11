"use client";

import { useShallow } from "zustand/react/shallow";
import { useCallback, useEffect, useState } from "react";
import { AgentAvatar } from "@/components/agent";
import { Badge, Button, cx, Empty, ErrorNote, Field, Input, Select, Spinner, Textarea, type Tone } from "@/components/ui";
import { formatRelative, useLocale, useT } from "@/i18n";
import { api } from "@/lib/api";
import type { Playbook, ShadowEvent, ShadowSession } from "@/lib/types";
import { useOrg } from "@/store/org";

type TFn = (key: string, params?: Record<string, string | number>) => string;

const STATUS_TONE: Record<ShadowSession["status"], Tone> = {
  recording: "bad",
  stopped: "neutral",
  learning: "accent",
  learned: "ok",
};

const STATUS_KEY: Record<ShadowSession["status"], string> = {
  recording: "org.shadow.statusRecording",
  stopped: "org.shadow.statusRecorded",
  learning: "org.shadow.statusLearning",
  learned: "org.shadow.statusLearned",
};

function whereLabel(t: TFn, source: string): string {
  if (source === "computer") return t("org.shadow.whereComputer");
  if (source === "desktop") return t("org.shadow.whereDesktop");
  if (source === "sandbox") return t("org.shadow.whereSandbox");
  if (source === "browser") return t("org.shadow.whereBrowser");
  return source;
}

export default function ShadowPage() {
  const t = useT();
  const locale = useLocale();
  const orgId = useOrg((s) => s.orgId)!;
  const feedLen = useOrg((s) => s.feed.length);
  const [sessions, setSessions] = useState<ShadowSession[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"recordings" | "playbooks">("recordings");
  const load = useCallback(() => api.shadowSessions(orgId).then(setSessions).catch(() => setSessions([])), [orgId]);
  useEffect(() => {
    void load();
  }, [load, feedLen]);
  const active = sessions?.some((s) => s.status === "recording" || s.status === "learning");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [active, load]);

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-line bg-panel md:w-80 md:border-b-0 md:border-r">
        <div className="flex gap-1 border-b border-line p-2">
          {(["recordings", "playbooks"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cx("flex-1 rounded-md px-2 py-1.5 text-sm capitalize cursor-pointer", view === v ? "bg-panel-2 font-medium text-ink" : "text-ink-2 hover:text-ink")}
            >
              {v === "recordings" ? t("org.shadow.recordings") : t("org.shadow.playbooks")}
            </button>
          ))}
        </div>
        {view === "recordings" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NewRecording
              orgId={orgId}
              onStarted={(s) => {
                setSelected(s.id);
                void load();
              }}
            />
            <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-ink-3">{t("org.shadow.recordings")}</div>
            {!sessions ? (
              <Spinner />
            ) : sessions.length === 0 ? (
              <div className="px-3 pb-3 text-xs text-ink-3">{t("common.noneYet")}</div>
            ) : (
              <ul className="space-y-0.5 px-2 pb-3">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelected(s.id)}
                      className={cx("w-full rounded-md px-2 py-2 text-left cursor-pointer", selected === s.id ? "bg-panel-2" : "hover:bg-panel-2/60")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</span>
                        <Badge tone={STATUS_TONE[s.status]}>{t(STATUS_KEY[s.status])}</Badge>
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-3">
                        {t("org.shadow.forAgent", { name: s.agentName ?? t("common.unknown") })} · {whereLabel(t, s.source)} · {t("org.shadow.eventCount", { count: s.eventCount })} · {formatRelative(locale, s.startedAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="p-3 text-xs leading-relaxed text-ink-3">
            {t("org.shadow.playbooksIntro")}
          </div>
        )}
      </aside>
      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {view === "playbooks" ? (
          <Playbooks orgId={orgId} />
        ) : selected ? (
          <Recording key={selected} id={selected} onChanged={load} onDeleted={() => (setSelected(null), void load())} />
        ) : (
          <Empty title={t("org.shadow.teachEmptyTitle")} icon="👁">
            {t("org.shadow.teachEmptyBody")}
          </Empty>
        )}
      </section>
    </div>
  );
}

function NewRecording({ orgId, onStarted }: { orgId: string; onStarted: (s: ShadowSession) => void }) {
  const t = useT();
  const agents = useOrg(useShallow((s) => Object.values(s.agents).filter((a) => !a.isSupervisor)));
  const [agentId, setAgentId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await api.startShadow(orgId, { agentId: agentId || agents[0]?.id || "", title, note });
      setTitle("");
      setNote("");
      onStarted(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-3 border-b border-line p-3">
      <div className="text-sm font-semibold">{t("org.shadow.teachAnAgent")}</div>
      <Field label={t("org.shadow.whoLearns")}>
        <Select value={agentId || agents[0]?.id || ""} onChange={(e) => setAgentId(e.target.value)}>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.role})
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("org.shadow.whatYoullDo")}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("org.shadow.titlePlaceholder")} />
      </Field>
      <Field label={t("org.shadow.anythingTheyShouldKnow")} hint={t("org.shadow.noteHint")}>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("org.shadow.notePlaceholder")} />
      </Field>
      <div className="text-[11px] leading-relaxed text-ink-3">
        {t("org.shadow.privacyNote")}
      </div>
      <ErrorNote error={error} />
      <Button variant="primary" disabled={busy || !title.trim() || agents.length === 0} onClick={start}>
        {t("org.shadow.startRecording")}
      </Button>
    </div>
  );
}

function Recording({ id, onChanged, onDeleted }: { id: string; onChanged: () => void; onDeleted: () => void }) {
  const t = useT();
  const [rec, setRec] = useState<(ShadowSession & { events: ShadowEvent[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const load = useCallback(() => api.shadowSession(id).then(setRec).catch((e) => setError((e as Error).message)), [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const live = rec?.status === "recording" || rec?.status === "learning";
  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [live, load]);
  if (!rec) return error ? <ErrorNote error={error} /> : <Spinner />;
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{rec.title}</h2>
        <Badge tone={STATUS_TONE[rec.status]}>{t(STATUS_KEY[rec.status])}</Badge>
        <span className="text-xs text-ink-3">
          {t("org.shadow.forAgent", { name: rec.agentName ?? t("common.unknown") })} · {whereLabel(t, rec.source)} · {t("org.shadow.eventCount", { count: rec.eventCount })}
        </span>
        <div className="ml-auto flex gap-2">
          {rec.status === "recording" && (
            <Button size="sm" variant="danger" onClick={() => act(() => api.stopShadow(rec.id))}>
              ■ {t("common.stop")}
            </Button>
          )}
          {(rec.status === "recording" || rec.status === "stopped") && rec.eventCount > 0 && (
            <Button size="sm" variant="primary" onClick={() => act(() => api.learnShadow(rec.id))}>
              {t("org.shadow.teachAgent", { name: rec.agentName ?? t("common.unknown") })}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => act(() => api.deleteShadow(rec.id)).then(onDeleted)}>
            {t("common.delete")}
          </Button>
        </div>
      </div>
      {rec.note && <div className="text-sm text-ink-2">{rec.note}</div>}
      <ErrorNote error={error} />
      {rec.status === "recording" && <HowToRecord />}
      {rec.status === "learning" && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
          {t("org.shadow.learningBanner", { name: rec.agentName ?? t("common.unknown") })}
        </div>
      )}
      {(rec.status === "learned" || rec.status === "learning") && <SessionPlaybook orgId={rec.orgId} agentId={rec.agentId} sessionId={rec.id} />}
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-3">{t("org.shadow.timeline")}</div>
        {rec.events.length === 0 ? (
          <div className="text-sm text-ink-3">{t("org.shadow.nothingRecorded")}</div>
        ) : (
          <ol className="space-y-1">
            {rec.events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-md px-2 py-1 hover:bg-panel-2/50">
                <span className="w-12 shrink-0 font-mono text-[11px] leading-5 text-ink-3">{clock(e.t)}</span>
                <span className="min-w-0 flex-1 text-sm leading-5">{describe(e, t)}</span>
                {e.image && (
                  <button onClick={() => setZoom(e.image)} className="shrink-0 cursor-zoom-in">
                    <img src={e.image} alt="" className="h-14 w-24 rounded border border-line object-cover object-top" loading="lazy" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      {zoom && (
        <button className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6" onClick={() => setZoom(null)}>
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg shadow-2xl" />
        </button>
      )}
    </div>
  );
}

function HowToRecord() {
  const t = useT();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-bad/40 bg-bad/5 p-4 text-sm">
      <span className="mt-1.5 size-2.5 shrink-0 animate-pulse rounded-full bg-bad" />
      <div className="space-y-1 text-ink-2">
        <div className="font-medium text-ink">{t("org.shadow.recordingThisComputer")}</div>
        <div>{t("org.shadow.howToRecord")}</div>
      </div>
    </div>
  );
}

function SessionPlaybook({ orgId, agentId, sessionId }: { orgId: string; agentId: string; sessionId: string }) {
  const [books, setBooks] = useState<Playbook[] | null>(null);
  const feedLen = useOrg((s) => s.feed.length);
  useEffect(() => {
    api.playbooks(orgId, agentId).then(setBooks).catch(() => setBooks([]));
  }, [orgId, agentId, feedLen]);
  const mine = books?.filter((b) => b.sessionId === sessionId) ?? [];
  if (!mine.length) return null;
  return (
    <div className="space-y-2">
      {mine.map((b) => (
        <PlaybookCard key={b.id} book={b} onChanged={() => api.playbooks(orgId, agentId).then(setBooks)} />
      ))}
    </div>
  );
}

function Playbooks({ orgId }: { orgId: string }) {
  const t = useT();
  const byId = useOrg((s) => s.agents);
  const feedLen = useOrg((s) => s.feed.length);
  const [books, setBooks] = useState<Playbook[] | null>(null);
  const load = useCallback(() => api.playbooks(orgId).then(setBooks).catch(() => setBooks([])), [orgId]);
  useEffect(() => {
    void load();
  }, [load, feedLen]);
  if (!books) return <Spinner />;
  if (!books.length)
    return (
      <Empty title={t("org.shadow.noPlaybooks")} icon="📘">
        {t("org.shadow.noPlaybooksBody")}
      </Empty>
    );
  return (
    <div className="space-y-3 p-4">
      {books.map((b) => (
        <div key={b.id}>
          <div className="mb-1 flex items-center gap-2 text-xs text-ink-3">
            {byId[b.agentId] && <AgentAvatar agent={byId[b.agentId]} size={16} />}
            {byId[b.agentId]?.name ?? "?"}
          </div>
          <PlaybookCard book={b} onChanged={load} />
        </div>
      ))}
    </div>
  );
}

function PlaybookCard({ book, onChanged }: { book: Playbook; onChanged: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(book.content);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await api.updatePlaybook(book.id, { content: text });
      setEditing(false);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">📘 {book.title}</span>
        <span className="text-[11px] text-ink-3">{formatRelative(locale, book.updatedAt ?? book.createdAt)}</span>
        <div className="ml-auto flex gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="primary" onClick={save}>
                {t("common.save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => (setEditing(false), setText(book.content))}>
                {t("common.cancel")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                {t("common.edit")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => api.deletePlaybook(book.id).then(onChanged)}>
                {t("common.delete")}
              </Button>
            </>
          )}
        </div>
      </div>
      {editing ? <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} /> : <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{book.content}</div>}
      <ErrorNote error={error} />
    </div>
  );
}

const clock = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function describe(e: ShadowEvent, t: TFn): React.ReactNode {
  const d = e.data as Record<string, string | number | string[] | undefined>;
  const where = d.window ? <span className="text-ink-3">{t("org.shadow.eventInWindow", { window: String(d.window) })}</span> : null;
  switch (e.kind) {
    case "click":
      return (
        <>
          🖱 {t("org.shadow.eventClicked")} {d.label ? <b>{String(d.label)}</b> : d.x !== undefined ? t("org.shadow.eventClickedAt", { x: String(d.x), y: String(d.y) }) : t("org.shadow.eventClickedSomething")}
          {where}
        </>
      );
    case "input":
      return (
        <>
          ⌨ {t("org.shadow.eventFilled")} <b>{String(d.label || d.name || t("org.shadow.eventAField"))}</b> {t("org.shadow.eventWith")} <span className="font-mono text-[12px]">{String(d.value ?? "")}</span>
        </>
      );
    case "submit":
      return <>↵ {t("org.shadow.eventSubmitted")} {d.label ? <b>{String(d.label)}</b> : t("org.shadow.eventAForm")}</>;
    case "key":
      return (
        <>
          ↵ {t("org.shadow.eventPressed")} {String(d.key)}
          {d.label ? <span className="text-ink-3">{t("org.shadow.eventInLabel", { label: String(d.label) })}</span> : null}
        </>
      );
    case "navigate":
      return (
        <>
          🌐 {d.switched ? t("org.shadow.eventSwitchedTo") : t("org.shadow.eventOpened")} <b>{String(d.title || d.url)}</b> <span className="break-all text-[11px] text-ink-3">{String(d.url ?? "")}</span>
        </>
      );
    case "window":
      return (
        <>
          🗔 {t("org.shadow.eventSwitchedTo")} <b>{String(d.title || t("org.shadow.eventNoTitle"))}</b>
        </>
      );
    case "typing":
      return (
        <>
          ⌨ {Array.isArray(d.special) && d.special.length ? t("org.shadow.eventTypedThen", { keys: String(d.keys), special: d.special.join(", ") }) : t("org.shadow.eventTyped", { keys: String(d.keys) })}
          {where}
        </>
      );
    case "note":
      return <span className="text-ink-2">ℹ {String(d.text)}</span>;
    default:
      return <span className="text-ink-3">📷 {t("org.shadow.eventScreen")}{where}</span>;
  }
}
