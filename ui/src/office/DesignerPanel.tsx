"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, cx, ErrorNote, Field, Input, Select } from "@/components/ui";
import { useT } from "@/i18n";
import type { Agent } from "@/lib/types";
import { useAssetVersion } from "./assets";
import { CATALOG, CATEGORIES, type CatalogEntry, type Category } from "./catalog";
import { proceduralThumb } from "./proceduralThumb";
import { THEMES, themeIds, themeOf } from "./themes";
import { generateDesign, newId, type FloorStyle, type OfficeDesign, type RoomType, type Side, type WallKind } from "./design";
import { patchItem, patchRoom, useDesigner } from "./designerStore";

const ROOM_TYPES: RoomType[] = [
  "meeting",
  "lounge",
  "kitchen",
  "team",
  "focus",
  "reception",
  "home",
  "bedroom",
  "washroom",
  "garden",
  "custom",
];

const ROOM_HINT_KEY: Record<RoomType, string> = {
  meeting: "office.roomHint.meeting",
  lounge: "office.roomHint.idleBreak",
  kitchen: "office.roomHint.idleBreak",
  team: "office.roomHint.team",
  focus: "office.roomHint.decorative",
  reception: "office.roomHint.decorative",
  home: "office.roomHint.home",
  bedroom: "office.roomHint.decorative",
  washroom: "office.roomHint.decorative",
  garden: "office.roomHint.garden",
  custom: "office.roomHint.decorative",
};

const FLOORS: { value: FloorStyle; key: string }[] = [
  { value: "oak", key: "office.floor.oak" },
  { value: "walnut", key: "office.floor.walnut" },
  { value: "concrete", key: "office.floor.concrete" },
  { value: "polished", key: "office.floor.polished" },
  { value: "slate", key: "office.floor.slate" },
  { value: "epoxy", key: "office.floor.epoxy" },
  { value: "carpet", key: "office.floor.carpet" },
  { value: "tile", key: "office.floor.tile" },
  { value: "grass", key: "office.floor.grass" },
  { value: "asphalt", key: "office.floor.asphalt" },
];

const CATEGORY_KEYS: Record<string, string> = {
  Workstations: "office.cat.workstations",
  Meeting: "office.cat.meeting",
  Seating: "office.cat.seating",
  Tables: "office.cat.tables",
  Lounge: "office.cat.lounge",
  Kitchen: "office.cat.kitchen",
  Storage: "office.cat.storage",
  Tech: "office.cat.tech",
  Decor: "office.cat.decor",
  Walls: "office.cat.walls",
  Home: "office.cat.home",
  Nature: "office.cat.nature",
  Industrial: "office.cat.industrial",
  "Sci-fi": "office.cat.scifi",
  Outdoor: "office.cat.outdoor",
  Vehicles: "office.cat.vehicles",
  Props: "office.cat.props",
  Custom: "office.cat.custom",
};

type TFn = (key: string, params?: Record<string, string | number>) => string;

function themeLabel(id: string, t: TFn): string {
  return THEMES[id]?.label ?? t("office.themeClassic");
}

function themeDescription(id: string, t: TFn): string {
  return THEMES[id]?.description ?? t("office.themeClassicDesc");
}

function categoryLabel(c: string, t: TFn): string {
  const key = CATEGORY_KEYS[c];
  return key ? t(key) : c;
}

export function DesignerToolbar({
  agents,
  onSave,
  onCancel,
  saving,
  error,
}: {
  agents: Agent[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const t = useT();
  const draft = useDesigner((s) => s.draft)!;
  const tool = useDesigner((s) => s.tool);
  // After picking a theme: rebuild the layout in its style, or keep the furniture?
  const [offer, setOffer] = useState<string | null>(null);
  const dirty = useDesigner((s) => s.dirty);
  const canUndo = useDesigner((s) => s.history.length > 0);
  const canRedo = useDesigner((s) => s.future.length > 0);
  const { update, undo, redo, setTool } = useDesigner.getState();
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-line-2 bg-panel/95 px-3 py-2 shadow-2xl backdrop-blur">
      <span className="mr-1 text-sm font-semibold">{t("office.designer")}</span>
      <Button size="sm" variant={tool.kind === "select" ? "primary" : "secondary"} onClick={() => setTool({ kind: "select" })} title={t("office.selectTitle")}>
        ⬚ {t("common.select")}
      </Button>
      <Button size="sm" variant={tool.kind === "room" ? "primary" : "secondary"} onClick={() => setTool({ kind: "room" })} title={t("office.drawRoomTitle")}>
        {t("office.drawRoom")}
      </Button>
      <span className="mx-1 h-5 w-px bg-line-2" />
      <Button size="sm" variant="ghost" disabled={!canUndo} onClick={undo} title={t("office.undoTitle")}>
        ↶
      </Button>
      <Button size="sm" variant="ghost" disabled={!canRedo} onClick={redo} title={t("office.redoTitle")}>
        ↷
      </Button>
      <span className="mx-1 h-5 w-px bg-line-2" />
      <Select
        className="h-7 w-36 text-xs"
        title={t("office.themeTitle")}
        value={draft.theme ?? "classic"}
        onChange={(e) => {
          const picked = themeOf(e.target.value);
          update((d) => ({ ...d, theme: picked.id, floor: picked.floor }));
          setOffer(picked.id);
        }}
      >
        {themeIds().map((id) => (
          <option key={id} value={id} title={themeDescription(id, t)}>
            {themeLabel(id, t)}
          </option>
        ))}
      </Select>
      <Select className="h-7 w-28 text-xs" value={draft.floor} onChange={(e) => update((d) => ({ ...d, floor: e.target.value as FloorStyle }))}>
        {FLOORS.map((f) => (
          <option key={f.value} value={f.value}>
            {t(f.key)}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-1 text-xs text-ink-2" title={t("office.width")}>
        W
        <Input className="h-7 w-16 text-xs" type="number" min={10} max={120} value={draft.width} onChange={(e) => update((d) => ({ ...d, width: clampNum(e.target.value, 10, 120) }))} />
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-2" title={t("office.depth")}>
        D
        <Input className="h-7 w-16 text-xs" type="number" min={10} max={120} value={draft.depth} onChange={(e) => update((d) => ({ ...d, depth: clampNum(e.target.value, 10, 120) }))} />
      </label>
      <Button size="sm" variant="ghost" onClick={() => update((d) => generateDesign(agents, d.theme))} title={t("office.regenerateTitle")}>
        {t("office.regenerate")}
      </Button>
      {offer && (
        <span className="flex items-center gap-1.5 rounded-md bg-accent/15 px-2 py-1 text-xs">
          {t("office.rebuildPrompt", { theme: themeLabel(offer, t) })}
          <Button size="sm" variant="primary" onClick={() => (update(() => generateDesign(agents, offer)), setOffer(null))}>
            {t("office.rebuild")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOffer(null)}>
            {t("office.justTheLook")}
          </Button>
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <ErrorNote error={error} />
        {dirty && <Badge tone="warn">{t("office.unsaved")}</Badge>}
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("common.close")}
        </Button>
        <Button size="sm" variant="primary" onClick={onSave} loading={saving} disabled={!dirty}>
          {t("office.saveOffice")}
        </Button>
      </div>
    </div>
  );
}

export function CatalogPanel() {
  const t = useT();
  const tool = useDesigner((s) => s.tool);
  const [cat, setCat] = useState<Category>("Workstations");
  const [q, setQ] = useState("");
  const assetVersion = useAssetVersion();
  const list = useMemo(
    () => Object.values(CATALOG).filter((e) => (q ? e.label.toLowerCase().includes(q.toLowerCase()) : e.category === cat)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat, q, assetVersion],
  );
  return (
    <div className="pointer-events-auto flex h-full w-64 flex-col rounded-xl border border-line-2 bg-panel/95 shadow-2xl backdrop-blur">
      <div className="border-b border-line p-2.5">
        <Input className="h-8 text-xs" placeholder={t("office.searchFurniture")} value={q} onChange={(e) => setQ(e.target.value)} />
        {!q && (
          <div className="mt-2 flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cx("rounded px-1.5 py-0.5 text-[11px] cursor-pointer", cat === c ? "bg-accent-2 text-white" : "bg-panel-2 text-ink-2 hover:text-ink")}
              >
                {categoryLabel(c, t)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto p-2">
        {list.map((e) => (
          <button
            key={e.key}
            onClick={() => useDesigner.getState().setTool({ kind: "place", key: e.key, rot: 0 })}
            className={cx(
              "flex flex-col items-center rounded-lg border p-1.5 text-center transition-colors cursor-pointer",
              tool.kind === "place" && tool.key === e.key ? "border-accent bg-accent/15" : "border-line hover:border-line-2 hover:bg-panel-2",
            )}
            title={e.label}
          >
            <PaletteThumb entry={e} />
            <span className="mt-1 line-clamp-2 text-[10.5px] leading-tight text-ink-2">{e.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-line p-2.5 text-[10.5px] leading-relaxed text-ink-3">
        {t("office.catalogHintHold")}
        <b>Shift</b>
        {t("office.catalogHintSeveral")}
        <b>R</b>
        {t("office.catalogHintRotates")}
        <b>Del</b>
        {t("office.catalogHintRemoves")}
        <b> Ctrl+D</b>
        {t("office.catalogHintRest")}
      </div>
    </div>
  );
}

export function PropertiesPanel({ agents }: { agents: Agent[] }) {
  const t = useT();
  const draft = useDesigner((s) => s.draft)!;
  const selection = useDesigner((s) => s.selection);
  const tool = useDesigner((s) => s.tool);
  const { update } = useDesigner.getState();
  const item = selection?.type === "item" ? draft.items.find((i) => i.id === selection.id) : undefined;
  const room = selection?.type === "room" ? draft.rooms.find((r) => r.id === selection.id) : undefined;
  const assigned = new Map(draft.items.filter((i) => i.agentId).map((i) => [i.agentId!, i.id]));

  if (tool.kind === "place") {
    const e = CATALOG[tool.key];
    return (
      <Panel title={t("office.placing", { label: e?.label ?? "" })}>
        <p className="text-xs text-ink-2">{t("office.placingHint")}</p>
        <Button size="sm" className="mt-3" onClick={() => useDesigner.getState().setTool({ ...tool, rot: tool.rot + Math.PI / 2 })}>
          {t("office.rotate")}
        </Button>
      </Panel>
    );
  }
  if (item) {
    const e = CATALOG[item.kind];
    return (
      <Panel title={e?.label ?? item.kind}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <Input className="h-8" type="number" step={0.25} value={item.x} onChange={(ev) => update((d) => patchItem(d, item.id, { x: Number(ev.target.value) }))} />
          </Field>
          <Field label="Z">
            <Input className="h-8" type="number" step={0.25} value={item.z} onChange={(ev) => update((d) => patchItem(d, item.id, { z: Number(ev.target.value) }))} />
          </Field>
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button size="sm" onClick={() => update((d) => patchItem(d, item.id, { rot: item.rot - Math.PI / 2 }))}>⟲ 90°</Button>
          <Button size="sm" onClick={() => update((d) => patchItem(d, item.id, { rot: item.rot + Math.PI / 2 }))}>⟳ 90°</Button>
          <Button size="sm" onClick={() => duplicate(item.id)}>{t("office.duplicate")}</Button>
        </div>
        {e?.workstation && (
          <Field label={t("office.assignedTo")}>
            <Select
              className="mt-1 h-8"
              value={item.agentId ?? ""}
              onChange={(ev) =>
                update((d) => ({
                  ...d,
                  items: d.items.map((i) =>
                    i.id === item.id ? { ...i, agentId: ev.target.value || null } : i.agentId === ev.target.value ? { ...i, agentId: null } : i,
                  ),
                }))
              }
            >
              <option value="">{t("office.assignedAuto")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {assigned.has(a.id) && assigned.get(a.id) !== item.id ? t("office.movesHere") : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button size="sm" variant="danger" className="mt-3" onClick={() => remove()}>
          {t("common.remove")}
        </Button>
      </Panel>
    );
  }
  if (room) {
    return (
      <Panel title={t("office.room")}>
        <div className="grid gap-2.5">
          <Field label={t("common.name")}>
            <Input className="h-8" value={room.name} onChange={(e) => update((d) => patchRoom(d, room.id, { name: e.target.value }), false)} onBlur={() => useDesigner.getState().checkpoint()} />
          </Field>
          <Field label={t("office.purpose")} hint={ROOM_HINT_KEY[room.type] ? t(ROOM_HINT_KEY[room.type]) : undefined}>
            <Select className="h-8" value={room.type} onChange={(e) => update((d) => patchRoom(d, room.id, { type: e.target.value as RoomType }))}>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`office.roomType.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("office.walls")}>
              <Select className="h-8" value={room.walls} onChange={(e) => update((d) => patchRoom(d, room.id, { walls: e.target.value as WallKind }))}>
                <option value="none">{t("office.wallsNone")}</option>
                <option value="glass">{t("office.wallsGlass")}</option>
                <option value="solid">{t("office.wallsSolid")}</option>
              </Select>
            </Field>
            <Field label={t("office.door")}>
              <Select className="h-8" value={room.door} onChange={(e) => update((d) => patchRoom(d, room.id, { door: e.target.value as Side }))}>
                <option value="n">{t("office.north")}</option>
                <option value="s">{t("office.south")}</option>
                <option value="e">{t("office.east")}</option>
                <option value="w">{t("office.west")}</option>
              </Select>
            </Field>
            {(["x", "z", "w", "d"] as const).map((k) => (
              <Field key={k} label={{ x: "X", z: "Z", w: t("office.width"), d: t("office.depth") }[k]}>
                <Input className="h-8" type="number" step={0.25} value={room[k]} onChange={(e) => update((d) => patchRoom(d, room.id, { [k]: Math.max(k === "w" || k === "d" ? 2 : 0, Number(e.target.value)) }))} />
              </Field>
            ))}
          </div>
          <Button size="sm" variant="danger" onClick={() => remove()}>
            {t("office.removeRoom")}
          </Button>
        </div>
      </Panel>
    );
  }
  const stations = draft.items.filter((i) => CATALOG[i.kind]?.workstation).length;
  return (
    <Panel title={t("shell.pane.office.title")}>
      <div className="space-y-1.5 text-xs text-ink-2">
        <div>
          {t("common.itemsCount", { count: draft.items.length })} · {t("office.roomsCount", { count: draft.rooms.length })}
        </div>
        <div className={stations < agents.length ? "text-warn" : ""}>
          {t("office.workstationsCount", { count: stations })} {t("office.forAgents", { count: agents.length })}
          {stations < agents.length && t("office.extraDesks")}
        </div>
        <p className="pt-2 text-ink-3">{t("office.officeHint")}</p>
      </div>
    </Panel>
  );
}

function PaletteThumb({ entry }: { entry: CatalogEntry }) {
  const src = entry.thumb || (entry.procedural ? proceduralThumb(entry.key, entry.procedural) : null);
  return src ? (
    <img src={src} alt="" className="h-14 w-14 object-contain" loading="lazy" />
  ) : (
    <span className="flex h-14 w-14 items-center justify-center rounded bg-black/5 text-2xl">{entry.procedural ? "◆" : "▣"}</span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto w-72 rounded-xl border border-line-2 bg-panel/95 p-3.5 shadow-2xl backdrop-blur">
      <div className="mb-2.5 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function clampNum(v: string, lo: number, hi: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
}

function duplicate(id: string) {
  const st = useDesigner.getState();
  const it = st.draft?.items.find((i) => i.id === id);
  if (!it) return;
  const copy = { ...it, id: newId("it"), x: it.x + 0.5, z: it.z + 0.5, agentId: null };
  st.update((d) => ({ ...d, items: [...d.items, copy] }));
  st.select({ type: "item", id: copy.id });
}

function remove() {
  const st = useDesigner.getState();
  const sel = st.selection;
  if (!sel) return;
  st.update((d) =>
    sel.type === "item" ? { ...d, items: d.items.filter((i) => i.id !== sel.id) } : { ...d, rooms: d.rooms.filter((r) => r.id !== sel.id) },
  );
  st.select(null);
}

/** Keyboard shortcuts while the designer is open. */
export function useDesignerKeys(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const st = useDesigner.getState();
      const sel = st.selection;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      } else if (ctrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
      } else if (ctrl && e.key.toLowerCase() === "d" && sel?.type === "item") {
        e.preventDefault();
        duplicate(sel.id);
      } else if (e.key === "Escape") {
        st.setTool({ kind: "select" });
        st.select(null);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        remove();
      } else if (e.key.toLowerCase() === "r") {
        const step = e.shiftKey ? Math.PI / 12 : Math.PI / 2;
        if (st.tool.kind === "place") st.setTool({ ...st.tool, rot: st.tool.rot + step });
        else if (sel?.type === "item") {
          const it = st.draft?.items.find((i) => i.id === sel.id);
          if (it) st.update((d) => patchItem(d, sel.id, { rot: it.rot + step }));
        }
      } else if (e.key.startsWith("Arrow") && sel) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -0.25 : e.key === "ArrowRight" ? 0.25 : 0;
        const dz = e.key === "ArrowUp" ? -0.25 : e.key === "ArrowDown" ? 0.25 : 0;
        st.update((d) => {
          if (sel.type === "item") {
            const it = d.items.find((i) => i.id === sel.id);
            return it ? patchItem(d, sel.id, { x: it.x + dx, z: it.z + dz }) : d;
          }
          const r = d.rooms.find((x) => x.id === sel.id);
          return r ? patchRoom(d, sel.id, { x: r.x + dx, z: r.z + dz }) : d;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}

export type { OfficeDesign };
