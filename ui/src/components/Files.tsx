"use client";

/** Files given to agents: the per-agent library, plus small pieces used in chat. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useT, translate, formatBytes, formatDuration, formatNumber } from "@/i18n";
import { api } from "@/lib/api";
import type { AttachmentBrief, AttachmentInfo } from "@/lib/types";
import { useOrg } from "@/store/org";
import { Badge, Button, cx, ErrorNote, Spinner } from "./ui";
import { engineHttp } from "@/lib/engine";

export const attachmentUrl = (id: string, download = false) => `${engineHttp()}/api/v1/attachments/${id}/file${download ? "?download=true" : ""}`;
export const posterUrl = (id: string) => `${engineHttp()}/api/v1/attachments/${id}/poster`;
/** Videos the interface plays in place (others download). */
const playable = (mime: string) => mime === "video/mp4" || mime === "video/webm";

/** A video: the player when it can play here, else its poster and a download link. */
function VideoView({ file, className }: { file: { id: string; name: string; mime: string }; className?: string }) {
  const t = useT();
  return playable(file.mime) ? (
    <video src={attachmentUrl(file.id)} poster={posterUrl(file.id)} controls autoPlay className={className} />
  ) : (
    <a href={attachmentUrl(file.id, true)} title={t("files.downloadFile", { name: file.name })} onClick={(e) => e.stopPropagation()}>
      <img src={posterUrl(file.id)} alt={file.name} className={className} />
      <div className="mt-2 text-center text-xs text-ink-3">{t("files.cannotPlayHere")}</div>
    </a>
  );
}

const EXT_ICON: Record<string, string> = { pdf: "📕", doc: "📘", docx: "📘", xls: "📗", xlsx: "📗", csv: "📗", md: "📝", txt: "📝", json: "🧾" };

function iconFor(f: { name: string; kind: string }): string {
  if (f.kind === "image") return "🖼";
  if (f.kind === "video") return "🎬";
  return EXT_ICON[f.name.split(".").pop()?.toLowerCase() ?? ""] ?? (f.kind === "document" ? "📄" : "📦");
}

/** Detail line, e.g. "12 pages · 34,000 characters". */
function detail(f: AttachmentInfo, locale: ReturnType<typeof useLocale>, t: (key: string, params?: Record<string, string | number>) => string): string {
  const i = f.info ?? {};
  return [
    formatBytes(locale, f.size),
    f.kind === "video" && i.duration ? formatDuration(locale, i.duration) : "",
    i.pages ? t(i.pages === 1 ? "files.pages_one" : "files.pages_other", { count: i.pages }) : "",
    i.chars ? t("files.characters", { count: formatNumber(locale, i.chars) }) : "",
    i.width ? `${i.width}×${i.height}` : "",
    i.sheets ? t(i.sheets === 1 ? "files.sheets_one" : "files.sheets_other", { count: i.sheets }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Upload files and return what the server made of them (errors are reported per file). */
export async function uploadFiles(orgId: string, files: File[], agentId: string | null | undefined, onError: (msg: string) => void): Promise<AttachmentInfo[]> {
  const done: AttachmentInfo[] = [];
  for (const file of files) {
    try {
      done.push(await api.uploadAttachment(orgId, file, agentId));
    } catch (e) {
      onError(translate("files.uploadError", { name: file.name || translate("files.file"), error: (e as Error).message }));
    }
  }
  return done;
}

/** A file attached to a message (or waiting to be sent). */
export function FilePill({ file, onRemove }: { file: { id: string; name: string; kind: string; status?: string; error?: string }; onRemove?: () => void }) {
  const t = useT();
  return (
    <span
      className={cx("inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs", file.status === "failed" ? "border-bad/50 bg-bad/10 text-bad" : "border-line-2 bg-panel-2 text-ink-2")}
      title={file.error || file.name}
    >
      {file.status === "processing" ? <Spinner className="size-3" /> : <span>{iconFor(file)}</span>}
      <span className="max-w-[12rem] truncate">{file.name}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-ink-3 hover:text-ink cursor-pointer" aria-label={t("files.removeFile", { name: file.name })}>
          ✕
        </button>
      )}
    </span>
  );
}

/** Attachments under a chat message: image and video thumbnails and document links. */
export function MessageAttachments({ items }: { items: AttachmentBrief[] }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState<AttachmentBrief | null>(null);
  const images = items.filter((a) => a.kind === "image" || a.kind === "video");
  const docs = items.filter((a) => a.kind !== "image" && a.kind !== "video");
  return (
    <div className="mt-1.5 flex flex-wrap items-start gap-2">
      {images.map((a) => (
        <button key={a.id} onClick={() => setOpen(a)} className="relative overflow-hidden rounded-lg border border-line cursor-zoom-in" title={a.name}>
          <img src={a.kind === "video" ? posterUrl(a.id) : attachmentUrl(a.id)} alt={a.name} className="max-h-40 max-w-[14rem] object-cover" loading="lazy" />
          {a.kind === "video" && <span className="absolute inset-0 flex items-center justify-center text-3xl text-white drop-shadow">▶</span>}
        </button>
      ))}
      {docs.map((a) => (
        <a key={a.id} href={attachmentUrl(a.id, true)} className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-panel-2 px-2 py-1 text-xs text-ink-2 hover:text-ink" title={t("files.downloadFile", { name: a.name })}>
          <span>{iconFor(a)}</span>
          <span className="max-w-[14rem] truncate">{a.name}</span>
          <span className="text-ink-3">{formatBytes(locale, a.size)}</span>
        </a>
      ))}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setOpen(null)}>
          {open.kind === "video" ? (
            <div onClick={(e) => e.stopPropagation()}>
              <VideoView file={open} className="max-h-[85dvh] max-w-full rounded-lg" />
            </div>
          ) : (
            <img src={attachmentUrl(open.id)} alt="" className="max-h-full max-w-full rounded-lg" />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One agent's library (and files shared with the whole organization): drop files
 * here, or attach them to a chat message. Documents are read, indexed and
 * searchable by the agent; images are shown to it when its model can see.
 */
export function AgentFiles({ orgId, agentId, agentName, compact }: { orgId: string; agentId: string | null; agentName?: string; compact?: boolean }) {
  const t = useT();
  const version = useOrg((s) => s.attachmentsVersion);
  const [files, setFiles] = useState<AttachmentInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AttachmentInfo | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api
      .attachments(orgId, agentId ? { agentId, scope: "agent" } : { scope: "shared" })
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [orgId, agentId]);
  useEffect(load, [load, version]);
  // Files being processed finish on their own; check back until they do.
  useEffect(() => {
    if (!files?.some((f) => f.status === "processing")) return;
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [files, load]);

  const add = async (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    await uploadFiles(orgId, picked, agentId, (m) => setError((e) => (e ? `${e}\n${m}` : m)));
    setBusy(false);
    load();
  };

  return (
    <div
      className="space-y-2"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void add(e.dataTransfer.files);
      }}
    >
      <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed px-3 text-sm transition-colors", compact ? "py-2" : "py-4", drag ? "border-accent bg-accent/10" : "border-line-2")}>
        <span className="min-w-0 flex-1 basis-40 text-ink-2">
          {agentId
            ? t("files.giveAgentFiles", { name: agentName ?? t("files.thisAgent") })
            : t("files.sharedWithEveryone")}{" "}
          {t("files.dropHere")}
        </span>
        <Button size="sm" className="shrink-0" loading={busy} onClick={() => input.current?.click()}>
          {t("files.chooseFiles")}
        </Button>
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => (void add(e.target.files ?? []), (e.target.value = ""))} />
      </div>
      <ErrorNote error={error} />
      {!files ? (
        <Spinner />
      ) : files.length === 0 ? (
        <div className="text-xs text-ink-3">
          {agentId ? t("files.nothingYet") : t("files.nothingSharedYet")}
        </div>
      ) : (
        <div className="divide-y divide-line rounded-lg border border-line">
          {files.map((f) => (
            <FileRow key={f.id} f={f} onPreview={() => setPreview(f)} onDeleted={load} />
          ))}
        </div>
      )}
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function FileRow({ f, onPreview, onDeleted }: { f: AttachmentInfo; onPreview: () => void; onDeleted: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex items-start gap-3 p-2.5 text-sm">
      {(f.kind === "image" || f.kind === "video") && f.status === "ready" ? (
        <img src={f.kind === "video" ? posterUrl(f.id) : attachmentUrl(f.id)} alt="" className="size-10 shrink-0 rounded object-cover" loading="lazy" />
      ) : (
        <span className="w-10 shrink-0 pt-0.5 text-center text-xl">{iconFor(f)}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={onPreview} className="truncate font-medium hover:underline cursor-pointer" title={t("files.preview")}>
            {f.name}
          </button>
          {f.status === "processing" && <Badge tone="info">{t("files.reading")}</Badge>}
          {f.status === "failed" && <Badge tone="bad">{t("files.unreadable")}</Badge>}
          {f.kind === "other" && <Badge>{t("files.storedOnly")}</Badge>}
        </div>
        <div className="text-xs text-ink-3">{detail(f, locale, t)}</div>
        {f.error && <div className="text-xs text-bad">{f.error}</div>}
        {f.info?.note && <div className="text-xs text-warn">{f.info.note}</div>}
      </div>
      <a href={attachmentUrl(f.id, true)} className="text-xs text-ink-3 hover:text-ink" title={t("common.download")}>
        ⤓
      </a>
      {confirm ? (
        <span className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            {t("files.keep")}
          </Button>
          <Button size="sm" variant="danger" onClick={() => api.deleteAttachment(f.id).then(onDeleted)}>
            {t("common.delete")}
          </Button>
        </span>
      ) : (
        <button onClick={() => setConfirm(true)} className="text-ink-3 hover:text-bad cursor-pointer" title={t("common.delete")} aria-label={t("files.deleteFile", { name: f.name })}>
          ✕
        </button>
      )}
    </div>
  );
}

function FilePreview({ file, onClose }: { file: AttachmentInfo; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [text, setText] = useState<{ text: string; total: number } | null>(null);
  useEffect(() => {
    if (file.kind === "document" && file.status === "ready")
      void api.attachmentText(file.id).then(setText).catch(() => setText({ text: t("files.couldNotLoadText"), total: 0 }));
  }, [file, t]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-xl border border-line-2 bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="truncate font-semibold">{file.name}</span>
          <span className="text-xs text-ink-3">{detail(file, locale, t)}</span>
          <button onClick={onClose} className="ml-auto text-ink-3 hover:text-ink cursor-pointer" aria-label={t("files.close")}>
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {file.kind === "image" ? (
            <img src={attachmentUrl(file.id)} alt={file.name} className="mx-auto max-h-full max-w-full rounded" />
          ) : file.kind === "video" ? (
            file.status === "ready" ? (
              <VideoView file={file} className="mx-auto max-h-[70dvh] max-w-full rounded" />
            ) : (
              <div className="text-sm text-ink-3">{file.error || t("files.stillPreparing")}</div>
            )
          ) : file.kind === "document" ? (
            text ? (
              <>
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-2">{text.text || t("files.noReadableText")}</pre>
                {text.total > text.text.length && (
                  <div className="mt-2 text-xs text-ink-3">
                    {t("files.showingFirstChars", { shown: formatNumber(locale, text.text.length), total: formatNumber(locale, text.total) })}
                  </div>
                )}
              </>
            ) : file.status === "ready" ? (
              <Spinner />
            ) : (
              <div className="text-sm text-ink-3">{file.error || t("files.stillBeingRead")}</div>
            )
          ) : (
            <div className="text-sm text-ink-3">{t("files.kindNotReadable")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
