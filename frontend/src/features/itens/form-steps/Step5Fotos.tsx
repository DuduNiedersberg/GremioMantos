import React from 'react';
import { ImageIcon } from 'lucide-react';
import ImageUploader from '../../../components/ImageUploader';
import { UploadResponse } from '../../../services/api/upload';

interface Step5Props {
  itemId: number | undefined;
  isEditing: boolean;
  onUploadComplete?: (uploadedImages: UploadResponse[]) => void;
}

export default function Step5Fotos({ itemId, isEditing, onUploadComplete }: Step5Props) {
  if (isEditing && itemId) {
    return (
      <div className="space-y-4">
        <ImageUploader
          tipo="item"
          itemId={itemId}
          maxFiles={5}
          onUploadComplete={onUploadComplete}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-neutral-400" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">
          Fotos disponíveis após salvar
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          Salve o item primeiro para adicionar fotos. Após criar, você será redirecionado para editar e poderá adicionar imagens.
        </p>
      </div>
    </div>
  );
}
