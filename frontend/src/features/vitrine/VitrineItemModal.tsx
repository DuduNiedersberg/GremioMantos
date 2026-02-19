import React, { useState } from 'react';
import { X, Shirt, MessageCircle } from 'lucide-react';

interface VitrineItem {
  id: number;
  nome: string;
  ano?: number;
  marca?: string;
  modelo?: string;
  jogador?: string;
  tamanho?: string;
  condicao?: string;
  valor_venda?: number;
  imagem_url?: string;
  thumbnail_url?: string;
  imagens?: Array<{ url: string; thumbnail_url?: string }>;
}

interface VitrineItemModalProps {
  item: VitrineItem | null;
  tenantWhatsapp?: string;
  onClose: () => void;
}

export default function VitrineItemModal({ item, tenantWhatsapp, onClose }: VitrineItemModalProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  if (!item) return null;

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const allImages: string[] = [];
  if (item.imagem_url) allImages.push(item.imagem_url);
  if (item.imagens) {
    item.imagens.forEach((img) => {
      if (img.url && !allImages.includes(img.url)) allImages.push(img.url);
    });
  }

  const mainImage = allImages[selectedImage] || item.thumbnail_url;

  const buildWhatsAppUrl = () => {
    const currentUrl = window.location.href;
    const valor = item.valor_venda ? formatBRL(item.valor_venda) : 'Consultar';
    const mensagem = encodeURIComponent(
      `Olá! Tenho interesse na ${item.nome} (Ref: ${item.id})\nValor: ${valor}\nLink: ${currentUrl}`
    );
    return `https://wa.me/${tenantWhatsapp}?text=${mensagem}`;
  };

  const details: { label: string; value?: string | number }[] = [
    { label: 'Marca', value: item.marca },
    { label: 'Modelo', value: item.modelo },
    { label: 'Ano', value: item.ano },
    { label: 'Jogador', value: item.jogador },
    { label: 'Tamanho', value: item.tamanho },
    { label: 'Condição', value: item.condicao },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg leading-snug pr-4">{item.nome}</h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Image section */}
          <div className="flex flex-col gap-3">
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {mainImage ? (
                <img src={mainImage} alt={item.nome} className="w-full h-full object-cover" />
              ) : (
                <Shirt className="w-20 h-20 text-gray-400" />
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === selectedImage
                        ? 'border-blue-500'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details section */}
          <div className="flex flex-col gap-4">
            {item.valor_venda != null && (
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatBRL(item.valor_venda)}
              </p>
            )}

            <dl className="space-y-2">
              {details.map(({ label, value }) =>
                value != null && value !== '' ? (
                  <div key={label} className="flex justify-between text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>

            <div className="mt-auto pt-4">
              {tenantWhatsapp ? (
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Tenho Interesse
                </a>
              ) : (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500">
                  Entre em contato para mais informações.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
