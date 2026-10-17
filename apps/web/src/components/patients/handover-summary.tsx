"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { aiApi, type HandoverHours, type HandoverSummary as HandoverSummaryResult } from "@/lib/api/ai.api";
import { ApiClientError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/locale";

const HOUR_OPTIONS: HandoverHours[] = [12, 24, 48];

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "Could not generate the summary. Please try again.";
}

export function HandoverSummary({ patientId }: { patientId: string }) {
  const [hours, setHours] = useState<HandoverHours>(24);
  // Kept only in component memory: the summary is health data and is never persisted client-side.
  const [result, setResult] = useState<HandoverSummaryResult | null>(null);

  const mutation = useMutation({
    mutationFn: (selected: HandoverHours) => aiApi.handoverSummary(patientId, selected),
    onSuccess: setResult
  });

  function generate(): void {
    toast.promise(mutation.mutateAsync(hours), {
      loading: "Preparing handover summary...",
      success: "Handover summary generated",
      error: errorMessage
    });
  }

  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold text-text">
          <Sparkles className="h-5 w-5 text-primary" /> Shift Handover Summary
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border p-1" role="radiogroup" aria-label="Time range">
            {HOUR_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={hours === option}
                disabled={mutation.isPending}
                onClick={() => setHours(option)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold focus-ring ${
                  hours === option ? "bg-primary text-white" : "text-muted hover:bg-surface"
                }`}
              >
                Last {option} h
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={mutation.isPending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white focus-ring disabled:opacity-60"
          >
            {mutation.isPending ? "Generating..." : "Generate handover summary"}
          </button>
        </div>
      </div>

      {mutation.isPending && !result ? <div className="mt-4 h-32 animate-pulse rounded-2xl bg-surface" /> : null}

      {result ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface">
          <div className="flex items-start gap-2 rounded-t-2xl border-b border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">
              {result.updateCount > 0
                ? "AI-generated. Please verify against the original records."
                : "No care records in this time range, so no AI summary was generated."}
            </span>
            <button
              type="button"
              onClick={() => setResult(null)}
              aria-label="Close summary"
              className="rounded-md p-0.5 hover:bg-yellow-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="mb-3 text-xs text-muted">
              Last {result.hours} h · {result.updateCount} records · {formatDateTime(result.generatedAt)}
              {result.truncated ? " · only the most recent records were used" : ""}
            </p>
            {/* Plain text only — model output is never rendered as HTML. */}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{result.summary}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
