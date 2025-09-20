import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X, Search } from "lucide-react";

export default function PlaybookFilters({ filters, onChange, serviceTypes = [], statuses = ["draft", "published", "archived"] }) {
  const handle = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="w-full rounded-xl border bg-white p-3 md:p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="inline-flex items-center gap-2 text-slate-600">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros</span>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Buscar playbooks"
              className="pl-8"
              placeholder="Buscar por título ou resumo..."
              value={filters.q || ""}
              onChange={(e) => handle({ q: e.target.value })}
            />
          </div>

          <Select value={filters.serviceType || "all"} onValueChange={(v) => handle({ serviceType: v === "all" ? null : v })}>
            <SelectTrigger aria-label="Tipo de serviço">
              <SelectValue placeholder="Tipo de serviço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os serviços</SelectItem>
              {serviceTypes.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status || "all"} onValueChange={(v) => handle({ status: v === "all" ? null : v })}>
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s === "draft" ? "Rascunho" : s === "published" ? "Publicado" : "Arquivado"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ q: "", serviceType: null, status: null })}
            className="gap-2"
            aria-label="Limpar filtros"
          >
            <X className="h-4 w-4" /> Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}