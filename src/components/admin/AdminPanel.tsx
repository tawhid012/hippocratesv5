"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Cpu, Clock, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACTIVE_PROVIDERS,
  FUTURE_PROVIDERS,
  createDefaultProviderStates,
  getActiveProviderName,
  type ProviderId,
  type ProviderState,
} from "@/lib/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ProviderConfigCard,
  FutureProviderCard,
} from "@/components/admin/ProviderConfigCard";

type AdminSection = "oracle" | "providers" | "future";

const SECTIONS: { id: AdminSection; label: string; icon: typeof Sparkles }[] = [
  { id: "oracle", label: "Oracle", icon: Sparkles },
  { id: "providers", label: "Providers", icon: Cpu },
  { id: "future", label: "Coming Soon", icon: Clock },
];

export function AdminPanel() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>("providers");
  const [providerStates, setProviderStates] = useState<
    Record<ProviderId, ProviderState>
  >(createDefaultProviderStates);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsMessage, setSettingsMessage] = useState("");

  const activeProviderName = getActiveProviderName(providerStates);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    setSettingsMessage("");
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const settings = (await response.json().catch(() => ({}))) as {
        activeProvider?: "openai" | "gemini";
        geminiConfigured?: boolean;
        openaiConfigured?: boolean;
        geminiMaskedKey?: string;
        openaiMaskedKey?: string;
        error?: string;
      };

      if (!response.ok) throw new Error(settings.error || "Unable to load settings.");

      const isGeminiActive = settings.activeProvider !== "openai";

      setProviderStates((prev) => ({
        ...prev,
        gemini: {
          ...prev.gemini,
          enabled: isGeminiActive,
          apiKey: "",
          isConfigured: Boolean(settings.geminiConfigured),
          maskedKey: settings.geminiMaskedKey,
          status: settings.geminiConfigured ? "disconnected" : "not_configured",
        },
        openai: {
          ...prev.openai,
          enabled: settings.activeProvider === "openai",
          apiKey: "",
          isConfigured: Boolean(settings.openaiConfigured),
          maskedKey: settings.openaiMaskedKey,
          status: settings.openaiConfigured ? "disconnected" : "not_configured",
        },
      }));
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Unable to load settings.");
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleEnable = useCallback((providerId: ProviderId, enabled: boolean) => {
    setProviderStates((prev) => {
      if (enabled) {
        const next = { ...prev };
        for (const id of Object.keys(next) as ProviderId[]) {
          next[id] = {
            ...next[id],
            enabled: id === providerId,
          };
        }
        return next;
      }
      return {
        ...prev,
        [providerId]: { ...prev[providerId], enabled: false },
      };
    });
  }, []);

  const handleApiKeyChange = useCallback((providerId: ProviderId, apiKey: string) => {
    setProviderStates((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        apiKey,
      },
    }));
  }, []);

  const handleTest = useCallback(async (providerId: ProviderId) => {
    if (providerId !== "openai" && providerId !== "gemini") return;

    setProviderStates((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], status: "testing" },
    }));

    try {
      const apiKey = providerStates[providerId].apiKey.trim() || undefined;
      const response = await fetch("/api/admin/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, apiKey }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Connection test failed.");

      setProviderStates((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], status: "connected" },
      }));
      setSettingsMessage(`${providerId === "gemini" ? "Google Gemini" : "OpenAI"} connection verified successfully.`);
    } catch (error) {
      setProviderStates((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], status: "error" },
      }));
      setSettingsMessage(error instanceof Error ? error.message : "Connection test failed.");
    }
  }, [providerStates]);

  const saveSettings = useCallback(async (providerId: ProviderId) => {
    const activeProvider = providerStates.gemini.enabled ? "gemini" : "openai";
    const apiKeyVal = providerStates[providerId].apiKey.trim();

    const payload: {
      activeProvider: string;
      geminiApiKey?: string;
      openaiApiKey?: string;
    } = {
      activeProvider,
    };

    if (apiKeyVal) {
      if (providerId === "gemini") payload.geminiApiKey = apiKeyVal;
      if (providerId === "openai") payload.openaiApiKey = apiKeyVal;
    }

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as {
      geminiConfigured?: boolean;
      openaiConfigured?: boolean;
      geminiMaskedKey?: string;
      openaiMaskedKey?: string;
      error?: string;
    };

    if (!response.ok) throw new Error(body.error || "Unable to save settings to database.");

    // Update state to reflect database configuration without storing plaintext key
    setProviderStates((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        apiKey: "",
        isConfigured: providerId === "gemini" ? Boolean(body.geminiConfigured) : Boolean(body.openaiConfigured),
        maskedKey: providerId === "gemini" ? body.geminiMaskedKey : body.openaiMaskedKey,
        lastSaved: new Date(),
        status: "disconnected",
      },
    }));

    setSettingsMessage(
      providerId === "gemini"
        ? "Gemini API key saved to database. Active immediately for all future Oracle & Aegis requests."
        : "Settings saved to database successfully."
    );
  }, [providerStates]);

  const handleSave = useCallback((providerId: ProviderId) => {
    if (providerId !== "openai" && providerId !== "gemini") return;
    setSettingsMessage("");

    saveSettings(providerId).catch((error) => {
      setSettingsMessage(error instanceof Error ? error.message : "Unable to save settings.");
    });
  }, [saveSettings]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="premium-hairline sticky top-0 z-20 glass-strong border-b border-white/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" asChild className="rounded-xl">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
            <div className="flex flex-col leading-none">
              <span className="font-serif text-[21px] font-semibold tracking-[-0.045em] text-foreground sm:text-[25px]">
                Hippocrates
              </span>
              <span className="mt-1 text-[7px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 sm:text-[8px]">
                AI Clinical Copilot
              </span>
            </div>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
            Admin · Beta v0.1
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 sm:mb-12"
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55">
            Administrator Console
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] text-foreground/95">
            Oracle Settings
          </h1>
          <p className="max-w-2xl text-[14px] sm:text-[15px] text-muted-foreground/70 mt-2 leading-relaxed">
            Configure the provider layer that powers Oracle. Doctors only see Oracle; provider details stay behind this administrative boundary.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          {/* Sidebar nav — pill tabs on mobile, vertical list on desktop */}
          <nav className="lg:w-64 shrink-0">
            <div className="glass-panel rounded-[1.45rem] flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible p-1.5 scrollbar-none">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] text-[13px] font-medium whitespace-nowrap",
                    "transition-all duration-200 cursor-pointer",
                    activeSection === section.id
                      ? "bg-white/80 text-foreground shadow-[0_12px_30px_rgba(26,39,68,0.065)] ring-1 ring-hippo-navy/[0.04]"
                      : "text-muted-foreground hover:-translate-y-px hover:bg-white/58 hover:text-foreground"
                  )}
                >
                  <section.icon className="h-4 w-4" strokeWidth={1.75} />
                  {section.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">
            {activeSection === "oracle" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="border-0 rounded-[1.55rem] bg-gradient-to-br from-white/80 to-accent/[0.035] shadow-[0_24px_72px_rgba(26,39,68,0.08)]">
                  <CardHeader>
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="h-5 w-5 text-accent" strokeWidth={1.75} />
                      <CardTitle className="text-[16px]">Oracle Status</CardTitle>
                    </div>
                    <CardDescription className="text-[13px]">
                      {activeProviderName
                        ? <>Oracle is powered by <span className="font-medium text-foreground">{activeProviderName}</span></>
                        : "No provider is currently active"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          activeProviderName ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                        )}
                      />
                      <span className="text-[13px] text-muted-foreground">
                        {activeProviderName ? "Oracle is operational" : "Oracle is offline"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="glass-panel rounded-[1.35rem] p-5">
                  <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                    Doctors interact exclusively with <strong className="text-foreground/80">Oracle</strong>.
                    The backend routes requests to the active provider configured below.
                    Provider names are never exposed in the chat interface.
                  </p>
                </div>
              </motion.div>
            )}

            {activeSection === "providers" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground/90">
                      AI Provider Configuration
                    </h2>
                    <p className="text-[12px] text-muted-foreground/70 mt-1">
                      Only one provider can be active at a time.
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground/55">
                    Supabase-backed beta configuration
                  </span>
                </div>

                {(loadingSettings || settingsMessage) && (
                  <div className="glass-panel rounded-2xl px-4 py-3 text-[12px] text-muted-foreground">
                    {loadingSettings ? "Loading provider settings…" : settingsMessage}
                  </div>
                )}

                {ACTIVE_PROVIDERS.map((provider) => (
                  <ProviderConfigCard
                    key={provider.id}
                    provider={provider}
                    state={providerStates[provider.id]}
                    onEnable={(enabled) => handleEnable(provider.id, enabled)}
                    onApiKeyChange={(key) => handleApiKeyChange(provider.id, key)}
                    onTest={() => handleTest(provider.id)}
                    onSave={() => handleSave(provider.id)}
                  />
                ))}

                <div className="glass-panel rounded-[1.35rem] p-5 mt-6">
                  <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                    Configuration is stored in Supabase for beta. The frontend never calls AI
                    providers directly; Oracle reads the active provider server-side.
                  </p>
                </div>
              </motion.div>
            )}

            {activeSection === "future" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground/90">
                    Upcoming Providers
                  </h2>
                  <p className="text-[12px] text-muted-foreground/70 mt-1">
                    Additional providers will be supported in future releases.
                  </p>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {FUTURE_PROVIDERS.map((provider) => (
                    <FutureProviderCard key={provider.id} provider={provider} />
                  ))}
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
