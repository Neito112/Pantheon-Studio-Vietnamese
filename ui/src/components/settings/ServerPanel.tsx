import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { useT } from "@/i18n";
import { api } from "@/lib/api";
import type { ServerStatus } from "@/lib/types";

/** Settings → Server: Pantheon in a browser, on this computer or others on the network. */
export function ServerPanel() {
  const t = useT();
  const [st, setSt] = useState<ServerStatus | null>(null);
  const [port, setPort] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    api
      .server()
      .then((s) => (setSt(s), setPort(String(s.port))))
      .catch((e) => setError((e as Error).message));
  }, []);
  const apply = async (b: { enabled?: boolean; port?: number; newAccessCode?: boolean }) => {
    setError(null);
    try {
      const s = await api.setServer(b);
      setSt(s);
      setPort(String(s.port));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!st) return error ? <ErrorNote error={error} /> : null;
  const portChanged = port !== String(st.port);
  return (
    <Card className="space-y-4 p-5 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-semibold">{t("settings.server.title")}</span>
        {st.enabled && <Badge tone={st.running ? "ok" : "bad"}>{st.running ? t("settings.server.onPort", { port: st.port }) : t("settings.server.notRunning")}</Badge>}
        <div className="ml-auto">
          <Button variant={st.enabled ? "danger" : "primary"} onClick={() => void apply({ enabled: !st.enabled })}>
            {st.enabled ? t("settings.server.stop") : t("settings.server.start")}
          </Button>
        </div>
      </div>
      <div className="text-ink-2">{t("settings.server.desc")}</div>
      <Field label={t("settings.server.port")}>
        <div className="flex gap-2">
          <Input className="w-32" inputMode="numeric" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} />
          {portChanged && (
            <Button size="sm" onClick={() => void apply({ port: Number(port) })}>
              {t("settings.server.usePort", { port })}
            </Button>
          )}
        </div>
      </Field>
      {st.error && <div className="text-xs text-bad">{st.error}</div>}
      {st.enabled && st.running && (
        <>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">{t("settings.server.addresses")}</div>
            <ul className="space-y-0.5 font-mono text-xs">
              {st.urls.map((u) => (
                <li key={u}>
                  <a className="text-accent hover:underline" href={u} target="_blank" rel="noreferrer">
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-3">{t("settings.server.accessCode")}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-panel-2 px-2.5 py-1 font-mono">{shown ? st.accessCode : "••••-••••-••••-••••"}</span>
              <Button size="sm" variant="ghost" onClick={() => setShown(!shown)}>
                {shown ? t("settings.server.hide") : t("settings.server.show")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void apply({ newAccessCode: true })}>
                {t("settings.server.newCode")}
              </Button>
            </div>
            <div className="mt-1 text-[11px] text-ink-3">{t("settings.server.newCodeNote")}</div>
          </div>
          <div className="text-[11px] leading-relaxed text-ink-3">{t("settings.server.httpNote")}</div>
        </>
      )}
      <ErrorNote error={error} />
      <Headless />
    </Card>
  );
}

const COMMANDS: Record<string, string> = {
  windows: "pantheon-serve",
  linux: "pantheon-serve",
  mac: '"/Applications/Pantheon Studio.app/Contents/Resources/runtime/pantheon-serve"',
};

/** Pantheon as a server without this window: the command to run, for a computer that
 * stays on (it shares your data, so close the app first). */
function Headless() {
  const t = useT();
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? "windows" : /Mac OS X|Macintosh/.test(ua) ? "mac" : "linux";
  const command = COMMANDS[os];
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2 border-t border-line pt-4">
      <div className="font-medium">{t("settings.server.headlessTitle")}</div>
      <div className="text-xs text-ink-2">{t("settings.server.headlessDesc")}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md bg-panel-2 px-2.5 py-1.5 font-mono text-xs">{command}</code>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            void navigator.clipboard.writeText(command).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? t("settings.server.copied") : t("settings.server.copy")}
        </Button>
      </div>
    </div>
  );
}
