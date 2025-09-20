import React, { useState, useEffect } from 'react';
import { Client } from '@/api/entities';
import { AlertTriangle, Building2, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ClientPanelSkeleton from './ClientPanelSkeleton';

const StatusBadge = ({ status }) => {
  const config = {
    ativo: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
    inativo: { label: 'Inativo', className: 'bg-slate-100 text-slate-800' },
    prospecto: { label: 'Prospecto', className: 'bg-blue-100 text-blue-800' }
  };
  const { label, className } = config[status] || config.prospecto;
  return <Badge className={className}>{label}</Badge>;
};

export default function DegradedClientPanel({ clientId }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        // No modo degradado, só precisamos do cliente.
        const clientData = await Client.get(clientId);
        setClient(clientData);
      } catch (error) {
        console.error("Degraded Mode - Failed to fetch client:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [clientId]);

  if (loading) {
    return <ClientPanelSkeleton message="Carregando modo de visualização simplificada..." />;
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-medium">Não foi possível carregar o cliente</h3>
          <p className="mt-1 text-sm text-slate-500">
            As informações básicas deste cliente não puderam ser acessadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-800">Modo de Visualização Simplificada</p>
          <p className="text-sm text-amber-700">O painel completo está temporariamente indisponível. Apenas a visualização de dados básicos está ativa.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
              <Building2 className="h-8 w-8 text-slate-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <p className="text-lg text-slate-600 mb-2">{client.company}</p>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1"><Mail className="w-4 h-4" />{client.email}</div>
                {client.phone && <div className="flex items-center gap-1"><Phone className="w-4 h-4" />{client.phone}</div>}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <StatusBadge status={client.status} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visão Simplificada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Apenas informações básicas do cliente estão disponíveis. Funcionalidades como edição, adição de serviços e visualização de ciclos estão desativadas neste modo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}