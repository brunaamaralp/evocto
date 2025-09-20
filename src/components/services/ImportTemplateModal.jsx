import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { importServiceTemplates } from '@/api/functions';

export default function ImportTemplateModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error('Formato não suportado. Use apenas arquivos CSV ou Excel (.xlsx)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await importServiceTemplates(formData);
      
      if (response.data.success) {
        toast.success(`${response.data.results.success.length} templates importados com sucesso!`);
        if (response.data.results.errors.length > 0) {
          toast.warning(`${response.data.results.errors.length} templates falharam na importação`);
        }
        onSuccess?.();
        onClose();
      } else {
        toast.error(`Erro na importação: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar templates');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setUploading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Templates de Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Importe templates a partir de arquivos CSV ou Excel (.xlsx). 
              Faça download de um template existente primeiro para ver o formato correto.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Arquivo para Importação</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : file 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              {file ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{file.name}</p>
                    <p className="text-xs text-green-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-green-600 hover:text-green-700"
                  >
                    Remover arquivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">
                      Arraste um arquivo CSV/Excel aqui ou
                    </p>
                    <Label className="cursor-pointer text-blue-600 hover:text-blue-700">
                      clique para selecionar
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!file || uploading}>
              {uploading ? 'Importando...' : 'Importar Templates'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}