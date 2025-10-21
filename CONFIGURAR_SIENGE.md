# ⚙️ Configuração da Integração com Sienge

## 🔑 Passo 1: Configurar API Key

Você precisa configurar a chave da API do Sienge nas Cloud Functions do Firebase:

```bash
# Configurar a API Key (substitua SUA_CHAVE_AQUI pela sua chave real)
firebase functions:config:set sienge.apikey="SUA_CHAVE_AQUI"

# Configurar a URL base da API Sienge
firebase functions:config:set sienge.baseurl="https://api.sienge.com.br"

# Fazer deploy das configurações
firebase deploy --only functions
```

## 📋 Verificar Configurações

Para verificar se as configurações foram aplicadas:

```bash
firebase functions:config:get
```

Você deve ver algo como:
```json
{
  "sienge": {
    "apikey": "SUA_CHAVE_AQUI",
    "baseurl": "https://api.sienge.com.br"
  }
}
```

## ✅ Como Funciona Agora

### Fluxo Atualizado:

1. **Fornecedor faz cadastro** → Status: "em_analise"
2. **Admin aprova no dashboard**
3. **Sistema atualiza status** → Status: "aprovado"
4. **Sistema chama Cloud Function** `createSiengeCreditor`
5. **Cloud Function:**
   - Valida os dados do fornecedor
   - Mapeia para o formato Sienge
   - Envia POST para API Sienge
   - Salva o ID do Sienge no Firestore
6. **Usuário recebe feedback:**
   - ✅ Sucesso: "Fornecedor aprovado e enviado ao Sienge com sucesso!"
   - ❌ Erro: "Fornecedor aprovado, mas erro ao enviar para Sienge: [mensagem]"

## 🔍 Como Ver os Logs

### Via Firebase Console (Recomendado):
1. https://console.firebase.google.com
2. Seu projeto → **Functions** → `createSiengeCreditor` → **LOGS**

### Via Terminal:
```bash
# Ver todos os logs
firebase functions:log

# Ver logs em tempo real
firebase functions:log --only createSiengeCreditor

# Ver últimas 2 horas
firebase functions:log --since 2h
```

## 🧪 Testar a Integração

1. **Crie um fornecedor teste** no formulário público
2. **Aprove o fornecedor** no dashboard admin
3. **Verifique os logs** para ver se a chamada foi feita
4. **Verifique o Firestore** para ver se `siengeCreditorId` foi salvo

### Exemplo de Log de Sucesso:
```
INFO: Creating creditor in Sienge for supplier: abc123
INFO: Validation passed
INFO: Sienge API Response: { "id": 12345, "name": "Empresa XYZ" }
INFO: Supplier updated with siengeCreditorId: 12345
```

### Exemplo de Log de Erro:
```
ERROR: Sienge API Error (401): Unauthorized
ERROR: Response: { "message": "Invalid API Key" }
```

## ⚠️ Possíveis Erros

### 1. API Key não configurada
**Erro:** `Sienge API key not configured`
**Solução:** Execute os comandos de configuração acima

### 2. API Key inválida
**Erro:** `Sienge API Error (401): Unauthorized`
**Solução:** Verifique se a API key está correta no Sienge

### 3. Dados inválidos
**Erro:** `Sienge API Error (400): Bad Request`
**Solução:** Verifique os campos obrigatórios do fornecedor

### 4. Fornecedor já enviado
**Erro:** `Supplier already sent to Sienge`
**Solução:** O fornecedor já tem um `siengeCreditorId` no Firestore

## 📊 Verificar no Firestore

Após a aprovação bem-sucedida, o documento do fornecedor deve ter:
- `status`: "aprovado"
- `approvedAt`: timestamp
- `siengeCreditorId`: número (ID retornado pelo Sienge)

## 🎯 Próximos Passos

1. ✅ Configure a API Key do Sienge
2. ✅ Teste com um fornecedor real
3. ✅ Verifique os logs
4. ✅ Confirme no Sienge que o credor foi criado

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Firebase Console
2. Verifique a configuração da API key
3. Teste a API do Sienge diretamente (Postman/cURL)
4. Verifique se todos os campos obrigatórios estão preenchidos
