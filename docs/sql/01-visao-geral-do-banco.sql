-- ============================================================================
-- Nortetel Notas – VISÃO GERAL (ESTRUTURA) DO BANCO DE DADOS
-- Somente leitura: nenhum comando altera dados. Não expõe conteúdo das tabelas.
-- Onde rodar: Supabase → SQL Editor. O editor mostra só o resultado da ÚLTIMA
-- consulta; rode cada bloco separadamente (selecione o trecho e clique em Run).
-- ============================================================================

-- 1) TABELAS: dono, proteção por linha (RLS), quantidade EXATA de linhas e tamanho
SELECT c.relname                                   AS tabela,
       pg_get_userbyid(c.relowner)                 AS dono,
       c.relrowsecurity                            AS rls_ativo,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, '')
       ))[1]::text::bigint                         AS linhas,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS tamanho_total
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- 2) COLUNAS de todas as tabelas (tipo, obrigatoriedade e valor padrão)
SELECT table_name AS tabela, ordinal_position AS ordem, column_name AS coluna,
       CASE WHEN data_type = 'USER-DEFINED' THEN udt_name ELSE data_type END AS tipo,
       character_maximum_length AS tamanho, is_nullable AS aceita_nulo, column_default AS padrao
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3) CHAVES e RESTRIÇÕES: primária, única e estrangeira (relacionamentos)
SELECT conrelid::regclass AS tabela, conname AS nome,
       CASE contype WHEN 'p' THEN 'CHAVE PRIMÁRIA' WHEN 'u' THEN 'ÚNICO'
                    WHEN 'f' THEN 'CHAVE ESTRANGEIRA' WHEN 'c' THEN 'CHECK' END AS tipo,
       pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY 1, 3, 2;

-- 4) ÍNDICES
SELECT tablename AS tabela, indexname AS indice, indexdef AS definicao
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5) TIPOS ENUMERADOS (listas de valores fixos)
SELECT t.typname AS tipo, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valores
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY 1;

-- 6) SEGURANÇA: RLS e se as chaves públicas (anon/authenticated) conseguem ler cada tabela
SELECT c.relname AS tabela,
       c.relrowsecurity AS rls_ativo,
       has_table_privilege('anon', c.oid, 'SELECT')          AS chave_publica_le,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS usuario_logado_supabase_le,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS politicas
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
ORDER BY 1;

-- 7) BANCO: versão, tamanho e extensões
SELECT current_database() AS banco, version() AS versao,
       pg_size_pretty(pg_database_size(current_database())) AS tamanho_total;
SELECT extname AS extensao, extversion AS versao FROM pg_extension ORDER BY 1;

-- 8) TUDO EM UM SÓ DOCUMENTO (JSON) – bom para copiar e enviar ao avaliador
--    Clique na célula do resultado e use "Copy cell".
SELECT jsonb_pretty(jsonb_build_object(
  'gerado_em', now(),
  'banco', current_database(),
  'versao', version(),
  'tamanho', pg_size_pretty(pg_database_size(current_database())),
  'tabelas', (
    SELECT jsonb_agg(jsonb_build_object(
      'tabela', c.relname,
      'dono', pg_get_userbyid(c.relowner),
      'rls_ativo', c.relrowsecurity,
      'linhas', (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', c.relname), false, true, '')))[1]::text::bigint,
      'colunas', (
        SELECT jsonb_agg(jsonb_build_object(
                 'nome', a.attname,
                 'tipo', format_type(a.atttypid, a.atttypmod),
                 'obrigatorio', a.attnotnull,
                 'padrao', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
        FROM pg_attribute a
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
      'restricoes', (
        SELECT jsonb_agg(jsonb_build_object('nome', k.conname, 'definicao', pg_get_constraintdef(k.oid)))
        FROM pg_constraint k WHERE k.conrelid = c.oid),
      'indices', (
        SELECT jsonb_agg(i.indexdef) FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = c.relname)
    ) ORDER BY c.relname)
    FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'),
  'tipos_enumerados', (
    SELECT jsonb_object_agg(x.typname, x.valores)
    FROM (SELECT t.typname, jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) AS valores
          FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE t.typnamespace = 'public'::regnamespace GROUP BY t.typname) x)
)) AS estrutura_completa;
