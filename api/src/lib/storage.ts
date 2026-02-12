import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

/**
 * Azure Blob Storage Configuration
 */
const CONTAINER_NAME = 'camisetas-fotos';
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Get extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  return map[mimeType] || '.jpg';
}

/**
 * Get or create container client for Azure Blob Storage
 * Creates the container if it doesn't exist with public read access for blobs
 */
export async function getContainerClient(): Promise<ContainerClient> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Create container if it doesn't exist (with public read access for blobs)
    await containerClient.createIfNotExists({
      access: 'blob', // Public read access for blobs
    });
    
    return containerClient;
  } catch (error) {
    console.error('Error getting container client:', error);
    throw new Error('Failed to connect to Azure Blob Storage');
  }
}

/**
 * Upload image to Azure Blob Storage
 * 
 * @param fileBuffer - Image file buffer
 * @param fileName - Original file name
 * @param contentType - MIME type of the file
 * @param tenantId - Tenant ID for organization
 * @param itemId - Optional item ID for organization (if null, uploads to temp folder)
 * @param metadata - Optional additional metadata
 * @returns Object with blob URL, filename, size, and contentType
 */
export async function uploadImage(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  tenantId: number,
  itemId?: number | null,
  metadata?: Record<string, string>
): Promise<{
  url: string;
  filename: string;
  size: number;
  contentType: string;
}> {
  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new Error(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // Generate unique filename
  const uuid = randomUUID();
  const extension = getExtensionFromMimeType(contentType);
  
  // Organize in folders: tenant_id/item_id/uuid.ext or tenant_id/temp/uuid.ext
  const folder = itemId ? `${tenantId}/${itemId}` : `${tenantId}/temp`;
  const blobName = `${folder}/${uuid}${extension}`;

  try {
    const containerClient = await getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Prepare metadata
    const blobMetadata: Record<string, string> = {
      tenantId: tenantId.toString(),
      originalName: fileName,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    };

    if (itemId) {
      blobMetadata.itemId = itemId.toString();
    }

    // Upload with metadata and cache headers
    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        // 1 year cache for immutable URLs (each file has unique UUID)
        // If image is replaced, it will have a new UUID/URL
        blobCacheControl: 'public, max-age=31536000',
      },
      metadata: blobMetadata,
    });

    return {
      url: blockBlobClient.url,
      filename: blobName,
      size: fileBuffer.length,
      contentType,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image to blob storage');
  }
}

/**
 * Delete image from Azure Blob Storage
 * 
 * @param filename - Blob filename (path) to delete
 * @returns true if deleted, false if not found
 */
export async function deleteImage(filename: string): Promise<boolean> {
  try {
    const containerClient = await getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    
    // Delete the blob (returns true if deleted, false if not found)
    const response = await blockBlobClient.deleteIfExists();
    
    return response.succeeded;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image from blob storage');
  }
}

/**
 * List all images for a specific tenant
 * 
 * @param tenantId - Tenant ID to filter images
 * @returns Array of blob names (filenames)
 */
export async function listTenantImages(tenantId: number): Promise<string[]> {
  try {
    const containerClient = await getContainerClient();
    const prefix = `${tenantId}/`;
    const images: string[] = [];

    // List blobs with tenant prefix
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      images.push(blob.name);
    }

    return images;
  } catch (error) {
    console.error('Error listing tenant images:', error);
    throw new Error('Failed to list tenant images');
  }
}

/**
 * Move image from temporary folder to permanent item folder
 * 
 * @param tempFilename - Current filename in temp folder (e.g., "tenant_id/temp/uuid.ext")
 * @param itemId - Target item ID
 * @returns New filename after move
 */
export async function moveImageFromTemp(
  tempFilename: string,
  itemId: number
): Promise<string> {
  try {
    // Parse tenant ID from temp filename
    const parts = tempFilename.split('/');
    if (parts.length !== 3 || parts[1] !== 'temp') {
      throw new Error('Invalid temp filename format. Expected: tenant_id/temp/uuid.ext');
    }

    const tenantId = parts[0];
    const uuid = parts[2];

    // New filename in permanent location
    const newFilename = `${tenantId}/${itemId}/${uuid}`;

    const containerClient = await getContainerClient();
    const sourceBlob = containerClient.getBlockBlobClient(tempFilename);
    const targetBlob = containerClient.getBlockBlobClient(newFilename);

    // Copy blob to new location with timeout handling
    try {
      const copyPoller = await targetBlob.beginCopyFromURL(sourceBlob.url);
      await copyPoller.pollUntilDone();
    } catch (copyError) {
      console.error('Copy operation failed:', copyError);
      throw new Error('Failed to copy image to new location');
    }

    // Update metadata
    const sourceProps = await sourceBlob.getProperties();
    await targetBlob.setMetadata({
      ...sourceProps.metadata,
      itemId: itemId.toString(),
      movedAt: new Date().toISOString(),
    });

    // Delete original blob
    await sourceBlob.delete();

    return newFilename;
  } catch (error) {
    console.error('Error moving image from temp:', error);
    throw new Error('Failed to move image from temporary folder');
  }
}

/**
 * Validate file extension
 */
export function isValidExtension(filename: string): boolean {
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Validate MIME type
 */
export function isValidMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Get tenant ID from filename
 * Extracts tenant ID from blob path (tenant_id/item_id/uuid.ext or tenant_id/temp/uuid.ext)
 */
export function getTenantIdFromFilename(filename: string): number | null {
  const parts = filename.split('/');
  if (parts.length < 2) {
    return null;
  }
  
  const tenantId = parseInt(parts[0], 10);
  return isNaN(tenantId) ? null : tenantId;
}
