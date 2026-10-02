"use client";

import Image from "next/image";

interface HippocratesLogoProps {
  size?: "sm" | "md" | "lg";
}

export function HippocratesLogo({ size = "md" }: HippocratesLogoProps) {
  const imageSizes = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-10 w-auto",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/logo.jpg"
          alt="Hippocrates Logo"
          width={40}
          height={40}
          className={`${imageSizes[size]} object-contain rounded-md select-none`}
          priority
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-col">
        <span className={`font-bold tracking-tight text-slate-900 ${textSizes[size]}`}>
          Hippocrates
        </span>
        <span className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold -mt-0.5">
          AI Clinical platform
        </span>
      </div>
    </div>
  );
}

