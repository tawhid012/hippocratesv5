"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
      setMessage("");
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 sm:p-8 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Contact Hippocrates Team
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            Reach out for clinical inquiries, institutional feedback, or platform support.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-900">Message Received</h4>
            <p className="text-xs text-slate-500 max-w-xs">
              Thank you for contacting Hippocrates. A team member will respond shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="text-xs font-medium text-slate-700">
                Email Address
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="physician@clinic.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message" className="text-xs font-medium text-slate-700">
                Message / Inquiry
              </Label>
              <textarea
                id="contact-message"
                rows={3}
                placeholder="How can we assist your clinical or institutional workflow?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl py-2.5 text-sm font-medium"
            >
              Send Message
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
