import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { withDefault, safeGet } from "@/components/utils/safeGuards";

export default function PendingApprovalsWidget({ cycles = [] }) {
  // Usar safeGuards para evitar crashes
  const safeCycles = withDefault(cycles, []);
  const pending = safeCycles.filter(c => safeGet(c, 'status') === "pending_approval");

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          Aprovações Pendentes
        </CardTitle>
        <Link to={createPageUrl('cycles')}>
          <Button variant="ghost" size="sm" className="gap-1">
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.slice(0, 4).map((cycle) => (
              <div
                key={safeGet(cycle, 'id', 'unknown')}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {safeGet(cycle, 'cyclePeriod', 'Plano Financeiro')}
                  </p>
                  <p className="text-xs text-slate-600">
                    Cliente: {safeGet(cycle, 'clientName', 'Cliente não identificado')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={safeGet(cycle, 'status', 'unknown')} />
                  <Link to={createPageUrl('cycle-approval') + `?id=${safeGet(cycle, 'id', '')}`}>
                    <Button size="sm" variant="outline">
                      Revisar
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {pending.length > 4 && (
              <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                +{pending.length - 4} mais
              </Badge>
            )}
          </div>
        ) : (
          <EmptyState
            icon="sucesso"
            title="Tudo em dia!"
            description="Não há aprovações pendentes no momento."
            className="bg-white border-0 p-0"
          />
        )}
      </CardContent>
    </Card>
  );
}