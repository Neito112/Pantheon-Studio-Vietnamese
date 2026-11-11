"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useT, useLocale, formatTime } from "@/i18n";
import type { Agent, AttachmentBrief, AttachmentInfo, Message } from "@/lib/types";
import { LiveTalk, type LiveState } from "@/lib/liveTalk";
import { canListen, listen, speak, stopSpeaking, voiceStatus, VoiceSetupError, type Listener, type VoiceStatus } from "@/lib/voice";
import { AgentAvatar, UserAvatar } from "./agent";
import { FilePill, MessageAttachments, uploadFiles } from "./Files";
import { Markdown } from "./Markdown";
import { Button, cx, Spinner, Textarea } from "./ui";

export function MessageList({
  messages,
  agents,
  empty,
  compact,
}: {
  messages: Message[];
  agents: Record<string, Agent>;
  empty?: ReactNode;
  compact?: boolean;
}) {
  const t = useT();
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useLayoutEffect(() => {
    if (stick.current) end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  return (
    <div
      ref={box}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      {messages.length === 0 && (empty ?? <div className="py-10 text-center text-sm text-ink-3">{t("agents.chat.noMessages")}</div>)}
      <div className="space-y-3">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = prev && prev.senderId === m.senderId && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < 120000;
          return <MessageRow key={m.id} m={m} agents={agents} grouped={!!grouped} compact={compact} />;
        })}
      </div>
      <div ref={end} />
    </div>
  );
}

function MessageRow({ m, agents, grouped, compact }: { m: Message; agents: Record<string, Agent>; grouped: boolean; compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const agent = m.senderType === "agent" ? agents[m.senderId] : undefined;
  const name =
    m.senderType === "user" ? t("common.you") : m.senderType === "system" ? t("agents.chat.system") : (agent?.name ?? String(m.meta?.senderName ?? m.senderId));
  if (m.senderType === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] rounded-md border border-line bg-panel-2/60 px-3 py-1.5 text-xs text-ink-2 whitespace-pre-wrap">{m.content}</div>
      </div>
    );
  }
  return (
    <div className={cx("flex gap-2.5", grouped && "-mt-1.5")}>
      <div className="w-7 shrink-0">
        {!grouped && (m.senderType === "user" ? <UserAvatar size={28} /> : <AgentAvatar agent={agent} size={28} />)}
      </div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold">{name}</span>
            {agent && !compact && <span className="text-xs text-ink-3">{agent.role}</span>}
            <span className="text-[11px] text-ink-3">{formatTime(locale, m.createdAt)}</span>
            {m.kind === "reply" && <span className="text-[10px] uppercase tracking-wide text-ink-3">{t("agents.chat.reply")}</span>}
          </div>
        )}
        {m.senderType === "agent" && m.meta?.thinking === true && <ThinkingBlock messageId={m.id} />}
        <Markdown className="text-ink">{m.content}</Markdown>
        {Array.isArray(m.meta?.attachments) && m.meta.attachments.length > 0 && <MessageAttachments items={m.meta.attachments as AttachmentBrief[]} />}
      </div>
    </div>
  );
}

type ThinkingStep = { reasoning: string; text: string; tools: string[] };

/** The agent's reasoning behind a message: collapsed by default, loaded on first open. */
function ThinkingBlock({ messageId }: { messageId: string }) {
  const t = useT();
  const [steps, setSteps] = useState<ThinkingStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    if (steps || error) return;
    api
      .messageThinking(messageId)
      .then((r) => setSteps(r.steps.filter((s) => s.reasoning.trim())))
      .catch((e: Error) => setError(e.message));
  };
  return (
    <details className="group mb-1 text-xs" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && load()}>
      <summary className="inline-flex cursor-pointer select-none items-center gap-1 rounded px-1 py-0.5 text-ink-3 hover:bg-panel-2 hover:text-ink-2">
        <span className="transition-transform group-open:rotate-90">›</span> {t("agents.chat.thinking")}
      </summary>
      <div className="mt-1 space-y-2 border-l-2 border-line pl-3 text-ink-2">
        {error ? (
          <div className="text-bad">{error}</div>
        ) : !steps ? (
          <Spinner className="size-3" />
        ) : steps.length === 0 ? (
          <div className="text-ink-3">{t("agents.chat.noReasoning")}</div>
        ) : (
          steps.map((s, i) => (
            <div key={i}>
              {steps.length > 1 && <div className="mb-0.5 text-[10px] uppercase tracking-wide text-ink-3">{t("agents.chat.step", { n: i + 1 })}</div>}
              <div className="whitespace-pre-wrap leading-relaxed">{s.reasoning.trim()}</div>
              {s.tools.length > 0 && <div className="mt-0.5 text-[11px] text-ink-3">{t("agents.chat.thenUsed", { tools: s.tools.join(", ") })}</div>}
            </div>
          ))
        )}
      </div>
    </details>
  );
}

/** What the agent is thinking right now (while a turn runs); collapsed by default. */
export function LiveThinking({ text }: { text: string }) {
  const t = useT();
  const body = text.trim();
  if (!body) return null;
  return (
    <details className="group text-xs">
      <summary className="inline-flex cursor-pointer select-none items-center gap-1 text-ink-3 hover:text-ink-2">
        <span className="transition-transform group-open:rotate-90">›</span> {t("agents.chat.thinkingLive")}
      </summary>
      <div className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap border-l-2 border-line pl-3 leading-relaxed text-ink-2">{body.slice(-3000)}</div>
    </details>
  );
}

const LIVE_LABEL_KEYS: Record<LiveState, string> = {
  connecting: "agents.chat.liveConnecting",
  listening: "agents.chat.liveListening",
  hearing: "agents.chat.liveHearing",
  transcribing: "agents.chat.liveTranscribing",
  "agent-speaking": "agents.chat.liveAgentSpeaking",
  paused: "agents.chat.livePaused",
  error: "agents.chat.liveError",
  off: "agents.chat.liveOff",
};

function readHalfDuplex(): boolean {
  try {
    return localStorage.getItem("pantheon.live.interrupt") !== "1";
  } catch {
    return true;
  }
}

/** Hands-free conversation bar: VAD-driven turn taking with an agent. */
function LiveBar({
  orgId,
  agentId,
  agentName,
  onClose,
  onHearing,
  onLiveState,
  preferInterruptible,
}: {
  orgId: string;
  agentId: string;
  agentName?: string;
  onClose: (error?: string) => void;
  onHearing?: () => void;
  /** Every live-talk state change (null when the session ends). */
  onLiveState?: (s: LiveState | null) => void;
  preferInterruptible?: boolean;
}) {
  const t = useT();
  const [state, setState] = useState<LiveState>("connecting");
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [info, setInfo] = useState<{ vad: string; fallbackReason?: string | null } | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // A caller that decides (the Stage's headphones switch) wins over the stored per-device choice.
  const [halfDuplex, setHalfDuplex] = useState(() => (preferInterruptible === undefined ? readHalfDuplex() : !preferInterruptible));
  useEffect(() => {
    if (preferInterruptible !== undefined) setHalfDuplex(!preferInterruptible);
  }, [preferInterruptible]);
  const hearingRef = useRef(onHearing);
  useLayoutEffect(() => {
    hearingRef.current = onHearing;
  });
  const session = useRef<LiveTalk | null>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });
  const liveStateRef = useRef(onLiveState);
  useLayoutEffect(() => {
    liveStateRef.current = onLiveState;
  });

  useEffect(() => {
    let lastError: string | undefined;
    const s = new LiveTalk(
      orgId,
      agentId,
      {
        onState: (st) => {
          setState(st);
          liveStateRef.current?.(st);
          if (st === "hearing") hearingRef.current?.();
          if (st === "error") closeRef.current(lastError);
        },
        onTranscript: setHeard,
        onLevel: setLevel,
        onInfo: setInfo,
        onError: (m) => {
          lastError = m;
          setNote(m);
        },
      },
      { halfDuplex },
    );
    session.current = s;
    void s.start();
    return () => {
      s.stop();
      liveStateRef.current?.(null);
    };
    // Restart the session only when the target or duplex mode changes.
  }, [orgId, agentId, halfDuplex]);

  const toggleDuplex = () => {
    const next = !halfDuplex;
    try {
      localStorage.setItem("pantheon.live.interrupt", next ? "0" : "1");
    } catch {
      /* per-device preference only */
    }
    setHalfDuplex(next);
  };

  const active = state === "hearing";
  return (
    <div className="mb-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={cx("relative flex size-7 shrink-0 items-center justify-center rounded-full", active ? "bg-bad/25 text-bad" : "bg-accent/25 text-accent")}>
          <span
            className="absolute inset-0 rounded-full border-2 border-current opacity-60 transition-transform duration-100"
            style={{ transform: `scale(${1 + (muted ? 0 : level) * 0.6})` }}
          />
          {state === "transcribing" || state === "connecting" ? <Spinner className="size-3.5" /> : <MicIcon />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {t(LIVE_LABEL_KEYS[state])}
            {agentName && state === "agent-speaking" && <span className="text-ink-3"> · {agentName}</span>}
          </div>
          <div className="truncate text-xs text-ink-3" title={info?.fallbackReason ?? undefined}>
            {heard
              ? `“${heard}”`
              : info
                ? `${t("agents.chat.voiceDetection", { vad: info.vad })}${info.fallbackReason ? t("agents.chat.voiceFallback") : ""}`
                : t("agents.chat.startingMic")}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            title={halfDuplex ? t("agents.chat.waitForAgentHint") : t("agents.chat.interruptibleHint")}
            onClick={toggleDuplex}
          >
            {halfDuplex ? t("agents.chat.waitForAgent") : t("agents.chat.interruptible")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              session.current?.setMuted(!muted);
              setMuted(!muted);
            }}
          >
            {muted ? t("agents.chat.unmute") : t("agents.chat.mute")}
          </Button>
          <Button size="sm" variant="danger" onClick={() => onClose()}>
            {t("agents.chat.end")}
          </Button>
        </div>
      </div>
      {note && state !== "error" && <div className="mt-1 text-xs text-warn">{note}</div>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export interface LiveTarget {
  orgId: string;
  agentId: string;
  agentName?: string;
}

export function Composer({
  onSend,
  placeholder,
  disabled,
  voice = true,
  live,
  onLiveChange,
  onHearing,
  onLiveState,
  preferInterruptible,
  attach,
  draftKey,
  working,
}: {
  onSend: (text: string, attachments?: string[], opts?: { steer: boolean }) => Promise<void> | void;
  /** The agent is mid-turn: offer to steer it now instead of queueing for after. */
  working?: { name: string } | null;
  /** Lets the user attach documents and images (uploaded to this agent's library, or the org's). */
  attach?: { orgId: string; agentId?: string | null };
  placeholder?: string;
  disabled?: boolean;
  voice?: boolean;
  /** Enables hands-free live talk with this agent. */
  live?: LiveTarget;
  onLiveChange?: (on: boolean) => void;
  /** Live talk heard the user start speaking. */
  onHearing?: () => void;
  /** Every live-talk state change (null when the session ends). */
  onLiveState?: (s: LiveState | null) => void;
  /** Live talk lets the user talk over the agent by default (teach-along). */
  preferInterruptible?: boolean;
  /** Where an unsent draft is kept; defaults to one per conversation (agent, channel...). */
  draftKey?: string;
}) {
  const t = useT();
  const key = draftKey ?? `${live?.agentId ?? attach?.agentId ?? ""}|${attach?.orgId ?? live?.orgId ?? ""}|${placeholder ?? ""}`;
  const [text, setTextState] = useState(() => loadDraft(key));
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    // Another conversation: show its draft.
    setShownKey(key);
    setTextState(loadDraft(key));
  }
  const setText = (v: string) => {
    setTextState(v);
    saveDraft(key, v);
  };
  const [expanded, setExpanded] = useState(false);
  const [steerOn, setSteerOn] = useState(true);
  const box = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    // Grow with the text (up to half the screen); the expand button gives more room.
    const el = box.current;
    if (!el) return;
    if (expanded) {
      el.style.height = ""; // let the expanded size apply
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, window.innerHeight * 0.5)}px`;
  }, [text, expanded]);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<"idle" | "recording" | "transcribing">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [liveOn, setLiveOn] = useState(false);
  const recorder = useRef<Listener | null>(null);
  const [voiceNow, setVoiceNow] = useState<VoiceStatus | null>(null);
  useEffect(() => {
    if (voice) void voiceStatus().then(setVoiceNow);
  }, [voice]);
  const micReady = canListen(voiceNow);
  const [files, setFiles] = useState<AttachmentInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | File[]) => {
    if (!attach) return;
    const picked = Array.from(list);
    if (!picked.length) return;
    setUploading(true);
    setErr(null);
    const done = await uploadFiles(attach.orgId, picked, attach.agentId, (m) => setErr(m));
    setFiles((f) => [...f, ...done]);
    setUploading(false);
  };
  // Files still being read finish on their own; keep the pills current.
  useEffect(() => {
    if (!files.some((f) => f.status === "processing")) return;
    const timer = setInterval(() => {
      void Promise.all(files.map((f) => (f.status === "processing" ? api.attachmentInfo(f.id).catch(() => f) : f))).then(setFiles);
    }, 1500);
    return () => clearInterval(timer);
  }, [files]);
  const removeFile = (f: AttachmentInfo) => {
    setFiles((all) => all.filter((x) => x.id !== f.id));
    void api.deleteAttachment(f.id).catch(() => {});
  };

  const setLive = (on: boolean, error?: string) => {
    setLiveOn(on);
    onLiveChange?.(on);
    if (error) setErr(error);
    else if (on) setErr(null);
  };
  const liveKey = live ? `${live.orgId}/${live.agentId}` : "";
  const onLiveChangeRef = useRef(onLiveChange);
  useLayoutEffect(() => {
    onLiveChangeRef.current = onLiveChange;
  });
  useEffect(() => {
    // Changing target (or unmounting) ends a live conversation.
    setLiveOn(false);
    return () => onLiveChangeRef.current?.(false);
  }, [liveKey]);

  const send = async (value = text) => {
    const v = value.trim();
    if ((!v && !files.length) || busy || uploading) return;
    setBusy(true);
    setErr(null);
    try {
      await onSend(v, files.map((f) => f.id), { steer: !!working && steerOn });
      setText("");
      setFiles([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startRec = async () => {
    setErr(null);
    stopSpeaking();
    try {
      recorder.current = await listen();
      setRec("recording");
    } catch (e) {
      setErr(e instanceof VoiceSetupError ? e.message : t("agents.chat.micUnavailable", { error: (e as Error).message }));
      setRec("idle");
    }
  };
  const stopRec = async () => {
    if (!recorder.current || rec !== "recording") return;
    setRec("transcribing");
    try {
      const said = (await recorder.current.stop()).trim();
      if (said) await send(said);
    } catch (e) {
      setErr(t("agents.chat.transcriptionFailed", { error: (e as Error).message }));
    } finally {
      setRec("idle");
      recorder.current = null;
    }
  };

  return (
    <div
      className={cx("shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", dragging && "bg-accent/10 outline-dashed outline-2 -outline-offset-4 outline-accent")}
      onDragOver={
        attach
          ? (e) => {
              e.preventDefault();
              setDragging(true);
            }
          : undefined
      }
      onDragLeave={attach ? () => setDragging(false) : undefined}
      onDrop={
        attach
          ? (e) => {
              e.preventDefault();
              setDragging(false);
              void addFiles(e.dataTransfer.files);
            }
          : undefined
      }
    >
      {err && <div className="mb-2 whitespace-pre-wrap text-xs text-bad">{err}</div>}
      {working && (
        <div className="mb-2 flex items-center gap-2 text-xs text-ink-3">
          <span>{t("agents.chat.isWorking", { name: working.name })}</span>
          <div className="inline-flex overflow-hidden rounded-md border border-line">
            <button
              type="button"
              className={cx("px-2 py-0.5 cursor-pointer", steerOn ? "bg-accent/20 text-ink" : "hover:bg-panel-2")}
              title={t("agents.chat.steerNowHint", { name: working.name })}
              onClick={() => setSteerOn(true)}
            >
              {t("agents.chat.steerNow")}
            </button>
            <button
              type="button"
              className={cx("border-l border-line px-2 py-0.5 cursor-pointer", !steerOn ? "bg-accent/20 text-ink" : "hover:bg-panel-2")}
              title={t("agents.chat.queueHint", { name: working.name })}
              onClick={() => setSteerOn(false)}
            >
              {t("agents.chat.queue")}
            </button>
          </div>
        </div>
      )}
      {(files.length > 0 || uploading) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {files.map((f) => (
            <FilePill key={f.id} file={f} onRemove={() => removeFile(f)} />
          ))}
          {uploading && <Spinner className="size-4" />}
        </div>
      )}
      {live && liveOn && (
        <LiveBar
          key={liveKey}
          orgId={live.orgId}
          agentId={live.agentId}
          agentName={live.agentName}
          onClose={(error) => setLive(false, error)}
          onHearing={onHearing}
          onLiveState={onLiveState}
          preferInterruptible={preferInterruptible}
        />
      )}
      {/* In a narrow pane the buttons wrap below the box instead of squeezing it. */}
      <div className="flex flex-wrap items-end gap-2">
        <Textarea
          ref={box}
          rows={1}
          className={cx("min-h-9 min-w-56 flex-1", expanded ? "h-[55vh] resize-none" : "max-h-[50vh] resize-y")}
          value={text}
          disabled={disabled}
          placeholder={placeholder ?? t("agents.chat.messagePlaceholder")}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            if (!attach) return;
            const pasted = Array.from(e.clipboardData.files);
            if (pasted.length) {
              e.preventDefault();
              void addFiles(pasted);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="ml-auto flex items-end gap-2">
          <button
            title={expanded ? t("agents.chat.shrinkBox") : t("agents.chat.expandBox")}
            aria-label={expanded ? t("agents.chat.shrinkBoxAria") : t("agents.chat.expandBoxAria")}
            onClick={() => {
              setExpanded((v) => !v);
              box.current?.focus();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-2 bg-panel-2 text-ink-2 transition-colors hover:text-ink cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {expanded ? <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /> : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
            </svg>
          </button>
          {attach && (
            <>
              <button
                title={t("agents.chat.attachHint")}
                aria-label={t("agents.chat.attachAria")}
                disabled={disabled}
                onClick={() => picker.current?.click()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-2 bg-panel-2 text-ink-2 transition-colors hover:text-ink cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5 12.5 20a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8" />
                </svg>
              </button>
              <input ref={picker} type="file" multiple className="hidden" onChange={(e) => (void addFiles(e.target.files ?? []), (e.target.value = ""))} />
            </>
          )}
          {voice && (
            <button
              title={micReady ? t("agents.chat.holdToTalk") : t("agents.chat.voiceNotSetUp")}
              disabled={disabled || rec === "transcribing"}
              onMouseDown={startRec}
              onMouseUp={stopRec}
              onMouseLeave={stopRec}
              onTouchStart={startRec}
              onTouchEnd={stopRec}
              className={cx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer",
                rec === "recording" ? "border-bad bg-bad/20 text-bad pulse-ring" : "border-line-2 bg-panel-2 text-ink-2 hover:text-ink",
                voiceNow && !micReady && "opacity-50",
              )}
            >
              {rec === "transcribing" ? <Spinner className="size-4" /> : <MicIcon />}
            </button>
          )}
          {voice && live && voiceNow?.server && (
            <button
              title={liveOn ? t("agents.chat.endLiveTalk") : t("agents.chat.liveTalkHint")}
              disabled={disabled}
              onClick={() => setLive(!liveOn)}
              className={cx(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors cursor-pointer",
                liveOn ? "border-accent bg-accent/20 text-accent" : "border-line-2 bg-panel-2 text-ink-2 hover:text-ink",
              )}
            >
              <span className={cx("size-2 rounded-full", liveOn ? "bg-accent animate-pulse" : "bg-ink-3")} />
              {t("agents.chat.live")}
            </button>
          )}
          <Button variant="primary" onClick={() => send()} loading={busy} disabled={disabled || uploading || (!text.trim() && !files.length)}>
            {t("agents.chat.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Speak new agent replies aloud (when enabled), once each. */
export function useAutoSpeak(messages: Message[], enabled: boolean): void {
  const spoken = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  useEffect(() => {
    if (!primed.current) {
      messages.forEach((m) => spoken.current.add(m.id));
      primed.current = true;
      return;
    }
    for (const m of messages) {
      if (spoken.current.has(m.id)) continue;
      spoken.current.add(m.id);
      if (enabled && m.senderType === "agent") speak(m.content, m.senderId);
    }
  }, [messages, enabled]);
}

/* Unsent drafts survive switching conversations, pages and reloads (this browser only). */
const DRAFT_PREFIX = "pantheon.draft:";

function loadDraft(key: string): string {
  try {
    return localStorage.getItem(DRAFT_PREFIX + key) ?? "";
  } catch {
    return "";
  }
}

function saveDraft(key: string, text: string): void {
  try {
    if (text) localStorage.setItem(DRAFT_PREFIX + key, text);
    else localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* private mode or storage blocked: drafts just don't persist */
  }
}
