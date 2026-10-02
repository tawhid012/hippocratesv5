"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Stethoscope, HeartPulse, ArrowRight } from "lucide-react";

interface GetStartedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPersona: (persona: "doctor" | "patient") => void;
}

export function GetStartedModal({
  open,
  onOpenChange,
  onSelectPersona,
}: GetStartedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-6 sm:p-8 bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            <span>AI Clinical Platform</span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            How will you use Hippocrates?
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm max-w-sm mx-auto">
            Choose your persona to launch the specialized clinical workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {/* Patient Card — Aegis */}
          <div
            onClick={() => {
              onOpenChange(false);
              onSelectPersona("patient");
            }}
            className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 hover:bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <HeartPulse className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                  For Patients
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Aegis</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Understand lab results, health questions, and physical health photograph evaluations.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
              <span>Talk to Aegis</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Doctor Card — Oracle */}
          <div
            onClick={() => {
              onOpenChange(false);
              onSelectPersona("doctor");
            }}
            className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 hover:bg-white hover:border-slate-400 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  For Doctors
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Oracle</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Clinical reasoning, differential diagnosis, patient cases, and evidence-based medicine.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-900 group-hover:text-slate-800">
              <span>Try Oracle</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-[11px] text-slate-400">
            Hippocrates provides clinical decision support and health guidance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
