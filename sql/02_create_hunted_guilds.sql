-- ================================================
-- FASE 1: Criação da tabela hunted_guilds
-- ================================================
-- Tabela principal para gerenciar guilds monitoradas
-- por tenant (cliente)

-- ================================================
-- Tabela: hunted_guilds
-- ================================================
CREATE TABLE IF NOT EXISTS hunted_guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do tenant/cliente
  tenant_id UUID NOT NULL,
  tenant_name TEXT NOT NULL, -- Nome amigável do tenant
  
  -- Referências
  bot_group_id UUID NOT NULL REFERENCES bot_groups(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES game_worlds(id) ON DELETE CASCADE,
  
  -- Dados da guild monitorada
  guild_name TEXT NOT NULL, -- Nome da guild a ser monitorada (ex: 'Genesis')
  guild_name_normalized TEXT NOT NULL, -- Nome normalizado para comparação
  
  -- Configurações de notificação
  notify_deaths BOOLEAN DEFAULT true,
  notify_level_ups BOOLEAN DEFAULT true,
  min_level_notify INTEGER DEFAULT 600, -- Nível mínimo para notificar level up
  
  -- Soft delete
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- phone_number ou LID do admin que criou
  
  -- Garantir unicidade por tenant + world + guild
  UNIQUE(tenant_id, world_id, guild_name_normalized)
);

-- ================================================
-- Indexes para performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_hunted_guilds_active ON hunted_guilds(is_active, tenant_id);
CREATE INDEX IF NOT EXISTS idx_hunted_guilds_world ON hunted_guilds(world_id, is_active);
CREATE INDEX IF NOT EXISTS idx_hunted_guilds_group ON hunted_guilds(bot_group_id);
CREATE INDEX IF NOT EXISTS idx_hunted_guilds_tenant ON hunted_guilds(tenant_id, is_active);

COMMENT ON TABLE hunted_guilds IS 'Guilds sendo monitoradas para death/level up por tenant (cliente)';
COMMENT ON COLUMN hunted_guilds.tenant_id IS 'UUID do tenant/cliente - permite múltiplos clientes no mesmo bot';
COMMENT ON COLUMN hunted_guilds.guild_name_normalized IS 'Nome normalizado (lowercase, sem acentos) para comparação';
COMMENT ON COLUMN hunted_guilds.min_level_notify IS 'Nível mínimo para enviar notificação de level up';

-- ================================================
-- Trigger para atualizar updated_at automaticamente
-- ================================================
CREATE OR REPLACE FUNCTION update_hunted_guilds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hunted_guilds_updated_at
BEFORE UPDATE ON hunted_guilds
FOR EACH ROW
EXECUTE FUNCTION update_hunted_guilds_updated_at();

-- ================================================
-- Função auxiliar para normalizar nome de guild
-- ================================================
CREATE OR REPLACE FUNCTION normalize_guild_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRANSLATE(
      name,
      'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
      'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooouuuuc'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_guild_name IS 'Normaliza nome de guild removendo acentos e convertendo para lowercase';
