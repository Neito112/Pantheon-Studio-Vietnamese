import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { inDesktopApp } from "@/lib/engine";

type Found = { version: string; install: () => Promise<void> };

/** "Pantheon 2.1.0 is available · Install and restart": checked once when the desktop app
 * starts, from the GitHub release (the updater plugin checks its signature). */
export function UpdateBanner() {
  const t = useT();
  const [found, setFound] = useState<Found | null>(null);
  const [state, setState] = useState<"idle" | "installing" | "failed">("idle");
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!inDesktopApp() || import.meta.env.DEV) return;
    let alive = true;
    void (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!update || !alive) return;
        setFound({
          version: update.version,
          install: async () => {
            await update.downloadAndInstall();
            const { relaunch } = await import("@tauri-apps/plugin-process");
            await relaunch();
          },
        });
      } catch {
        /* offline, or no release yet: try again next start */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  if (!found || hidden) return null;
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-line bg-panel-2 px-4 py-1.5 text-sm">
      <span>
        {t("shell.update.available", { version: found.version })}
      </span>
      {state === "failed" && <span className="text-xs text-bad">{t("shell.update.failed")}</span>}
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setHidden(true)}>
          {t("shell.update.later")}
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={state === "installing"}
          onClick={() => {
            setState("installing");
            found.install().catch(() => setState("failed"));
          }}
        >
          {state === "installing" ? t("shell.update.installing") : t("shell.update.installAndRestart")}
        </Button>
      </div>
    </div>
  );
}
