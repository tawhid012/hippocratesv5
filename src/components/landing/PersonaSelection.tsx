"use client";

import { motion } from "framer-motion";
import { Stethoscope, HeartPulse, ArrowRight, Shield, Sparkles, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/hooks/useAppContext";

export function PersonaSelection() {
  const { selectPersona } = useApp();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-hippo-sky/10 via-hippo-blue/15 to-transparent blur-3xl pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl text-center space-y-10 relative z-10"
      >
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full glass-control px-3.5 py-1.5 text-xs font-medium text-hippo-navy">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Hippocrates AI Platform</span>
          </div>
          
          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-hippo-navy tracking-tight">
            How will you use Hippocrates?
          </h1>
          
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Select your clinical persona to access specialized AI intelligence tailored for medical decision support or patient health guidance.
          </p>
        </div>

        {/* Two Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Doctor Card — Oracle */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="glass-strong rounded-[2rem] p-8 flex flex-col justify-between border border-white/70 shadow-[0_24px_60px_rgba(26,39,68,0.06)] relative group"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-hippo-navy to-hippo-blue flex items-center justify-center text-white shadow-md">
                  <Stethoscope className="h-7 w-7" strokeWidth={1.8} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <Activity className="h-3 w-3" />
                  Doctor AI
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-serif text-2xl font-semibold text-hippo-navy">Doctor</h2>
                  <span className="text-xs font-medium uppercase tracking-wider text-accent font-sans">
                    Oracle
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Clinical intelligence designed to support doctors with differential diagnoses, treatment options, medical literature, and patient case analysis.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Oracle Core (Available)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Oracle Research & Pro (Coming Soon)</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Button
                variant="default"
                size="lg"
                className="w-full rounded-xl bg-hippo-navy hover:bg-hippo-navy/90 text-white shadow-md group-hover:shadow-lg transition-all"
                onClick={() => selectPersona("doctor")}
              >
                <span>Continue as Doctor</span>
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>

          {/* Patient Card — Aegis */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="glass-strong rounded-[2rem] p-8 flex flex-col justify-between border border-white/70 shadow-[0_24px_60px_rgba(26,39,68,0.06)] relative group"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-hippo-blue to-hippo-sky flex items-center justify-center text-white shadow-md">
                  <HeartPulse className="h-7 w-7" strokeWidth={1.8} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <Shield className="h-3 w-3" />
                  Patient AI
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-serif text-2xl font-semibold text-hippo-navy">Patient</h2>
                  <span className="text-xs font-medium uppercase tracking-wider text-hippo-blue font-sans">
                    Aegis
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Patient health intelligence designed to help users understand their health information, analyze laboratory blood reports, and prepare for doctor visits.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Aegis Core (Available)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Aegis Research & Pro (Coming Soon)</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Button
                variant="default"
                size="lg"
                className="w-full rounded-xl bg-hippo-blue hover:bg-hippo-blue/90 text-white shadow-md group-hover:shadow-lg transition-all"
                onClick={() => selectPersona("patient")}
              >
                <span>Continue as Patient</span>
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </div>

        <p className="text-xs text-muted-foreground/70">
          Hippocrates AI is designed for decision support and education. You can switch between Doctor and Patient modes anytime in the application header.
        </p>
      </motion.div>
    </div>
  );
}
