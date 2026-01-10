import React, { useEffect, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { getItemQRCode } from '../../lib/api';
import { Item } from '../../types';
import Button from '../../shared/components/Button';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';

interface ItemQRCodeProps {
  item: Item;
  onClose: () => void;
}

export default function ItemQRCode({ item, onClose }: ItemQRCodeProps) {
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQRCode();
  }, [item.id]);

  const loadQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getItemQRCode(item.id);
      // API returns { success: true, data: { qrcode: "data:image/png;base64,..." } }
      const qrData = response.data.data?.qrcode || response.data.data;
      setQrCodeUrl(qrData);
    } catch (err: any) {
      console.error('Erro ao carregar QR Code:', err);
      setError(err.response?.data?.error || 'Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-item-${item.id}-${item.nome.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!qrCodeUrl) return;
    
    if (navigator.share) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], `qrcode-${item.nome}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: `QR Code - ${item.nome}`,
          text: `QR Code da camiseta: ${item.nome}`,
          files: [file],
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            {item.nome}
          </p>

          {loading && (
            <div className="py-8">
              <LoadingSkeleton />
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <p className="text-error mb-4">{error}</p>
              <Button variant="secondary" onClick={loadQRCode}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!loading && !error && qrCodeUrl && (
            <>
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code - ${item.nome}`}
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Escaneie para ver detalhes do item
              </p>

              <div className="flex justify-center space-x-3">
                <Button variant="secondary" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <Button variant="secondary" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
