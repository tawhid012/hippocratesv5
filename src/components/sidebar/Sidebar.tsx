"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Settings,
  MessageSquare,
  X,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  SquarePen,
  Pin,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/hooks/useAppContext";
import { CasesListSkeleton } from "@/components/skeletons/CasesListSkeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCaseDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCaseTitle(title: string): string {
  if (!title) return "Health Consultation";
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  if (title.startsWith("Report:") && uuidRegex.test(title)) {
    return "Report Analysis";
  }
  return title;
}

// ---------------------------------------------------------------------------
// Sidebar Nav Item
// ---------------------------------------------------------------------------

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
}

function SidebarNavItem({ icon: Icon, label, onClick, href, active }: NavItemProps) {
  const className = cn(
    "group relative flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.005em]",
    "transition-all duration-200 ease-out cursor-pointer",
    active
      ? "bg-white/76 text-foreground shadow-[0_12px_30px_rgba(26,39,68,0.065)] ring-1 ring-hippo-navy/[0.055]"
      : "text-muted-foreground hover:-translate-y-px hover:bg-white/60 hover:text-foreground hover:shadow-[0_10px_26px_rgba(26,39,68,0.045)]"
  );

  const content = (
    <>
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-[14px] bg-white/76 ring-1 ring-hippo-navy/[0.055]"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <Icon
        className={cn(
          "relative h-[17px] w-[17px] shrink-0 transition-all duration-200 group-hover:scale-[1.04]",
          active ? "text-accent" : "text-muted-foreground/70 group-hover:text-foreground/80"
        )}
        strokeWidth={1.75}
      />
      <span className="relative truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Case Item with inline rename + delete
// ---------------------------------------------------------------------------

interface CaseItemProps {
  caseItem: CaseSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => Promise<void>;
}

function CaseItem({ caseItem, isActive, onSelect, onDelete, onRename }: CaseItemProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(caseItem.title);
  const [renameLoading, setRenameLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when rename mode activates
  useEffect(() => {
    if (renaming) {
      setRenameValue(caseItem.title);
      setTimeout(() => inputRef.current?.select(), 30);
    }
  }, [renaming, caseItem.title]);

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === caseItem.title) {
      setRenaming(false);
      return;
    }
    setRenameLoading(true);
    try {
      await onRename(trimmed);
    } finally {
      setRenameLoading(false);
      setRenaming(false);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void commitRename();
    if (e.key === "Escape") setRenaming(false);
  };

  if (confirmingDelete) {
    return (
      <div className="flex items-center justify-between gap-1.5 px-3 py-2.5 my-0.5 bg-destructive/10 border border-destructive/25 rounded-[14px] animate-in fade-in-0 duration-150">
        <span className="text-[12px] font-semibold text-destructive truncate">Delete chat?</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(false);
              onDelete();
            }}
            className="px-2.5 py-1 rounded-[7px] bg-destructive text-white text-[11px] font-semibold hover:bg-destructive/90 transition shadow-sm cursor-pointer"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(false);
            }}
            className="px-2.5 py-1 rounded-[7px] bg-white/90 dark:bg-slate-800 text-foreground text-[11px] font-medium hover:bg-white transition cursor-pointer border border-slate-200/80"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative w-full rounded-[15px] transition-all duration-200",
        isActive
          ? "bg-white/85 ring-1 ring-hippo-navy/[0.08] shadow-[0_12px_30px_rgba(26,39,68,0.065)]"
          : "hover:-translate-y-px hover:bg-white/60 hover:shadow-[0_10px_26px_rgba(26,39,68,0.04)]"
      )}
    >
      {/* Main clickable row */}
      <button
        type="button"
        onClick={() => {
          if (!renaming) onSelect();
        }}
        className="w-full min-w-0 overflow-hidden text-left px-3.5 py-3 cursor-pointer"
      >
        <div className="flex items-start gap-2.5 pr-10 min-w-0">
          <MessageSquare
            className={cn(
              "h-[15px] w-[15px] mt-0.5 shrink-0 transition-all duration-200 group-hover:scale-[1.04]",
              isActive ? "text-accent" : "text-muted-foreground/60 group-hover:text-muted-foreground"
            )}
            strokeWidth={1.75}
          />
          <div className="min-w-0 flex-1">
            {renaming ? (
              <div className="flex items-center gap-1.5 -mx-1" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={() => void commitRename()}
                  className="w-full min-w-0 bg-white/90 dark:bg-slate-800 text-[13px] font-medium text-foreground rounded-lg px-2 py-0.5 outline-none ring-2 ring-accent/50 focus:ring-accent transition shadow-sm"
                  disabled={renameLoading}
                />
                {renameLoading ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
                ) : (
                  <button
                    type="button"
                    onClick={() => void commitRename()}
                    className="shrink-0 text-accent hover:text-accent/80 p-0.5"
                    title="Save"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="shrink-0 text-muted-foreground hover:text-foreground p-0.5"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <p className="text-[13px] font-medium truncate text-foreground/90 leading-snug tracking-[-0.006em]">
                {formatCaseTitle(caseItem.title)}
              </p>
            )}

            {!renaming && (
              <p className="text-[10px] text-muted-foreground/50 mt-1.5 tabular-nums">
                {formatCaseDate(caseItem.updatedAt)}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Actions Menu (⋯) — smoothly visible on hover and always on active item */}
      {!renaming && (
        <div
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-all duration-150 z-30",
            isActive
              ? "opacity-100 visible pointer-events-auto"
              : "opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto focus-within:opacity-100 focus-within:visible focus-within:pointer-events-auto"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/65 hover:bg-white/90 text-muted-foreground hover:text-foreground transition-all shadow-sm border border-slate-200/50 backdrop-blur-md dark:bg-white/65 dark:hover:bg-white/90 dark:border-slate-200/50"
                title="Conversation actions"
                aria-label="Conversation actions"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 rounded-[1.25rem] bg-white/65 dark:bg-white/65 backdrop-blur-xl border border-white/50 p-2 shadow-[0_28px_80px_rgba(26,39,68,0.14)]"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setRenaming(true);
                }}
                className="gap-2.5 cursor-pointer rounded-xl px-3 py-2 text-[12px] font-medium transition-all focus:bg-white/80 dark:focus:bg-white/80 focus:shadow-[0_4px_12px_rgba(26,39,68,0.03)]"
              >
                <Pencil className="h-4 w-4 text-muted-foreground/80" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingDelete(true);
                }}
                className="gap-2.5 cursor-pointer rounded-xl px-3 py-2 text-[12px] font-medium transition-all text-destructive focus:text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  onNewCase: () => void;
  onSelectCase: (caseId: string) => void;
  onDeleteCase: (caseId: string) => Promise<void>;
  onRenameCase: (caseId: string, newTitle: string) => Promise<void>;
  onOpenSettings: () => void;
  cases: CaseSummary[];
  casesLoading?: boolean;
  activeCaseId?: string | null;
}

export function Sidebar({
  onNewCase,
  onSelectCase,
  onDeleteCase,
  onRenameCase,
  onOpenSettings,
  cases,
  casesLoading = false,
  activeCaseId,
}: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, persona } = useApp();
  const isPatient = persona === "patient";

  return (
    <>
      {/* Mobile backdrop for screens < 768px */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 top-[68px] z-40 bg-hippo-navy/10 backdrop-blur-[2px] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className={cn(
          "fixed left-0 top-[68px] z-50 flex h-[calc(100%-68px)] flex-col overflow-hidden glass-sidebar bg-white/65 backdrop-blur-xl",
          "md:top-auto md:h-full md:relative md:z-30 md:shrink-0",
          "border-r border-slate-200/80 dark:border-slate-800",
          sidebarOpen ? "w-[280px] min-w-[280px]" : "w-0 min-w-0 pointer-events-none border-r-0"
        )}
      >
        <div className="flex h-full w-[280px] min-w-[280px] flex-col">
          {/* Mobile close button */}
          <div className="flex justify-end px-4 pb-1 pt-3 md:hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>

          {/* Primary nav */}
          <nav className="space-y-1 px-4 pt-3 md:pt-4">
            <SidebarNavItem
              icon={Plus}
              label={isPatient ? "New Health Chat" : "New Case"}
              onClick={onNewCase}
            />
            <SidebarNavItem
              icon={Search}
              label={isPatient ? "Search Chats" : "Search Cases"}
              onClick={() => {}}
            />
          </nav>

          {/* Previous Cases / Conversations */}
          <div className="mt-6 flex-1 overflow-hidden px-4">
            <p className="px-3.5 mb-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.14em]">
              {isPatient ? "Saved Conversations" : "Previous Cases"}
            </p>
            <ScrollArea className="h-[calc(100%-1.75rem)] mt-2.5">
              <div className="space-y-1 pr-1">
                {casesLoading && (
                  <div className="px-1 py-1 space-y-2">
                    <div className="flex items-center gap-2 px-2 text-[11px] text-muted-foreground/70 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin text-accent" strokeWidth={2} />
                      <span>{isPatient ? "Syncing health history…" : "Loading case records…"}</span>
                    </div>
                    <CasesListSkeleton count={5} />
                  </div>
                )}

                {!casesLoading && cases.length === 0 && (
                  <div className="rounded-[15px] px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground/65">
                    {isPatient
                      ? "No saved conversations yet. Ask Aegis a health question or upload a medical report to start."
                      : "No saved cases yet. Start a new case to save the conversation."}
                  </div>
                )}

                {!casesLoading &&
                  cases.map((caseItem) => (
                    <CaseItem
                      key={caseItem.id}
                      caseItem={caseItem}
                      isActive={activeCaseId === caseItem.id}
                      onSelect={() => {
                        onSelectCase(caseItem.id);
                        // Close sidebar on mobile phones (< 768px) after selecting
                        if (window.innerWidth < 768) {
                          setSidebarOpen(false);
                        }
                      }}
                      onDelete={() => void onDeleteCase(caseItem.id)}
                      onRename={(newTitle) => onRenameCase(caseItem.id, newTitle)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </div>

          {/* Footer nav */}
          <div className="mt-auto px-4 pb-6 pt-4 space-y-1 border-t border-hippo-navy/[0.055]">
            <SidebarNavItem
              icon={Settings}
              label="Settings"
              onClick={onOpenSettings}
            />
          </div>
        </div>
      </motion.aside>

      {/* Mini taskbar when sidebar is closed on desktop/tablet */}
      {!sidebarOpen && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="hidden md:flex relative shrink-0 z-30 h-full w-[68px] flex-col items-center py-5 border-r border-slate-200/80 dark:border-slate-800 glass-sidebar bg-white/65 backdrop-blur-xl"
        >
          {/* Top Icons */}
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewCase}
              title="New Case"
              className="rounded-[14px] h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-white/60 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(26,39,68,0.04)]"
            >
              <SquarePen className="h-5 w-5" strokeWidth={1.75} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              title="Search"
              className="rounded-[14px] h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-white/60 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(26,39,68,0.04)]"
            >
              <Search className="h-5 w-5" strokeWidth={1.75} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              title="Pinned"
              className="rounded-[14px] h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-white/60 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(26,39,68,0.04)]"
            >
              <Pin className="h-5 w-5" strokeWidth={1.75} />
            </Button>
          </div>

          {/* Bottom Settings Icon */}
          <div className="mt-auto flex flex-col gap-3 pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              title="Settings"
              className="rounded-[14px] h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-white/60 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(26,39,68,0.04)]"
            >
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}
