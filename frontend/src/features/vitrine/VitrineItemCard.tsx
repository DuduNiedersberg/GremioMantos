import React, { useState } from 'react';
import { Shirt, MessageCircle } from 'lucide-react';

interface VitrineItemCardProps {
  item: {
    id: number;
    nome: string;
    ano?: number;
    marca?: string;
    jogador?: string;
    tamanho?: string;
    valor_venda?: number;
    imagem_url?: string;
    thumbnail_url?: string;
    tenant_whatsapp?: string;
    tenant_slug?: string;
  };
  onClick: () => void;
}

export default function VitrineItemCard({ item, onClick }: VitrineItemCardProps) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = item.thumbnail_url || item.imagem_url;

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const buildWhatsAppUrl = () => {
    const currentUrl = window.location.href;
    const valor = item.valor_venda ? formatBRL(item.valor_venda) : 'Consultar';
    const mensagem = encodeURIComponent(
      `Olá! Tenho interesse na ${item.nome} (Ref: ${item.id})\nValor: ${valor}\nLink: ${currentUrl}`
    );
    return `https://wa.me/${item.tenant_whatsapp}?text=${mensagem}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(buildWhatsAppUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleSaibaMais = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700"
      onClick={onClick}
    >
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={item.nome}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Shirt className="w-16 h-16 text-gray-400" />
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-1">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
          {item.nome}
        </h3>

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          {item.marca && <p>{item.marca}</p>}
          {item.ano && <p>{item.ano}</p>}
          {item.jogador && <p>{item.jogador}</p>}
        </div>

        {item.valor_venda != null && (
          <p className="mt-auto pt-2 text-base font-bold text-green-600 dark:text-green-400">
            {formatBRL(item.valor_venda)}
          </p>
        )}

        <div className="mt-2">
          {item.tenant_whatsapp ? (
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Tenho Interesse
            </button>
          ) : (
            <button
              onClick={handleSaibaMais}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
            >
              Saiba Mais
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
