"use client";

import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between">
      <div>
        <PublicNavbar />

        <section className="pt-12 sm:pt-20 pb-20 px-4 sm:px-6 lg:px-10 max-w-4xl mx-auto space-y-10">
          <div className="space-y-4 border-b border-slate-200/80 pb-8">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#eef4ff] text-[#2563eb] border border-[#dbeafe]">
              <Shield className="h-3.5 w-3.5 text-[#2563eb]" />
              <span>Data Protection & Privacy Policy</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Privacy Principles & Policy
            </h1>
            <p className="text-slate-500 text-sm">Last updated: August 2026 • Hippocrates AI Platform</p>
          </div>

          <div className="space-y-8 text-sm text-slate-700 leading-relaxed">
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">1. Clinical Data Protection & Encryption</h3>
              <p>
                Hippocrates handles conversational transcripts, attached laboratory report files, and visual skin observations strictly to provide immediate AI clinical intelligence. All data transferred between your browser and our servers is encrypted in transit using industry-standard TLS 1.3 encryption, and at rest using robust AES-256 standards.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">2. Local Storage & Session State</h3>
              <p>
                Conversational cases and personal preferences may be stored in your local browser session or encrypted database instance. You retain full control over your data and can delete individual cases or clear your active history at any time through the platform interface.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">3. Non-Commercial Processing & AI Models</h3>
              <p>
                Your clinical prompts, laboratory extractions, and medical observations are never sold, rented, or repurposed for external ad-targeting algorithms. Model processing is isolated and adheres to strict medical confidentiality frameworks.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">4. User Rights & Data Control</h3>
              <p>
                You have the right to request access, correction, or permanent deletion of any personal data stored within your Hippocrates account. For privacy-related inquiries, contact our data protection team at support@hippocrates.ai.
              </p>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
