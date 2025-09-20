import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Spinner({ size = 22, className = "" }) {
  return <Loader2 className={`animate-spin text-blue-600 ${className}`} style={{ width: size, height: size }} />;
}

export function LoadingOverlay({ show = false, text = "Carregando..." }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center rounded-lg bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-slate-700">
        <Spinner />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

export function LoadingButton({ isLoading, children, disabled, ...props }) {
  return (
    <Button disabled={isLoading || disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

// Skeletons
export function SkeletonLine({ width = "100%", height = 12, className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-200/80 ${className}`} style={{ width, height }} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <SkeletonLine width="60%" height={16} />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5, linesPerItem = 2 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={linesPerItem} />
      ))}
    </div>
  );
}