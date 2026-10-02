"use client";

import { useRef, useEffect, useState, FormEvent, KeyboardEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Send,
  ArrowUp,
  FileText,
  X,
  Mic,
  Check,
  AlertCircle,
  Radio,
  ImageIcon,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useApp } from "@/hooks/useAppContext";
import { useVoiceCopilot } from "@/hooks/useVoiceCopilot";
import { optimizeMedicalImageForUpload } from "@/lib/image-optimizer";
import type { AttachmentCategory } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AttachmentFile {
  fileBase64: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
  dataUrl?: string;
  attachmentType?: AttachmentCategory;
}

interface ChatInputProps {
  onSend: (message: string, attachment?: AttachmentFile | AttachmentFile[]) => void;
  disabled?: boolean;
  centered?: boolean;
  placeholder?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ChatInput({
  onSend,
  disabled = false,
  centered = false,
  placeholder,
}: ChatInputProps) {
  const { persona } = useApp();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<AttachmentFile[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const labReportInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [zoomedImage, setZoomedImage] = useState<AttachmentFile | null>(null);

  const isPatient = persona === "patient";

  const {
    isListening,
    transcript,
    interimTranscript,
    duration,
    audioLevel,
    error: voiceError,
    startListening,
    stopListening,
    cancelListening,
    clearError: clearVoiceError,
  } = useVoiceCopilot();

  const defaultPlaceholder = isPatient
    ? "Ask Aegis about your health, symptoms, or upload a photo / report..."
    : "Describe clinical case or use 🎙️ Copilot to listen to consultation...";

  const activePlaceholder = placeholder || defaultPlaceholder;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [value]);

  // Dismiss attachment menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    }
    if (showAttachmentMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachmentMenu]);

  const handleLabReportSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    setShowAttachmentMenu(false);

    try {
      const optimized = await optimizeMedicalImageForUpload(file);
      setSelectedFiles([
        {
          fileBase64: optimized.base64,
          mimeType: optimized.mimeType,
          fileName: file.name,
          fileSize: optimized.fileSize,
          dataUrl: optimized.dataUrl,
          attachmentType: "lab_report",
        },
      ]);
    } catch {
      // Direct reader fallback
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result as string;
        const base64Index = resultStr.indexOf(",");
        const fileBase64 = base64Index !== -1 ? resultStr.substring(base64Index + 1) : resultStr;
        setSelectedFiles([
          {
            fileBase64,
            mimeType: file.type || "application/pdf",
            fileName: file.name,
            fileSize: file.size,
            dataUrl: file.type.startsWith("image/") ? resultStr : undefined,
            attachmentType: "lab_report",
          },
        ]);
      };
      reader.readAsDataURL(file);
    } finally {
      setFileLoading(false);
    }
  };

  const handleImagesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setFileLoading(true);
    setShowAttachmentMenu(false);

    try {
      const readPromises = files.map(async (file) => {
        const optimized = await optimizeMedicalImageForUpload(file);
        return {
          fileBase64: optimized.base64,
          mimeType: optimized.mimeType,
          fileName: file.name,
          fileSize: optimized.fileSize,
          dataUrl: optimized.dataUrl,
          attachmentType: "medical_image" as const,
        };
      });

      const newAttachments = await Promise.all(readPromises);
      setSelectedFiles((prev) => {
        // If previous files were lab reports, replace with images; otherwise append
        const filtered = prev.filter((p) => p.attachmentType === "medical_image");
        return [...filtered, ...newAttachments].slice(0, 4); // Max 4 images
      });
    } catch {
      // Ignore read error
    } finally {
      setFileLoading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFileIndex = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (labReportInputRef.current) labReportInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if ((!value.trim() && selectedFiles.length === 0) || disabled || fileLoading || isListening) return;

    if (selectedFiles.length === 1) {
      onSend(value, selectedFiles[0]);
    } else if (selectedFiles.length > 1) {
      onSend(value, selectedFiles);
    } else {
      onSend(value);
    }

    setValue("");
    setSelectedFiles([]);
    if (labReportInputRef.current) labReportInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFinishVoice = () => {
    const consultationTranscript = stopListening();
    if (consultationTranscript) {
      const prefix = "Consultation Dialogue (Doctor & Patient):\n";
      onSend(`${prefix}${consultationTranscript}`);
      setValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = Boolean(value.trim() || selectedFiles.length > 0) && !disabled && !fileLoading && !isListening;

  return (
    <motion.form
      initial={centered ? { opacity: 0, y: 16 } : false}
      animate={centered ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
      onSubmit={handleSubmit}
      className={cn(
        "w-full relative",
        centered ? "max-w-2xl mx-auto px-2" : "max-w-3xl mx-auto px-3 sm:px-6 pb-4 sm:pb-6 pt-2"
      )}
    >
      {/* Hidden file inputs for Lab Report & Image & Replacement */}
      <input
        type="file"
        ref={labReportInputRef}
        onChange={handleLabReportSelected}
        accept="application/pdf,image/png,image/jpeg,image/jpg"
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImagesSelected}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        className="hidden"
      />

      {/* Full-view Modal for Zoomed Image */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-2 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground truncate max-w-[280px]">
                    {zoomedImage.fileName}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setZoomedImage(null)}
                  className="h-7 w-7 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative flex items-center justify-center p-3 overflow-auto max-h-[70vh]">
                {zoomedImage.dataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={zoomedImage.dataUrl}
                    alt={zoomedImage.fileName}
                    className="max-h-[60vh] w-auto rounded-xl object-contain shadow-md"
                  />
                )}
              </div>
              <div className="px-3 py-2 bg-muted/40 rounded-b-xl flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{zoomedImage.fileSize ? `${Math.round(zoomedImage.fileSize / 1024)} KB` : "Image preview"}</span>
                <span>Click outside or close to return</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Error Notice */}
      <AnimatePresence>
        {voiceError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-2 mx-1 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{voiceError}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clearVoiceError}
              className="h-6 w-6 rounded text-amber-800 hover:bg-amber-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "rounded-2xl sm:rounded-[1.4rem] border border-slate-200/90 bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] flex flex-col transition-all duration-200 relative",
          centered && !focused && "shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
          focused && "border-slate-300 shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
          isListening && "border-blue-500/50 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-[0_10px_30px_rgba(59,130,246,0.1)]"
        )}
      >
        {/* Compact ChatGPT-style Attachment Previews inside composer */}
        {selectedFiles.length > 0 && !isListening && (
          <div className="pt-3 px-3.5 pb-0 flex flex-wrap items-center gap-2.5">
            {selectedFiles.map((file, idx) =>
              file.attachmentType === "medical_image" ? (
                /* Compact Image Thumbnail (ChatGPT-style) */
                <div key={idx} className="group relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setZoomedImage(file)}
                    className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden border border-border/80 bg-muted/40 shadow-xs hover:ring-2 hover:ring-primary/40 transition-all flex items-center justify-center cursor-pointer"
                    title="Click to preview image"
                  >
                    {file.dataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={file.dataUrl}
                        alt={file.fileName || "Attached health image"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>

                  {/* Remove X Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFileIndex(idx);
                    }}
                    aria-label="Remove image"
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background hover:scale-110 flex items-center justify-center shadow-md transition-transform z-10"
                  >
                    <X className="h-3 w-3 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                /* Compact Lab Report Document Chip (ChatGPT-style) */
                <div
                  key={idx}
                  className="group relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/70 hover:bg-muted border border-border/70 max-w-[240px] text-xs font-medium text-foreground transition-all"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate text-xs text-foreground/90 select-none">
                    {file.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFileIndex(idx);
                    }}
                    aria-label="Remove report"
                    className="ml-1 h-4 w-4 shrink-0 rounded-full hover:bg-foreground/15 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3 stroke-[2]" />
                  </button>
                </div>
              )
            )}

            {/* Quick add additional image if < 4 */}
            {selectedFiles[0]?.attachmentType === "medical_image" && selectedFiles.length < 4 && (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-all text-[11px] gap-0.5"
                title="Add another photo (up to 4)"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[9px] font-medium">Add</span>
              </button>
            )}
          </div>
        )}

        {/* Ambient Voice Copilot Listening Banner inside Chat Box */}
        {isListening ? (
          <div className="p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span
                    className="absolute inset-0 rounded-full bg-blue-500 opacity-40 animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      Oracle Copilot Listening
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                      {formatDuration(duration)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ambient Consultation Mode • Doctor & Patient dialogue
                  </p>
                </div>
              </div>

              {/* Dynamic waveform visualization */}
              <div className="flex items-center gap-1 h-5 px-2">
                {[0.4, 0.8, 1.2, 0.6, 1.0, 0.7].map((scale, i) => (
                  <span
                    key={i}
                    className="w-1 bg-blue-500 rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(4, Math.min(20, (audioLevel * 20 + 4) * scale))}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live consultation transcript preview */}
            <div className="rounded-xl bg-background/60 border border-border/50 p-3 min-h-[56px] max-h-[140px] overflow-y-auto text-xs sm:text-sm text-foreground/90 font-sans leading-relaxed">
              {transcript || interimTranscript ? (
                <span>
                  {transcript} <span className="text-blue-500 italic">{interimTranscript}</span>
                </span>
              ) : (
                <span className="text-muted-foreground/60 italic">
                  Listening to doctor and patient speaking... Conversation will appear in real-time here.
                </span>
              )}
            </div>

            {/* Action buttons inside the active voice session */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelListening}
                className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleFinishVoice}
                  disabled={!transcript && !interimTranscript}
                  className="h-8 px-4 rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Analyze Consultation
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Chat Input Composer */
          <div className="flex items-end gap-1.5 sm:gap-2 p-2.5 sm:p-3 min-h-[56px] relative">
            {/* Attachment Button */}
            <div className="relative" ref={menuRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (isPatient) {
                        setShowAttachmentMenu((prev) => !prev);
                      } else {
                        labReportInputRef.current?.click();
                      }
                    }}
                    className={cn(
                      "shrink-0 h-9 w-9 sm:h-10 sm:w-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors",
                      selectedFiles.length > 0 && "text-blue-600 bg-blue-50 hover:bg-blue-100",
                      showAttachmentMenu && "bg-slate-100 text-slate-900 ring-2 ring-blue-500/20"
                    )}
                    disabled={disabled || fileLoading}
                  >
                    <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPatient ? "Upload report or physical photo" : "Attach clinical document"}
                </TooltipContent>
              </Tooltip>

              {/* Aegis 2-Option Attachment Dropdown Menu */}
              <AnimatePresence>
                {showAttachmentMenu && isPatient && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute bottom-12 left-0 z-50 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 flex flex-col gap-1"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        labReportInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 group-hover:text-emerald-700">
                          Upload Lab Report
                        </span>
                        <span className="text-[10px] text-slate-500">PDF, JPG, PNG blood tests</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        imageInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 shrink-0">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-700">
                          Upload Health Image
                        </span>
                        <span className="text-[10px] text-slate-500">Photos of rashes, cuts, swelling</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={activePlaceholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent text-[15px] sm:text-[15.5px] leading-relaxed text-slate-900 tracking-[-0.005em]",
                "placeholder:text-slate-400 placeholder:font-normal",
                "focus:outline-none",
                "max-h-[200px] py-2 px-1.5"
              )}
            />

            {/* Voice Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={startListening}
                  className={cn(
                    "shrink-0 h-9 w-9 sm:h-10 sm:w-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors",
                    !isPatient && "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  )}
                  disabled={disabled || fileLoading}
                >
                  <Mic className="h-[19px] w-[19px]" strokeWidth={1.8} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPatient
                  ? "Voice input for questions"
                  : "Oracle Voice Copilot • Ambient Doctor-Patient consultation listening"}
              </TooltipContent>
            </Tooltip>

            {/* Send Button */}
            <Button
              type="submit"
              size="icon"
              disabled={!canSubmit}
              className={cn(
                "shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl transition-all duration-200",
                canSubmit
                  ? "bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:scale-[1.02] cursor-pointer"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-100 cursor-not-allowed shadow-none"
              )}
            >
              {centered ? (
                <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <Send className="h-4 w-4" strokeWidth={2} />
              )}
            </Button>
          </div>
        )}
      </div>

      {!centered && (
        <p className="text-center text-[11px] text-slate-400 mt-2.5 font-normal tracking-normal px-2">
          {isPatient
            ? "Aegis helps explain health information and visible concerns. A photo cannot confirm a diagnosis. Always consult a healthcare professional."
            : "Oracle Copilot provides clinical decision support. Always verify AI-generated notes before saving."}
        </p>
      )}
    </motion.form>
  );
}
