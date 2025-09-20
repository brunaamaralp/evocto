import { useState, useCallback, useEffect } from 'react';
import { ClientDocument, Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de arquivos do cliente
 */
export function useClientFileManagement() {
  const { agency, user } = useSession();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Carrega arquivos do cliente
   */
  const loadFiles = useCallback(async (clientId, serviceId = null) => {
    setLoading(true);
    setError(null);

    try {
      const filters = {
        agencyId: agency.id,
        clientId: clientId,
        visibility: { $in: ['client', 'public'] }
      };

      if (serviceId) {
        filters.serviceId = serviceId;
      }

      const filesData = await ClientDocument.filter(filters, '-created_date');
      setFiles(filesData || []);
      return filesData || [];
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar arquivos:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [agency]);

  /**
   * Upload de arquivo
   */
  const uploadFile = useCallback(async (file, metadata = {}) => {
    setUploading(true);
    setError(null);

    try {
      // Validar arquivo
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
      }

      // Gerar hash do arquivo para evitar duplicatas
      const fileHash = await generateFileHash(file);
      
      // Verificar se arquivo já existe
      const existingFile = files.find(f => f.fileHash === fileHash);
      if (existingFile) {
        throw new Error('Este arquivo já foi enviado anteriormente');
      }

      // Upload do arquivo
      const uploadResult = await uploadFileToStorage(file);
      
      // Criar registro do documento
      const newDocument = await ClientDocument.create({
        agencyId: agency.id,
        clientId: metadata.clientId,
        serviceId: metadata.serviceId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileHash: fileHash,
        fileUrl: uploadResult.url,
        category: metadata.category || 'other',
        description: metadata.description || '',
        tags: metadata.tags || [],
        visibility: metadata.visibility || 'client',
        uploadedBy: user.email,
        uploadedAt: new Date().toISOString(),
        status: 'active'
      });

      setFiles(prev => [newDocument, ...prev]);
      toast.success('Arquivo enviado com sucesso!');
      return newDocument;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao enviar arquivo';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [agency, user, files]);

  /**
   * Atualiza metadados do arquivo
   */
  const updateFileMetadata = useCallback(async (fileId, updates) => {
    try {
      const updatedFile = await ClientDocument.update(fileId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      setFiles(prev => prev.map(file => 
        file.id === fileId ? updatedFile : file
      ));

      toast.success('Arquivo atualizado com sucesso!');
      return updatedFile;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao atualizar arquivo';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Remove arquivo
   */
  const deleteFile = useCallback(async (fileId) => {
    try {
      await ClientDocument.delete(fileId);
      
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('Arquivo removido com sucesso!');
      return true;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao remover arquivo';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Download de arquivo
   */
  const downloadFile = useCallback(async (fileId) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error('Arquivo não encontrado');

      // Registrar download
      await ClientDocument.update(fileId, {
        downloadCount: (file.downloadCount || 0) + 1,
        lastDownloadedAt: new Date().toISOString()
      });

      // Iniciar download
      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = file.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download iniciado!');
      return true;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao fazer download';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [files]);

  /**
   * Filtra arquivos por categoria
   */
  const filterFilesByCategory = useCallback((category) => {
    if (category === 'all') return files;
    return files.filter(file => file.category === category);
  }, [files]);

  /**
   * Busca arquivos por nome ou descrição
   */
  const searchFiles = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return files;
    
    const term = searchTerm.toLowerCase();
    return files.filter(file => 
      file.fileName.toLowerCase().includes(term) ||
      file.description.toLowerCase().includes(term) ||
      (file.tags && file.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }, [files]);

  /**
   * Obtém estatísticas de arquivos
   */
  const getFileStats = useCallback(() => {
    const total = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const categories = [...new Set(files.map(file => file.category))];
    const recentUploads = files.filter(file => {
      const uploadDate = new Date(file.uploadedAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return uploadDate > weekAgo;
    }).length;

    return {
      total,
      totalSize,
      categories: categories.length,
      recentUploads,
      avgFileSize: total > 0 ? Math.round(totalSize / total) : 0
    };
  }, [files]);

  /**
   * Gera hash do arquivo
   */
  const generateFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Upload para storage (mock - implementar com serviço real)
   */
  const uploadFileToStorage = async (file) => {
    // Simular upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Em implementação real, usar serviço de storage (S3, MinIO, etc.)
    return {
      url: URL.createObjectURL(file),
      key: `uploads/${Date.now()}-${file.name}`
    };
  };

  return {
    files,
    loading,
    error,
    uploading,
    loadFiles,
    uploadFile,
    updateFileMetadata,
    deleteFile,
    downloadFile,
    filterFilesByCategory,
    searchFiles,
    getFileStats
  };
}

