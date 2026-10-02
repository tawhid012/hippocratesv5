"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError("Invalid beta admin credentials.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={handleSubmit} className="glass-panel w-full max-w-md rounded-[1.5rem] p-6 sm:p-7">
        <div className="mb-7 flex items-center gap-3">
          <div className="glass-control flex h-11 w-11 items-center justify-center rounded-2xl">
            <LockKeyhole className="h-5 w-5 text-accent" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
              Admin Access
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Temporary beta login for Oracle configuration.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="Oracle Core or admin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Oracle@123 or admin"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          {loading ? "Signing in..." : "Enter Admin"}
        </Button>

        <div className="mt-4 rounded-xl bg-accent/5 p-3 text-[11px] leading-relaxed text-muted-foreground/80 border border-accent/10">
          <span className="font-semibold text-foreground/80">Beta Credentials:</span> Use username <code className="font-mono text-accent">Oracle Core</code> (password: <code className="font-mono text-accent">Oracle@123</code>) or <code className="font-mono text-accent">admin</code> / <code className="font-mono text-accent">admin</code>.
        </div>
      </form>
    </div>
  );
}
