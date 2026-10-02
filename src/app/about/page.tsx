"use client";

import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between">
      <div>
        <PublicNavbar />

        {/* Hero Section */}
        <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#eef4ff] text-[#2563eb] border border-[#dbeafe]">
              <Sparkles className="h-3.5 w-3.5 text-[#2563eb]" />
              <span>About Hippocrates AI</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-[-0.04em] text-slate-900 leading-[1.08]">
              Intelligent Care. Human First.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Hippocrates was founded on a simple yet ambitious premise: artificial intelligence can transform healthcare not by replacing human clinicians, but by empowering patients with clarity and supporting doctors with intelligent clinical synthesis.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Our Mission</span>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Making clinical intelligence accessible and safe.</h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Too often, patients leave consultations with unanswered questions, and doctors are burdened by mountains of paperwork and complex diagnostic analysis. Hippocrates provides a dual-engine architecture (Aegis for patients, Oracle for doctors) designed for compassionate care and clinical rigor.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <Link href="/">
                    <Button className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-7 py-3 rounded-xl text-sm font-medium">
                      Launch Web App
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-[#f8fafc] border border-slate-200/80 shadow-sm space-y-6">
                <h3 className="text-xl font-bold text-slate-900">Core Principles</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Patient-First Safety</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Always transparent about AI limitations, encouraging in-person consultations when appropriate.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Clinical Rigor</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Built with multi-model intelligence that helps doctors evaluate differentials and lab findings rapidly.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Absolute Privacy</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Encrypted records and strict data stewardship protecting sensitive health conversations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
