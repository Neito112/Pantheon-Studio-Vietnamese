"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Badge, Button, cx } from "@/components/ui";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import type { NotebookCell, NotebookData, NotebookOutput } from "@/lib/types";
import { useOrg } from "@/store/org";

/** A Python notebook shared with agents; code runs in the sandbox desktop. */
export default function NotebookView({ docId, onView }: { docId: string; onView?: (text: string) => void }) {
  const t = useT();
  const [cells, setCells] = useState<NotebookCell[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const drafts = useRef<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const ev = useOrg((s) => s.docs[docId]);
  const seen = useRef(0);

  useEffect(() => {
    api
      .stageDoc(docId)
      .then((d) => {
        setCells((d.data as NotebookData).cells);
        seen.current = d.version;
      })
      .catch((e) => setError((e as Error).message));
  }, [docId]);

  // Changes from agents (and runs finishing) arrive live; the cell being typed in keeps its draft.
  useEffect(() => {
    if (!ev?.data || ev.version <= seen.current) return;
    seen.current = ev.version;
    setCells((ev.data as NotebookData).cells);
  }, [ev]);

  useEffect(() => {
    if (!cells || !focus) return;
    const i = cells.findIndex((c) => c.id === focus);
    if (i >= 0) onView?.(t("stage.nb.workingInCell", { cell: i + 1, total: cells.length }));
  }, [focus, cells, onView, t]);

  const act = (p: Promise<unknown>) => p.catch((e) => setError((e as Error).message));
  const flush = async (id: string) => {
    clearTimeout(timers.current[id]);
    const text = drafts.current[id];
    if (text === undefined) return;
    delete drafts.current[id];
    await act(api.editNotebookCell(docId, id, { source: text }));
  };
  const type = (id: string, text: string) => {
    drafts.current[id] = text;
    setCells((cs) => cs?.map((c) => (c.id === id ? { ...c, source: text } : c)) ?? cs);
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => void flush(id), 800);
  };
  const run = async (id: string) => {
    await flush(id);
    setCells((cs) => cs?.map((c) => (c.id === id && c.type === "code" ? { ...c, status: "running" } : c)) ?? cs);
    await act(api.runNotebookCell(docId, id));
  };
  const runAll = async () => {
    await Promise.all(Object.keys(drafts.current).map(flush));
    await act(api.runNotebook(docId));
  };

  if (error && !cells) return <div className="p-6 text-sm text-bad">{error}</div>;
  if (!cells) return <div className="p-6 text-sm text-ink-3">{t("stage.nb.loading")}</div>;
  const running = cells.some((c) => c.status === "running");
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-panel px-3 py-1.5">
        <Button size="sm" variant="primary" onClick={() => void runAll()} disabled={running}>
          {t("stage.nb.runAll")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void act(api.notebookKernel(docId, "interrupt"))} disabled={!running} title={t("stage.nb.stopCell")}>
          {t("common.stop")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void act(api.notebookKernel(docId, "restart"))} title={t("stage.nb.forgetVariables")}>
          {t("stage.nb.restart")}
        </Button>
        <span className="mx-1 h-5 w-px bg-line-2" />
        <Button size="sm" variant="ghost" onClick={() => void act(api.addNotebookCell(docId, { type: "code" }))}>
          {t("stage.nb.addCode")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void act(api.addNotebookCell(docId, { type: "markdown" }))}>
          {t("stage.nb.addText")}
        </Button>
        <span className="ml-auto text-xs text-ink-3">{t("stage.nb.sandboxNote")}</span>
        <a href={api.stageDocExportUrl(docId)} className="text-xs text-ink-2 hover:text-ink" download>
          .ipynb ↓
        </a>
      </div>
      {error && <div className="border-b border-line bg-bad/10 px-3 py-1.5 text-xs text-bad">{error}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 md:px-6">
        {cells.map((c, i) => (
          <Cell
            key={c.id}
            cell={c}
            index={i}
            last={i === cells.length - 1}
            focused={focus === c.id}
            onFocus={() => setFocus(c.id)}
            onBlur={() => void flush(c.id)}
            onType={(t) => type(c.id, t)}
            onRun={() => void run(c.id)}
            onAddBelow={(kind) => void act(api.addNotebookCell(docId, { type: kind, after: c.id }))}
            onMove={(to) => void flush(c.id).then(() => act(api.editNotebookCell(docId, c.id, { to })))}
            onToggle={() => void act(api.editNotebookCell(docId, c.id, { type: c.type === "code" ? "markdown" : "code" }))}
            onDelete={() => void act(api.deleteNotebookCell(docId, c.id))}
          />
        ))}
      </div>
    </div>
  );
}

function Cell(props: {
  cell: NotebookCell;
  index: number;
  last: boolean;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onType: (text: string) => void;
  onRun: () => void;
  onAddBelow: (kind: "code" | "markdown") => void;
  onMove: (to: number) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { cell, index } = props;
  const t = useT();
  const [editing, setEditing] = useState(cell.type === "code" || !cell.source);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = area.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [cell.source, editing]);
  useEffect(() => {
    if (cell.type === "code") setEditing(true);
  }, [cell.type]);

  const gutter = cell.type === "markdown" ? "" : cell.status === "running" ? "[*]" : `[${cell.count ?? " "}]`;
  return (
    <div className={cx("group mb-3 flex gap-2 rounded-lg border p-2", props.focused ? "border-accent/60" : "border-transparent hover:border-line")}>
      <div className="w-10 shrink-0 pt-1.5 text-right font-mono text-[11px] text-ink-3">{gutter}</div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            ref={area}
            value={cell.source}
            spellCheck={false}
            rows={1}
            placeholder={cell.type === "code" ? t("stage.nb.codePlaceholder") : t("stage.nb.textPlaceholder")}
            onFocus={props.onFocus}
            onBlur={() => {
              props.onBlur();
              if (cell.type === "markdown" && cell.source.trim()) setEditing(false);
            }}
            onChange={(e) => props.onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                if (cell.type === "markdown") setEditing(false);
                props.onRun();
              }
              if (e.key === "Tab") {
                e.preventDefault();
                const el = e.currentTarget;
                const { selectionStart: s, selectionEnd: t } = el;
                props.onType(`${cell.source.slice(0, s)}    ${cell.source.slice(t)}`);
                requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
              }
            }}
            className={cx(
              "block w-full resize-none overflow-hidden rounded-md border border-line px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-accent/60",
              cell.type === "code" ? "bg-panel-2 font-mono" : "bg-panel",
            )}
          />
        ) : (
          <div className="cursor-text rounded-md px-3 py-1 text-sm" onDoubleClick={() => setEditing(true)} title={t("stage.nb.doubleClickEdit")}>
            <Markdown>{cell.source}</Markdown>
          </div>
        )}
        {cell.outputs.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {cell.outputs.map((o, i) => (
              <Output key={i} o={o} />
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">
          {cell.type === "code" && (
            <button className="hover:text-ink cursor-pointer" onClick={props.onRun}>
              {t("stage.nb.run")}
            </button>
          )}
          <button className="hover:text-ink cursor-pointer" onClick={() => props.onAddBelow("code")}>
            {t("stage.nb.addCodeBelow")}
          </button>
          <button className="hover:text-ink cursor-pointer" onClick={() => props.onAddBelow("markdown")}>
            {t("stage.nb.addTextBelow")}
          </button>
          <button className="hover:text-ink cursor-pointer" disabled={index === 0} onClick={() => props.onMove(index)}>
            ↑
          </button>
          <button className="hover:text-ink cursor-pointer" disabled={props.last} onClick={() => props.onMove(index + 2)}>
            ↓
          </button>
          <button className="hover:text-ink cursor-pointer" onClick={props.onToggle}>
            {cell.type === "code" ? t("stage.nb.toText") : t("stage.nb.toCode")}
          </button>
          <button className="hover:text-bad cursor-pointer" onClick={props.onDelete}>
            {t("stage.nb.delete")}
          </button>
          {cell.by && cell.by !== "user" && <Badge className="ml-auto">{cell.by}</Badge>}
        </div>
      </div>
    </div>
  );
}

function Output({ o }: { o: NotebookOutput }) {
  const t = useT();
  if (o.type === "image") {
    return <img src={`data:image/png;base64,${o.data}`} alt={t("stage.nb.chartAlt")} className="max-w-full rounded bg-white" />;
  }
  if (o.type === "error") {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-bad/10 px-3 py-2 font-mono text-[12px] text-bad">
        {o.traceback || `${o.ename}: ${o.evalue}`}
      </pre>
    );
  }
  if (o.type === "result" && o.html) return <HtmlOutput html={o.html} />;
  return (
    <pre
      className={cx(
        "overflow-x-auto whitespace-pre-wrap px-3 py-1 font-mono text-[12px]",
        o.type === "stream" && o.name === "stderr" ? "text-warn" : "text-ink-2",
      )}
    >
      {o.text}
    </pre>
  );
}

/** HTML output (e.g. a DataFrame) in a frame where no script can run. */
function HtmlOutput({ html }: { html: string }) {
  const t = useT();
  const [height, setHeight] = useState(60);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><style>
    html,body{margin:0;font:12px ui-monospace,monospace;color:#d6dae3;background:#11141b}
    table{border-collapse:collapse}th,td{border:1px solid #2c3240;padding:3px 8px;text-align:right}
    th{background:#1b1f27}tr:nth-child(even) td{background:#151921}
  </style></head><body>${html}</body></html>`;
  return (
    <iframe
      title={t("stage.nb.outputTitle")}
      sandbox="allow-same-origin"
      srcDoc={doc}
      className="w-full rounded border-0"
      style={{ height }}
      onLoad={(e) => {
        const b = e.currentTarget.contentDocument?.body;
        if (b) setHeight(Math.min(b.scrollHeight + 4, 600));
      }}
    />
  );
}
