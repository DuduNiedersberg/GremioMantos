# 🔵⚫⚪ Bolicho do Grêmio - Vale dos Sinos

<div align="center">
  
  ![Grêmio Logo](frontend/public/logo-gremio.svg)
  
  **Sistema completo de gestão de camisetas colecionáveis do Grêmio FBPA**
  
  [![Deploy API](https://github.com/DuduNiedersberg/GremioMantos/actions/workflows/deploy-api.yml/badge.svg)](https://github.com/DuduNiedersberg/GremioMantos/actions/workflows/deploy-api.yml)
  [![Deploy Frontend](https://github.com/DuduNiedersberg/GremioMantos/actions/workflows/deploy-frontend.yml/badge.svg)](https://github.com/DuduNiedersberg/GremioMantos/actions/workflows/deploy-frontend.yml)
  
  [🌐 Ver Aplicação](https://dudniedersberg.github.io/GremioMantos/) | [📖 Documentação API](#-api-documentation)
  
</div>

---

## 📋 Sobre o Projeto

O **Bolicho do Grêmio - Vale dos Sinos** é um sistema web profissional e completo desenvolvido para gerenciar acervos de camisetas colecionáveis do Grêmio FBPA. Com foco em **mobile-first**, identidade visual tricolor e tecnologias modernas, oferece uma solução completa para colecionadores.

### ✨ Features Principais

- 📊 **Dashboard Interativo** - Métricas em tempo real do acervo
- 👕 **Gestão de Camisetas** - CRUD completo com filtros e busca
- 💰 **Controle de Vendas** - Registro e histórico de vendas
- 🔄 **Gestão de Trocas** - Controle de trocas entre itens
- 📦 **Lotes de Compra** - Organização por lotes de aquisição
- ❤️ **Wishlist** - Lista de desejos com prioridades
- 👥 **Cadastro de Clientes** - Gerenciamento de compradores
- 📈 **Histórico de Preços** - Acompanhamento de valorização
- 📱 **QR Code** - Geração de códigos para cada item
- 🌓 **Dark Mode** - Tema claro/escuro
- 📱 **Mobile-First** - Design responsivo otimizado

---

## 🏗️ Arquitetura

### Stack Tecnológica

#### Backend - Azure Functions
- **Runtime:** Node.js 22.x
- **Framework:** Azure Functions v4
- **Database:** Azure SQL Database
- **Auth:** System-Assigned Managed Identity
- **Language:** TypeScript

#### Frontend - React SPA
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Styling:** TailwindCSS 3
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Deployment:** GitHub Pages

#### Database - Azure SQL
- **Server:** gremio.database.windows.net
- **Database:** bolicho_gremio_camisetas
- **Region:** Brazil South

### Estrutura do Projeto

```
GremioMantos/
├── api/                          # Azure Functions API
│   ├── src/
│   │   ├── functions/           # Endpoints (10 functions)
│   │   │   ├── health.ts
│   │   │   ├── itens.ts
│   │   │   ├── vendas.ts
│   │   │   ├── trocas.ts
│   │   │   ├── lotes.ts
│   │   │   ├── clientes.ts
│   │   │   ├── wishlist.ts
│   │   │   ├── historico-precos.ts
│   │   │   ├── qrcode.ts
│   │   │   └── dashboard.ts
│   │   ├── lib/                 # Core libraries
│   │   │   ├── database.ts
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── middleware/          # Middlewares
│   │       ├── cors.ts
│   │       └── errorHandler.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── host.json
│
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── features/            # Feature modules
│   │   │   ├── dashboard/
│   │   │   ├── itens/
│   │   │   ├── vendas/
│   │   │   ├── trocas/
│   │   │   ├── lotes/
│   │   │   ├── wishlist/
│   │   │   └── clientes/
│   │   ├── shared/              # Shared components
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── contexts/            # React contexts
│   │   ├── lib/                 # Libraries
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── database/                     # SQL Scripts
│   ├── schema-azure-sql.sql
│   ├── migrations/
│   │   ├── 001_add_wishlist.sql
│   │   ├── 002_add_historico_precos.sql
│   │   └── 003_add_imagens.sql
│   └── seed-data-azure-sql.sql
│
└── .github/workflows/           # CI/CD
    ├── deploy-api.yml
    └── deploy-frontend.yml
```

---

## 🚀 Setup e Desenvolvimento

### Pré-requisitos

- Node.js 22.x ou superior
- Azure Functions Core Tools 4.x
- Azure CLI (para deploy)
- Conta Azure (para backend)

### Instalação Local

#### 1. Clone o repositório

```bash
git clone https://github.com/DuduNiedersberg/GremioMantos.git
cd GremioMantos
```

#### 2. Setup Backend (API)

```bash
cd api
npm install
npm run build
npm start  # Inicia em http://localhost:7071
```

#### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev  # Inicia em http://localhost:5173
```

### Variáveis de Ambiente

#### Backend (local.settings.json)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "SQL_SERVER": "gremio.database.windows.net",
    "SQL_DATABASE": "bolicho_gremio_camisetas"
  }
}
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:7071/api
```

---

## 📡 API Documentation

### Base URL
```
Production: https://gremiomantosapi-d6gshveqc4fee0c2.brazilsouth-01.azurewebsites.net/api
Local: http://localhost:7071/api
```

### Endpoints

#### Health Check
```http
GET /health
```

#### Itens (Camisetas)
```http
GET    /itens              # Listar todos
GET    /itens/{id}         # Buscar por ID
POST   /itens              # Criar novo
PUT    /itens/{id}         # Atualizar
DELETE /itens/{id}         # Excluir
```

#### Dashboard
```http
GET    /dashboard          # Métricas gerais
```

#### Vendas
```http
GET    /vendas             # Listar vendas
GET    /vendas/{id}        # Buscar venda
POST   /vendas             # Registrar venda
```

#### Trocas
```http
GET    /trocas             # Listar trocas
GET    /trocas/{id}        # Buscar troca
POST   /trocas             # Registrar troca
```

#### Lotes
```http
GET    /lotes              # Listar lotes
GET    /lotes/{id}         # Buscar lote com itens
POST   /lotes              # Criar lote
PUT    /lotes/{id}         # Atualizar lote
DELETE /lotes/{id}         # Excluir lote
```

#### Clientes
```http
GET    /clientes           # Listar clientes
GET    /clientes/{id}      # Buscar cliente
POST   /clientes           # Criar cliente
PUT    /clientes/{id}      # Atualizar cliente
DELETE /clientes/{id}      # Excluir cliente
```

#### Wishlist
```http
GET    /wishlist           # Listar wishlist
GET    /wishlist/{id}      # Buscar item
POST   /wishlist           # Adicionar item
PUT    /wishlist/{id}      # Atualizar item
DELETE /wishlist/{id}      # Remover item
```

#### Histórico de Preços
```http
GET    /itens/{id}/historico-precos     # Buscar histórico
POST   /itens/{id}/historico-precos     # Adicionar registro
```

#### QR Code
```http
GET    /itens/{id}/qrcode  # Gerar QR Code
```

### Exemplo de Requisição

```javascript
// Criar novo item
POST /api/itens
Content-Type: application/json

{
  "nome": "Camisa Grêmio 1983 Mundial",
  "ano": 1983,
  "marca": "Olympikus",
  "modelo": "Home",
  "jogador": "Renato",
  "numero": 7,
  "tamanho": "M",
  "valor_compra": 800.00,
  "valor_venda": 1500.00,
  "observacoes": "Camisa histórica do Mundial"
}
```

---

## 🎨 Design System

### Cores

#### Grêmio (Primárias)
- **Celeste:** `#00A3E0`
- **Preto:** `#000000`
- **Branco:** `#FFFFFF`

#### Estados
- **Success:** `#10B981`
- **Error:** `#EF4444`
- **Warning:** `#F59E0B`
- **Info:** `#3B82F6`

### Breakpoints
- **Mobile:** < 640px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Componentes
- Mobile-first responsivo
- Dark mode support
- Animações suaves
- Feedback visual claro
- Acessibilidade WCAG AA

---

## 🔐 Segurança

- ✅ System-Assigned Managed Identity para SQL
- ✅ CORS configurado
- ✅ HTTPS only
- ✅ Input validation com Zod
- ✅ SQL injection protection (parameterized queries)
- ✅ Error messages sem info sensível

---

## 🚢 Deploy

### Backend (Automático via GitHub Actions)

O deploy do backend é automático ao fazer push para `main` com mudanças em `api/`:

1. Build TypeScript
2. Deploy para Azure Functions
3. Health check automático

### Frontend (Automático via GitHub Actions)

O deploy do frontend é automático ao fazer push para `main` com mudanças em `frontend/`:

1. Build com Vite
2. Deploy para GitHub Pages
3. Disponível em: https://dudniedersberg.github.io/GremioMantos/

### Deploy Manual

#### API
```bash
cd api
npm run build
func azure functionapp publish gremiomantosapi
```

#### Frontend
```bash
cd frontend
npm run build
# Upload pasta dist/ para GitHub Pages
```

---

## 📊 Database Schema

### Tabelas Principais

- **itens** - Camisetas do acervo
- **lotes** - Lotes de compra
- **clientes** - Cadastro de clientes
- **vendas** - Registro de vendas
- **trocas** - Registro de trocas
- **wishlist** - Lista de desejos
- **historico_precos** - Histórico de valores
- **imagens** - Imagens dos itens (Azure Blob)

### Migrations

Migrations estão em `database/migrations/`:
1. `001_add_wishlist.sql` - Tabela wishlist
2. `002_add_historico_precos.sql` - Histórico de preços
3. `003_add_imagens.sql` - Tabela de imagens

---

## 📈 Roadmap

### Próximas Features
- [ ] Filtros avançados de busca
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Upload de imagens (Azure Blob Storage)
- [ ] Notificações por email
- [ ] Gráficos de valorização
- [ ] App mobile (React Native)
- [ ] Integração com Mercado Livre
- [ ] Sistema de autenticação
- [ ] Multi-tenancy

---

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto é de uso pessoal. Todos os direitos reservados.

---

## 👨‍💻 Autor

**Dudu Niedersberg**
- GitHub: [@DuduNiedersberg](https://github.com/DuduNiedersberg)

---

## 🙏 Agradecimentos

- **Grêmio FBPA** - Pelo amor incondicional ao Tricolor
- **Vale dos Sinos** - Região que representa
- **Comunidade de colecionadores** - Pela paixão pelos mantos

---

<div align="center">
  
  ### 🔵⚫⚪ Tricolor de coração! 💙🖤🤍
  
  **AVANTE GRÊMIO!**
  
</div>
