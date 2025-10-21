# 🔄 Integração com API Sienge - Criação de Credores

## 📋 Visão Geral

Este documento descreve a integração implementada para enviar dados de fornecedores cadastrados no sistema para a API do Sienge (ERP).

---

## 🎯 Endpoint da API Sienge

**POST** `https://api.sienge.com.br/creditor/v1/creditors`

Documentação completa: [https://api.sienge.com.br/docs/#/creditor-v1](https://api.sienge.com.br/docs/#/creditor-v1)

---

## 📊 Mapeamento de Dados

### 1. **Tipo de Pessoa (personType)**
- **`F`** = Pessoa Física
- **`J`** = Pessoa Jurídica (padrão)

### 2. **Tipo de Inscrição Estadual (stateRegistrationType)**
- **`C`** = Contribuinte (padrão)
- **`I`** = Isento
- **`N`** = Não Contribuinte

### 3. **Tipo de Conta Bancária (accountType)**
- **`corrente`** (formulário) → **`C`** (Sienge)
- **`poupanca`** (formulário) → **`P`** (Sienge)

### 4. **Tipo de Telefone**
- **`1`** = Comercial (padrão)
- **`2`** = Residencial
- **`3`** = Celular

### 5. **Tipos de Credor (typesId)**
- **`FO`** = Fornecedor (padrão)
- **`CO`** = Colaborador
- Outros conforme configuração do Sienge

---

## 🔧 Implementação

### Arquivos Modificados

#### 1. **`types.ts`** - Novas Interfaces

```typescript
export interface Supplier {
  // ... campos existentes
  personType: 'F' | 'J'; // NOVO
  stateRegistrationType: 'C' | 'I' | 'N'; // NOVO
  // ...
}

export interface SiengeCreditorRequest {
  name: string;
  personType: 'F' | 'J';
  typesId: string[];
  registerNumber: string;
  stateRegistrationNumber?: string;
  stateRegistrationType: 'C' | 'I' | 'N';
  municipalSubscription?: string;
  paymentTypeId: number;
  phone?: { ddd: string; number: string; type: string };
  agents?: Array<{ agentId: number }>;
  contacts?: Array<{ name: string; email?: string; ... }>;
  address?: { cityId: number; streetName: string; ... };
  accountStatement?: { bankCode: string; accountType: 'C' | 'P'; ... };
}
```

#### 2. **`firebaseService.ts`** - Função de Mapeamento

```typescript
// Função para converter dados do Supplier para formato Sienge
const mapSupplierToSiengeCreditor = (
  supplier: Supplier, 
  cityId: number = 1, 
  agentId: number = 48
): SiengeCreditorRequest => {
  // Extração de DDD e telefone
  const phoneMatch = supplier.phone.replace(/\D/g, '').match(/^(\d{2})(\d+)$/);
  const phoneDdd = phoneMatch ? phoneMatch[1] : '';
  const phoneNumber = phoneMatch ? phoneMatch[2] : supplier.phone;

  // Conversão tipo de conta
  const accountType = supplier.bankData.accountType === 'corrente' ? 'C' : 'P';

  return {
    name: supplier.companyName,
    personType: supplier.personType,
    typesId: ['FO'], // Fornecedor
    registerNumber: supplier.cnpj.replace(/\D/g, ''),
    stateRegistrationNumber: supplier.stateRegistration,
    stateRegistrationType: supplier.stateRegistrationType,
    municipalSubscription: supplier.personType === 'J' 
      ? supplier.municipalRegistration 
      : undefined,
    // ... demais campos mapeados
  };
};
```

#### 3. **`PreRegistrationPage.tsx`** - Novos Campos do Formulário

**Campos Adicionados:**

1. **Tipo de Pessoa** (select)
   - Jurídica (padrão)
   - Física

2. **Tipo de Inscrição Estadual** (select)
   - Contribuinte (padrão)
   - Isento
   - Não Contribuinte

**Lógica Condicional:**
- Inscrição Municipal é obrigatória **apenas para Pessoa Jurídica**

---

## 📝 Estrutura do Payload para Sienge

### Exemplo Completo

```json
{
  "name": "Empresa Exemplo LTDA",
  "personType": "J",
  "typesId": ["FO"],
  "registerNumber": "12345678000190",
  "stateRegistrationNumber": "12345",
  "stateRegistrationType": "C",
  "municipalSubscription": "98765",
  "paymentTypeId": 1,
  "phone": {
    "ddd": "48",
    "number": "999998888",
    "type": "1"
  },
  "agents": [
    {
      "agentId": 48
    }
  ],
  "contacts": [
    {
      "name": "Empresa Exemplo LTDA",
      "phoneDdd": "48",
      "phoneNumber": "999998888",
      "email": "contato@exemplo.com"
    }
  ],
  "address": {
    "cityId": 1,
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
    "accountType": "C",
    "accountBeneficiaryName": "Empresa Exemplo LTDA",
    "accountBeneficiaryCnpjNumber": "12345678000190"
  }
}
```

---

## 🚀 Como Usar

### 1. **Obter Dados Formatados para Sienge**

```typescript
import { firebaseService } from './services/firebaseService';

// Obter fornecedor do Firebase
const supplier = await firebaseService.getSupplierById('supplier-id');

// Gerar payload para Sienge
const siengeData = await firebaseService.getSiengeCreditorData(
  supplier,
  1,   // cityId (ID da cidade no Sienge)
  48   // agentId (ID do agente no Sienge)
);

console.log(siengeData);
```

### 2. **Enviar para Sienge (via Cloud Function)**

```typescript
// Esta função deve ser implementada como Cloud Function
// por questões de segurança (não expor API key no client)

const result = await firebaseService.createCreditorInSienge(
  supplier,
  cityId,  // opcional
  agentId  // opcional
);
```

---

## ⚠️ Campos Obrigatórios

### No Formulário

✅ Razão Social  
✅ CNPJ  
✅ Tipo de Pessoa  
✅ Inscrição Estadual  
✅ Tipo de Inscrição Estadual  
✅ Inscrição Municipal (apenas para PJ)  
✅ Telefone  
✅ E-mail Principal  
✅ Endereço completo (CEP, Logradouro, Número, Bairro, Cidade, Estado)  
✅ Dados Bancários (Banco, Código, Agência, Conta, Dígito, Tipo)

### Validações Importantes

1. **CNPJ/CPF:** Deve ser válido e sem formatação
2. **Telefone:** Formato `(DD) NNNNN-NNNN` - automaticamente extraído DDD
3. **CEP:** Formato `NNNNN-NNN` - automaticamente remove formatação
4. **Código do Banco:** Sempre 3 dígitos (padLeft com zeros)
5. **Inscrição Municipal:** Obrigatória apenas se `personType === 'J'`

---

## 🔐 Segurança

**⚠️ IMPORTANTE:**

A integração com a API Sienge **NÃO DEVE** ser feita diretamente do client por questões de segurança:

1. **API Key não deve ser exposta** no código frontend
2. **Implementar Cloud Function** no Firebase Functions
3. A Cloud Function deve:
   - Receber o `supplierId`
   - Buscar dados do Firestore
   - Mapear para formato Sienge
   - Fazer POST para API Sienge com credenciais seguras
   - Retornar resultado/erro

### Exemplo de Cloud Function

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

export const createSiengeCreditor = functions.https.onCall(
  async (data, context) => {
    // Verificar autenticação
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuário não autenticado'
      );
    }

    const { supplierId, cityId, agentId } = data;

    // Buscar supplier do Firestore
    const supplierDoc = await admin
      .firestore()
      .collection('suppliers')
      .doc(supplierId)
      .get();

    if (!supplierDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Fornecedor não encontrado'
      );
    }

    const supplier = supplierDoc.data();

    // Mapear dados (usar mesma lógica do mapSupplierToSiengeCreditor)
    const siengeData = {
      // ... mapeamento completo
    };

    // Chamar API Sienge
    try {
      const response = await axios.post(
        'https://api.sienge.com.br/creditor/v1/creditors',
        siengeData,
        {
          headers: {
            Authorization: `Bearer ${functions.config().sienge.apikey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Atualizar Firestore com ID do Sienge
      await supplierDoc.ref.update({
        siengeCreditorId: response.data.id,
        sentToSiengeAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, siengeId: response.data.id };
    } catch (error) {
      console.error('Erro ao criar credor no Sienge:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Erro ao integrar com Sienge'
      );
    }
  }
);
```

---

## 🧪 Testes

### Dados de Teste

```typescript
const testSupplier: Supplier = {
  id: 'test-123',
  companyName: 'Teste LTDA',
  tradeName: 'Teste',
  cnpj: '12.345.678/0001-90',
  personType: 'J',
  stateRegistration: '123456789',
  stateRegistrationType: 'C',
  municipalRegistration: '987654',
  email: 'teste@teste.com',
  phone: '(48) 99999-8888',
  website: 'https://teste.com',
  address: {
    street: 'Rua Teste',
    number: '100',
    complement: 'Sala 1',
    neighborhood: 'Centro',
    city: 'Florianópolis',
    state: 'SC',
    zipCode: '88000-000'
  },
  bankData: {
    bank: 'Banco do Brasil',
    bankCode: '001',
    agency: '1234',
    agencyDigit: '5',
    account: '56789',
    accountDigit: '0',
    accountType: 'corrente',
    pixKey: 'teste@teste.com'
  },
  // ... demais campos
};

// Gerar payload
const payload = await firebaseService.getSiengeCreditorData(testSupplier);
console.log(JSON.stringify(payload, null, 2));
```

---

## 📚 Referências

- [Documentação Sienge - Credores](https://api.sienge.com.br/docs/#/creditor-v1)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Axios](https://axios-http.com/docs/intro)

---

## ✅ Checklist de Implementação

- [x] Adicionar campos `personType` e `stateRegistrationType` na interface `Supplier`
- [x] Criar interface `SiengeCreditorRequest`
- [x] Implementar função `mapSupplierToSiengeCreditor`
- [x] Adicionar campos no formulário de pré-cadastro
- [x] Implementar validação condicional (Inscrição Municipal apenas PJ)
- [x] Adicionar métodos no `firebaseService`
- [ ] Implementar Cloud Function para chamada segura à API Sienge
- [ ] Configurar API Key do Sienge no Firebase Config
- [ ] Testar integração em ambiente de homologação
- [ ] Adicionar tratamento de erros e retry logic
- [ ] Implementar logs de auditoria
- [ ] Documentar códigos de erro da API Sienge

---

**Última atualização:** 21/10/2025
