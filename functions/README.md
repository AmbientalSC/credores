# Cloud Functions para `credores`

Esta pasta contém uma Cloud Function que integra fornecedores aprovados com o ERP Sienge.

Visão geral:
- `src/index.ts` - função `onSupplierStatusChange` que escuta atualizações em `suppliers/{id}` e envia um POST ao Sienge quando o status vira `aprovado`.

Como configurar (resumo):
1. Instale dependências:
   - abra um terminal na pasta `functions`
   - `npm install`

2. Instale o Firebase CLI (se ainda não tiver):
   ```
   npm install -g firebase-tools
   firebase login
   ```

## Configuração de Credenciais

### Opção A - Para teste local (.env file):
1. Copie o arquivo de exemplo:
   ```
   cp .env.example .env
   ```
2. As credenciais já estão configuradas no `.env.example`

### Opção B - Firebase Functions Config (recomendado para produção):
1. Instale o Firebase CLI se não tiver:
   ```
   npm install -g firebase-tools
   ```
2. Configure as credenciais:
   ```
   firebase functions:config:set erp.username="ambientallimpeza-relatoriospb"
   firebase functions:config:set erp.password="[REMOVED_SECRET]"
   ```

### Opção C - Secret Manager (mais seguro, requer gcloud CLI):
Se preferir usar Secret Manager, instale o Google Cloud CLI e execute:
```
gcloud secrets create ERP_USERNAME --replication-policy="automatic" --data-file=<(echo "ambientallimpeza-relatoriospb")
gcloud secrets create ERP_PASSWORD --replication-policy="automatic" --data-file=<(echo "[REMOVED_SECRET]")
```

3. Deploy:
   - `npm run build` (na pasta functions)
   - `firebase deploy --only functions`

Alternativa simples (menos segura): 
```
firebase functions:config:set erp.username="ambientallimpeza-relatoriospb"
firebase functions:config:set erp.password="[REMOVED_SECRET]"
```
e ler via `functions.config()` (não implementado no exemplo acima).

Observações:
- A função faz POST para `https://api.sienge.com.br/ambientallimpeza/public/api/v1/creditors` usando Basic Auth.
- Customize o payload conforme exigido pelo Sienge API.
- Teste usando Firebase Emulators: `firebase emulators:start --only functions,firestore`.
