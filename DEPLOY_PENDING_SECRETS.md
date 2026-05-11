# Pendencia de Deploy: GitHub Actions Secrets

O CI/CD do GitHub esta falhando no job de deploy porque os secrets obrigatorios ainda nao foram configurados no repositorio.

## Secrets Necessarios

Configurar em:

GitHub > Settings > Secrets and variables > Actions > New repository secret

Obrigatorios:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`

## Valores Vercel ja identificados localmente

Encontrados em `.vercel/project.json`:

```txt
VERCEL_PROJECT_ID=prj_XTGgqNdXXh7l5a8QK6EJmkoDaeOg
VERCEL_ORG_ID=team_31C67BWp2cIh2rnuiUdPnpYj
```

## Valores que ainda precisam ser buscados

- `VITE_SUPABASE_URL`: pegar do `.env.local` local ou do painel do Supabase.
- `VITE_SUPABASE_ANON_KEY`: pegar do `.env.local` local ou do painel do Supabase.
- `VERCEL_TOKEN`: criar no painel da Vercel em Account Settings > Tokens.

## Observacao Importante

O GitHub ainda estava no commit `917caec` quando o erro apareceu. O repositorio local estava com commits a frente.

Depois de configurar os secrets, fazer:

```bash
git push origin main
```

## Impacto

Essa pendencia bloqueia deploy automatico pelo GitHub Actions, mas nao bloqueia desenvolvimento local.

Enquanto os secrets nao forem configurados:

- `bun run build` local continua funcionando.
- `bun run test:qa` local continua funcionando.
- Novos commits podem continuar sendo feitos.
- O GitHub Actions vai continuar falhando no deploy quando rodar em `main`.

