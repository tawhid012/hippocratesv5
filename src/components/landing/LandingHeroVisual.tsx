"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";

export function LandingHeroVisual() {
  return (
    <div className="relative w-full max-w-[540px] aspect-square flex items-center justify-center select-none">
      {/* Background ambient radial gradients */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/60 via-sky-50/40 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Concentric subtle ripple rings */}
      <div className="absolute w-[92%] h-[92%] rounded-full border border-blue-100/70 pointer-events-none" />
      <div className="absolute w-[78%] h-[78%] rounded-full border border-blue-200/50 pointer-events-none" />
      <div className="absolute w-[64%] h-[64%] rounded-full border border-blue-200/40 pointer-events-none" />

      {/* Subtle floating accent dots */}
      <div className="absolute top-[18%] right-[14%] w-1.5 h-1.5 rounded-full bg-blue-400/80 animate-pulse" />
      <div className="absolute bottom-[24%] left-[16%] w-1.5 h-1.5 rounded-full bg-blue-400/80" />
      <div className="absolute top-[32%] left-[22%] w-1 h-1 rounded-full bg-blue-300/70" />

      {/* Central 3D-styled Layered Clinical Shield */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center"
      >
        {/* Outer ambient shadow layer */}
        <div className="w-56 sm:w-64 md:w-72 h-64 sm:h-72 md:h-80 relative flex items-center justify-center">
          {/* Layer 1: Shield Outer Shell with soft lighting & realistic 3D depth */}
          <div
            className="w-full h-full relative"
            style={{
              filter: "drop-shadow(0 28px 45px rgba(59, 130, 246, 0.18)) drop-shadow(0 8px 18px rgba(15, 23, 42, 0.08))",
            }}
          >
            <svg
              viewBox="0 0 240 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              {/* Definitions for 3D Bevels and Gradients */}
              <defs>
                <linearGradient id="shieldBg" x1="40" y1="20" x2="200" y2="260" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="45%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#eef4ff" />
                </linearGradient>

                <linearGradient id="shieldBorder" x1="20" y1="10" x2="220" y2="270" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#e2e8f0" />
                  <stop offset="70%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>

                <linearGradient id="innerShield" x1="60" y1="40" x2="180" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.75" />
                </linearGradient>

                <linearGradient id="ecgGlow" x1="40" y1="140" x2="200" y2="140" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>

                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Base Shield Outline */}
              <path
                d="M120 18 C168 18 214 38 214 38 C214 135 180 215 120 258 C60 215 26 135 26 38 C26 38 72 18 120 18 Z"
                fill="url(#shieldBg)"
                stroke="url(#shieldBorder)"
                strokeWidth="4"
              />

              {/* Inner Shield Bevel Layer */}
              <path
                d="M120 34 C158 34 196 50 196 50 C196 130 168 198 120 236 C72 198 44 130 44 50 C44 50 82 34 120 34 Z"
                fill="url(#innerShield)"
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />

              {/* Subtle Medical Cross Watermark in Background */}
              <path
                d="M112 85 H128 V105 H148 V121 H128 V141 H112 V121 H92 V105 H112 Z"
                fill="#3b82f6"
                fillOpacity="0.04"
              />

              {/* Vibrant Blue ECG / Heartbeat Line */}
              <path
                d="M 68 140 L 96 140 L 105 118 L 115 166 L 126 96 L 138 174 L 148 132 L 156 140 L 172 140"
                stroke="url(#ecgGlow)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#softGlow)"
              />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Floating Trust Card (Positioned bottom-left / lower-center just like reference) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="absolute -bottom-2 sm:bottom-2 left-0 sm:left-4 z-20 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/80 shadow-[0_16px_36px_rgba(15,23,42,0.08)] flex items-center gap-3 max-w-[280px] sm:max-w-xs"
      >
        <div className="h-10 w-10 rounded-xl bg-slate-100/90 border border-slate-200/60 flex items-center justify-center shrink-0 text-slate-700">
          <Users className="h-5 w-5 text-slate-700" strokeWidth={1.8} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold text-slate-900 tracking-tight leading-tight">
            Trusted by Healthcare Professionals
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5">
            Secure • Reliable • Responsible
          </span>
        </div>
      </motion.div>
    </div>
  );
}
