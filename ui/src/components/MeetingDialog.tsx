"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { api } from "@/lib/api";
import { useT } from "@/i18n";
import { useOrg } from "@/store/org";
import { AgentAvatar } from "./agent";
import { Button, cx, ErrorNote, Field, Input, Modal, Select, Textarea, Toggle } from "./ui";
import { engineHttp } from "@/lib/engine";

const STYLES = [
  { value: "discussion", label: "agents.meeting.styleDiscussion", hint: "agents.meeting.styleDiscussionHint" },
  { value: "decision", label: "agents.meeting.styleDecision", hint: "agents.meeting.styleDecisionHint" },
  { value: "brainstorm", label: "agents.meeting.styleBrainstorm", hint: "agents.meeting.styleBrainstormHint" },
  { value: "standup", label: "agents.meeting.styleStandup", hint: "agents.meeting.styleStandupHint" },
  { value: "review", label: "agents.meeting.styleReview", hint: "agents.meeting.styleReviewHint" },
];

export function MeetingDialog({ open, onClose, rooms }: { open: boolean; onClose: () => void; rooms: string[] }) {
  const t = useT();
  const orgId = useOrg((s) => s.orgId)!;
  const org = useOrg((s) => s.org);
  const agents = useOrg(useShallow((s) => Object.values(s.agents).filter((a) => !a.isSupervisor)));
  const defaults = { max_rounds: 3, default_rounds: 2, create_tasks: false, ...((org?.settings as unknown as { meetings?: Record<string, unknown> })?.meetings ?? {}) } as {
    max_rounds: number;
    default_rounds: number;
    create_tasks: boolean;
  };
  const [facilitator, setFacilitator] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [agenda, setAgenda] = useState("");
  const [style, setStyle] = useState("discussion");
  const [rounds, setRounds] = useState(defaults.default_rounds);
  const [detail, setDetail] = useState("brief");
  const [createTasks, setCreateTasks] = useState(defaults.create_tasks);
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch(`${engineHttp()}/api/v1/orgs/${orgId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilitatorId: facilitator, participants: people.filter((p) => p !== facilitator), agenda, style, rounds, detail, createTasks, room: room || null }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail ?? `HTTP ${r.status}`);
      });
      onClose();
      setAgenda("");
      setPeople([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  void api;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("agents.meeting.title")}
      footer={
        <Button variant="primary" onClick={submit} loading={busy} disabled={!facilitator || !agenda.trim() || people.filter((p) => p !== facilitator).length === 0}>
          {t("agents.meeting.start")}
        </Button>
      }
    >
      <div className="grid gap-4">
        <Field label={t("agents.meeting.agenda")}>
          <Textarea rows={3} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder={t("agents.meeting.agendaPlaceholder")} />
        </Field>
        <Field label={t("agents.meeting.facilitator")} hint={t("agents.meeting.facilitatorHint")}>
          <Select value={facilitator} onChange={(e) => setFacilitator(e.target.value)}>
            <option value="">{t("agents.meeting.choose")}</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.role}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <div className="mb-1.5 text-xs font-medium text-ink-2">{t("agents.meeting.participants")}</div>
          <div className="flex flex-wrap gap-2">
            {agents
              .filter((a) => a.id !== facilitator)
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => setPeople((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                  className={cx("flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs cursor-pointer", people.includes(a.id) ? "border-accent bg-accent/15" : "border-line-2")}
                >
                  <AgentAvatar agent={a} size={18} /> {a.name}
                </button>
              ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("agents.meeting.style")} hint={t(STYLES.find((s) => s.value === style)?.hint ?? "agents.meeting.styleDiscussionHint")}>
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.label)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("agents.meeting.rounds", { max: defaults.max_rounds })}>
            <Input type="number" min={1} max={defaults.max_rounds} value={rounds} disabled={style === "standup"} onChange={(e) => setRounds(Number(e.target.value))} />
          </Field>
          <Field label={t("agents.meeting.contributions")}>
            <Select value={detail} onChange={(e) => setDetail(e.target.value)}>
              <option value="brief">{t("agents.meeting.brief")}</option>
              <option value="detailed">{t("agents.meeting.detailed")}</option>
            </Select>
          </Field>
          <Field label={t("agents.meeting.room")}>
            <Select value={room} onChange={(e) => setRoom(e.target.value)}>
              <option value="">{t("agents.meeting.anyRoom")}</option>
              {rooms.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Toggle checked={createTasks} onChange={setCreateTasks} label={t("agents.meeting.createTasks")} />
        <ErrorNote error={error} />
      </div>
    </Modal>
  );
}
