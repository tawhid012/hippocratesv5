import "server-only";
import crypto from "crypto";
import type { ReportAnalysisResult, SafetyEvaluation } from "@/lib/types";

interface CachedReportEntry {
  reportAnalysis: ReportAnalysisResult;
  safetyEvaluation: SafetyEvaluation;
  formattedReply: string;
  timestamp: number;
}

// In-memory LRU cache limited to 100 recent unique reports with a 1-hour TTL
const MAX_CACHE_SIZE = 100;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const reportCache = new Map<string, CachedReportEntry>();

export function computeReportHash(fileBase64: string, notes: string = ""): string {
  // Use first 8KB + length + notes for fast hashing of large files
  const sample = fileBase64.length > 8192 ? fileBase64.slice(0, 4096) + fileBase64.slice(-4096) : fileBase64;
  return crypto
    .createHash("sha256")
    .update(`${sample}:${fileBase64.length}:${notes.trim()}`)
    .digest("hex");
}

export function getCachedReport(hash: string): CachedReportEntry | null {
  const entry = reportCache.get(hash);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    reportCache.delete(hash);
    return null;
  }

  // Refresh position in LRU Map
  reportCache.delete(hash);
  reportCache.set(hash, entry);
  return entry;
}

export function setCachedReport(
  hash: string,
  reportAnalysis: ReportAnalysisResult,
  safetyEvaluation: SafetyEvaluation,
  formattedReply: string
): void {
  if (reportCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = reportCache.keys().next().value;
    if (oldestKey) {
      reportCache.delete(oldestKey);
    }
  }

  reportCache.set(hash, {
    reportAnalysis,
    safetyEvaluation,
    formattedReply,
    timestamp: Date.now(),
  });
}
