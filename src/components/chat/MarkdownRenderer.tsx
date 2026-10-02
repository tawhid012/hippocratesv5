"use client";

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  isStreaming,
}: MarkdownRendererProps) {
  if (!content && !isStreaming) return null;

  return (
    <div
      className={cn(
        "text-[15px] sm:text-[15.5px] leading-[1.7] text-slate-900 tracking-[-0.01em]",
        "space-y-3",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1
              {...props}
              className="text-lg sm:text-xl font-semibold text-slate-950 mt-4 mb-2 first:mt-0 tracking-[-0.015em]"
            />
          ),
          h2: ({ ...props }) => (
            <h2
              {...props}
              className="text-base sm:text-lg font-semibold text-slate-950 mt-4 mb-2 first:mt-0 tracking-[-0.015em]"
            />
          ),
          h3: ({ ...props }) => (
            <h3
              {...props}
              className="text-[15px] sm:text-base font-semibold text-slate-950 mt-3 mb-1.5 first:mt-0"
            />
          ),
          p: ({ ...props }) => (
            <p
              {...props}
              className="leading-[1.7] text-slate-900 my-2.5 first:mt-0 last:mb-0"
            />
          ),
          ul: ({ ...props }) => (
            <ul
              {...props}
              className="list-disc pl-5 my-3 space-y-1.5 marker:text-slate-600"
            />
          ),
          ol: ({ ...props }) => (
            <ol
              {...props}
              className="list-decimal pl-5 my-3 space-y-1.5 marker:font-medium marker:text-slate-600"
            />
          ),
          li: ({ ...props }) => (
            <li
              {...props}
              className="leading-[1.65] text-slate-900 pl-1"
            />
          ),
          strong: ({ ...props }) => (
            <strong
              {...props}
              className="font-semibold text-slate-950"
            />
          ),
          em: ({ ...props }) => (
            <em
              {...props}
              className="italic text-slate-800"
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              {...props}
              className="border-l-2 border-emerald-500/80 pl-4 py-0.5 my-3 italic text-slate-800 bg-slate-50 rounded-r-lg"
            />
          ),
          hr: ({ ...props }) => (
            <hr
              {...props}
              className="my-5 border-slate-200"
            />
          ),
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2 font-medium transition-colors"
            />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-slate-200">
              <table {...props} className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm" />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              {...props}
              className="bg-slate-100/80 px-3.5 py-2.5 text-left font-semibold text-slate-950"
            />
          ),
          td: ({ ...props }) => (
            <td
              {...props}
              className="px-3.5 py-2.5 border-t border-slate-200/80 text-slate-900"
            />
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  {...props}
                  className="bg-slate-100 border border-slate-200 text-slate-900 px-1.5 py-0.5 rounded text-[13px] font-mono font-medium"
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto my-3 text-xs font-mono border border-slate-800">
                <code {...props} className={codeClassName}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="inline-block w-1.5 h-4 ml-1 bg-slate-800 align-middle animate-pulse rounded-[1px]"
          aria-hidden="true"
        />
      )}
    </div>
  );
});


