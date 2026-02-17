import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, QrCode, Shirt } from 'lucide-react';
import { getItem, deleteItem } from '../../lib/api';
import { Item } from '../../types';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import Button from '../../shared/components/Button';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import ItemQRCode from './ItemQRCode';

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Item | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadItem(parseInt(id));
    }
  }, [id]);

  const loadItem = async (itemId: number) => {
    try {
      setLoading(true);
      const response = await getItem(itemId);
      setItem(response.data.data);
    } catch (err) {
      showError('Erro ao carregar item');
      console.error(err);
      navigate('/itens');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    try {
      setDeleting(true);
      await deleteItem(item.id);
      success('Item excluído com sucesso!');
      navigate('/itens');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao excluir item');
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Item não encontrado</p>
      </div>
    );
  }

  const situacaoColors: Record<string, string> = {
    disponivel: 'bg-green-100 text-green-800',
    vendido: 'bg-blue-100 text-blue-800',
    trocado: 'bg-purple-100 text-purple-800',
    reservado: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/itens')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={() => setShowQRCode(true)}>
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </Button>
          <Link to={`/itens/${item.id}/editar`}>
            <Button variant="secondary">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Link>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Item Image and Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="aspect-square bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center overflow-hidden">
            {item.imagem_principal_url ? (
              <img 
                src={item.imagem_principal_url} 
                alt={item.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <Shirt className="w-24 h-24 text-neutral-400" />
            )}
          </div>
          
          {/* Galeria de imagens */}
          {item.imagens && item.imagens.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {item.imagens.map((img) => (
                <button
                  key={img.id}
                  onClick={() => {/* Futuramente: trocar imagem principal exibida */}}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    img.e_principal 
                      ? 'border-yellow-500' 
                      : 'border-transparent hover:border-gremio-celeste'
                  }`}
                >
                  <img 
                    src={img.thumbnail_url || img.url_blob}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{item.nome}</h1>
              <span className={`badge ${situacaoColors[item.situacao] || 'bg-neutral-100 text-neutral-800'}`}>
                {item.situacao}
              </span>
            </div>
            {item.valor_venda && (
              <div className="text-right">
                <p className="text-sm text-neutral-500">Valor</p>
                <p className="text-2xl font-bold text-gremio-celeste">
                  {formatCurrency(item.valor_venda)}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {item.ano && (
              <div>
                <p className="text-sm text-neutral-500">Ano</p>
                <p className="font-medium">{item.ano}</p>
              </div>
            )}
            {item.marca && (
              <div>
                <p className="text-sm text-neutral-500">Marca</p>
                <p className="font-medium">{item.marca}</p>
              </div>
            )}
            {item.modelo && (
              <div>
                <p className="text-sm text-neutral-500">Modelo</p>
                <p className="font-medium">{item.modelo}</p>
              </div>
            )}
            {item.tamanho && (
              <div>
                <p className="text-sm text-neutral-500">Tamanho</p>
                <p className="font-medium">{item.tamanho}</p>
              </div>
            )}
            {item.jogador && (
              <div>
                <p className="text-sm text-neutral-500">Jogador</p>
                <p className="font-medium">{item.jogador}</p>
              </div>
            )}
            {item.numero && (
              <div>
                <p className="text-sm text-neutral-500">Número</p>
                <p className="font-medium">#{item.numero}</p>
              </div>
            )}
            {item.tipo && (
              <div>
                <p className="text-sm text-neutral-500">Tipo</p>
                <p className="font-medium">{item.tipo}</p>
              </div>
            )}
            {item.cor_principal && (
              <div>
                <p className="text-sm text-neutral-500">Cor Principal</p>
                <p className="font-medium">{item.cor_principal}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Valores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-neutral-500">Valor de Compra</p>
            <p className="text-lg font-bold">{formatCurrency(item.valor_compra)}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Valor de Venda</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(item.valor_venda)}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Valor de Mercado</p>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(item.valor_mercado)}</p>
          </div>
          {item.lucro_calculado !== undefined && (
            <div>
              <p className="text-sm text-neutral-500">Lucro Calculado</p>
              <p className={`text-lg font-bold ${item.lucro_calculado >= 0 ? 'text-green-600' : 'text-error'}`}>
                {formatCurrency(item.lucro_calculado)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Condition */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Condição</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {item.condicao && (
            <div>
              <p className="text-sm text-neutral-500">Estado</p>
              <p className="font-medium">{item.condicao}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-neutral-500">Autografada</p>
            <p className="font-medium">{item.autografada ? 'Sim' : 'Não'}</p>
          </div>
          {item.autografada && item.autografo_descricao && (
            <div>
              <p className="text-sm text-neutral-500">Descrição do Autógrafo</p>
              <p className="font-medium">{item.autografo_descricao}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dates and Origin */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Origem e Datas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {item.data_aquisicao && (
            <div>
              <p className="text-sm text-neutral-500">Data de Aquisição</p>
              <p className="font-medium">{formatDate(item.data_aquisicao)}</p>
            </div>
          )}
          {item.data_saida && (
            <div>
              <p className="text-sm text-neutral-500">Data de Saída</p>
              <p className="font-medium">{formatDate(item.data_saida)}</p>
            </div>
          )}
          {item.destino && (
            <div>
              <p className="text-sm text-neutral-500">Destino</p>
              <p className="font-medium">{item.destino}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-neutral-500">Criado em</p>
            <p className="font-medium">{formatDate(item.criado_em)}</p>
          </div>
        </div>
      </div>

      {/* Observations */}
      {item.observacoes && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Observações</h2>
          <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
            {item.observacoes}
          </p>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <ItemQRCode item={item} onClose={() => setShowQRCode(false)} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Exclusão</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Tem certeza que deseja excluir o item <strong>{item.nome}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
