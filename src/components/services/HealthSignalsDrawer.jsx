import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export default function HealthSignalsDrawer({ isOpen, onClose, healthState }) {
  if (!healthState) return null;

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return AlertCircle;
      case 'warn': return AlertTriangle;
      default: return CheckCircle;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              healthState.status === 'critical' ? 'bg-red-500' :
              healthState.status === 'attention' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            Sinais de Saúde do Serviço
          </DrawerTitle>
          <DrawerDescription>
            {healthState.signals.length === 0 
              ? 'Nenhum sinal ativo - tudo funcionando bem!'
              : `${healthState.signals.length} sinal(is) detectado(s) que precisa(m) de atenção.`
            }
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {healthState.signals.length === 0 ? (
            <Card className="text-center p-6 bg-green-50 border-green-200">
              <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-green-800">Nenhum problema detectado</p>
            </Card>
          ) : (
            healthState.signals.map((signal, index) => {
              const Icon = getSeverityIcon(signal.severity);
              const colorClass = getSeverityColor(signal.severity);
              
              return (
                <Card key={index} className={`border-l-4 ${
                  signal.severity === 'critical' ? 'border-red-500' :
                  signal.severity === 'warn' ? 'border-yellow-500' : 'border-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 mb-1">
                            {signal.title}
                          </h4>
                          <p className="text-sm text-slate-600 capitalize">
                            {signal.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="sm">
                        <Link to={signal.href}>
                          Resolver
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}