"use client";

import { useCallback, useEffect, useState } from "react";
import { HostStatusCard } from "@/components/HostStatus";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccountsPanel } from "@/components/settings/AccountsPanel";
import { McpServersPanel } from "@/components/settings/McpServersPanel";
import { ServerPanel } from "@/components/settings/ServerPanel";
import { Badge, Button, Card, ErrorNote, Field, Input, Modal, Select, Tabs, Toggle } from "@/components/ui";
import { formatNumber, useLocale, useT } from "@/i18n";
import { api, type VoiceConfig } from "@/lib/api";
import type { Provider, ProviderModel } from "@/lib/types";
import { browserSttSupported, browserTtsSupported, listen, speak, voiceStatus, type Listener } from "@/lib/voice";

export default function SettingsPage() {
  const t = useT();
  const [tab, setTab] = useState<"providers" | "accounts" | "agents" | "mcp" | "voice" | "computer" | "server">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "accounts" ? "accounts" : "providers",
  );
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
          <LanguageSwitcher />
        </div>
        <Tabs
          className="no-scrollbar mt-4 w-fit max-w-full overflow-x-auto"
          value={tab}
          onChange={setTab}
          items={[
            { value: "providers", label: t("settings.tab.providers") },
            { value: "accounts", label: t("settings.tab.accounts") },
            { value: "agents", label: t("settings.tab.agents") },
            { value: "mcp", label: t("settings.tab.mcp") },
            { value: "voice", label: t("settings.tab.voice") },
            { value: "computer", label: t("settings.tab.computer") },
            { value: "server", label: t("settings.tab.server") },
          ]}
        />
        <div className="mt-6">
          {tab === "providers" && <Providers />}
          {tab === "accounts" && <AccountsPanel />}
          {tab === "agents" && <Concurrency />}
          {tab === "mcp" && (
            <Card className="p-5">
              <div className="mb-4 text-sm text-ink-2">{t("settings.mcpGlobalNote")}</div>
              <McpServersPanel />
            </Card>
          )}
          {tab === "voice" && <Voice />}
          {tab === "computer" && <HostStatusCard />}
          {tab === "server" && <ServerPanel />}
        </div>
      </div>
    </div>
  );
}

/** How many agents may work at once, across every organization. */
function Concurrency() {
  const t = useT();
  const locale = useLocale();
  const [limits, setLimits] = useState<Awaited<ReturnType<typeof api.runtimeLimits>> | null>(null);
  const [value, setValue] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .runtimeLimits()
        .then((l) => {
          if (!alive) return;
          setLimits((prev) => {
            if (!prev) setValue(l.maxConcurrent);
            return l;
          });
        })
        .catch(() => {});
    void load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const save = async () => {
    setError(null);
    setSaved(false);
    try {
      setLimits(await api.setRuntimeLimits(value));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Card className="space-y-4 p-5 text-sm">
      <div>
        <div className="font-semibold">{t("settings.concurrency.title")}</div>
        <div className="mt-1 text-ink-2">{t("settings.concurrency.desc")}</div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("settings.concurrency.atMost")}>
          <Input type="number" className="w-28" min={1} max={limits?.max ?? 64} value={value} onChange={(e) => setValue(Math.max(1, Math.round(Number(e.target.value) || 1)))} />
        </Field>
        <Button variant="primary" onClick={() => void save()} disabled={!limits || value === limits.maxConcurrent}>
          {t("common.save")}
        </Button>
        {saved && <Badge tone="ok">{t("settings.concurrency.saved")}</Badge>}
      </div>
      {limits && (
        <div className="text-xs text-ink-3">
          {t("settings.concurrency.rightNow", {
            running: formatNumber(locale, limits.running),
            waiting: formatNumber(locale, limits.waiting),
            limit: formatNumber(locale, limits.maxConcurrent),
          })}
        </div>
      )}
      <ErrorNote error={error} />
    </Card>
  );
}

const PRESETS: { label: string; type: Provider["type"]; name: string; baseUrl?: string; model?: string }[] = [
  { label: "OpenAI", type: "openai", name: "OpenAI", model: "gpt-5.1" },
  { label: "OpenRouter", type: "openrouter", name: "OpenRouter" },
  { label: "Local vLLM / llama.cpp / LM Studio", type: "openai_compatible", name: "Local model", baseUrl: "http://host.docker.internal:8000/v1" },
  { label: "Ollama", type: "ollama", name: "Ollama", baseUrl: "http://host.docker.internal:11434/v1" },
  { label: "Anthropic", type: "anthropic", name: "Anthropic" },
];

function Providers() {
  const t = useT();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | "new" | null>(null);
  const [tests, setTests] = useState<Record<string, { busy?: boolean; text?: string; ok?: boolean }>>({});
  const load = useCallback(() => api.providers().then(setProviders).catch(() => {}), []);
  useEffect(() => {
    void load();
  }, [load]);

  const test = async (p: Provider) => {
    setTests((prev) => ({ ...prev, [p.id]: { busy: true } }));
    const r = await api.testProvider(p.id).catch((e) => ({ ok: false, error: e.message }) as Awaited<ReturnType<typeof api.testProvider>>);
    setTests((prev) => ({
      ...prev,
      [p.id]: {
        ok: r.ok,
        text: r.ok
          ? r.models
            ? t("settings.provider.testOkModels", { model: r.model ?? "", reply: r.reply ?? "", count: r.models.length })
            : t("settings.provider.testOk", { model: r.model ?? "", reply: r.reply ?? "" })
          : t("settings.provider.testFailed", { error: r.error ?? r.modelsError ?? "" }),
      },
    }));
  };

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{p.name}</span>
            <Badge>{p.type}</Badge>
            {p.isDefault && <Badge tone="accent">{t("settings.provider.defaultBadge")}</Badge>}
            <div className="ml-auto flex gap-1.5">
              <Button size="sm" onClick={() => test(p)} loading={tests[p.id]?.busy}>
                {t("settings.provider.test")}
              </Button>
              {!p.isDefault && (
                <Button size="sm" variant="ghost" onClick={() => api.updateProvider(p.id, { isDefault: true }).then(load)}>
                  {t("settings.provider.makeDefault")}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                {t("common.edit")}
              </Button>
            </div>
          </div>
          <div className="mt-1.5 text-xs text-ink-3">
            {p.baseUrl ?? t("settings.provider.defaultEndpoint")} · {p.hasApiKey ? t("settings.provider.apiKeySet") : t("settings.provider.noApiKey")} ·{" "}
            {t("settings.provider.models", { models: p.models.map((m) => m.id).join(", ") || "—" })}
            {p.defaultModel && ` · ${t("settings.provider.defaultModel", { model: p.defaultModel })}`}
          </div>
          {tests[p.id]?.text && <div className={`mt-2 text-xs ${tests[p.id]?.ok ? "text-ok" : "text-bad"}`}>{tests[p.id]?.text}</div>}
        </Card>
      ))}
      <Button variant="primary" onClick={() => setEditing("new")}>
        {t("settings.provider.add")}
      </Button>
      {editing && (
        <ProviderEditor
          provider={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ProviderEditor({ provider, onClose }: { provider: Provider | null; onClose: () => void }) {
  const t = useT();
  const [form, setForm] = useState({
    name: provider?.name ?? "",
    type: provider?.type ?? ("openai_compatible" as Provider["type"]),
    baseUrl: provider?.baseUrl ?? "",
    apiKey: "",
    defaultModel: provider?.defaultModel ?? "",
    models: provider?.models ?? ([] as ProviderModel[]),
  });
  const [remote, setRemote] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    const models = form.models.length ? form.models : form.defaultModel ? [{ id: form.defaultModel }] : [];
    const body: Record<string, unknown> = { name: form.name || form.type, baseUrl: form.baseUrl || null, defaultModel: form.defaultModel || null, models };
    if (form.apiKey) body.apiKey = form.apiKey;
    try {
      if (provider) await api.updateProvider(provider.id, body);
      else await api.createProvider({ ...body, type: form.type });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fetchModels = async () => {
    if (!provider) return;
    const r = await api.testProvider(provider.id);
    setRemote(r.models ?? []);
    if (r.modelsError) setError(r.modelsError);
  };

  const setModel = (i: number, patch: Partial<ProviderModel>) => setForm({ ...form, models: form.models.map((m, k) => (k === i ? { ...m, ...patch } : m)) });

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={provider ? t("settings.provider.editTitle", { name: provider.name }) : t("settings.provider.addTitle")}
      footer={
        <>
          {provider && (
            <Button variant="danger" onClick={() => api.deleteProvider(provider.id).then(onClose).catch((e) => setError(e.message))}>
              {t("common.delete")}
            </Button>
          )}
          <Button variant="primary" onClick={save} loading={busy}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {!provider && (
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className="rounded-full border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:text-ink cursor-pointer"
                onClick={() => setForm({ ...form, type: p.type, name: p.name, baseUrl: p.baseUrl ?? "", defaultModel: p.model ?? "", models: p.model ? [{ id: p.model }] : [] })}
              >
                {p.type === "openai_compatible" ? t("settings.provider.localPreset") : p.label}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("settings.provider.name")}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("settings.provider.type")}>
            <Select disabled={!!provider} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Provider["type"] })}>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="openai_compatible">{t("settings.provider.type.openaiCompatible")}</option>
              <option value="ollama">Ollama</option>
              <option value="anthropic">Anthropic</option>
              <option value="mock">{t("settings.provider.type.mock")}</option>
            </Select>
          </Field>
          <Field label={t("settings.provider.baseUrl")} hint={form.type === "openai_compatible" ? t("settings.provider.baseUrlRequired") : t("settings.provider.baseUrlOptional")}>
            <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="http://host:port/v1" />
          </Field>
          <Field label={t("settings.provider.apiKey")} hint={provider?.hasApiKey ? t("settings.provider.apiKeySetHint") : t("settings.provider.apiKeyStoredHint")}>
            <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          </Field>
          <Field label={t("settings.provider.defaultModelField")}>
            <Input list="remote-models" value={form.defaultModel} onChange={(e) => setForm({ ...form, defaultModel: e.target.value })} />
            <datalist id="remote-models">
              {remote.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          {provider && (
            <div className="flex items-end">
              <Button onClick={fetchModels}>{t("settings.provider.fetchModels")}</Button>
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-2">{t("settings.provider.modelsLabel")}</span>
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, models: [...form.models, { id: "" }] })}>
              {t("settings.provider.addModel")}
            </Button>
          </div>
          <div className="space-y-2">
            {form.models.map((m, i) => (
              <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto_auto]">
                <Input list="remote-models" placeholder={t("settings.provider.modelIdPlaceholder")} value={m.id} onChange={(e) => setModel(i, { id: e.target.value })} />
                <Input type="number" placeholder={t("settings.provider.contextPlaceholder")} value={m.context_window ?? ""} onChange={(e) => setModel(i, { context_window: e.target.value ? Number(e.target.value) : undefined })} />
                <Input type="number" step="0.01" placeholder={t("settings.provider.inputPricePlaceholder")} value={m.input_per_mtok ?? ""} onChange={(e) => setModel(i, { input_per_mtok: e.target.value ? Number(e.target.value) : undefined })} />
                <Input type="number" step="0.01" placeholder={t("settings.provider.outputPricePlaceholder")} value={m.output_per_mtok ?? ""} onChange={(e) => setModel(i, { output_per_mtok: e.target.value ? Number(e.target.value) : undefined })} />
                <label className="flex items-center gap-1.5 text-xs text-ink-2" title={t("settings.provider.visionTitle")}>
                  <input type="checkbox" checked={!!m.vision} onChange={(e) => setModel(i, { vision: e.target.checked || undefined })} /> {t("settings.provider.vision")}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-2" title={t("settings.provider.videoTitle")}>
                  <input type="checkbox" checked={!!m.video} onChange={(e) => setModel(i, { video: e.target.checked || undefined })} /> {t("settings.provider.video")}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-2" title={t("settings.provider.keepThinkingTitle")}>
                  <input type="checkbox" checked={!!m.preserve_thinking} onChange={(e) => setModel(i, { preserve_thinking: e.target.checked || undefined })} /> {t("settings.provider.keepThinking")}
                </label>
                <Button variant="ghost" onClick={() => setForm({ ...form, models: form.models.filter((_, k) => k !== i) })}>
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
        <ErrorNote error={error} />
      </div>
    </Modal>
  );
}

/** One-click starting points; any OpenAI-compatible audio API works. */
const VOICE_PRESETS: { label: string; hintKey: string; cfg: Partial<VoiceConfig> }[] = [
  {
    label: "audio.cpp (local)",
    hintKey: "settings.voice.presetLocalHint",
    cfg: { baseUrl: "http://host.docker.internal:8080", sttModel: "qwen3-asr", ttsModel: "pocket-tts", defaultVoice: "" },
  },
  {
    label: "OpenAI",
    hintKey: "settings.voice.presetOpenAiHint",
    cfg: { baseUrl: "https://api.openai.com", sttModel: "gpt-4o-mini-transcribe", ttsModel: "gpt-4o-mini-tts", defaultVoice: "alloy" },
  },
  {
    label: "Groq (speech-to-text)",
    hintKey: "settings.voice.presetGroqHint",
    cfg: { baseUrl: "https://api.groq.com/openai", sttModel: "whisper-large-v3-turbo", ttsModel: "", defaultVoice: "" },
  },
];

function Voice() {
  const t = useT();
  const [cfg, setCfg] = useState<VoiceConfig | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.voiceHealth>> | null>(null);
  const [saved, setSaved] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [rec, setRec] = useState<Listener | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState("");
  useEffect(() => {
    api.voiceConfig().then(setCfg).catch(() => {});
    api.voiceHealth().then(setHealth).catch(() => {});
  }, []);
  if (!cfg) return null;
  const save = async (patch: Partial<VoiceConfig> = {}) => {
    const body: Partial<VoiceConfig> = { ...cfg, ...patch };
    delete body.hasApiKey;
    if (key) body.apiKey = key;
    const c = await api.saveVoiceConfig(body);
    setCfg(c);
    setKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    void voiceStatus(true);
    setHealth(null);
    api.voiceHealth().then(setHealth).catch(() => {});
  };
  return (
    <Card className="p-5">
      <div className="mb-1 text-sm font-semibold">{t("settings.voice.title")}</div>
      <p className="mb-4 text-sm text-ink-2">
        {t("settings.voice.desc")}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {VOICE_PRESETS.map((p) => (
          <Button key={p.label} size="sm" title={t(p.hintKey)} onClick={() => setCfg({ ...cfg, ...p.cfg })}>
            {p.label}
          </Button>
        ))}
      </div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        {t("settings.voice.speechServer")}
        {health ? (
          health.ok ? (
            <Badge tone="ok">{t("settings.voice.connected")}{health.models?.length ? ` · ${health.models.slice(0, 6).join(", ")}${health.models.length > 6 ? "…" : ""}` : ""}</Badge>
          ) : (
            <Badge tone={cfg.baseUrl ? "bad" : undefined}>{cfg.baseUrl ? (health.error ?? t("settings.voice.unreachable")) : t("settings.voice.none")}</Badge>
          )
        ) : (
          <Badge>{t("settings.voice.checking")}</Badge>
        )}
      </div>
      {health?.ok && health.vad && (
        <div className="-mt-2 mb-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {t("settings.voice.vadDetection")}
            <Badge tone={health.vadError ? "warn" : "ok"}>{health.vad}</Badge>
          </div>
          {health.vadError && (
            <div className="mt-1 text-xs text-ink-3">
              {t("settings.voice.vadNotUsed", {
                error: health.vadError,
                dir: health.shareDir ?? "",
                hostDir: health.shareHostDir ?? t("settings.voice.vadHostDirFallback"),
              })}
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("settings.voice.serverUrl")} hint={t("settings.voice.serverUrlHint")}>
          <Input value={cfg.baseUrl} placeholder="http://host.docker.internal:8080" onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} />
        </Field>
        <Field label={t("settings.voice.apiKey")} hint={cfg.hasApiKey ? t("settings.voice.apiKeySavedHint") : t("settings.voice.apiKeyHostedHint")}>
          <div className="flex gap-2">
            <Input type="password" autoComplete="off" value={key} placeholder={cfg.hasApiKey ? "••••••••" : ""} onChange={(e) => setKey(e.target.value)} />
            {cfg.hasApiKey && (
              <Button size="sm" onClick={() => void save({ apiKey: "" })}>
                {t("settings.voice.clear")}
              </Button>
            )}
          </div>
        </Field>
        <Field label={t("settings.voice.sttModel")}>
          <Input list="voice-models" value={cfg.sttModel} onChange={(e) => setCfg({ ...cfg, sttModel: e.target.value })} />
        </Field>
        <Field label={t("settings.voice.ttsModel")} hint={t("settings.voice.ttsModelHint")}>
          <Input list="voice-models" value={cfg.ttsModel} onChange={(e) => setCfg({ ...cfg, ttsModel: e.target.value })} />
        </Field>
        <datalist id="voice-models">
          {(health?.models ?? []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <Field label={t("settings.voice.defaultVoice")}>
          <Input value={cfg.defaultVoice} onChange={(e) => setCfg({ ...cfg, defaultVoice: e.target.value })} />
        </Field>
        <Field label={t("settings.voice.language")} hint={t("settings.voice.languageHint")}>
          <Input value={cfg.language} onChange={(e) => setCfg({ ...cfg, language: e.target.value })} />
        </Field>
      </div>
      <div className="mt-5 grid gap-3">
        <Toggle checked={cfg.autoSpeak} onChange={(v) => setCfg({ ...cfg, autoSpeak: v })} label={t("settings.voice.autoSpeak")} />
        <Toggle
          checked={cfg.browserTts}
          onChange={(v) => setCfg({ ...cfg, browserTts: v })}
          label={`${t("settings.voice.browserTts")}${browserTtsSupported() ? "" : t("settings.voice.browserTtsUnsupported")}`}
        />
        <div>
          <Toggle
            checked={cfg.browserStt}
            onChange={(v) => setCfg({ ...cfg, browserStt: v })}
            label={`${t("settings.voice.browserStt")}${browserSttSupported() ? "" : t("settings.voice.browserSttUnsupported")}`}
          />
          <div className="mt-1 text-xs text-ink-3">{t("settings.voice.sttNote")}</div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => void save()}>
          {t("common.save")}
        </Button>
        {saved && <span className="text-sm text-ok">{t("settings.voice.saved")}</span>}
        <Button onClick={() => speak(t("settings.voice.testSpeechSample", { name: "Pantheon" }))}>{t("settings.voice.testSpeech")}</Button>
        <Button
          variant={rec ? "danger" : "secondary"}
          onClick={async () => {
            setError(null);
            if (!rec) {
              try {
                setRec(await listen());
              } catch (e) {
                setError((e as Error).message);
              }
            } else {
              setRec(null);
              try {
                setHeard(await rec.stop());
              } catch (e) {
                setError((e as Error).message);
              }
            }
          }}
        >
          {rec ? t("settings.voice.stopTranscribe") : t("settings.voice.testMicrophone")}
        </Button>
      </div>
      {heard !== null && <div className="mt-3 rounded-md border border-line bg-bg p-3 text-sm">{t("settings.voice.heard", { text: heard })}</div>}
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
    </Card>
  );
}
