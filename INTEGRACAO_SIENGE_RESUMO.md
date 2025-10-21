# ✅ Integração Sienge - Resumo da Implementação

## 🎯 O Que Foi Implementado

### 1. **Novas Interfaces TypeScript** (`types.ts`)

Adicionados novos campos à interface `Supplier`:
- ✅ `personType: 'F' | 'J'` - Tipo de pessoa (Física/Jurídica)
- ✅ `stateRegistrationType: 'C' | 'I' | 'N'` - Tipo de inscrição estadual

Nova interface completa para API Sienge:
- ✅ `SiengeCreditorRequest` - Estrutura completa do payload

---

### 2. **Função de Mapeamento** (`firebaseService.ts`)

Implementada função `mapSupplierToSiengeCreditor()` que converte dados do formulário para formato Sienge:

**Mapeamentos automáticos:**
- ✅ Extração de DDD do telefone: `(48) 99999-8888` → `{ ddd: "48", number: "999998888" }`
- ✅ Remoção de formatação de CNPJ: `12.345.678/0001-90` → `12345678000190`
- ✅ Remoção de formatação de CEP: `88000-000` → `88000000`
- ✅ Conversão tipo de conta: `corrente` → `C`, `poupanca` → `P`
- ✅ Padding de código bancário: `1` → `001`
- ✅ Inscrição Municipal apenas para PJ

---

### 3. **Campos Adicionados no Formulário** (`PreRegistrationPage.tsx`)

**Novos campos na aba "Dados da Empresa":**

1. **Tipo de Pessoa** (select obrigatório)
   ```
   [ ] Jurídica (padrão)
   [ ] Física
   ```

2. **Tipo de Inscrição Estadual** (select obrigatório)
   ```
   [ ] Contribuinte (padrão)
   [ ] Isento
   [ ] Não Contribuinte
   ```

**Validação condicional implementada:**
- Inscrição Municipal é obrigatória **apenas** quando `Tipo de Pessoa = Jurídica`

---

### 4. **Métodos no FirebaseService**

```typescript
// Obter dados formatados para Sienge (sem enviar)
await firebaseService.getSiengeCreditorData(supplier, cityId?, agentId?)

// Criar credor no Sienge (placeholder - requer Cloud Function)
await firebaseService.createCreditorInSienge(supplier, cityId?, agentId?)
```

---

## 📋 Estrutura do Payload Sienge

### Campos Principais

```json
{
  "name": "Razão Social",
  "personType": "J",                    // F=Física, J=Jurídica
  "typesId": ["FO"],                    // FO=Fornecedor
  "registerNumber": "12345678000190",   // CNPJ/CPF sem formatação
  "stateRegistrationNumber": "123456",
  "stateRegistrationType": "C",         // C=Contribuinte, I=Isento, N=Não
  "municipalSubscription": "98765",     // Apenas PJ
  "paymentTypeId": 1,
  "phone": {
    "ddd": "48",
    "number": "999998888",
    "type": "1"                         // 1=Comercial
  },
  "agents": [{ "agentId": 48 }],
  "contacts": [...],
  "address": {
    "cityId": 1,                        // ID da cidade no Sienge
    "streetName": "Rua Exemplo",
    "number": "123",
    "complement": "Sala 1",
    "neighborhood": "Centro",
    "zipCode": "88000000"
  },
  "accountStatement": {
    "bankCode": "001",
    "bankBranchNumber": "1234",
    "bankBranchDigit": "5",
    "accountNumber": "56789",
    "accountDigit": "0",
    "accountType": "C",                 // C=Corrente, P=Poupança
    "accountBeneficiaryName": "...",
    "accountBeneficiaryCnpjNumber": "..."
  }
}
```

---

## 📁 Arquivos Criados/Modificados

### Modificados
1. ✅ `types.ts` - Interfaces atualizadas
2. ✅ `services/firebaseService.ts` - Função de mapeamento e métodos
3. ✅ `pages/PreRegistrationPage.tsx` - Novos campos no formulário

### Criados
4. ✅ `INTEGRACAO_SIENGE.md` - Documentação completa da integração
5. ✅ `functions-sienge-integration.ts` - Cloud Function pronta para uso
6. ✅ `INTEGRACAO_SIENGE_RESUMO.md` - Este arquivo

---

## 🚀 Próximos Passos para Deploy

### 1. Configurar Firebase Functions

```bash
# No diretório do projeto
firebase init functions

# Escolher TypeScript
# Instalar dependências
cd functions
npm install firebase-functions firebase-admin axios
```

### 2. Copiar Cloud Function

```bash
# Copiar conteúdo de functions-sienge-integration.ts 
# para functions/src/index.ts
```

### 3. Configurar API Key do Sienge

```bash
firebase functions:config:set sienge.apikey="SUA_API_KEY_AQUI"
firebase functions:config:set sienge.baseurl="https://api.sienge.com.br"
```

### 4. Deploy

```bash
firebase deploy --only functions
```

---

## 🧪 Como Testar

### 1. Testar Mapeamento Localmente

```typescript
import { firebaseService } from './services/firebaseService';

// Criar supplier de teste
const testSupplier = {
  id: 'test-123',
  companyName: 'Teste LTDA',
  cnpj: '12.345.678/0001-90',
  personType: 'J',
  stateRegistrationType: 'C',
  // ... demais campos
};

// Ver payload que seria enviado
const payload = await firebaseService.getSiengeCreditorData(testSupplier);
console.log(JSON.stringify(payload, null, 2));
```

### 2. Preview via Cloud Function

```typescript
// No frontend, após deploy da Cloud Function
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const previewSienge = httpsCallable(functions, 'previewSiengeCreditor');

const result = await previewSienge({ supplierId: 'abc123' });
console.log('Preview:', result.data.preview);
```

### 3. Enviar para Sienge

```typescript
const createSienge = httpsCallable(functions, 'createSiengeCreditor');

const result = await createSienge({
  supplierId: 'abc123',
  cityId: 1,      // opcional
  agentId: 48     // opcional
});

if (result.data.success) {
  console.log('Credor criado no Sienge:', result.data.siengeCreditorId);
}
```

---

## ⚠️ Validações Importantes

### Campos Obrigatórios no Sienge

✅ `name` - Razão Social  
✅ `personType` - Tipo de Pessoa  
✅ `typesId` - Array com tipos (ex: ["FO"])  
✅ `registerNumber` - CNPJ/CPF sem formatação  
✅ `stateRegistrationType` - Tipo de IE  
✅ `paymentTypeId` - ID do tipo de pagamento  

### Campos Condicionais

⚠️ `municipalSubscription` - **Obrigatório apenas para PJ**  
⚠️ `accountBeneficiaryCnpjNumber` - Apenas para PJ  
⚠️ `accountBeneficiaryCpfNumber` - Apenas para PF  

---

## 🔐 Segurança

**✅ IMPLEMENTADO:**
- Mapeamento de dados no backend (Cloud Function)
- API Key protegida via Firebase Config
- Validação de autenticação
- Logs de auditoria
- Tratamento de erros da API

**🚫 NÃO FAZER:**
- Chamar API Sienge diretamente do frontend
- Expor API Key no código client
- Enviar dados sem validação

---

## 📊 Fluxo Completo

```
1. Usuário preenche formulário
   ↓
2. Dados salvos no Firestore (status: "em_analise")
   ↓
3. Admin aprova fornecedor (status: "aprovado")
   ↓
4. Admin clica "Enviar para Sienge"
   ↓
5. Frontend chama Cloud Function "createSiengeCreditor"
   ↓
6. Cloud Function:
   - Busca dados do Firestore
   - Mapeia para formato Sienge
   - Faz POST para API Sienge
   - Salva siengeCreditorId no Firestore
   ↓
7. Fornecedor criado no Sienge ✅
```

---

## 🎨 Melhorias Futuras (Opcional)

- [ ] Trigger automático: enviar para Sienge ao aprovar
- [ ] Sincronização bidirecional
- [ ] Atualização de dados existentes (PUT)
- [ ] Webhook para notificações do Sienge
- [ ] Retry automático em caso de falha
- [ ] Dashboard de status de integração
- [ ] Exportação em massa
- [ ] Validação de CNPJ com API Receita Federal

---

## 📞 Suporte

### Documentação Sienge
- API Docs: https://api.sienge.com.br/docs
- Endpoint Credores: https://api.sienge.com.br/docs/#/creditor-v1

### Firebase
- Cloud Functions: https://firebase.google.com/docs/functions
- Firestore: https://firebase.google.com/docs/firestore

---

## ✅ Checklist Final

- [x] Interface `Supplier` atualizada com `personType` e `stateRegistrationType`
- [x] Interface `SiengeCreditorRequest` criada
- [x] Função `mapSupplierToSiengeCreditor` implementada
- [x] Campos adicionados no formulário de pré-cadastro
- [x] Validação condicional de Inscrição Municipal
- [x] Métodos no `firebaseService`
- [x] Cloud Function completa documentada
- [x] Documentação completa da integração
- [ ] Deploy da Cloud Function
- [ ] Configuração da API Key
- [ ] Testes em ambiente de homologação
- [ ] Implementação no painel admin (botão "Enviar para Sienge")

---

**Data:** 21/10/2025  
**Status:** ✅ Código implementado - Aguardando deploy da Cloud Function
