import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gremiomantosapi-d6gshveqc4fee0c2.brazilsouth-01.azurewebsites.net/api';

export interface UploadResponse {
  message: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export interface UploadOptions {
  itemId?: number;
  tipo: 'item' | 'logo_tenant' | 'avatar_usuario';
  onProgress?: (progress: number) => void;
}

export async function uploadImage(
  file: File,
  token: string,
  options: UploadOptions
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  if (options.itemId) {
    formData.append('item_id', options.itemId.toString());
  }
  
  formData.append('tipo', options.tipo);

  const response = await axios.post<UploadResponse>(
    `${API_BASE_URL}/upload`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && options.onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    }
  );

  return response.data;
}

export async function deleteImage(
  filename: string,
  token: string
): Promise<void> {
  await axios.delete(`${API_BASE_URL}/upload`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { filename },
  });
}
