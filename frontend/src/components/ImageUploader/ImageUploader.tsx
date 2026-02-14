import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';
import ImagePreview from './ImagePreview';
import Button from '../../shared/components/Button';
import './ImageUploader.styles.css';

interface ImageUploaderProps {
  tipo: 'item' | 'logo_tenant' | 'avatar_usuario';
  itemId?: number;
  maxFiles?: number;
  onUploadComplete?: (uploadedImages: any[]) => void;
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

    await handleUpload(previewFiles, { tipo, itemId });
    
    if (onUploadComplete) {
      onUploadComplete(uploadedImages);
    }
    
    // Clear preview files after successful upload
    setPreviewFiles([]);
  };

  const handleDeleteImage = async (filename: string) => {
    await handleDelete(filename);
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
            <Button
              variant="primary"
              onClick={handleUploadClick}
              loading={isUploading}
              disabled={isUploading}
            >
              {isUploading ? 'Enviando...' : `Enviar ${previewFiles.length} ${previewFiles.length === 1 ? 'arquivo' : 'arquivos'}`}
            </Button>
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
                  src={URL.createObjectURL(file)}
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

      {/* Uploaded Images Gallery */}
      {allImages.length > 0 && (
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
