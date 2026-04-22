"use client";

import { useMemo, useState, useTransition } from "react";
import type { Signal } from "@/lib/supabase/types";

type SignalState = {
  status: string | null;
  claimed_by: string | null;
};

type Props = {
  signals: Signal[];
  currentUserId: string | null;
};

function urgencyLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 70) return "Critical Urgency";
  if (score >= 40) return "High Urgency";
  if (score >= 20) return "Med Urgency";
  return "Low Urgency";
}

function signalBorderColor(score: number | null): string {
  if (score === null) return "border-outline";
  if (score >= 70) return "border-error";
  if (score >= 40) return "border-[#fb923c]";
  if (score >= 20) return "border-error/50";
  return "border-primary/40";
}

function signalUrgencyBadge(score: number | null): string {
  if (score === null) return "bg-outline/20 text-outline";
  if (score >= 70) return "bg-error/20 text-error";
  if (score >= 40) return "bg-[#fb923c]/20 text-[#fb923c]";
  if (score >= 20) return "bg-error/15 text-error";
  return "bg-primary/20 text-on-primary-container";
}

function statusBadge(status: Signal["is_answered"]): { label: string; classes: string } {
  switch (status) {
    case "true":
      return { label: "Answered", classes: "bg-green-500/20 text-green-400" };
    case "false":
      return { label: "Unanswered", classes: "bg-red-500/20 text-red-400" };
    case "privated":
      return { label: "Privated", classes: "bg-zinc-500/20 text-zinc-300" };
    default:
      return {
        label: "Unknown",
        classes: "bg-surface-container-highest text-on-surface-variant",
      };
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SignalsPanel({ signals, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [claimStates, setClaimStates] = useState<Record<string, SignalState>>(
    () =>
      signals.reduce<Record<string, SignalState>>((acc, signal) => {
        acc[signal.id] = { status: signal.status, claimed_by: signal.claimed_by };
        return acc;
      }, {})
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inFlightSignalId, setInFlightSignalId] = useState<string | null>(null);

  const displaySignals = useMemo(
    () =>
      signals.map((signal) => ({
        ...signal,
        status: claimStates[signal.id]?.status ?? signal.status,
        claimed_by: claimStates[signal.id]?.claimed_by ?? signal.claimed_by,
      })),
    [claimStates, signals]
  );

  const handleClaim = (signal: Signal) => {
    if (!currentUserId) {
      setErrorMessage("Sign in to claim inquiries.");
      return;
    }

    const activeState = claimStates[signal.id] ?? {
      status: signal.status,
      claimed_by: signal.claimed_by,
    };

    const alreadyClaimedByOther =
      activeState.status === "claimed" && activeState.claimed_by && activeState.claimed_by !== currentUserId;

    if (alreadyClaimedByOther) {
      setErrorMessage("This signal is already claimed by another user.");
      return;
    }

    const previousState = activeState;

    setErrorMessage(null);
    setInFlightSignalId(signal.id);
    setClaimStates((prev) => ({
      ...prev,
      [signal.id]: { status: "claimed", claimed_by: currentUserId },
    }));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/signals/${signal.id}/claim`, {
          method: "POST",
        });
        const result = await response.json();

        if (!response.ok) {
          setClaimStates((prev) => ({ ...prev, [signal.id]: previousState }));
          setErrorMessage(result.error ?? "Unable to claim signal.");
          return;
        }

        setClaimStates((prev) => ({
          ...prev,
          [signal.id]: {
            status: result.signal?.status ?? "claimed",
            claimed_by: result.signal?.claimed_by ?? currentUserId,
          },
        }));
      } catch {
        setClaimStates((prev) => ({ ...prev, [signal.id]: previousState }));
        setErrorMessage("Network error while claiming signal.");
      } finally {
        setInFlightSignalId(null);
      }
    });
  };

  return (
    <div
      className="bg-surface-container-low rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(180,197,255,0.05)" }}
    >
      <div className="p-6 bg-surface-container-high/50 flex justify-between items-center">
        <div>
          <h3 className="font-headline font-bold text-on-surface">Demand Signals</h3>
          <p className="text-[10px] font-mono text-primary uppercase tracking-widest">
            {displaySignals.length} inquiries detected
          </p>
        </div>
        <span className="material-symbols-outlined text-primary">sensors</span>
      </div>

      <div className="max-h-[440px] overflow-y-auto p-4 space-y-4 no-scrollbar">
        {errorMessage && (
          <p className="text-[11px] font-mono text-error bg-error/10 border border-error/30 px-3 py-2 rounded-sm">
            {errorMessage}
          </p>
        )}
        {displaySignals.length === 0 ? (
          <p className="text-on-surface-variant text-xs italic p-2">No signals detected for this post yet.</p>
        ) : (
          displaySignals.map((signal) => {
            const sb = statusBadge(signal.is_answered);
            const isClaimed = signal.status === "claimed";
            const isClaimedByCurrentUser = isClaimed && signal.claimed_by === currentUserId;
            const isClaimedByOther = isClaimed && signal.claimed_by && signal.claimed_by !== currentUserId;
            const isCurrentSignalPending = inFlightSignalId === signal.id && isPending;
            const canClaim = !isClaimedByOther && !isClaimedByCurrentUser && Boolean(currentUserId);

            return (
              <div
                key={signal.id}
                className={`p-4 rounded-lg border-l-2 transition-all ${
                  isClaimed
                    ? "bg-primary/10 border-primary/70"
                    : `bg-surface-container-highest/40 ${signalBorderColor(signal.urgency_score)} hover:bg-surface-container-highest/60`
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-mono text-outline">{relativeTime(signal.commented_at)}</span>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-0.5 ${signalUrgencyBadge(signal.urgency_score)} text-[9px] font-bold uppercase tracking-wider rounded-sm`}
                    >
                      {urgencyLabel(signal.urgency_score)}
                    </span>
                    <span
                      className={`px-2 py-0.5 ${sb.classes} text-[9px] font-bold uppercase tracking-wider rounded-sm`}
                    >
                      {sb.label}
                    </span>
                    {isClaimed && (
                      <span className="px-2 py-0.5 bg-primary/30 text-primary text-[9px] font-bold uppercase tracking-wider rounded-sm">
                        Claimed
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed italic mb-4">&quot;{signal.text}&quot;</p>
                <button
                  onClick={() => handleClaim(signal)}
                  disabled={!canClaim || isCurrentSignalPending}
                  className={`w-full py-2 font-mono text-[10px] uppercase tracking-widest rounded-sm transition-colors ${
                    isClaimedByCurrentUser
                      ? "bg-primary/30 text-primary cursor-default"
                      : isClaimedByOther
                        ? "bg-outline/10 text-outline cursor-not-allowed"
                        : canClaim
                          ? "bg-primary text-on-primary hover:opacity-90"
                          : "bg-outline/10 text-outline cursor-not-allowed"
                  }`}
                >
                  {isCurrentSignalPending
                    ? "Claiming..."
                    : isClaimedByCurrentUser
                      ? "Claimed"
                      : isClaimedByOther
                        ? "Claimed"
                        : currentUserId
                          ? "Claim Inquiry"
                          : "Sign In to Claim"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
