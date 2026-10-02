"use client";

import { Loader2, CheckCircle2, XCircle, Circle, Save, Zap, Database, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderDefinition, ProviderState, ProviderStatus } from "@/lib/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ProviderConfigCardProps {
  provider: ProviderDefinition;
  state: ProviderState;
  onEnable: (enabled: boolean) => void;
  onApiKeyChange: (apiKey: string) => void;
  onTest: () => void;
  onSave: () => void;
}

function StatusIndicator({ status, isConfigured }: { status: ProviderStatus; isConfigured?: boolean }) {
  const config = {
    connected: {
      icon: CheckCircle2,
      label: "Connected & Verified",
      className: "text-emerald-600",
      dot: "bg-emerald-500",
    },
    disconnected: {
      icon: isConfigured ? CheckCircle2 : Circle,
      label: isConfigured ? "Configured in Database" : "Disconnected",
      className: isConfigured ? "text-hippo-teal" : "text-muted-foreground",
      dot: isConfigured ? "bg-hippo-teal" : "bg-muted-foreground/40",
    },
    testing: {
      icon: Loader2,
      label: "Testing...",
      className: "text-accent",
      dot: "bg-accent animate-pulse",
    },
    error: {
      icon: XCircle,
      label: "Connection Failed",
      className: "text-destructive",
      dot: "bg-destructive",
    },
    not_configured: {
      icon: Circle,
      label: "Not Configured",
      className: "text-muted-foreground/70",
      dot: "bg-muted-foreground/30",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          config.className,
          status === "testing" && "animate-spin"
        )}
        strokeWidth={2}
      />
      <span className={cn("text-[12px] font-medium", config.className)}>
        {config.label}
      </span>
    </div>
  );
}

export function ProviderConfigCard({
  provider,
  state,
  onEnable,
  onApiKeyChange,
  onTest,
  onSave,
}: ProviderConfigCardProps) {
  const Icon = provider.icon;
  const isTesting = state.status === "testing";
  const canTest = (Boolean(state.apiKey.trim()) || state.isConfigured) && !isTesting;
  const canSave = (Boolean(state.apiKey.trim()) || state.isConfigured) && !isTesting;

  return (
    <Card
      id={`provider-card-${provider.id}`}
      className={cn(
        "group overflow-hidden rounded-[1.45rem] border-0 transition-all duration-300 hover:-translate-y-0.5",
        state.enabled
          ? "ring-1 ring-accent/18 bg-white/76 shadow-[0_24px_70px_rgba(26,39,68,0.085)]"
          : "bg-white/46 shadow-[0_14px_42px_rgba(26,39,68,0.05)]"
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={cn(
                "glass-control flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] transition-all duration-200 group-hover:scale-[1.03]",
                state.enabled ? "bg-accent/10 shadow-inner" : "bg-hippo-navy/[0.04]"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  state.enabled ? "text-accent" : "text-muted-foreground/60"
                )}
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[15px] font-semibold text-foreground/90">
                  {provider.name}
                </h3>
                {state.enabled && (
                  <Badge variant="success">Active Provider</Badge>
                )}
                {state.isConfigured && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <Database className="h-3 w-3" />
                    Saved in DB
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground/70 mt-0.5 leading-relaxed">
                {provider.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Switch
              id={`switch-${provider.id}`}
              checked={state.enabled}
              onCheckedChange={onEnable}
              aria-label={`Enable ${provider.name}`}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {state.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Config body */}
        <Separator className="bg-hippo-navy/[0.045]" />
        <div className="px-5 sm:px-6 py-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${provider.id}-api-key`} className="text-[12px] text-muted-foreground font-medium">
                {provider.name} API Key
              </Label>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                <ShieldCheck className="h-3 w-3 text-hippo-teal" />
                Server-side only (never exposed)
              </span>
            </div>
            <Input
              id={`${provider.id}-api-key`}
              type="password"
              placeholder={
                state.isConfigured
                  ? "•••••••••••••••• (Configured in Database - enter new key to replace)"
                  : `Enter your ${provider.name} API key`
              }
              value={state.apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              disabled={isTesting}
              className="h-11 rounded-xl font-mono text-[13px] disabled:cursor-not-allowed disabled:bg-white/35"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <StatusIndicator status={state.status} isConfigured={state.isConfigured} />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                id={`btn-test-${provider.id}`}
                variant="outline"
                size="sm"
                onClick={onTest}
                disabled={!canTest}
                className="h-9 rounded-xl text-[13px]"
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Test Connection
              </Button>
              <Button
                id={`btn-save-${provider.id}`}
                size="sm"
                onClick={onSave}
                disabled={!canSave}
                className="h-9 rounded-xl text-[13px] bg-hippo-navy text-white hover:bg-hippo-navy/90"
              >
                <Save className="h-3.5 w-3.5" />
                Save Key to Database
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FutureProviderCardProps {
  provider: ProviderDefinition;
}

export function FutureProviderCard({ provider }: FutureProviderCardProps) {
  const Icon = provider.icon;

  return (
    <Card className="rounded-[1.25rem] border-0 bg-white/34 opacity-80 shadow-[0_10px_32px_rgba(26,39,68,0.035)] transition-all duration-200 hover:-translate-y-px hover:opacity-90">
      <CardContent className="flex items-center justify-between px-5 sm:px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hippo-navy/[0.03]">
            <Icon className="h-4.5 w-4.5 text-muted-foreground/50" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-foreground/70">{provider.name}</h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{provider.description}</p>
          </div>
        </div>
        <Badge variant="upcoming">Coming Soon</Badge>
      </CardContent>
    </Card>
  );
}
