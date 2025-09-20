import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AIReviewSummary({ results, onConfirm }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Revisão da Análise da IA</CardTitle>
        <CardDescription>
          A IA processou os insumos. Revise os destaques antes de prosseguir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg">
          <h4 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600"/>
            Destaques de Performance
          </h4>
          <p className="text-slate-700 mt-1">{results.performanceHighlights}</p>
        </div>

        {results.anomalies?.length > 0 && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600"/>
              Anomalias e Riscos Detectados
            </h4>
            <ul className="list-disc list-inside mt-1 text-yellow-800">
              {results.anomalies.map((anomaly, i) => <li key={i}>{anomaly}</li>)}
            </ul>
          </div>
        )}

        <Button onClick={onConfirm} className="w-full">
          Revisão Concluída, Próximo Passo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}