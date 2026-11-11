"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import type { Org } from "@/lib/types";
import { notifyOrgsChanged } from "./AppShell";
import { Button, ErrorNote, Input, Modal } from "./ui";

/** Confirm-by-typing-the-name dialog for deleting an organization. */
export function DeleteOrgDialog({ org, open, onClose, onDeleted }: { org: Pick<Org, "id" | "name" | "agentCount" | "openTasks">; open: boolean; onClose: () => void; onDeleted?: () => void }) {
  const t = useT();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setTyped("");
    setError(null);
    onClose();
  };
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteOrg(org.id);
      notifyOrgsChanged();
      close();
      onDeleted?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const agents =
    typeof org.agentCount === "number"
      ? org.agentCount === 1
        ? t("org.deleteWithAgents", { count: org.agentCount })
        : t("org.deleteWithAgentsPlural", { count: org.agentCount })
      : "";
  const tasks =
    typeof org.openTasks === "number" && org.openTasks
      ? org.openTasks === 1
        ? t("org.deleteWithTasks", { count: org.openTasks })
        : t("org.deleteWithTasksPlural", { count: org.openTasks })
      : "";
  return (
    <Modal
      open={open}
      onClose={close}
      title={t("org.deleteTitle", { name: org.name })}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" loading={busy} disabled={typed.trim() !== org.name} onClick={remove}>
            {t("org.deleteConfirmButton")}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-ink-2">{t("org.deleteWarning", { agents, tasks })}</p>
        <div>
          <div className="mb-1.5 text-xs text-ink-3">
            {t("org.typeToConfirmLead")} <b className="text-ink">{org.name}</b> {t("org.typeToConfirmTail")}
          </div>
          <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && typed.trim() === org.name && void remove()} />
        </div>
        <ErrorNote error={error} />
      </div>
    </Modal>
  );
}
