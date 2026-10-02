"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Moon, Globe, Shield } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your Hippocrates experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card className="border-0 shadow-none bg-white/40">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                    <Bell className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Case updates and reminders
                    </p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator className="bg-white/40" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                    <Moon className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Coming soon
                    </p>
                  </div>
                </div>
                <Switch disabled />
              </div>

              <Separator className="bg-white/40" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                    <Globe className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Language</Label>
                    <p className="text-xs text-muted-foreground">English (US)</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-white/40" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                    <Shield className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      HIPAA Compliance
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      End-to-end encryption enabled
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Hippocrates Beta v0.1
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
