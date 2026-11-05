# Nortetel Notas — controle das notas do cartão corporativo

Sistema web para os colaboradores lançarem as notas de uso do cartão corporativo e para o financeiro/administração conferirem, revisarem e gerarem relatórios.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · PostgreSQL (Prisma) · hospedagem Vercel + Supabase.

## Perfis de acesso

| Perfil | O que pode fazer |
|---|---|
| **Colaborador** | Lançar notas (com anexos), adicionar observações depois, ver as próprias notas e o total usado no mês. Não edita nem exclui. |
| **Gestor de setor** | Tudo do colaborador + ver as notas do seu setor e cadastrar/gerenciar colaboradores do setor. |
| **Financeiro** | Ver todas as notas, editar, marcar como **revisada** (individual ou em lote), relatórios/exportação, cadastros, auditoria, cadastrar gestores e colaboradores. |
| **Administrador** | Tudo, inclusive excluir notas, gerenciar financeiro/administradores, integrações (API) e anonimização LGPD. |

Login por **CPF, e-mail ou telefone** + senha. O status da nota é `Lançada` → `Revisada` (lançamento direto, sem aprovação prévia).

## Funcionalidades

- Lançamento com data, valor, fornecedor, CNPJ, categoria, centro de custo, projeto, forma de pagamento, final do cartão, descrição, observação, chave NF-e e anexos (JPG/PNG/WEBP/PDF/XML, até 4 MB; fotos são comprimidas no celular).
- **Leitura automática**: XML de NF-e, QR Code da NFC-e e OCR (Tesseract, em português) sugerem os campos — o usuário sempre confere. O CNPJ preenche a razão social (BrasilAPI).
- Detecção de nota duplicada, painel com gráficos, filtros completos, relatórios e exportação **XLSX / CSV / PDF**.
- Notificações no sistema (e e-mail via Resend), histórico/auditoria, API somente-leitura com tokens para integrações (`/api/v1/notas`).
- Layout responsivo (computador e celular).

## Segurança e LGPD

- Senhas com **argon2id**; política de senha forte; troca obrigatória no primeiro acesso; bloqueio após 5 tentativas; rate limit por IP/identificador.
- **CPF criptografado (AES-256-GCM)** e indexado por HMAC; exibido mascarado nas listas.
- Sessões opacas em cookie `HttpOnly` + `Secure` + `SameSite=Lax` (hash no banco, revogáveis, expiram por inatividade).
- Permissões verificadas **no servidor** em toda leitura/escrita (sem confiar no menu); escopo por perfil/setor nas consultas.
- Anexos em armazenamento **privado**, entregues só por rota autenticada; tipo validado pela assinatura binária do arquivo.
- Cabeçalhos: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy. Proteção CSRF (Server Actions + checagem de Origin).
- Exportações protegidas contra injeção de fórmulas (CSV/Excel injection).
- **Auditoria** de login, criação/edição/exclusão, visualização de anexos/CPF, exportações.
- Direitos do titular: aceite da política no 1º acesso, download dos próprios dados (`/api/meus-dados`), anonimização pelo admin. Página `/privacidade` é um **modelo** — revise com o jurídico/DPO.

## Rodando localmente

```bash
cp .env.example .env        # preencha as chaves (comandos de geração no arquivo)
npm install
npm run db:migrate          # cria as tabelas
npm run db:seed             # categorias/setores iniciais + 1º administrador (SEED_ADMIN_*)
npm run dev
```

Testes: `npm test` · Tipos: `npm run typecheck`.

## Publicação (Vercel + Supabase)

1. Crie um projeto Supabase; copie as strings de conexão (`DATABASE_URL` = pooler, `DIRECT_URL` = conexão direta) e crie um bucket **privado** `notas-anexos`.
2. Importe o repositório na Vercel e configure as variáveis do `.env.example` (`STORAGE_DRIVER=supabase`, `SUPABASE_*`, `RESEND_API_KEY`, `APP_URL`, `CRON_SECRET`, chaves de segurança).
3. Rode as migrações uma vez: `npm run db:deploy` e `npm run db:seed` (com as variáveis de produção).
4. O `vercel.json` já agenda a limpeza diária (`/api/cron/limpeza`).

## Identidade visual

O logo oficial está em `public/logo.png` (e `src/app/icon.png` como ícone da aba) e as cores em `src/app/globals.css` (variáveis `--brand-*`).

## Pendências / próximos passos sugeridos

- Notificações por WhatsApp (requer provedor, ex.: Meta Cloud API/Twilio).
- Autenticação em dois fatores (TOTP) para administradores e financeiro.
- Integração específica com o sistema contábil/ERP da empresa (hoje: exportação + API).
