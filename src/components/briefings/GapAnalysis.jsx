import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, AlertTriangle, Plus, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const severityConfig = {
  high: { icon: AlertTriangle, color: 'text-red-500', badge: 'bg-red-100 text-red-700' },
  medium: { icon: AlertTriangle, color: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
  low: { icon: Lightbulb, color: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
};

export default function GapAnalysis({ gaps = [], score = 0, isAnalyzing, onAddQuestion, onMarkAddressed, analysisAttempts, lastError }) {

  const openGaps = gaps.filter(g => g.status !== 'addressed');

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between text-xl">
          Análise de Gaps
          {isAnalyzing && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
        </CardTitle>
        <div className="flex items-center gap-2 pt-2">
          <Progress value={score} className="w-full" />
          <span className="font-bold text-lg text-slate-800">{score}%</span>
        </div>
        <p className="text-sm text-slate-500">Completude do briefing</p>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {analysisAttempts > 2 && lastError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Badge className="bg-amber-100 text-amber-800 p-2 text-xs w-full justify-center">
                    <AlertTriangle className="w-3 h-3 mr-2"/>
                    Análise em modo de segurança
                </Badge>
            </motion.div>
        )}
        
        {openGaps.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {openGaps.map((gap, index) => {
                const config = severityConfig[gap.severity] || severityConfig.low;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={gap.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border rounded-lg bg-slate-50/50"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-1 ${config.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <Badge className={`${config.badge} mb-2`}>{gap.severity}</Badge>
                            {gap.source === 'fallback' && (
                                <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">Modo Seguro</Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-800 font-medium">{gap.description}</p>
                        <p className="text-xs text-slate-500 italic mt-1">"{gap.followUpQuestion}"</p>
                        <div className="flex gap-2 mt-3">
                           <Button size="sm" variant="outline" onClick={() => onAddQuestion(gap.id, gap.followUpQuestion)}>
                             <Plus className="w-3 h-3 mr-1.5"/> Adicionar Pergunta
                           </Button>
                           <Button size="sm" variant="ghost" onClick={() => onMarkAddressed(gap.id)}>
                             Marcar como Resolvido
                           </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-6">
            <Lightbulb className="w-10 h-10 mx-auto text-green-500 mb-2" />
            <h4 className="font-semibold text-slate-800">
              {gaps.length > 0 ? "Todos os gaps foram resolvidos!" : "Nenhum gap encontrado!"}
            </h4>
            <p className="text-sm text-slate-500">O briefing parece completo e pronto para a próxima etapa.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}