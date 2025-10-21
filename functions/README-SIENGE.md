# 🚀 Firebase Functions - Integração Sienge

## ✅ Funções Implementadas

1. **`createSiengeCreditor`** - Criar credor no Sienge
2. **`previewSiengeCreditor`** - Preview dos dados antes de enviar

---

## 📝 Configuração

### 1. Configurar API Key do Sienge

Existem duas formas de configurar:

#### Opção A: Variáveis de Ambiente (Recomendado para v2)

Crie um arquivo `.env` na pasta `functions/`:

```bash
SIENGE_API_KEY=sua_api_key_aqui
SIENGE_BASE_URL=https://api.sienge.com.br
```

Adicione `.env` ao `.gitignore` para não versionar!

#### Opção B: Firebase Config (Legacy)

```bash
firebase functions:config:set sienge.apikey="SUA_API_KEY_AQUI"
firebase functions:config:set sienge.baseurl="https://api.sienge.com.br"
```

Para verificar:
```bash
firebase functions:config:get
```

---

## 🚀 Deploy

### 1. Build do código TypeScript

```bash
cd functions
npm run build
```

### 2. Deploy das funções

```bash
cd ..
firebase deploy --only functions
```

Ou deploy de função específica:
```bash
firebase deploy --only functions:createSiengeCreditor
firebase deploy --only functions:previewSiengeCreditor
```

---

## 🧪 Testes

### 1. Testar Localmente (Emulador)

```bash
firebase emulators:start --only functions
```

### 2. Testar Preview no Frontend

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const previewFunc = httpsCallable(functions, 'previewSiengeCreditor');

const result = await previewFunc({
  supplierId: 'abc123',
  cityId: 1,      // opcional
  agentId: 48     // opcional
});

console.log('Preview:', result.data);
```

### 3. Criar Credor no Sienge

```typescript
const createFunc = httpsCallable(functions, 'createSiengeCreditor');

const result = await createFunc({
  supplierId: 'abc123',
  cityId: 1,      // opcional
  agentId: 48     // opcional
});

if (result.data.success) {
  console.log('Credor criado:', result.data.siengeCreditorId);
}
```

---

## 📊 Logs

Ver logs em tempo real:
```bash
firebase functions:log
```

Ver logs de função específica:
```bash
firebase functions:log --only createSiengeCreditor
```

---

## 🔧 Troubleshooting

### Erro: "API Key do Sienge não configurada"

Verifique se a variável de ambiente está configurada:
```bash
firebase functions:config:get
```

### Erro: "Dados inválidos"

Use a função `previewSiengeCreditor` para ver exatamente o que será enviado e validar os dados.

### Erro 401 - "API Key inválida"

Verifique se a API Key está correta e tem permissões para criar credores no Sienge.

---

## 📋 Checklist de Deploy

- [ ] Axios instalado (`npm install axios` na pasta functions)
- [ ] API Key do Sienge configurada
- [ ] Código compilado sem erros (`npm run build`)
- [ ] Funções deployadas (`firebase deploy --only functions`)
- [ ] Testes realizados com `previewSiengeCreditor`
- [ ] Primeiro credor enviado com sucesso

---

## 🔐 Segurança

✅ **Implementado:**
- Autenticação obrigatória para todas as funções
- API Key protegida (não exposta no client)
- Validação de dados antes de enviar
- Logs de auditoria
- Tratamento de erros específicos

---

## 📚 Referências

- [Firebase Functions v2](https://firebase.google.com/docs/functions/beta)
- [API Sienge - Credores](https://api.sienge.com.br/docs/#/creditor-v1)
- [Axios](https://axios-http.com/)
