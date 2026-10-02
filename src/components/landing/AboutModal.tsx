"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Shield, Award, Lock } from "lucide-react";
import { HippocratesLogo } from "./HippocratesLogo";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-6 sm:p-8 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-2xl">
        <DialogHeader className="space-y-2">
          <HippocratesLogo size="sm" />
          <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight pt-2">
            About Hippocrates
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm leading-relaxed">
            Hippocrates is an AI clinical intelligence platform engineered to bridge the communication and analytical divide between patients and physicians.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Clinical Decision Support</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Providing doctors with structured clinical copiloting (Oracle) while empowering patients with accessible health report analysis and clear guidance (Aegis).
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Lock className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Privacy & Security First</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Engineered with strict client confidentiality, secure data isolation, and privacy-preserving clinical processing architectures.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Award className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Human-First Principles</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Hippocrates does not replace human judgment. Physicians remain the ultimate decision-makers, and patients are supported toward timely professional care.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">
            © 2026 Hippocrates AI Platform. All rights reserved.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
