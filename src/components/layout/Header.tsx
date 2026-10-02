"use client";

import Image from "next/image";
import { Menu, Stethoscope, HeartPulse, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/hooks/useAppContext";

export function Header() {
  const { toggleSidebar, persona, switchPersona } = useApp();

  return (
    <header className="premium-hairline sticky top-0 z-[70] grid min-h-[68px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 sm:px-4 sm:gap-3 lg:px-6 backdrop-blur-2xl bg-white/60">
      {/* Left — sidebar toggle + brand */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          variant="glass"
          size="icon-sm"
          className="shrink-0 rounded-xl"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </Button>

        <button
          onClick={switchPersona}
          aria-label="Hippocrates home"
          className="group flex min-w-0 items-center gap-2.5 transition-opacity duration-200 hover:opacity-90 text-left select-none"
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <Image
              src="/logo.jpg"
              alt="Hippocrates Logo"
              width={48}
              height={32}
              className="h-7 sm:h-8 w-auto object-contain select-none rounded-md"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-base font-semibold tracking-tight text-slate-900 font-sans">
              Hippocrates
            </span>
            <span className="text-[7px] font-medium uppercase tracking-[0.22em] text-slate-400 mt-1 font-sans">
              AI CLINICAL PLATFORM
            </span>
          </div>
        </button>

        {persona && (
          <div className="hidden md:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100/90 text-slate-800 border border-slate-200/80">
            {persona === "doctor" ? (
              <>
                <Stethoscope className="h-3.5 w-3.5 text-hippo-navy" />
                <span>Doctor Mode • Oracle</span>
              </>
            ) : (
              <>
                <HeartPulse className="h-3.5 w-3.5 text-hippo-blue" />
                <span>Patient Mode • Aegis</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Center — empty spacer */}
      <div aria-hidden />

      {/* Right — Switch Persona button */}
      <div className="flex items-center gap-2">
        {persona && (
          <Button
            variant="ghost"
            size="sm"
            onClick={switchPersona}
            className="rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/80 border border-transparent hover:border-slate-200"
            title="Switch between Doctor and Patient persona"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5 text-hippo-blue" />
            <span className="hidden sm:inline">Switch Role</span>
          </Button>
        )}
      </div>
    </header>
  );
}
