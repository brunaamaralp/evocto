import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckSquare } from "lucide-react";

export default function QuickTasksDock() {
  return (
    <div className="hidden md:flex fixed left-4 bottom-6 z-40">
      <Link
        to={createPageUrl("tasks-manager")}
        className="group inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200 shadow-md hover:shadow-lg hover:bg-blue-50 transition-all"
        aria-label="Abrir Tarefas"
      >
        <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
          <CheckSquare className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
          Tarefas
        </span>
      </Link>
    </div>
  );
}