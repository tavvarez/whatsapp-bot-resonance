-- Migração para adicionar colunas de tracking diário de level ups
-- Execute este SQL no Supabase

-- Adiciona coluna para rastrear total de levels ganhos hoje
ALTER TABLE hunteds 
ADD COLUMN IF NOT EXISTS level_gain_today INTEGER NOT NULL DEFAULT 0;

-- Adiciona coluna para rastrear a data do último level up
ALTER TABLE hunteds 
ADD COLUMN IF NOT EXISTS last_level_up_date DATE;

-- Comentários
COMMENT ON COLUMN hunteds.level_gain_today IS 'Total de levels ganhos hoje - reseta diariamente';
COMMENT ON COLUMN hunteds.last_level_up_date IS 'Data do último level up - usado para resetar contador diário';

