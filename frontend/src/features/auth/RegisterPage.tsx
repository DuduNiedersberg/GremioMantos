import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';

type UserType = 'tenant_admin' | 'colecionador';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [tipo, setTipo] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    nome_loja: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo) { toast.error('Selecione o tipo de conta'); return; }
    if (!formData.nome || !formData.email || !formData.senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (tipo === 'tenant_admin' && !formData.nome_loja) {
      toast.error('Nome da loja é obrigatório para vendedores');
      return;
    }

    setLoading(true);
    try {
      await register({
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        telefone: formData.telefone || undefined,
        tipo,
        nome_loja: tipo === 'tenant_admin' ? formData.nome_loja : undefined,
        provider: 'local',
      });
      toast.success('Conta criada com sucesso!');
      navigate(tipo === 'tenant_admin' ? '/dashboard' : '/vitrine');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 text-white text-4xl font-bold mb-4 shadow-lg">
            G
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Criar Conta</h1>
          <p className="text-gray-600 dark:text-gray-400">Escolha como você quer usar o GremioMantos</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 space-y-6">
          {/* Tipo de conta */}
          {!tipo && (
            <div className="space-y-4">
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-center">Como você vai usar?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTipo('tenant_admin')}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                >
                  <span className="text-4xl mb-2">🏪</span>
                  <span className="font-bold text-gray-900 dark:text-white">Vendedor</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">Vendo camisetas e quero uma vitrine</span>
                </button>
                <button
                  onClick={() => setTipo('colecionador')}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                >
                  <span className="text-4xl mb-2">👕</span>
                  <span className="font-bold text-gray-900 dark:text-white">Colecionador</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">Gerencio minha coleção pessoal</span>
                </button>
              </div>
            </div>
          )}

          {/* Formulário */}
          {tipo && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{tipo === 'tenant_admin' ? '🏪' : '👕'}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {tipo === 'tenant_admin' ? 'Conta Vendedor' : 'Conta Colecionador'}
                </span>
                <button
                  type="button"
                  onClick={() => setTipo(null)}
                  className="ml-auto text-xs text-blue-600 hover:underline"
                >
                  Alterar
                </button>
              </div>

              <Input
                label="Nome completo *"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Seu nome"
                required
                disabled={loading}
              />

              <Input
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />

              <Input
                label="Senha *"
                name="senha"
                type="password"
                value={formData.senha}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres, maiúscula, número e símbolo"
                required
                disabled={loading}
              />

              <Input
                label="WhatsApp (opcional)"
                name="telefone"
                type="tel"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="51999999999"
                disabled={loading}
              />

              {tipo === 'tenant_admin' && (
                <Input
                  label="Nome da loja/vitrine *"
                  name="nome_loja"
                  value={formData.nome_loja}
                  onChange={handleChange}
                  placeholder="Ex: Bolicho Tricolor"
                  required
                  disabled={loading}
                />
              )}

              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Criando conta...' : 'Criar Conta Grátis'}
              </Button>
            </form>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Já tem conta?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-semibold">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
