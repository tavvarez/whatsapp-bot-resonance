-- Tabela de hunteds para tracking de level ups
-- Execute este SQL no Supabase para criar a tabela

CREATE TABLE IF NOT EXISTS hunteds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados do personagem
  player_name VARCHAR(255) NOT NULL,
  name_normalized VARCHAR(255) NOT NULL UNIQUE,
  last_known_level INTEGER NOT NULL DEFAULT 0,
  vocation VARCHAR(100),
  guild VARCHAR(255) NOT NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hunteds_guild ON hunteds(guild);
CREATE INDEX IF NOT EXISTS idx_hunteds_active ON hunteds(is_active);
CREATE INDEX IF NOT EXISTS idx_hunteds_guild_active ON hunteds(guild, is_active);
CREATE INDEX IF NOT EXISTS idx_hunteds_name_normalized ON hunteds(name_normalized);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hunteds_updated_at ON hunteds;
CREATE TRIGGER trigger_hunteds_updated_at
  BEFORE UPDATE ON hunteds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - opcional, mas recomendado
ALTER TABLE hunteds ENABLE ROW LEVEL SECURITY;

-- Policy para permitir todas as operações via service role
CREATE POLICY "Service role can do everything" ON hunteds
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE hunteds IS 'Lista de personagens rastreados para notificação de level ups';
COMMENT ON COLUMN hunteds.player_name IS 'Nome original do personagem';
COMMENT ON COLUMN hunteds.name_normalized IS 'Nome normalizado (lowercase, sem acentos) para buscas';
COMMENT ON COLUMN hunteds.last_known_level IS 'Último level conhecido - usado para detectar level ups';
COMMENT ON COLUMN hunteds.vocation IS 'Vocação do personagem (Elder Druid, Elite Knight, etc)';
COMMENT ON COLUMN hunteds.guild IS 'Guild do personagem - usado para filtrar buscas';
COMMENT ON COLUMN hunteds.is_active IS 'Se o tracking está ativo para este personagem';

