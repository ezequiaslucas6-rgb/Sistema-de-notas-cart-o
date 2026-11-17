-- ============================================================================
-- Nortetel Notas – CONTEÚDO DO BANCO em um único JSON, SEM os campos sigilosos
-- Somente leitura. Onde rodar: Supabase → SQL Editor → "Copy cell" no resultado.
--
-- REMOVIDOS por segurança: senhas (passwordHash), CPF criptografado e seu hash
-- (cpfEnc/cpfHash), tokens de API (tokenHash), sessões, tokens de redefinição de
-- senha e o conteúdo binário dos anexos (FileBlob.data). O CPF aparece só como
-- os 2 últimos dígitos (cpfLast2).
--
-- ATENÇÃO (LGPD): o resultado ainda traz dados pessoais (nomes, e-mails,
-- telefones, valores e descrições de gastos). Envie somente a quem for avaliar,
-- por canal seguro, e apague depois.
-- ============================================================================
SELECT jsonb_pretty(jsonb_build_object(
  'gerado_em', now(),
  'aviso', 'Sem senhas, hashes, tokens, sessões e arquivos dos anexos.',

  -- Cadastros
  'Sector',      (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Sector" t),
  'Category',    (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Category" t),
  'CostCenter',  (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "CostCenter" t),
  'Project',     (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Project" t),
  'Card',        (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Card" t),

  -- Pessoas (sem senha e sem CPF)
  'User',        (SELECT coalesce(jsonb_agg(to_jsonb(t) - 'passwordHash' - 'cpfEnc' - 'cpfHash'), '[]'::jsonb) FROM "User" t),

  -- Notas
  'Expense',        (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Expense" t),
  'ExpenseComment', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "ExpenseComment" t),
  'Attachment',     (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Attachment" t),   -- só metadados
  'FileBlob_resumo',(SELECT jsonb_build_object('arquivos', count(*), 'bytes_total', coalesce(sum(octet_length(data)), 0)) FROM "FileBlob"),

  -- Regras e controle
  'Setting',     (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Setting" t),
  'ClosedMonth', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "ClosedMonth" t),
  'ApiToken',    (SELECT coalesce(jsonb_agg(to_jsonb(t) - 'tokenHash'), '[]'::jsonb) FROM "ApiToken" t),

  -- Avisos e auditoria (auditoria: últimos 5.000 registros)
  'Notification',(SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM "Notification" t),
  'AuditLog',    (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
                  FROM (SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 5000) x),

  -- Apenas contagem (conteúdo técnico, sem valor para avaliação)
  'contagens_tecnicas', jsonb_build_object(
      'Session', (SELECT count(*) FROM "Session"),
      'PasswordResetToken', (SELECT count(*) FROM "PasswordResetToken"),
      'RateLimit', (SELECT count(*) FROM "RateLimit"))
)) AS dados_sem_sigilo;
