-- ================================================
-- FASE 1: Criação de tabelas para Multi-Tenancy
-- ================================================
-- Este script cria as tabelas necessárias para suportar
-- múltiplos servidores (Rubinot, Tibia Global, etc) e
-- múltiplos worlds por servidor.

-- ================================================
-- Tabela: game_servers
-- ================================================
-- Armazena os servidores de jogo disponíveis
CREATE TABLE IF NOT EXISTS game_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_name TEXT NOT NULL UNIQUE, -- 'rubinot', 'tibia_global', 'otservbr'
  display_name TEXT NOT NULL, -- 'Rubinot', 'Tibia Global', 'OTServBR'
  base_url TEXT NOT NULL, -- 'https://rubinot.com.br'
  scraper_type TEXT NOT NULL CHECK (scraper_type IN ('rubinot', 'tibia_official', 'generic_ots')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por tipo de scraper
CREATE INDEX IF NOT EXISTS idx_game_servers_type ON game_servers(scraper_type, is_active);

COMMENT ON TABLE game_servers IS 'Servidores de jogo disponíveis (Rubinot, Tibia Global, outros OTServers)';
COMMENT ON COLUMN game_servers.scraper_type IS 'Tipo de scraper a ser usado: rubinot, tibia_official, generic_ots';

-- ================================================
-- Tabela: game_worlds
-- ================================================
-- Armazena os mundos disponíveis em cada servidor
CREATE TABLE IF NOT EXISTS game_worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES game_servers(id) ON DELETE CASCADE,
  world_name TEXT NOT NULL, -- 'Mystian', 'Antica', 'Belobra'
  world_identifier TEXT NOT NULL, -- '18' para Rubinot, 'Antica' para Tibia Global
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(server_id, world_name)
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_game_worlds_server_active ON game_worlds(server_id, is_active);
CREATE INDEX IF NOT EXISTS idx_game_worlds_identifier ON game_worlds(world_identifier);

COMMENT ON TABLE game_worlds IS 'Mundos/worlds disponíveis em cada servidor de jogo';
COMMENT ON COLUMN game_worlds.world_identifier IS 'Identificador usado no scraping (número no Rubinot, nome no Tibia)';

-- ================================================
-- Dados iniciais: Rubinot
-- ================================================
INSERT INTO game_servers (server_name, display_name, base_url, scraper_type) 
VALUES ('rubinot', 'Rubinot', 'https://rubinot.com.br', 'rubinot')
ON CONFLICT (server_name) DO NOTHING;

-- Inserir worlds do Rubinot (os mais comuns)
INSERT INTO game_worlds (server_id, world_name, world_identifier) 
SELECT id, 'Mystian', '18' FROM game_servers WHERE server_name = 'rubinot'
ON CONFLICT (server_id, world_name) DO NOTHING;

INSERT INTO game_worlds (server_id, world_name, world_identifier) 
SELECT id, 'Belobra', '20' FROM game_servers WHERE server_name = 'rubinot'
ON CONFLICT (server_id, world_name) DO NOTHING;

-- Você pode adicionar mais worlds conforme necessário:
-- INSERT INTO game_worlds (server_id, world_name, world_identifier) 
-- SELECT id, 'OutroWorld', 'ID' FROM game_servers WHERE server_name = 'rubinot'
-- ON CONFLICT (server_id, world_name) DO NOTHING;

-- ================================================
-- Dados iniciais: Tibia Global (preparado para futuro)
-- ================================================
-- Descomente quando implementar o scraper do Tibia Global
/*
INSERT INTO game_servers (server_name, display_name, base_url, scraper_type) 
VALUES ('tibia_global', 'Tibia Global', 'https://www.tibia.com', 'tibia_official')
ON CONFLICT (server_name) DO NOTHING;

INSERT INTO game_worlds (server_id, world_name, world_identifier) 
SELECT id, 'Antica', 'Antica' FROM game_servers WHERE server_name = 'tibia_global'
ON CONFLICT (server_id, world_name) DO NOTHING;

INSERT INTO game_worlds (server_id, world_name, world_identifier) 
SELECT id, 'Menera', 'Menera' FROM game_servers WHERE server_name = 'tibia_global'
ON CONFLICT (server_id, world_name) DO NOTHING;
*/

-- ================================================
-- Verificação
-- ================================================
-- Verificar servidores cadastrados
SELECT 
  s.server_name,
  s.display_name,
  s.scraper_type,
  COUNT(w.id) as worlds_count
FROM game_servers s
LEFT JOIN game_worlds w ON w.server_id = s.id
WHERE s.is_active = true
GROUP BY s.id, s.server_name, s.display_name, s.scraper_type;

-- Verificar worlds cadastrados
SELECT 
  s.server_name,
  w.world_name,
  w.world_identifier,
  w.is_active
FROM game_worlds w
JOIN game_servers s ON s.id = w.server_id
ORDER BY s.server_name, w.world_name;
