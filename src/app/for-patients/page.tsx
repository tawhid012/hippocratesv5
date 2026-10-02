"use client";

import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HeartPulse, MessageSquare, FileText, ArrowRight, Shield } from "lucide-react";

export default function ForPatientsPage() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between">
      <div>
        <PublicNavbar />

        {/* Hero Section */}
        <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#eef4ff] text-[#2563eb] border border-[#dbeafe]">
                <HeartPulse className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>Aegis Health Intelligence for Patients</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-[-0.04em] text-slate-900 leading-[1.08]">
                Understand your health. With absolute clarity.
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                Meet Aegis — your personal health assistant. Designed to feel like talking to a calm, attentive doctor during a real consultation. No medical jargon, no panic, just clear guidance.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/?persona=patient">
                  <Button className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-8 py-3.5 rounded-xl font-medium text-sm shadow-sm flex items-center gap-2 cursor-pointer">
                    <span>Talk to Aegis Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/platform">
                  <Button variant="outline" className="border-slate-300 hover:bg-slate-50 text-slate-900 px-7 py-3.5 rounded-xl font-medium text-sm">
                    Platform Overview
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Card / Mockup preview */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xl space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">A</div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Aegis Clinical Assistant</h4>
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">● Active Consultation</span>
                  </div>
                </div>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-700">
                    &quot;I can see the area you&apos;re concerned about. It looks red and irritated. When did you first notice this appearing?&quot;
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 ml-6">
                    &quot;It started around three days ago after trying a new facial cream.&quot;
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-700">
                    &quot;That helps narrow things down. Let&apos;s look at whether it&apos;s itchy or painful...&quot;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Patient Features Grid */}
        <section className="py-20 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Patient-Centric Care</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Designed for peace of mind</h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Navigating health questions can be stressful. Aegis provides structured, compassionate support at your own pace.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-[#f8fafc] border border-slate-200/80 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Natural Conversations</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  No confusing medical terminology. Aegis explains conditions, asks relevant follow-ups gradually, and summarizes your health picture step-by-step.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#f8fafc] border border-slate-200/80 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Lab Report Analyzer</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Upload photos or PDFs of blood tests and lab work. Aegis extracts exact test values, units, and reference ranges into clear, understandable summaries.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#f8fafc] border border-slate-200/80 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Safe & Cautious Guidance</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Always grounded in patient safety. Aegis knows its limitations, never gives reckless diagnoses, and guides you on when to consult an in-person physician.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
