"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Stethoscope, HeartPulse } from "lucide-react";
import { HippocratesLogo } from "./HippocratesLogo";
import { Button } from "@/components/ui/button";

interface LandingNavbarProps {
  onSelectPersona: (persona: "doctor" | "patient") => void;
  onOpenGetStarted: () => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
}

export function LandingNavbar({
  onSelectPersona,
  onOpenGetStarted,
}: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between">
        <Link href="/" className="hover:opacity-95 transition-opacity" aria-label="Hippocrates Home">
          <HippocratesLogo size="md" />
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10" aria-label="Main Navigation">
          <Link href="/platform" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Platform
          </Link>
          <Link href="/for-patients" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            For Patients
          </Link>
          <Link href="/for-doctors" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            For Doctors
          </Link>
          <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            About
          </Link>
          <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Contact
          </Link>
        </nav>

        {/* Right: Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            onClick={onOpenGetStarted}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-full px-6 py-2.5 text-sm font-medium shadow-sm hover:shadow transition-all duration-200"
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-800 hover:bg-slate-100 rounded-xl"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-white/98 backdrop-blur-2xl md:hidden overflow-y-auto px-6 py-8 border-t border-slate-100 flex flex-col justify-between animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="space-y-6">
            <nav className="flex flex-col space-y-4" aria-label="Mobile Navigation">
              <Link href="/platform" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-900 py-2 border-b border-slate-100">
                Platform
              </Link>
              <Link href="/for-patients" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-900 py-2 border-b border-slate-100">
                For Patients
              </Link>
              <Link href="/for-doctors" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-900 py-2 border-b border-slate-100">
                For Doctors
              </Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-900 py-2 border-b border-slate-100">
                About
              </Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-slate-900 py-2 border-b border-slate-100">
                Contact
              </Link>
              <Link href="/privacy" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 py-1">
                Privacy Policy
              </Link>
              <Link href="/terms" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 py-1">
                Terms of Service
              </Link>
            </nav>

            <div className="pt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Direct Launch</p>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectPersona("patient");
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Talk to Aegis</div>
                    <div className="text-xs text-slate-500">For Patients</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectPersona("doctor");
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Try Oracle</div>
                    <div className="text-xs text-slate-500">For Doctors</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="pt-8 mt-auto border-t border-slate-100">
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenGetStarted();
              }}
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-3.5 rounded-xl text-base font-medium shadow-md"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
