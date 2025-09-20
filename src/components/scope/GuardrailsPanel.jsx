import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

export default function GuardrailsPanel({ guardrails, isGenerating }) {
  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <Shield className="w-5 h-5" />
          Guardrails do Projeto
        </CardTitle>
        <p className="text-sm text-slate-600">
          Diretrizes importantes para execução criativa
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence>
          {isGenerating ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-sm text-slate-600">Definindo guardrails...</p>
            </motion.div>
          ) : guardrails && guardrails.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {guardrails.map((guardrail, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium leading-relaxed">
                        {guardrail}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <div className="mt-6 pt-4 border-t border-amber-200">
                <Badge variant="outline" className="bg-amber-100 text-amber-700 text-xs">
                  {guardrails.length} guideline{guardrails.length > 1 ? 's' : ''} identificada{guardrails.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm">
                Nenhum guardrail definido ainda
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Gere o escopo para obter as diretrizes
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}