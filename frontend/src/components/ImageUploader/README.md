# ImageUploader Component

Component React para upload de imagens para Azure Blob Storage com suporte a drag & drop, preview, validação e galeria.

## 📦 Arquivos

- `ImageUploader.tsx` - Componente principal
- `ImagePreview.tsx` - Componente de preview individual
- `ImageUploader.styles.css` - Estilos CSS
- `index.ts` - Exportações

## 🚀 Como Usar

### Importação

```typescript
import ImageUploader from '@/components/ImageUploader';
```

### Exemplo Básico - Upload de Fotos de Item

```typescript
import React from 'react';
import ImageUploader from '@/components/ImageUploader';

const ItemPhotoUpload: React.FC = () => {
  const handleUploadComplete = (images) => {
    console.log('Imagens enviadas:', images);
    // Atualizar estado ou fazer requisições adicionais
  };

  return (
    <ImageUploader
      tipo="item"
      itemId={123}
      maxFiles={5}
      onUploadComplete={handleUploadComplete}
    />
  );
};
```

### Exemplo - Upload de Logo do Tenant

```typescript
const TenantLogoUpload: React.FC = () => {
  return (
    <ImageUploader
      tipo="logo_tenant"
      maxFiles={1}
      onUploadComplete={(images) => {
        console.log('Logo atualizado:', images[0]);
      }}
    />
  );
};
```

### Exemplo - Upload de Avatar do Usuário

```typescript
const UserAvatarUpload: React.FC = () => {
  return (
    <ImageUploader
      tipo="avatar_usuario"
      maxFiles={1}
    />
  );
};
```

### Exemplo - Com Imagens Existentes

```typescript
const ItemGallery: React.FC = () => {
  const existingImages = [
    {
      url: 'https://storage.blob.core.windows.net/container/1/123/image1.jpg',
      filename: '1/123/image1.jpg',
      size: 123456,
    },
  ];

  return (
    <ImageUploader
      tipo="item"
      itemId={123}
      maxFiles={5}
      existingImages={existingImages}
    />
  );
};
```

## 📋 Props

### ImageUploaderProps

| Prop | Tipo | Obrigatório | Padrão | Descrição |
|------|------|-------------|--------|-----------|
| `tipo` | `'item' \| 'logo_tenant' \| 'avatar_usuario'` | ✅ | - | Tipo de upload |
| `itemId` | `number` | ❌ | - | ID do item (obrigatório para tipo='item') |
| `maxFiles` | `number` | ❌ | `5` | Número máximo de arquivos |
| `onUploadComplete` | `(images: UploadResponse[]) => void` | ❌ | - | Callback após upload bem-sucedido |
| `existingImages` | `Array<{ url, filename, size? }>` | ❌ | `[]` | Imagens já enviadas |

### UploadResponse

```typescript
interface UploadResponse {
  message: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}
```

## ✨ Funcionalidades

- ✅ **Drag & Drop** - Arraste arquivos para a área de upload
- ✅ **Seleção Manual** - Clique para abrir seletor de arquivos
- ✅ **Preview** - Visualize imagens antes de enviar
- ✅ **Validação** - Apenas JPEG, PNG, WebP (máx. 5MB)
- ✅ **Progress Bar** - Barra de progresso em tempo real
- ✅ **Upload Múltiplo** - Envie até 5 arquivos simultaneamente
- ✅ **Galeria** - Visualize imagens já enviadas
- ✅ **Delete** - Remova imagens do storage
- ✅ **Dark Mode** - Suporte a tema escuro
- ✅ **Responsivo** - Funciona em mobile e desktop
- ✅ **Type Safety** - TypeScript completo
- ✅ **Memory Safe** - Cleanup adequado de Object URLs

## 🔒 Validações

### Tipos de Arquivo Permitidos
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/webp` (.webp)

### Tamanho Máximo
- 5 MB por arquivo

### Autenticação
- JWT token obrigatório via `useAuth()` hook

## 🎨 Customização

O componente usa Tailwind CSS para estilos básicos e CSS personalizado para elementos específicos. Para customizar:

1. Modifique `ImageUploader.styles.css` para ajustar cores, espaçamentos, etc.
2. Os estilos respeitam o tema escuro automaticamente via classes `.dark`

## 🔧 Dependências

- `react` - Framework
- `react-dropzone` - Drag & drop
- `axios` - HTTP requests
- `lucide-react` - Ícones

## 📡 Backend Integration

O componente se integra com os seguintes endpoints:

### POST /api/upload
```typescript
// Request
FormData {
  file: File,
  item_id?: string,
  tipo: 'item' | 'logo_tenant' | 'avatar_usuario'
}

// Response
{
  message: string,
  url: string,
  filename: string,
  size: number,
  contentType: string
}
```

### DELETE /api/upload
```typescript
// Request
{
  filename: string
}

// Response
{
  message: string
}
```

## 🧪 Testando

Para testar o componente:

1. **Upload de Item**
   - Selecione 1-5 imagens
   - Verifique preview
   - Faça upload
   - Confirme salvamento na tabela `imagens`

2. **Upload de Logo**
   - Selecione 1 logo
   - Faça upload
   - Verifique atualização de `tenants.logo_url`

3. **Upload de Avatar**
   - Selecione 1 avatar
   - Faça upload
   - Verifique atualização de `usuarios.avatar_url`

4. **Validações**
   - Tente arquivo > 5MB (deve rejeitar)
   - Tente arquivo não-imagem (deve rejeitar)
   - Tente sem autenticação (deve retornar 401)

5. **Delete**
   - Delete uma imagem
   - Verifique remoção do banco e storage

## 🐛 Troubleshooting

### Erro: "Você precisa estar autenticado"
- Verifique se o usuário está logado
- Confirme que `useAuth()` retorna um token válido

### Erro: "Tipo de arquivo não permitido"
- Apenas JPEG, PNG e WebP são aceitos
- Verifique a extensão do arquivo

### Erro: "Arquivo muito grande"
- Tamanho máximo é 5MB
- Comprima a imagem antes de enviar

### Preview não aparece
- Verifique console para erros
- Confirme que o arquivo é uma imagem válida

## 📚 Recursos Adicionais

- [Azure Blob Storage Docs](https://learn.microsoft.com/azure/storage/blobs/)
- [React Dropzone Docs](https://react-dropzone.js.org/)
- [Backend Implementation](/api/src/functions/upload.ts)
