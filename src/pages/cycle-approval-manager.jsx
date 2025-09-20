import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ApprovalActions from "@/components/cycles/ApprovalActions";
import ClosingPanel from "@/components/cycles/ClosingPanel";

export default function CycleApprovalManagerPage() {
  return (
    <div className="p-6 space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Gestão de Aprovação do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <ApprovalActions />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Fechamento do Ciclo</CardTitle>
        </CardHeader>
        <CardContent>
          <ClosingPanel />
        </CardContent>
      </Card>
    </div>
  );
}