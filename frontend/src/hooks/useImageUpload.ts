import { useState, useCallback } from 'react';
import { uploadImage, deleteImage, UploadOptions, UploadResponse } from '../services/api/upload';
import { useAuth } from '../contexts/AuthContext';

interface UseImageUploadReturn {
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
  uploadedImages: UploadResponse[];
  handleUpload: (files: File[], options: Omit<UploadOptions, 'onProgress'>) => Promise<void>;
  handleDelete: (filename: string) => Promise<void>;
  clearError: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useImageUpload(): UseImageUploadReturn {
  const { token } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadResponse[]>([]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG ou WebP.`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Máximo: 5MB.`;
    }
    
    return null;
  };

  const handleUpload = useCallback(async (
    files: File[],
    options: Omit<UploadOptions, 'onProgress'>
  ) => {
    if (!token) {
      setError('Você precisa estar autenticado para fazer upload');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = files.map(async (file) => {
        const validationError = validateFile(file);
        if (validationError) {
          throw new Error(validationError);
        }

        const result = await uploadImage(file, token, {
          ...options,
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        });

        return result;
      });

      const results = await Promise.all(uploadPromises);
      setUploadedImages((prev) => [...prev, ...results]);
      setUploadProgress(100);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao fazer upload');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [token]);

  const handleDelete = useCallback(async (filename: string) => {
    if (!token) {
      setError('Você precisa estar autenticado para deletar imagens');
      return;
    }

    setError(null);

    try {
      await deleteImage(filename, token);
      setUploadedImages((prev) => prev.filter((img) => img.filename !== filename));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao deletar imagem');
      console.error('Delete error:', err);
    }
  }, [token]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploadProgress,
    isUploading,
    error,
    uploadedImages,
    handleUpload,
    handleDelete,
    clearError,
  };
}
