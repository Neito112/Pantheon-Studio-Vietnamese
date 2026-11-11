"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Input, Toggle, cx } from "@/components/ui";
import { useT, translate } from "@/i18n";
import { api } from "@/lib/api";
import { inDesktopApp } from "@/lib/engine";
import { pickFolder } from "@/lib/folders";
import type { ComputerStatus, HostStatus, SandboxStatus } from "@/lib/types";

function usePolled<T>(load: () => Promise<T>, ms: number): [T | null, (v: T) => void] {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const run = () =>
      load()
        .then((v) => alive && setValue(v))
        .catch(() => {});
    void run();
    const t = setInterval(run, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [load, ms]);
  return [value, setValue];
}

/** This computer's status (the source Kronos may change, its folders), refreshed now and then. */
export function useHostStatus(): HostStatus | null {
  return usePolled(api.hostStatus, 10000)[0];
}

/** The folders Kronos may use: add one (with the system's folder picker) or take one away. */
export function HostFolders({ allowed, compact = false }: { allowed: string[]; compact?: boolean }) {
  const t = useT();
  const [changed, setChanged] = useState<string[] | null>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const list = changed ?? allowed;
  const apply = async (p: Promise<HostStatus>) => {
    setError(null);
    try {
      setChanged((await p).info?.allowed ?? []);
      setTyped("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const add = async () => {
    const dir = await pickFolder(t("shell.host.folderPickerTitle"));
    if (dir) await apply(api.hostAddFolder(dir));
  };
  return (
    <div className="space-y-2">
      {list.length ? (
        <ul className="space-y-1 text-xs text-ink-2">
          {list.map((a) => (
            <li key={a} className="flex items-start gap-2">
              <span className="min-w-0 flex-1 break-all font-mono">{a}</span>
              <button className="shrink-0 cursor-pointer text-ink-3 hover:text-bad" onClick={() => void apply(api.hostRemoveFolder(a))}>
                {t("shell.host.removeFolder")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-ink-3">{t("shell.host.foldersEmpty")}</div>
      )}
      {inDesktopApp() ? (
        <Button size="sm" onClick={() => void add()}>
          {t("shell.host.addFolder")}
        </Button>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) void apply(api.hostAddFolder(typed.trim()));
          }}
        >
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("shell.host.folderPathPlaceholder")} className="text-xs" />
          <Button size="sm" type="submit" disabled={!typed.trim()}>
            {t("common.add")}
          </Button>
        </form>
      )}
      {!compact && <div className="text-[11px] leading-relaxed text-ink-3">{t("shell.host.folderScopeNote")}</div>}
      {error && <div className="text-xs text-bad">{error}</div>}
    </div>
  );
}

/** Settings → This computer: which computer agents use, and the folders Kronos may use. */
export function HostStatusCard() {
  const t = useT();
  const [computer, setComputer] = usePolled(api.computer, 4000);
  const status = useHostStatus();
  const [error, setError] = useState<string | null>(null);
  const choose = async (backend: string) => {
    setError(null);
    try {
      setComputer(await api.setComputer(backend));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const options = computer ? [{ id: "off", label: t("shell.host.computerOff"), description: t("shell.host.computerOffDesc") }, ...computer.backends] : [];
  return (
    <div className="space-y-5">
      <StartAtLogin />
      <Card className="space-y-4 p-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{t("shell.host.computerUseTitle")}</span>
          {computer?.paused && <Badge tone="warn">{t("shell.host.pausedBadge", { reason: computer.paused })}</Badge>}
        </div>
        <div className="text-ink-2">{t("shell.host.computerUseDesc")}</div>
        <div className="grid gap-2">
          {options.map((b) => (
            <label
              key={b.id}
              className={cx(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5",
                computer?.backend === b.id ? "border-accent bg-accent/10" : "border-line hover:bg-panel-2",
              )}
            >
              <input type="radio" name="computer" className="mt-1" checked={computer?.backend === b.id} onChange={() => void choose(b.id)} />
              <span>
                <span className="font-medium text-ink">{b.label}</span>
                <span className="block text-xs text-ink-2">{b.description}</span>
              </span>
            </label>
          ))}
        </div>
        {computer && computer.backend !== "off" && (
          <div className="flex items-center gap-3">
            {computer.paused ? (
              <Button size="sm" onClick={() => void api.computerResume().then(setComputer)}>
                {t("shell.host.letAgentsUseAgain")}
              </Button>
            ) : (
              <Button size="sm" variant="danger" onClick={() => void api.computerStop().then(setComputer)}>
                {t("shell.host.stopNow")}
              </Button>
            )}
            <span className="text-xs text-ink-3">{computer.inUseBy ? t("shell.host.inUseBy", { name: computer.inUseBy }) : t("shell.host.nobodyUsing")}</span>
          </div>
        )}
        {computer?.backend === "driver" && /Mac OS X|Macintosh/.test(navigator.userAgent) && <MacPermissions />}
        {computer?.backend === "cua" && <SandboxSetup />}
        {error && <div className="text-xs text-bad">{error}</div>}
      </Card>

      <WebBrowsing showSandbox={computer?.backend !== "cua"} />

      <Card className="space-y-3 p-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{t("shell.host.foldersTitle")}</span>
          {status?.info?.host && <Badge>{status.info.host}</Badge>}
        </div>
        <div className="text-ink-2">
          {t("shell.host.kronosEngineerDesc", {
            inRepo: status?.info?.repo
              ? t("shell.host.kronosEngineerInRepo", { repo: status.info.repo })
              : t("shell.host.kronosEngineerFromSource"),
          })}
        </div>
        {status?.info && <HostFolders allowed={status.info.allowed ?? []} />}
      </Card>
    </div>
  );
}

const WHERE: { id: "auto" | "builtin" | "sandbox"; label: string; description: string }[] = [
  {
    id: "auto",
    get label() {
      return translate("shell.host.browseAuto");
    },
    get description() {
      return translate("shell.host.browseAutoDesc");
    },
  },
  {
    id: "builtin",
    get label() {
      return translate("shell.host.browseBuiltin");
    },
    get description() {
      return translate("shell.host.browseBuiltinDesc");
    },
  },
  {
    id: "sandbox",
    get label() {
      return translate("shell.host.browseSandbox");
    },
    get description() {
      return translate("shell.host.browseSandboxDesc");
    },
  },
];

/** Settings → This computer: where agents browse the web (app/browser/sandboxed.py). */
function WebBrowsing({ showSandbox }: { showSandbox: boolean }) {
  const t = useT();
  const [st, setSt] = useState<{ where: string; sandbox: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.browserWhere().then(setSt).catch(() => {});
  }, []);
  const choose = async (where: string) => {
    setError(null);
    try {
      setSt(await api.setBrowserWhere(where));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!st) return null;
  return (
    <Card className="space-y-4 p-5 text-sm">
      <div className="font-semibold">{t("shell.host.browsingTitle")}</div>
      <div className="text-ink-2">{t("shell.host.browsingDesc")}</div>
      <div className="grid gap-2">
        {WHERE.map((w) => (
          <label
            key={w.id}
            className={cx("flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5", st.where === w.id ? "border-accent bg-accent/10" : "border-line hover:bg-panel-2")}
          >
            <input type="radio" name="browser-where" className="mt-1" checked={st.where === w.id} onChange={() => void choose(w.id)} />
            <span>
              <span className="font-medium text-ink">{w.label}</span>
              <span className="block text-xs text-ink-2">{w.description}</span>
            </span>
          </label>
        ))}
      </div>
      {st.where !== "builtin" && !st.sandbox && (
        <div className="text-xs text-warn">{t("shell.host.sandboxNotReady", { suffix: st.where === "auto" ? t("shell.host.sandboxNotReadyAuto") : "" })}</div>
      )}
      {st.where !== "builtin" && showSandbox && <SandboxSetup />}
      {error && <div className="text-xs text-bad">{error}</div>}
    </Card>
  );
}

/** The sandbox desktop: Docker → download → create → run, one step at a time. */
export function SandboxSetup() {
  const t = useT();
  const [st, setSt] = useState<SandboxStatus | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await api.sandbox();
        if (!alive) return;
        setSt(s);
        timer = setTimeout(tick, s.setup.running || s.docker !== "running" || !s.healthy ? 2000 : 10000);
      } catch {
        timer = setTimeout(tick, 4000);
      }
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setNote(null);
    try {
      const r = await fn();
      if (r && typeof r === "object" && "docker" in r) setSt(r as SandboxStatus);
      if (r && typeof r === "object" && "message" in r) setNote(String((r as { message: string }).message));
    } catch (e) {
      setNote((e as Error).message);
    }
  };
  if (!st) return <div className="text-xs text-ink-3">{t("shell.host.checkingDocker")}</div>;
  const box = "space-y-2 rounded-lg border border-line p-3 text-xs text-ink-2";
  let body;
  if (st.docker === "missing") {
    body = (
      <>
        <div>{t("shell.host.dockerMissing")}</div>
        <a className="text-accent hover:underline" href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noreferrer">
          {t("shell.host.getDockerDesktop")}
        </a>
        <span className="text-ink-3">{t("shell.host.dockerDesktopNote")}</span>
      </>
    );
  } else if (st.docker === "stopped") {
    body = (
      <>
        <div>{t("shell.host.dockerStopped")}</div>
        <Button size="sm" onClick={() => void act(api.dockerStart)}>
          {t("shell.host.startDocker")}
        </Button>
      </>
    );
  } else if (st.setup.running) {
    body = (
      <>
        <div>{st.setup.step}…</div>
        <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(st.setup.progress * 100)}%` }} />
        </div>
      </>
    );
  } else if (st.container === "none") {
    body = (
      <>
        <div>
          {t("shell.host.sandboxSetupDesc", {
            size: st.image ? t("shell.host.sandboxAlreadyDownloaded") : t("shell.host.sandboxDownloadSize"),
          })}
        </div>
        <Button size="sm" variant="primary" onClick={() => void act(api.sandboxSetup)}>
          {t("shell.host.setUpSandbox")}
        </Button>
      </>
    );
  } else {
    body = (
      <>
        <div className="flex items-center gap-2">
          <Badge tone={st.healthy ? "ok" : "warn"}>
            {st.healthy ? t("shell.host.sandboxRunning") : st.container === "running" ? t("shell.host.sandboxStarting") : t("shell.host.sandboxStopped")}
          </Badge>
          <span className="text-ink-3">{t("shell.host.sandboxAutoStarts")}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {st.container === "running" ? (
            <Button size="sm" variant="ghost" onClick={() => void act(api.sandboxStop)}>
              {t("shell.host.stopSandbox")}
            </Button>
          ) : (
            <Button size="sm" onClick={() => void act(api.sandboxStart)}>
              {t("shell.host.startSandbox")}
            </Button>
          )}
          {st.view && st.healthy && (
            <a className="inline-flex items-center rounded-md border border-line px-2.5 py-1 text-xs hover:bg-panel-2" href={api.sandboxDesktopUrl()} target="_blank" rel="noreferrer">
              {t("shell.host.openDesktop")}
            </a>
          )}
        </div>
        {st.view && <div className="text-ink-3">{t("shell.host.desktopOnStage")}</div>}
      </>
    );
  }
  return (
    <div className={box}>
      <div className="font-medium text-ink">{t("shell.host.sandboxTitle")}</div>
      {body}
      {st.setup.error && <div className="text-bad">{st.setup.error}</div>}
      {note && <div>{note}</div>}
    </div>
  );
}

/** macOS asks once for Accessibility and Screen Recording, for cua-driver. */
function MacPermissions() {
  const t = useT();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="space-y-1 rounded-md border border-line p-3 text-xs text-ink-2">
      <div>{t("shell.host.macPermissions")}</div>
      <Button size="sm" onClick={() => void api.computerPermissions().then((r) => setNote(r.ok ? t("shell.host.permissionsDone") : r.message))}>
        {t("shell.host.grantPermissions")}
      </Button>
      {note && <div className="whitespace-pre-wrap">{note}</div>}
    </div>
  );
}

/** Start Pantheon when the user signs in to the computer (the desktop app only). */
function StartAtLogin() {
  const t = useT();
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!inDesktopApp()) return;
    void import("@tauri-apps/plugin-autostart")
      .then((m) => m.isEnabled())
      .then(setOn)
      .catch(() => setOn(null));
  }, []);
  if (on === null) return null;
  const change = async (value: boolean) => {
    const m = await import("@tauri-apps/plugin-autostart");
    await (value ? m.enable() : m.disable());
    setOn(await m.isEnabled());
  };
  return (
    <Card className="flex items-center gap-3 p-5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{t("shell.host.startAtLoginTitle")}</div>
        <div className="text-xs text-ink-2">{t("shell.host.startAtLoginDesc")}</div>
      </div>
      <Toggle checked={on} onChange={(v) => void change(v)} />
    </Card>
  );
}

/** "Ada is using your computer · Stop", across the app, while an agent drives this computer. */
export function ComputerBanner() {
  const t = useT();
  const [computer, setComputer] = usePolled<ComputerStatus>(api.computer, 3000);
  if (!computer || !["native", "driver"].includes(computer.backend) || !computer.active || computer.paused) return null;
  const takesOver = computer.backend === "native";
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-accent/40 bg-accent/15 px-4 py-1.5 text-sm">
      <span className="size-2 animate-pulse rounded-full bg-accent" />
      <span>
        <span className="font-medium">{computer.active.agent}</span> {takesOver ? t("shell.host.bannerIsUsing") : t("shell.host.bannerWorkingInApps")}
      </span>
      {takesOver && <span className="hidden text-xs text-ink-3 sm:inline">{t("shell.host.bannerTakeBack")}</span>}
      <Button size="sm" variant="danger" className="ml-auto" onClick={() => void api.computerStop().then(setComputer)}>
        {t("common.stop")}
      </Button>
    </div>
  );
}
