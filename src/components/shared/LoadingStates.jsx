import React from "react";

export function LoadingState({
  message = "Carregando...",
  variant = "spinner", // 'spinner' | 'skeleton'
  lines = 3,
  className = ""
}) {
  if (variant === "skeleton") {
    return (
      <div className={`w-full ${className}`} role="status" aria-live="polite" aria-busy="true">
        {[...Array(lines)].map((_, i) => (
          <div key={i} className="loading-skeleton h-5 rounded-md mb-3" />
        ))}
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center py-10 ${className}`} role="status" aria-live="polite" aria-busy="true">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
      <span className="text-slate-600">{message}</span>
    </div>
  );
}

export default LoadingState;