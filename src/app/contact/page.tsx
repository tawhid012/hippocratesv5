"use client";

import { useState } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, Send, CheckCircle2, Building } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", role: "patient", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between">
      <div>
        <PublicNavbar />

        {/* Hero & Contact Section */}
        <section className="pt-12 sm:pt-20 pb-20 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#eef4ff] text-[#2563eb] border border-[#dbeafe]">
                <Sparkles className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>Get in Touch</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.04em] text-slate-900 leading-[1.08]">
                We are here to help.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Have questions about Hippocrates, Aegis, or Oracle clinical integrations? Reach out to our team and we will respond promptly.
              </p>

              <div className="space-y-4 pt-4 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">Email Support</span>
                    <span className="text-slate-500">support@hippocrates.ai</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">Clinical Inquiries</span>
                    <span className="text-slate-500">clinical@hippocrates.ai</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form Card */}
            <div className="lg:col-span-7">
              <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/80 shadow-xl">
                {submitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Message Received!</h3>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      Thank you for reaching out. Our team will review your inquiry and get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: "", email: "", role: "patient", message: "" });
                      }}
                      variant="outline"
                      className="mt-4"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Send us a message</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Your Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Dr. Alex Morgan"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Email Address</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="alex@hospital.org"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">I am a...</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="patient">Patient / Family Member</option>
                        <option value="doctor">Physician / Healthcare Provider</option>
                        <option value="partner">Institutional Partner</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Message</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="How can we assist you?"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-3.5 rounded-xl font-medium text-sm shadow-md flex items-center justify-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>Send Message</span>
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
