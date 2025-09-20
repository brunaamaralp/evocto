import React from "react";
import { Check, Clock, Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";

export default function AutosaveStatus({ state, lastSavedAt }) {
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  switch (state) {
    case "saving":
      return (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Salvando...
        </div>
      );

    case "saved":
      return (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Check className="h-4 w-4" />
          Salvo {lastSavedAt && formatTime(lastSavedAt)}
        </div>
      );

    case "offline":
      return (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <WifiOff className="h-4 w-4" />
          Offline
        </div>
      );

    case "queued":
      return (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <Clock className="h-4 w-4" />
          Na fila
        </div>
      );

    case "error":
      return (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          Erro ao salvar
        </div>
      );

    case "idle":
    default:
      return (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Wifi className="h-4 w-4" />
          {lastSavedAt ? `Salvo ${formatTime(lastSavedAt)}` : "Conectado"}
        </div>
      );
  }
}