/**
 * Every view in an org is a pane the dock can hold (docs/DESIGN.md). The Console and
 * Activity panes are the Studio's own; the rest are Pantheon 1's pages,
 * which read the org from the route as before.
 */
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AgentInspector } from "@/components/AgentInspector";
import { translate, useT } from "@/i18n";
import { useOrg } from "@/store/org";
import { Icon, type IconName } from "./icons";
import { agentHue, hsl } from "./look";
import { HumanSeat } from "./HumanSeat";
import { useStudio } from "./store";
import { FlowPane } from "./FlowPane";
import { WorktreesPane } from "./WorktreesPane";

export interface PaneDef {
  id: string;
  title: string;
  icon: IconName;
  hint: string;
  render: () => ReactNode;
}

/** The pane descriptors, before their titles and hints are attached. */
interface PaneSeed {
  id: string;
  titleKey: string;
  hintKey: string;
  icon: IconName;
  render: () => ReactNode;
}

const page = (load: () => Promise<{ default: ComponentType }>) => {
  const Page = lazy(load);
  return function Wrapped() {
    const t = useT();
    return (
      <Suspense fallback={<div className="p-6 text-sm text-[var(--st-ink-3)]">{t("shell.pane.loading")}</div>}>
        <div className="studio-page h-full overflow-auto">
          <Page />
        </div>
      </Suspense>
    );
  };
};

const Office = page(() => import("../app/org/[orgId]/page"));
const Stage = page(() => import("../app/org/[orgId]/stage/page"));
const Board = page(() => import("../app/org/[orgId]/board/page"));
const Comms = page(() => import("../app/org/[orgId]/comms/page"));
const Sessions = page(() => import("../app/org/[orgId]/sessions/page"));
const Memory = page(() => import("../app/org/[orgId]/memory/page"));
const Shadow = page(() => import("../app/org/[orgId]/shadow/page"));
const Team = page(() => import("../app/org/[orgId]/team/page"));
const Files = page(() => import("../app/org/[orgId]/files/page"));
const Settings = page(() => import("../app/org/[orgId]/settings/page"));

/** The selected agent's console: its chat, live thinking, tasks and approvals. */
function ConsolePane() {
  const t = useT();
  const agentId = useStudio((s) => s.agentId);
  const select = useStudio((s) => s.select);
  const agent = useOrg((s) => (agentId ? s.agents[agentId] : undefined));
  const agents = useOrg((s) => s.agents);
  if (!agentId || !agent) {
    const list = Object.values(agents).filter((a) => !a.isSupervisor && !a.metaRole);
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-sm text-[var(--st-ink-3)]">{t("shell.pane.pickSomeone")}</div>
        <div className="flex max-w-md flex-wrap justify-center gap-2">
          {list.map((a) => (
            <button
              key={a.id}
              onClick={() => select(a.id)}
              className="rounded-full border px-3 py-1 text-[13px] transition-colors hover:bg-white/5"
              style={{ borderColor: hsl(agentHue(a), 70, 60, 0.4), color: hsl(agentHue(a), 70, 82) }}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="studio-page flex h-full flex-col overflow-hidden">
      {agent.kind === "human" && <HumanSeat agent={agent} />}
      <div className="min-h-0 flex-1">
        <AgentInspector key={agentId} agentId={agentId} onClose={() => select(null)} />
      </div>
    </div>
  );
}

function ActivityPane() {
  const select = useStudio((s) => s.select);
  return (
    <div className="studio-page h-full overflow-auto">
      <ActivityFeed onSelectAgent={select} limit={300} />
    </div>
  );
}

const PANE_SEEDS: PaneSeed[] = [
  { id: "office", titleKey: "shell.pane.office.title", hintKey: "shell.pane.office.hint", icon: "office", render: () => <Office /> },
  { id: "console", titleKey: "shell.pane.console.title", hintKey: "shell.pane.console.hint", icon: "chat", render: () => <ConsolePane /> },
  { id: "activity", titleKey: "shell.pane.activity.title", hintKey: "shell.pane.activity.hint", icon: "live", render: () => <ActivityPane /> },
  { id: "stage", titleKey: "shell.pane.stage.title", hintKey: "shell.pane.stage.hint", icon: "stage", render: () => <Stage /> },
  { id: "board", titleKey: "shell.pane.board.title", hintKey: "shell.pane.board.hint", icon: "board", render: () => <Board /> },
  { id: "comms", titleKey: "shell.pane.comms.title", hintKey: "shell.pane.comms.hint", icon: "comms", render: () => <Comms /> },
  { id: "sessions", titleKey: "shell.pane.sessions.title", hintKey: "shell.pane.sessions.hint", icon: "sessions", render: () => <Sessions /> },
  { id: "memory", titleKey: "shell.pane.memory.title", hintKey: "shell.pane.memory.hint", icon: "memory", render: () => <Memory /> },
  { id: "files", titleKey: "shell.pane.files.title", hintKey: "shell.pane.files.hint", icon: "files", render: () => <Files /> },
  { id: "flows", titleKey: "shell.pane.flows.title", hintKey: "shell.pane.flows.hint", icon: "canvas", render: () => <FlowPane /> },
  { id: "worktrees", titleKey: "shell.pane.worktrees.title", hintKey: "shell.pane.worktrees.hint", icon: "branch", render: () => <WorktreesPane /> },
  { id: "team", titleKey: "shell.pane.team.title", hintKey: "shell.pane.team.hint", icon: "team", render: () => <Team /> },
  { id: "shadow", titleKey: "shell.pane.shadow.title", hintKey: "shell.pane.shadow.hint", icon: "shadow", render: () => <Shadow /> },
  { id: "settings", titleKey: "shell.pane.settings.title", hintKey: "shell.pane.settings.hint", icon: "settings", render: () => <Settings /> },
];

/**
 * The panes, with their titles and hints resolved on access.
 *
 * `title` and `hint` are getters so that reading them always returns the string
 * for the locale in effect — the array itself is built at module load, but the
 * texts are read at render time.
 */
export const PANES: PaneDef[] = PANE_SEEDS.map((seed) => ({
  id: seed.id,
  icon: seed.icon,
  render: seed.render,
  get title() {
    return translate(seed.titleKey);
  },
  get hint() {
    return translate(seed.hintKey);
  },
}));

export const paneById = (id: string) => PANES.find((p) => p.id === id);

export function PaneIcon({ id, size = 14 }: { id: string; size?: number }) {
  const def = paneById(id);
  return def ? <Icon name={def.icon} size={size} /> : null;
}
