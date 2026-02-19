import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { createItem, updateItem, getItem, getLotes } from '../../lib/api';
import { Item, Lote } from '../../types';
import Button from '../../shared/components/Button';
import LoadingSkeleton from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../contexts/ToastContext';
import Step1Identificacao from './form-steps/Step1Identificacao';
import Step2Caracteristicas from './form-steps/Step2Caracteristicas';
import Step3Condicao from './form-steps/Step3Condicao';
import Step4Valores from './form-steps/Step4Valores';
import Step5Fotos from './form-steps/Step5Fotos';

const STEPS = [
  { number: 1, title: 'Identificação' },
  { number: 2, title: 'Características' },
  { number: 3, title: 'Condição' },
  { number: 4, title: 'Valores' },
  { number: 5, title: 'Fotos' },
];

export default function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const autoNome = useRef<string>('');

  const [formData, setFormData] = useState<Partial<Item>>({
    nome: '',
    tipo: '',
    ano: undefined,
    marca: '',
    modelo: '',
    jogador: '',
    numero: undefined,
    tamanho: '',
    cor_principal: '',
    condicao: '',
    autografada: false,
    autografo_descricao: '',
    valor_compra: undefined,
    valor_venda: undefined,
    valor_mercado: undefined,
    situacao: 'estoque',
    destino: '',
    data_aquisicao: '',
    observacoes: '',
    lote_id: undefined,
  });

  // Auto-fill nome based on ano, jogador, numero
  useEffect(() => {
    const { ano, jogador, numero } = formData;
    const hasAno = ano !== undefined && ano !== null && String(ano) !== '';
    const hasJogador = Boolean(jogador && jogador.trim());
    const hasNumero = numero !== undefined && numero !== null;

    let generated = '';
    if (hasAno && hasJogador && hasNumero) {
      generated = `Camiseta ${ano} - ${jogador} #${numero}`;
    } else if (hasAno && hasJogador) {
      generated = `Camiseta ${ano} - ${jogador}`;
    } else if (hasJogador && hasNumero) {
      generated = `Camiseta - ${jogador} #${numero}`;
    } else if (hasJogador) {
      generated = `Camiseta - ${jogador}`;
    } else if (hasAno) {
      generated = `Camiseta ${ano}`;
    }

    if (!generated) return;

    setFormData(prev => {
      if (!prev.nome || prev.nome === autoNome.current) {
        autoNome.current = generated;
        return { ...prev, nome: generated };
      }
      return prev;
    });
  }, [formData.ano, formData.jogador, formData.numero]); // only watch these three fields for auto-fill

  useEffect(() => {
    loadLotes();
    if (isEditing && id) {
      loadItem(parseInt(id));
    }
  }, [id, isEditing]); // loadLotes and loadItem are stable local functions

  const loadLotes = async () => {
    try {
      const response = await getLotes({ perPage: 100 });
      setLotes(response.data.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar lotes:', err);
    }
  };

  const loadItem = async (itemId: number) => {
    try {
      setLoading(true);
      const response = await getItem(itemId);
      const item = response.data.data;
      setFormData({
        ...item,
        data_aquisicao: item.data_aquisicao ? item.data_aquisicao.split('T')[0] : '',
      });
    } catch (err) {
      showError('Erro ao carregar item');
      console.error(err);
      navigate('/itens');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      newValue = value === '' ? undefined : parseFloat(value);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.nome) {
      showError('Nome é obrigatório');
      return;
    }
    setCurrentStep(s => Math.min(s + 1, STEPS.length));
  };

  const handlePrev = () => {
    setCurrentStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome) {
      showError('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);

      const dataToSave = {
        ...formData,
        valor_compra: formData.valor_compra ?? 0,
      };

      if (isEditing && id) {
        await updateItem(parseInt(id), dataToSave);
        success('Item atualizado com sucesso!');
        navigate('/itens');
      } else {
        const response = await createItem(dataToSave);
        const novoItemId = response.data.data.id;
        success('Item criado! Agora adicione fotos.');
        navigate(`/itens/${novoItemId}/editar`);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Erro ao salvar item');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/itens')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Item' : 'Nova Camiseta'}
        </h1>
      </div>

      {/* Stepper */}
      <div className="card">
        <div className="flex items-start justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={[
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors',
                    currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.number
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400',
                  ].join(' ')}
                >
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span className="text-xs mt-1 text-center w-16 text-neutral-600 dark:text-neutral-400">
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={[
                    'flex-1 h-1 mt-5 mx-2 rounded transition-colors',
                    currentStep > index + 1
                      ? 'bg-green-500'
                      : 'bg-neutral-200 dark:bg-neutral-700',
                  ].join(' ')}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <form onSubmit={handleSubmit}>
        <div className="card min-h-64">
          <h2 className="text-lg font-bold mb-6">
            {STEPS[currentStep - 1].title}
          </h2>

          {currentStep === 1 && (
            <Step1Identificacao formData={formData} onChange={handleChange} />
          )}
          {currentStep === 2 && (
            <Step2Caracteristicas formData={formData} onChange={handleChange} />
          )}
          {currentStep === 3 && (
            <Step3Condicao formData={formData} onChange={handleChange} />
          )}
          {currentStep === 4 && (
            <Step4Valores formData={formData} onChange={handleChange} />
          )}
          {currentStep === 5 && (
            <Step5Fotos
              itemId={id ? parseInt(id, 10) : undefined}
              isEditing={isEditing}
              onUploadComplete={(uploadedImages) => {
                const message =
                  uploadedImages.length === 1
                    ? '1 imagem enviada com sucesso!'
                    : `${uploadedImages.length} imagens enviadas com sucesso!`;
                success(message);
              }}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="secondary" type="button" onClick={handlePrev}>
                ← Anterior
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" type="button" onClick={() => navigate('/itens')}>
              Cancelar
            </Button>
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext}>
                Próximo →
              </Button>
            ) : (
              <Button type="submit" loading={saving}>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Salvar Alterações' : 'Criar Item'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
