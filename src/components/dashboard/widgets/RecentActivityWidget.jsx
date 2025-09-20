import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { withDefault, safeGet } from "@/components/utils/safeGuards";

export default function RecentActivityWidget({ cycles = [] }) {
  // Usar safeGuards para evitar crashes
  const safeCycles = withDefault(cycles, []);
  
  const items = safeCycles
    .slice()
    .sort((a, b) => {
      const dateA = new Date(safeGet(a, 'updated_date', 0));
      const dateB = new Date(safeGet(b, 'updated_date', 0));
      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Atividade Recente
        </CardTitle>
        <Link to={createPageUrl('cycles')}>
          <Button variant="ghost" size="sm" className="gap-1">
            Ver histórico
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((cycle) => (
              <div
                key={safeGet(cycle, 'id', 'unknown')}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {safeGet(cycle, 'cyclePeriod', 'Plano Financeiro')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {safeGet(cycle, 'updated_date') 
                      ? new Date(cycle.updated_date).toLocaleString("pt-BR")
                      : "Data não disponível"
                    }
                  </p>
                </div>
                <StatusBadge status={safeGet(cycle, 'status', 'unknown')} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="info"
            title="Nenhuma atividade"
            description="Nenhuma atividade recente encontrada."
            className="bg-white border-0 p-0"
          />
        )}
      </CardContent>
    </Card>
  );
}