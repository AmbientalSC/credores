# Como Analisar Logs do Firebase Functions

## 📊 Opções para Ver Logs

### 1. Via Firebase Console (Mais Fácil)
1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. No menu lateral, clique em **Functions**
4. Clique na function **createSiengeCreditor**
5. Clique na aba **LOGS**
6. Você verá todos os logs em tempo real

### 2. Via Firebase CLI (Terminal)

#### Ver logs em tempo real (streaming):
```bash
firebase functions:log
```

#### Ver logs de uma função específica:
```bash
firebase functions:log --only createSiengeCreditor
```

#### Ver logs com filtro de tempo:
```bash
# Últimas 2 horas
firebase functions:log --since 2h

# Último dia
firebase functions:log --since 1d
```

#### Ver apenas erros:
```bash
firebase functions:log --only createSiengeCreditor | Select-String -Pattern "error|Error|ERROR"
```

### 3. Via Google Cloud Console (Mais Detalhado)
1. Acesse: https://console.cloud.google.com/logs
2. Selecione seu projeto
3. No filtro, digite:
   ```
   resource.type="cloud_function"
   resource.labels.function_name="createSiengeCreditor"
   ```
4. Clique em **Run Query**

## 🔍 O Que Procurar nos Logs

### Logs de Sucesso:
```
✅ Validation passed for supplier: <id>
✅ Sienge API Response: { id: 12345, ... }
✅ Supplier updated with Sienge ID: 12345
```

### Logs de Erro Comuns:

#### 1. API Key não configurada:
```
❌ Error: Sienge API key not configured
```
**Solução:**
```bash
firebase functions:config:set sienge.apikey="SUA_CHAVE_AQUI"
firebase functions:config:set sienge.baseurl="https://api.sienge.com.br"
firebase deploy --only functions
```

#### 2. Fornecedor não encontrado:
```
❌ Supplier not found: <id>
```
**Causa:** ID inválido ou fornecedor foi deletado

#### 3. Fornecedor não aprovado:
```
❌ Supplier status is not approved
```
**Causa:** Tentou enviar fornecedor que não está com status "aprovado"

#### 4. Erro na API do Sienge:
```
❌ Sienge API Error (401): Unauthorized
❌ Sienge API Error (400): Bad Request - { message: "..." }
❌ Sienge API Error (500): Internal Server Error
```

**Código 401:** API Key inválida
**Código 400:** Dados inválidos (verifique o payload)
**Código 500:** Erro no servidor Sienge

#### 5. Campos obrigatórios faltando:
```
❌ Missing required fields: ...
```
**Causa:** Fornecedor não tem todos os campos necessários

## 📝 Exemplo de Log Completo

### Sucesso:
```
INFO: Function execution started
INFO: Creating creditor in Sienge for supplier: abc123
INFO: Validation passed
INFO: Sienge Request: {
  "personType": "J",
  "name": "Empresa XYZ Ltda",
  ...
}
INFO: Sienge API Response: { "id": 12345, "name": "Empresa XYZ Ltda" }
INFO: Supplier updated with siengeCreditorId: 12345
INFO: Function execution took 2345 ms
```

### Erro:
```
INFO: Function execution started
INFO: Creating creditor in Sienge for supplier: abc123
ERROR: Sienge API Error (401): Unauthorized
ERROR: Response: { "message": "Invalid API Key" }
ERROR: Function execution failed
```

## 🛠️ Comandos Úteis para Debug

### 1. Ver logs em tempo real enquanto testa:
```bash
# Terminal 1: Ver logs
firebase functions:log

# Terminal 2: Testar a função
# (Aprove um fornecedor no dashboard)
```

### 2. Salvar logs em arquivo:
```bash
firebase functions:log > logs.txt
```

### 3. Ver configurações atuais:
```bash
firebase functions:config:get
```

### 4. Testar localmente (Firebase Emulator):
```bash
firebase emulators:start --only functions
```

## 🎯 Checklist de Debug

Quando um fornecedor é aprovado mas não cria no Sienge:

- [ ] Verificar se a Cloud Function foi chamada (ver logs)
- [ ] Verificar se API key está configurada
- [ ] Verificar se fornecedor tem todos os campos obrigatórios
- [ ] Verificar resposta da API Sienge
- [ ] Verificar se `siengeCreditorId` foi salvo no Firestore

## 📞 Endpoints da API Sienge

**Base URL:** `https://api.sienge.com.br`

**Criar Credor:**
- Método: `POST`
- URL: `/public/api/v1/creditors`
- Header: `Authorization: Bearer SUA_API_KEY`
- Body: JSON com dados do credor

**Teste Manual (via Postman ou cURL):**
```bash
curl -X POST https://api.sienge.com.br/public/api/v1/creditors \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personType": "J",
    "name": "Teste Empresa",
    "cpfCnpj": "12345678901234",
    ...
  }'
```
