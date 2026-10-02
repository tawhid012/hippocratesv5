"use client";

import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Shield,
  MessageSquare,
  FileText,
  Lock,
  Stethoscope,
  HeartPulse,
  Mic,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { LandingHeroVisual } from "./LandingHeroVisual";
import { GetStartedModal } from "./GetStartedModal";
import { AboutModal } from "./AboutModal";
import { ContactModal } from "./ContactModal";
import { LegalModal } from "./LegalModal";

interface LandingPageProps {
  onSelectPersona: (persona: "doctor" | "patient") => void;
  onLaunchAegisPro?: () => void;
}

export function LandingPage({ onSelectPersona, onLaunchAegisPro }: LandingPageProps) {
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);

  const handleLaunchPatient = () => {
    onSelectPersona("patient");
  };

  const handleLaunchDoctor = () => {
    onSelectPersona("doctor");
  };

  const handleLaunchAegisPro = () => {
    if (onLaunchAegisPro) {
      onLaunchAegisPro();
    } else {
      onSelectPersona("patient");
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between">
      <div>
        {/* 1. UNIVERSAL NAVIGATION BAR */}
        <PublicNavbar
          onSelectPersona={onSelectPersona}
          onOpenGetStarted={() => setGetStartedOpen(true)}
        />

        {/* 2. UPGRADED HERO SECTION */}
        <section
          id="hero"
          className="relative pt-10 sm:pt-16 pb-20 sm:pb-28 lg:pb-32 overflow-hidden"
        >
          {/* Enhanced multi-layer ambient background glow */}
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-blue-200/40 via-sky-100/30 to-transparent rounded-full blur-[100px] pointer-events-none -z-10" />
          <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-[90px] pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: 55% */}
              <div className="lg:col-span-7 space-y-7 sm:space-y-9 text-left">
                {/* Top Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#eef4ff] text-[#2563eb] border border-[#dbeafe] shadow-sm">
                  <Sparkles className="h-4 w-4 text-[#2563eb]" />
                  <span className="tracking-tight">AI Clinical Intelligence Platform • 99.9% Accuracy</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-bold text-slate-900 tracking-[-0.04em] leading-[1.04]">
                  Intelligent Care.
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
                    Human First.
                  </span>
                </h1>

                {/* Supporting Text */}
                <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl font-normal">
                  Hippocrates bridges the gap between complex medical documentation, compassionate patient understanding, and rapid physician decision-making.
                </p>

                {/* Single Primary CTA: Get Started */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <Button
                    onClick={() => setGetStartedOpen(true)}
                    className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-8 py-6 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
                    aria-label="Get Started with Hippocrates"
                  >
                    <span>Get Started</span>
                    <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Button>
                </div>

                {/* Trust / Security badge */}
                <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200/60 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>HIPAA Compliant & AES-256 Encrypted</span>
                  </div>
                </div>
              </div>

              {/* Right Column: 45% Healthcare Visual with 3D Shield & ECG */}
              <div className="lg:col-span-5 flex items-center justify-center lg:justify-end pt-4 lg:pt-0">
                <LandingHeroVisual />
              </div>
            </div>
          </div>
        </section>

      {/* 3. SECTION 2 — PLATFORM INTRODUCTION */}
      <section className="py-16 sm:py-24 border-t border-slate-100 bg-[#fbfcfd]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 block">
            BUILT FOR REAL-WORLD HEALTHCARE
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            AI that understands. Care that improves.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed pt-2">
            One intelligent platform designed to help patients understand their health and help doctors make better-informed decisions.
          </p>

          {/* Minimal accent line matching reference */}
          <div className="flex justify-center pt-2">
            <div className="w-10 h-1 rounded-full bg-blue-600/70" />
          </div>
        </div>

        {/* 4. SECTION 3 — CORE CAPABILITIES (4-Column Layout) */}
        <div id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Feature 1: Smart Conversations */}
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-blue-200 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <MessageSquare className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-[15px]">Smart Conversations</h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  Natural, context-aware AI conversations for health support and guidance.
                </p>
              </div>
            </div>

            {/* Feature 2: Report Analysis */}
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-blue-200 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <FileText className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-[15px]">Report Analysis</h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  Instant insights from lab reports, scans, and medical documents in simpler language.
                </p>
              </div>
            </div>

            {/* Feature 3: Doctor Copilot */}
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-blue-200 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Stethoscope className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-[15px]">Doctor Copilot</h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  AI copilot that helps doctors think faster, organize clinical context, and decide with confidence.
                </p>
              </div>
            </div>

            {/* Feature 4: Privacy First */}
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-blue-200 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Lock className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-900 text-[15px]">Privacy First</h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  Your data is encrypted, protected, and handled with strong security principles.
                </p>
              </div>
            </div>
          </div>

          {/* Centered Tagline matching reference */}
          <div className="text-center pt-14">
            <p className="text-sm sm:text-base font-medium text-slate-700">
              One Platform. Two Experiences. <span className="text-blue-600 font-semibold">Better Outcomes.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 5. SECTION 4 — FOR PATIENTS (Aegis) */}
      <section id="for-patients" className="py-20 sm:py-28 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                FOR PATIENTS
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                Understand your health.
                <br />
                With more clarity.
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Aegis is designed to make health information easier to understand through natural conversations, medical report analysis, and physical health image analysis.
              </p>

              {/* Bullet highlights */}
              <ul className="space-y-3 pt-2">
                {[
                  "Ask health questions naturally",
                  "Understand medical reports & blood work",
                  "Analyse supported physical health images",
                  "Get clear, easy-to-understand explanations",
                  "Move toward professional care when needed",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
                <Button
                  onClick={handleLaunchPatient}
                  className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 py-3 rounded-xl text-sm font-medium shadow-sm"
                >
                  <span>Explore Aegis</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                <Button
                  variant="outline"
                  onClick={handleLaunchAegisPro}
                  className="border-slate-200 hover:bg-slate-50 text-slate-800 px-6 py-3 rounded-xl text-sm font-medium"
                >
                  <Mic className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Talk to Aegis Pro</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Right: Minimal Interface Preview Card */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.04)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <HeartPulse className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Aegis Patient Assistant</div>
                      <div className="text-[11px] text-slate-500">Laboratory & Symptom Analysis</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                    Aegis Core
                  </span>
                </div>

                {/* Simulated Conversation Snippet */}
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 text-slate-800">
                    <span className="font-semibold text-slate-900 block mb-1">Patient Query:</span>
                    &ldquo;Can you explain what my elevated HbA1c of 6.2% means on this blood test?&rdquo;
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-900 text-xs">
                      <Shield className="h-3.5 w-3.5 text-blue-600" />
                      <span>Aegis Clinical Explanation:</span>
                    </div>
                    <p className="text-slate-700">
                      An HbA1c of <strong>6.2%</strong> indicates an estimated 3-month average blood glucose level in the <em>prediabetes range (5.7% – 6.4%)</em>.
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      This is an early indicator where lifestyle adaptations, nutrition adjustments, and consultation with your primary physician can help maintain optimal glucose balance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 5 — FOR DOCTORS (Oracle) */}
      <section id="for-doctors" className="py-20 sm:py-28 border-t border-slate-100 bg-[#fbfcfd]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Minimal Clinical Interface Preview */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.04)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Oracle Clinical Copilot</div>
                      <div className="text-[11px] text-slate-500">Differential Diagnosis & Case Reasoning</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    Physician Decision Support
                  </span>
                </div>

                {/* Simulated Clinical Reasoning Output */}
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800">
                    <span className="font-semibold text-slate-900 block mb-0.5">Clinical Case:</span>
                    &ldquo;54yo male with exertional dyspnea, normal resting ECG, elevated BNP (420 pg/mL).&rdquo;
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-white text-xs">
                      <span>Structured Differential Assessment</span>
                      <span className="text-[10px] text-slate-400">Evidence Grade A</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-300 text-[11px]">
                      <li>• <strong>HFpEF / Heart Failure:</strong> Transthoracic Echocardiogram & stress evaluation recommended.</li>
                      <li>• <strong>Ischemic Heart Disease:</strong> Coronary CT angiography or stress perfusion imaging.</li>
                      <li>• <strong>Pulmonary Etiology:</strong> Spirometry and DLCO to evaluate airway vs. vascular resistance.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                FOR DOCTORS
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                A smarter copilot
                <br />
                for clinical work.
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Oracle is designed to support doctors with intelligent clinical conversations and assistance while keeping the doctor firmly in control of all clinical decisions.
              </p>

              {/* Highlights */}
              <ul className="space-y-3 pt-2">
                {[
                  "Clinical conversation support",
                  "Structured reasoning assistance & differentials",
                  "Patient conversation & consultation synthesis",
                  "Faster access to relevant medical literature",
                  "Support for documentation and clinical workflows",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-slate-900 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Primary CTA */}
              <div className="pt-4">
                <Button
                  onClick={handleLaunchDoctor}
                  className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-7 py-3 rounded-xl text-sm font-medium shadow-sm"
                >
                  <span>Explore Oracle</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 6 — AEGIS PRO / ORACLE PRO */}
      <section id="voice" className="py-20 sm:py-24 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Healthcare shouldn&apos;t always require a keyboard.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Hippocrates is expanding beyond text-based conversations with voice-first experiences designed for more natural interaction.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-10 text-left">
            {/* Aegis Pro: Available */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Mic className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available Now
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">Aegis Pro</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time natural speech health assistant for patients. Hands-free consultation and audio health guidance powered by low-latency voice synthesis.
                </p>
              </div>

              <Button
                onClick={handleLaunchAegisPro}
                variant="outline"
                className="w-full bg-white hover:bg-slate-100 border-slate-300 text-slate-900 rounded-xl text-xs font-semibold"
              >
                <span>Launch Aegis Voice</span>
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </div>

            {/* Oracle Pro: In Development */}
            <div className="p-6 rounded-2xl bg-slate-50/60 border border-slate-200/60 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                    <Radio className="h-5 w-5 text-slate-300" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                    In Development
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">Oracle Pro</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Advanced voice experience for clinicians. Continuous consultation ambient dictation, hands-free operative and clinical ward decision support.
                </p>
              </div>

              <div className="text-xs text-slate-400 italic py-2">
                Clinical voice protocols currently in validation.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SECTION 7 — HOW HIPPOCRATES WORKS */}
      <section id="how-it-works" className="py-20 sm:py-24 border-t border-slate-100 bg-[#fbfcfd]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              SIMPLE PROCESS
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              How Hippocrates Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-3">
              <span className="font-mono text-xs font-bold text-blue-600 tracking-widest block">
                01
              </span>
              <h3 className="font-bold text-xl text-slate-900">Ask</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Start a natural conversation about your health, lab report, or complex clinical question.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-3">
              <span className="font-mono text-xs font-bold text-blue-600 tracking-widest block">
                02
              </span>
              <h3 className="font-bold text-xl text-slate-900">Understand</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hippocrates helps organize, synthesize, and explain the medical information with context-aware reasoning.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-3">
              <span className="font-mono text-xs font-bold text-blue-600 tracking-widest block">
                03
              </span>
              <h3 className="font-bold text-xl text-slate-900">Act</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Use the insights to make better-informed next steps, clinical decisions, or seek appropriate professional care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. SECTION 8 — ONE PLATFORM */}
      <section id="platform" className="py-20 sm:py-24 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            One platform.
            <br />
            Two experiences.
            <br />
            <span className="text-blue-600">Better outcomes.</span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed pt-2">
            Hippocrates connects patient-focused intelligence with doctor-focused clinical assistance in one unified platform.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 max-w-md mx-auto">
            <button
              onClick={handleLaunchPatient}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <span>Patients</span>
              <ArrowRight className="h-4 w-4 text-blue-600" />
              <span className="font-bold">Aegis</span>
            </button>

            <button
              onClick={handleLaunchDoctor}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-slate-100 border border-slate-300 text-slate-900 text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <span>Doctors</span>
              <ArrowRight className="h-4 w-4 text-slate-700" />
              <span className="font-bold">Oracle</span>
            </button>
          </div>
        </div>
      </section>

      {/* 10. SECTION 9 — SAFETY / TRUST */}
      <section id="safety" className="py-20 sm:py-24 border-t border-slate-100 bg-[#fbfcfd]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            RESPONSIBLE AI
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Built to assist.
            <br />
            Designed to keep humans in control.
          </h2>
          <p className="text-slate-600 text-base max-w-2xl mx-auto leading-relaxed">
            Hippocrates is designed to support health understanding and clinical workflows, not replace qualified healthcare professionals.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/70 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">AI Assistance, Not a Diagnosis</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Informational guidance intended to assist clinical thinking and improve patient literacy.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/70 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Stethoscope className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Professional Care is Essential</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Independent medical evaluation and physician judgment remain necessary for all clinical decisions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/70 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertCircle className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Emergency Situations</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Emergency or acute life-threatening situations require immediate local professional intervention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. SECTION 10 — FINAL CTA */}
      <section className="py-20 sm:py-28 border-t border-slate-100 bg-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Better conversations.
            <br />
            Better understanding.
            <br />
            Better care.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Explore Hippocrates and experience a more natural way to interact with healthcare intelligence.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button
              onClick={handleLaunchPatient}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-8 py-3.5 rounded-xl text-sm font-semibold shadow-sm"
            >
              <span>Talk to Aegis</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button
              variant="outline"
              onClick={handleLaunchDoctor}
              className="border-slate-300 hover:bg-slate-50 text-slate-900 px-8 py-3.5 rounded-xl text-sm font-semibold"
            >
              <span>Explore Oracle</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      </div>

      {/* UNIVERSAL FOOTER */}
      <PublicFooter />

      {/* Modals for Get Started, About, Contact, Legal */}
      <GetStartedModal
        open={getStartedOpen}
        onOpenChange={setGetStartedOpen}
        onSelectPersona={onSelectPersona}
      />

      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />

      <LegalModal
        open={legalModal !== null}
        onOpenChange={(open) => !open && setLegalModal(null)}
        type={legalModal || "privacy"}
      />
    </div>
  );
}
