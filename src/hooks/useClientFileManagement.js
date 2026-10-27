import { useState, useCallback } from 'react';
import { ClientDocument } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de arquivos do cliente (Appwrite Storage real).
 */
export function useClientFileManagement() {
  const { agency, agencyId: sessionAgencyId, user, userId } = useSession();
  const agencyId = sessionAgencyId || agency?.id || null;
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async (clientId, serviceId = null) => {
    if (!agencyId || !clientId) {
      setFiles([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const filters = {
        agencyId,
        clientId,
        visibility: { $in: ['client', 'public'] },
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
  }, [agencyId]);

  const uploadFile = useCallback(async (file, metadata = {}) => {
    setUploading(true);
    setError(null);

    try {
      if (!agencyId) {
        throw new Error('Agência não identificada');
      }
      if (!metadata.clientId) {
        throw new Error('Cliente obrigatório para o upload');
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
      }

      const fileHash = await generateFileHash(file);

      const existingFile = files.find((f) => f.fileHash === fileHash);
      if (existingFile) {
        throw new Error('Este arquivo já foi enviado anteriormente');
      }

      const uploadResult = await UploadFile({ file, agencyId });
      const fileUrl = uploadResult.file_url || uploadResult.url;
      if (!fileUrl) {
        throw new Error('URL do arquivo não retornada');
      }

      const title =
        metadata.title ||
        String(file.name || 'arquivo').replace(/\.[^/.]+$/, '');
      const group = metadata.group || metadata.category || 'other';

      const newDocument = await ClientDocument.create({
        agencyId,
        clientId: metadata.clientId,
        serviceId: metadata.serviceId || null,
        title,
        group,
        category: group,
        description: metadata.description || '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        fileHash,
        fileUrl,
        fileId: uploadResult.fileId || null,
        tags: metadata.tags || [],
        visibility: metadata.visibility || 'client',
        status: metadata.status || 'approved',
        version: '1.0',
        uploadedBy: user?.email || userId || null,
        uploadedAt: new Date().toISOString(),
        metadata: {
          uploaded_manually: true,
          file_size: file.size,
        },
      });

      setFiles((prev) => [newDocument, ...prev]);
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
  }, [agencyId, user, userId, files]);

  const updateFileMetadata = useCallback(async (fileId, updates) => {
    try {
      const updatedFile = await ClientDocument.update(fileId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      setFiles((prev) =>
        prev.map((file) => (file.id === fileId ? updatedFile : file))
      );

      toast.success('Arquivo atualizado com sucesso!');
      return updatedFile;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao atualizar arquivo';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const deleteFile = useCallback(async (fileId) => {
    try {
      await ClientDocument.delete(fileId);

      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      toast.success('Arquivo removido com sucesso!');
      return true;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao remover arquivo';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const downloadFile = useCallback(async (fileId) => {
    try {
      const file = files.find((f) => f.id === fileId);
      if (!file) throw new Error('Arquivo não encontrado');
      if (!file.fileUrl) throw new Error('URL do arquivo indisponível');

      await ClientDocument.update(fileId, {
        downloadCount: (file.downloadCount || 0) + 1,
        lastDownloadedAt: new Date().toISOString(),
      }).catch(() => null);

      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = file.fileName || 'arquivo';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
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

  const filterFilesByCategory = useCallback((category) => {
    if (category === 'all') return files;
    return files.filter(
      (file) => file.category === category || file.group === category
    );
  }, [files]);

  const searchFiles = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return files;

    const term = searchTerm.toLowerCase();
    return files.filter(
      (file) =>
        file.fileName?.toLowerCase().includes(term) ||
        file.title?.toLowerCase().includes(term) ||
        file.description?.toLowerCase().includes(term) ||
        (file.tags && file.tags.some((tag) => tag.toLowerCase().includes(term)))
    );
  }, [files]);

  const getFileStats = useCallback(() => {
    const total = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const categories = [
      ...new Set(files.map((file) => file.category || file.group).filter(Boolean)),
    ];
    const recentUploads = files.filter((file) => {
      const uploadDate = new Date(file.uploadedAt || file.created_date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return uploadDate > weekAgo;
    }).length;

    return {
      total,
      totalSize,
      categories: categories.length,
      recentUploads,
      avgFileSize: total > 0 ? Math.round(totalSize / total) : 0,
    };
  }, [files]);

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
    getFileStats,
  };
}

async function generateFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
