import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Validações de upload para MVP - apenas arquivos suportados
 */

const ALLOWED_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'text/plain': ['.txt']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_BATCH = 5;

export function validateFile(file) {
  const errors = [];
  
  // Tipo de arquivo
  if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
    errors.push(`Tipo de arquivo não suportado: ${file.type}`);
  }
  
  // Tamanho
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB (máximo 10MB)`);
  }
  
  return errors;
}

export function FileUploadZone({ onFilesAccepted, onFilesRejected, className }) {
  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    // Validar cada arquivo aceito
    const validFiles = [];
    const invalidFiles = [];
    
    acceptedFiles.forEach(file => {
      const errors = validateFile(file);
      if (errors.length === 0) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, errors });
      }
    });
    
    // Combinar com rejeições do dropzone
    const allRejections = [
      ...fileRejections.map(rejection => ({
        file: rejection.file,
        errors: rejection.errors.map(err => err.message)
      })),
      ...invalidFiles
    ];
    
    if (validFiles.length > 0) {
      onFilesAccepted?.(validFiles);
    }
    
    if (allRejections.length > 0) {
      onFilesRejected?.(allRejections);
    }
  }, [onFilesAccepted, onFilesRejected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES_PER_BATCH,
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${className}
      `}
    >
      <input {...getInputProps()} />
      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      
      {isDragActive ? (
        <p className="text-blue-600">Solte os arquivos aqui...</p>
      ) : (
        <div className="space-y-2">
          <p className="text-lg font-medium">Enviar arquivos</p>
          <p className="text-gray-500">
            Clique ou arraste arquivos aqui
          </p>
          <p className="text-sm text-gray-400">
            CSV, XLSX, PDF, PNG, JPG ou TXT (máx. 10MB cada)
          </p>
        </div>
      )}
    </div>
  );
}

export function FileValidationErrors({ rejections }) {
  if (!rejections || rejections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {rejections.map((rejection, index) => (
        <Alert key={index} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{rejection.file.name}:</strong>
            <ul className="ml-4 mt-1 list-disc">
              {rejection.errors.map((error, errorIndex) => (
                <li key={errorIndex} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

export function FileValidationSuccess({ files }) {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <Alert>
      <CheckCircle className="h-4 w-4" />
      <AlertDescription>
        <strong>Arquivos válidos ({files.length}):</strong>
        <ul className="ml-4 mt-1 list-disc">
          {files.map((file, index) => (
            <li key={index} className="text-sm">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}