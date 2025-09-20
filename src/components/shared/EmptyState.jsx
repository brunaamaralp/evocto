import React from "react";
import { Button } from "@/components/ui/button";
import {
  Info,
  Users,
  Lightbulb,
  List,
  FolderOpen,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

const ICONS = {
  info: Info,
  usuarios: Users,
  clientes: Users,
  ideias: Lightbulb,
  tarefas: List,
  pasta: FolderOpen,
  alerta: AlertTriangle,
  sucesso: CheckCircle2
};

export default function EmptyState({
  icon = "info",
  title = "Nada por aqui ainda",
  description = "",
  primaryAction = null, // {label, onClick}
  secondaryAction = null, // {label, onClick}
  children = null,
  className = ""
}) {
  const Icon = ICONS[icon] || Info;

  return (
    <div className={`w-full max-w-2xl mx-auto text-center p-8 bg-white rounded-xl border border-slate-200 ${className}`}>
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon className="w-6 h-6 text-slate-500" />
      </div>
      <h3 className="text-slate-900 font-semibold text-lg">{title}</h3>
      {description && (
        <p className="text-slate-600 mt-1">{description}</p>
      )}

      {children && <div className="mt-4">{children}</div>}

      {(primaryAction || secondaryAction) && (
        <div className="flex gap-2 justify-center mt-6">
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}