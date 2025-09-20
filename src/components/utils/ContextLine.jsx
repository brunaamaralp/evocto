import React from 'react';
import { ArrowRight, Info } from 'lucide-react';

export default function ContextLine({ context, outcome }) {
  if (!context && !outcome) return null;

  return (
    <div className="text-xs text-slate-600 bg-slate-100 p-3 rounded-md border border-slate-200/80 mb-4">
      <div className="flex items-start gap-2">
        <Info className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 flex-wrap">
          {context && <span className="font-medium">{context}</span>}
          {context && outcome && <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 hidden sm:block" />}
          {outcome && <span className="italic text-slate-500">{outcome}</span>}
        </div>
      </div>
    </div>
  );
}