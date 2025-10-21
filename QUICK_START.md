# 🚀 Quick Start - Sienge Integration

## Deploy Rápido

```bash
# 1. Configurar API Key
firebase functions:config:set sienge.apikey="SUA_API_KEY_AQUI"

# 2. Build
cd functions
npm run build

# 3. Deploy
cd ..
firebase deploy --only functions

# 4. Verificar
firebase functions:log
```

## Comandos Úteis

```bash
# Ver configuração atual
firebase functions:config:get

# Testar localmente
firebase emulators:start --only functions

# Ver logs em tempo real
firebase functions:log --only createSiengeCreditor

# Deploy apenas uma função
firebase deploy --only functions:createSiengeCreditor

# Limpar build
cd functions && npm run clean
```

## Teste Rápido no Console

```javascript
// Preview
const preview = firebase.functions().httpsCallable('previewSiengeCreditor');
preview({ supplierId: 'SEU_ID_AQUI' }).then(console.log);

// Criar
const create = firebase.functions().httpsCallable('createSiengeCreditor');
create({ supplierId: 'SEU_ID_AQUI' }).then(console.log);
```

## Troubleshooting

```bash
# Erro de build
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build

# Erro de deploy
firebase deploy --only functions --debug

# Ver erros em tempo real
firebase functions:log --only createSiengeCreditor
```
