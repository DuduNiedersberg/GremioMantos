import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, Star } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';
import { UploadResponse } from '../../services/api/upload';
import ImagePreview from './ImagePreview';
import Button from '../../shared/components/Button';
import { getItemImagens, setImagemPrincipal, deleteItemImagem } from '../../lib/api';
import { ImagemItem } from '../../types';
import './ImageUploader.styles.css';

interface ImageUploaderProps {
  tipo: 'item' | 'logo_tenant' | 'avatar_usuario';
  itemId?: number;
  maxFiles?: number;
  onUploadComplete?: (uploadedImages: UploadResponse[]) => void;
  existingImages?: Array<{ url: string; filename: string; size?: number }>;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  tipo,
  itemId,
  maxFiles = 5,
  onUploadComplete,
  existingImages = [],
}) => {
  const {
    uploadProgress,
    isUploading,
    error,
    uploadedImages,
    handleUpload,
    handleDelete,
    clearError,
  } = useImageUpload();

  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [itemImages, setItemImages] = useState<ImagemItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [markAsPrincipal, setMarkAsPrincipal] = useState(false);

  // Load images from backend if itemId is provided
  useEffect(() => {
    if (tipo === 'item' && itemId) {
      loadItemImages();
    }
  }, [tipo, itemId]);

  const loadItemImages = async () => {
    if (!itemId) return;
    
    try {
      setLoadingImages(true);
      const response = await getItemImagens(itemId);
      setItemImages(response.data.data.data || []);
    } catch (err) {
      console.error('Error loading images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  // Create and cleanup object URLs when files change
  useEffect(() => {
    // Create new URLs for current files
    const newUrls = previewFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newUrls);

    // Cleanup function revokes URLs created in this effect
    return () => {
      newUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Limit files
    const filesToAdd = acceptedFiles.slice(0, maxFiles - previewFiles.length);
    setPreviewFiles((prev) => [...prev, ...filesToAdd]);
    clearError();
  }, [maxFiles, previewFiles.length, clearError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: maxFiles > 1,
    disabled: isUploading,
  });

  const removePreviewFile = (index: number) => {
    setPreviewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = async () => {
    if (previewFiles.length === 0) return;

    // Only set first uploaded file as principal if no images exist yet
    const shouldSetAsPrincipal = markAsPrincipal && itemImages.length === 0 && previewFiles.length === 1;

    const results = await handleUpload(previewFiles, { 
      tipo, 
      itemId,
      e_principal: shouldSetAsPrincipal
    });
    
    if (onUploadComplete && results.length > 0) {
      onUploadComplete(results);
    }
    
    // Clear preview files after successful upload
    setPreviewFiles([]);
    setMarkAsPrincipal(false);
    
    // Reload images from backend
    if (tipo === 'item' && itemId) {
      await loadItemImages();
    }
  };

  const handleDeleteImage = async (filename: string) => {
    await handleDelete(filename);
  };

  const handleDeleteItemImage = async (imagemId: number) => {
    if (!itemId) return;
    
    try {
      await deleteItemImagem(itemId, imagemId);
      await loadItemImages();
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

  const handleSetPrincipal = async (imagemId: number) => {
    if (!itemId) return;
    
    try {
      await setImagemPrincipal(itemId, imagemId);
      await loadItemImages();
    } catch (err) {
      console.error('Error setting principal image:', err);
    }
  };

  const allImages = [
    ...existingImages,
    ...uploadedImages,
  ];

  return (
    <div className="image-uploader">
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${isUploading ? 'dropzone-disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-3" />
        {isDragActive ? (
          <p className="text-lg font-medium text-gremio-celeste dark:text-gremio-celeste-400">
            Solte os arquivos aqui...
          </p>
        ) : (
          <>
            <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Arraste imagens aqui ou clique para selecionar
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              JPEG, PNG ou WebP (máx. 5MB por arquivo)
            </p>
            {maxFiles > 1 && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                Máximo de {maxFiles} arquivos por vez
              </p>
            )}
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
          <button type="button" onClick={clearError} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview Files (before upload) */}
      {previewFiles.length > 0 && (
        <div className="preview-section">
          <div className="preview-header">
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              Arquivos Selecionados ({previewFiles.length})
            </h3>
            <div className="flex items-center gap-4">
              {tipo === 'item' && itemImages.length === 0 && previewFiles.length === 1 && (
                <label className="flex items-center space-x-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={markAsPrincipal}
                    onChange={(e) => setMarkAsPrincipal(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-gremio-celeste focus:ring-gremio-celeste"
                  />
                  <span className="text-neutral-700 dark:text-neutral-300">
                    Definir como principal
                  </span>
                </label>
              )}
              <Button
                variant="primary"
                onClick={handleUploadClick}
                loading={isUploading}
                disabled={isUploading}
              >
                {isUploading ? 'Enviando...' : `Enviar ${previewFiles.length} ${previewFiles.length === 1 ? 'arquivo' : 'arquivos'}`}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && uploadProgress > 0 && (
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>
                <span className="progress-text">{uploadProgress}%</span>
              </div>
            </div>
          )}

          <div className="preview-grid">
            {previewFiles.map((file, index) => (
              <div key={index} className="preview-item">
                <img
                  src={previewUrls[index]}
                  alt={file.name}
                  className="preview-image"
                />
                <button
                  type="button"
                  onClick={() => removePreviewFile(index)}
                  className="preview-remove-btn"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="preview-info">
                  <p className="preview-filename" title={file.name}>
                    {file.name}
                  </p>
                  <p className="preview-filesize">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Images Gallery - Show item images from backend */}
      {tipo === 'item' && itemImages.length > 0 && (
        <div className="uploaded-section">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Imagens do Item ({itemImages.length})
          </h3>
          <div className="uploaded-grid">
            {itemImages.map((imagem) => (
              <div key={imagem.id} className="relative">
                <ImagePreview
                  url={imagem.url_blob}
                  filename={imagem.nome_arquivo || 'Imagem'}
                  size={imagem.tamanho_bytes}
                  onDelete={() => handleDeleteItemImage(imagem.id)}
                />
                <button 
                  onClick={() => handleSetPrincipal(imagem.id)}
                  className={`absolute top-2 left-2 p-2 rounded-full shadow-lg transition-colors ${
                    imagem.e_principal 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-white dark:bg-neutral-800 text-neutral-400 hover:text-yellow-500'
                  }`}
                  title={imagem.e_principal ? 'Imagem principal' : 'Definir como principal'}
                >
                  <Star className="w-5 h-5" fill={imagem.e_principal ? 'currentColor' : 'none'} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Images Gallery - For non-item uploads or fallback */}
      {tipo !== 'item' && allImages.length > 0 && (
        <div className="uploaded-section">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Imagens Enviadas ({allImages.length})
          </h3>
          <div className="uploaded-grid">
            {allImages.map((image, index) => (
              <ImagePreview
                key={`${image.filename}-${index}`}
                url={image.url}
                filename={image.filename}
                size={image.size}
                onDelete={() => handleDeleteImage(image.filename)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
