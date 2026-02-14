import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ImagePreviewProps {
  url: string;
  filename: string;
  onDelete: () => void;
  size?: number;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ url, filename, onDelete, size }) => {
  return (
    <div className="relative group rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
      <img
        src={url}
        alt={filename}
        className="w-full h-48 object-cover"
      />
      
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-white dark:bg-neutral-800 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          title="Ver imagem"
        >
          <ExternalLink className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
        </a>
        
        <button
          type="button"
          onClick={onDelete}
          className="p-2 bg-white dark:bg-neutral-800 rounded-full hover:bg-error hover:text-white transition-colors"
          title="Deletar imagem"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-2 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate" title={filename}>
          {filename}
        </p>
        {size && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
            {(size / 1024).toFixed(2)} KB
          </p>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;
