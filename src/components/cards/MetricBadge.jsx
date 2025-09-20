import React from "react";
const variants = {
  success: "bg-green-50 text-green-700 ring-green-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  neutral: "bg-slate-50 text-slate-700 ring-slate-200"
};
export default function MetricBadge({ label, value, variant = "info", className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${variants[variant]} ${className}`}>
      <span className="font-semibold">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}