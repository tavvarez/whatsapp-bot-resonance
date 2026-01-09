-- ================================================
-- FASE 1: Migração de dados existentes
-- ================================================
-- Este script adiciona colunas necessárias nas tabelas
-- existentes e migra dados para a nova estrutura

-- ================================================
-- 1. Atualizar tabela bot_groups
-- ================================================
-- Adiciona colunas de tenant se ainda não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bot_groups' AND column_name='tenant_id') THEN
    ALTER TABLE bot_groups ADD COLUMN tenant_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bot_groups' AND column_name='tenant_name') THEN
    ALTER TABLE bot_groups ADD COLUMN tenant_name TEXT;
  END IF;
END $$;

-- Index para busca por tenant
CREATE INDEX IF NOT EXISTS idx_bot_groups_tenant ON bot_groups(tenant_id, is_active);

-- Para compatibilidade, define um tenant padrão para grupos existentes
-- que ainda não têm tenant_id
UPDATE bot_groups 
SET 
  tenant_id = gen_random_uuid(),
  tenant_name = 'Default Tenant'
WHERE tenant_id IS NULL;

COMMENT ON COLUMN bot_groups.tenant_id IS 'UUID do tenant/cliente dono deste grupo';
COMMENT ON COLUMN bot_groups.tenant_name IS 'Nome amigável do tenant para identificação';

-- ================================================
-- 2. Atualizar tabela hunteds
-- ================================================
-- Adiciona referência à hunted_guild
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='hunteds' AND column_name='hunted_guild_id') THEN
    ALTER TABLE hunteds ADD COLUMN hunted_guild_id UUID REFERENCES hunted_guilds(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_hunteds_guild ON hunteds(hunted_guild_id, is_active);

COMMENT ON COLUMN hunteds.hunted_guild_id IS 'Referência à guild monitorada à qual este hunted pertence';

-- NOTA: A coluna 'guild' antiga será mantida por compatibilidade
-- Após a migração completa, você pode removê-la se desejar:
-- ALTER TABLE hunteds DROP COLUMN guild;

-- ================================================
-- 3. Atualizar tabela deaths
-- ================================================
-- Adiciona referência ao world
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='deaths' AND column_name='world_id') THEN
    ALTER TABLE deaths ADD COLUMN world_id UUID REFERENCES game_worlds(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_deaths_world ON deaths(world_id, occurred_at);

COMMENT ON COLUMN deaths.world_id IS 'Referência ao world onde a morte ocorreu';

-- ================================================
-- 4. Migrar dados existentes de deaths para world_id
-- ================================================
-- Se você já tem dados de mortes com 'world' como texto,
-- este script tentará associá-los aos worlds cadastrados

-- Exemplo: Se world = '18', associa ao Mystian
UPDATE deaths d
SET world_id = w.id
FROM game_worlds w
WHERE d.world_id IS NULL
  AND d.world = w.world_identifier;

-- ================================================
-- 5. Criar hunted_guild padrão para dados existentes
-- ================================================
-- Se você já tem hunteds cadastrados, este script cria
-- uma hunted_guild padrão para eles

-- Primeiro, verifica se existe algum hunted sem hunted_guild_id
DO $$
DECLARE
  default_tenant_id UUID;
  default_group_id UUID;
  default_world_id UUID;
  default_guild_name TEXT := 'Genesis'; -- Ajuste conforme sua guild atual
  new_hunted_guild_id UUID; -- ✅ RENOMEADO para evitar ambiguidade
BEGIN
  -- Busca o primeiro grupo ativo como padrão
  SELECT tenant_id, id INTO default_tenant_id, default_group_id
  FROM bot_groups
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;

  -- Busca o world Mystian (ajuste se necessário)
  SELECT id INTO default_world_id
  FROM game_worlds
  WHERE world_name = 'Mystian'
  LIMIT 1;

  -- Se encontrou tenant, grupo e world, cria a hunted_guild
  IF default_tenant_id IS NOT NULL AND default_group_id IS NOT NULL AND default_world_id IS NOT NULL THEN
    -- Verifica se já existe uma hunted_guild para esses dados
    SELECT id INTO new_hunted_guild_id -- ✅ ATUALIZADO
    FROM hunted_guilds
    WHERE tenant_id = default_tenant_id
      AND world_id = default_world_id
      AND guild_name = default_guild_name;

    -- Se não existe, cria
    IF new_hunted_guild_id IS NULL THEN -- ✅ ATUALIZADO
      INSERT INTO hunted_guilds (
        tenant_id,
        tenant_name,
        bot_group_id,
        world_id,
        guild_name,
        guild_name_normalized,
        notify_deaths,
        notify_level_ups,
        min_level_notify
      ) VALUES (
        default_tenant_id,
        'Default Tenant',
        default_group_id,
        default_world_id,
        default_guild_name,
        normalize_guild_name(default_guild_name),
        true,
        true,
        600
      )
      RETURNING id INTO new_hunted_guild_id; -- ✅ ATUALIZADO

      RAISE NOTICE 'Hunted guild padrão criada: % (ID: %)', default_guild_name, new_hunted_guild_id; -- ✅ ATUALIZADO
    END IF;

    -- Associa hunteds existentes sem hunted_guild_id a esta hunted_guild
    UPDATE hunteds
    SET hunted_guild_id = new_hunted_guild_id -- ✅ ATUALIZADO: agora não há ambiguidade
    WHERE hunted_guild_id IS NULL
      AND guild = default_guild_name;

    RAISE NOTICE 'Hunteds migrados para hunted_guild_id: %', new_hunted_guild_id; -- ✅ ATUALIZADO
  ELSE
    RAISE NOTICE 'Não foi possível criar hunted_guild padrão. Verifique se bot_groups e game_worlds estão populados.';
  END IF;
END $$;

-- ================================================
-- Verificação final
-- ================================================
SELECT 
  'bot_groups' as tabela,
  COUNT(*) as total,
  COUNT(tenant_id) as com_tenant
FROM bot_groups
UNION ALL
SELECT 
  'hunteds' as tabela,
  COUNT(*) as total,
  COUNT(hunted_guild_id) as com_guild
FROM hunteds
UNION ALL
SELECT 
  'deaths' as tabela,
  COUNT(*) as total,
  COUNT(world_id) as com_world
FROM deaths
UNION ALL
SELECT 
  'hunted_guilds' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active THEN 1 END) as ativos
FROM hunted_guilds;

-- Listar hunted_guilds criadas
SELECT 
  hg.tenant_name,
  bg.description as grupo,
  s.server_name,
  w.world_name,
  hg.guild_name,
  hg.is_active,
  hg.notify_deaths,
  hg.notify_level_ups
FROM hunted_guilds hg
JOIN bot_groups bg ON bg.id = hg.bot_group_id
JOIN game_worlds w ON w.id = hg.world_id
JOIN game_servers s ON s.id = w.server_id
ORDER BY hg.created_at DESC;
