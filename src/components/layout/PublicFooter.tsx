"use client";

import Link from "next/link";
import { HippocratesLogo } from "@/components/landing/HippocratesLogo";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-6 space-y-4">
            <div className="brightness-0 invert">
              <HippocratesLogo size="md" />
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Clinical intelligence platform built with advanced AI architectures to empower patients and support physicians.
            </p>
          </div>

          <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <h4 className="font-semibold text-white tracking-wider text-xs uppercase">Platform</h4>
              <ul className="space-y-2.5 text-slate-400">
                <li><Link href="/platform" className="hover:text-white transition-colors">Platform</Link></li>
                <li><Link href="/for-patients" className="hover:text-white transition-colors">For Patients</Link></li>
                <li><Link href="/for-doctors" className="hover:text-white transition-colors">For Doctors</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-white tracking-wider text-xs uppercase">Company</h4>
              <ul className="space-y-2.5 text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-white tracking-wider text-xs uppercase">Legal</h4>
              <ul className="space-y-2.5 text-slate-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <span>© 2026 Hippocrates AI. All rights reserved.</span>
          <span>Secure • Reliable • Responsible Clinical AI</span>
        </div>
      </div>
    </footer>
  );
}
