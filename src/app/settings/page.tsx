"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useState } from "react";

export default function SettingsPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <SettingsDialog open={open} onOpenChange={setOpen} />
      {!open && (
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Settings closed.</p>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
