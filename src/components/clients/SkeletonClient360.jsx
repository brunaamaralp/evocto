import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Building2, Wrench, Calendar, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SkeletonListItem = ({ showIcon = true }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 animate-pulse">
    {showIcon && <div className="h-8 w-8 rounded bg-slate-200 flex-shrink-0"></div>}
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
    </div>
    <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
  </div>
);

export default function SkeletonClient360({ 
  clientName = "Cliente", 
  onReload = () => window.location.reload(),
  showActions = true,
  message = "Carregando informações do cliente..."
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(createPageUrl('clients'));
  };

  return (
    <div className="space-y-6" role="main" aria-label="Carregando painel do cliente">
      {/* Header */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="h-7 bg-slate-200 rounded w-48 animate-pulse"></div>
                  <div className="h-5 bg-slate-200 rounded w-32 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-slate-200 rounded w-40 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-28 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-slate-200 text-slate-400 animate-pulse">
                    Status
                  </Badge>
                  <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {showActions && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBack}
                  aria-label="Voltar para lista de clientes"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onReload}
                  aria-label="Recarregar informações do cliente"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar
                </Button>
              </div>
            )}
          </div>
          
          {message && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-700" role="status" aria-live="polite">
                {message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Serviços Card */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-slate-400" />
              <div className="h-5 bg-slate-200 rounded w-20 animate-pulse"></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3" role="region" aria-label="Serviços contratados">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
              <div className="text-center pt-2">
                <div className="h-3 bg-slate-200 rounded w-32 mx-auto animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ciclos Card */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div className="h-5 bg-slate-200 rounded w-16 animate-pulse"></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3" role="region" aria-label="Ciclos de serviço">
              <SkeletonListItem />
              <SkeletonListItem />
              <div className="text-center pt-2">
                <div className="h-3 bg-slate-200 rounded w-28 mx-auto animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aprendizados Card */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-slate-400" />
              <div className="h-5 bg-slate-200 rounded w-24 animate-pulse"></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3" role="region" aria-label="Aprendizados relacionados">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
              <div className="text-center pt-2">
                <div className="h-3 bg-slate-200 rounded w-36 mx-auto animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-slate-200 animate-pulse"></div>
              <span>Informações sendo carregadas...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}