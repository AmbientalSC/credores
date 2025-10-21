# Segurança e gerenciamento de segredos

Este repositório foi limpo para remover segredos hard-coded do histórico. Use este guia para configurar segredos de forma segura.

## Recomendações gerais
- Nunca commit arquivos `.env` com credenciais. Eles devem estar no `.gitignore`.
- Use o Google Secret Manager ou `firebase functions:secrets` para armazenar segredos de produção.
- Rotacione credenciais imediatamente se houver exposição.

## Como criar secrets (GCP Secret Manager)
1. Criar o secret para usuário e senha:

```bash
# substituir PROJECT_ID e valores
gcloud secrets create ERP_USERNAME --replication-policy="automatic"
echo -n "YOUR_ERP_USERNAME" | gcloud secrets versions add ERP_USERNAME --data-file=-

gcloud secrets create ERP_PASSWORD --replication-policy="automatic"
echo -n "YOUR_ERP_PASSWORD" | gcloud secrets versions add ERP_PASSWORD --data-file=-
```

2. Dar permissão de acesso para a service account usada pelas Cloud Functions (ou atribuir via deploy `--set-secrets`).

## Deploy das Cloud Functions (gen2) com secrets
Exemplo deploy (gen2) usando `gcloud`:

```bash
gcloud functions deploy createSiengeCreditor \
  --region=southamerica-east1 \
  --gen2 \
  --runtime=nodejs22 \
  --trigger-http \
  --set-secrets=SIENGE_USERNAME=projects/PROJECT_ID/secrets/ERP_USERNAME:latest,SIENGE_PASSWORD=projects/PROJECT_ID/secrets/ERP_PASSWORD:latest
```

Ou usando `firebase` com `functions:secrets` (quando disponível):

```bash
# registrar secrets com firebase CLI (opcional) e deploy
firebase functions:secrets:set ERP_PASSWORD --data "YOUR_ERP_PASSWORD"
firebase functions:secrets:set ERP_USERNAME --data "YOUR_ERP_USERNAME"
firebase deploy --only functions
```

## Como colaboradores sincronizam após purge/force-push
- Recomendado: clonar novamente. Alternativa:

```bash
git fetch origin
# salvar mudanças locais (stash) se houver
git reset --hard origin/main
```

## Contato e resposta a incidentes
- Rotacione credenciais imediatamente após qualquer exposição.
- Mantenha logs de auditoria e comunique equipes afetadas.
