import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Upload, 
  Calculator, 
  History, 
  Database,
  FileText,
  Brain,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Calendar
} from 'lucide-react';
import FinancialReportUploadModal from './FinancialReportUploadModal';
import ManualKPIsInputModal from './ManualKPIsInputModal';
import { useFinancialData } from '@/hooks/useFinancialData';

/**
 * Componente para gerenciar fontes de dados do dashboard
 */
export default function DataSourceManager({ clientId, serviceId, serviceType, onDataUpdated }) {
  const { loading, error } = useFinancialData();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const handleDataExtracted = (data) => {
    onDataUpdated(data);
    setShowUploadModal(false);
  };

  const handleDataSaved = (data) => {
    onDataUpdated(data);
    setShowManualModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fontes de Dados</h3>
          <p className="text-sm text-gray-600">
            Escolha como inserir os dados financeiros no dashboard
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {serviceType}
        </Badge>
      </div>

      {/* Opções de Inserção */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload de Relatórios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Upload de Relatórios</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Faça upload de relatórios financeiros e deixe a IA extrair os KPIs automaticamente
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText className="w-3 h-3" />
                    <span>PDF, Excel, CSV</span>
                    <Brain className="w-3 h-3 ml-2" />
                    <span>Análise com IA</span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => setShowUploadModal(true)}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Inserção Manual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Inserção Manual</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Insira os números diretamente nos campos dos KPIs
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>Entrada manual</span>
                    <CheckCircle className="w-3 h-3 ml-2" />
                    <span>Validação automática</span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => setShowManualModal(true)}
                className="w-full mt-4 bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Inserir Manualmente
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Informações sobre Fontes */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-gray-600 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Sobre as Fontes de Dados</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Upload de Relatórios:</strong> Ideal para relatórios estruturados (DRE, Balanço, Fluxo de Caixa)</li>
                <li><strong>Inserção Manual:</strong> Perfeito para números específicos ou quando não há relatórios digitais</li>
                <li><strong>Histórico:</strong> Todos os dados são armazenados e podem ser consultados posteriormente</li>
                <li><strong>Validação:</strong> Sistema valida automaticamente os dados inseridos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <FinancialReportUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        clientId={clientId}
        serviceId={serviceId}
        onDataExtracted={handleDataExtracted}
      />

      <ManualKPIsInputModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        clientId={clientId}
        serviceId={serviceId}
        serviceType={serviceType}
        onDataSaved={handleDataSaved}
      />
    </div>
  );
}

