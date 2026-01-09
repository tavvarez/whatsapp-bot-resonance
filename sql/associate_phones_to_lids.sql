-- ========================================
-- Associa telefones aos LIDs existentes
-- baseado na tabela characters
-- ========================================

-- Atualiza bot_users que têm LID mas não têm phone_number
-- buscando o telefone na tabela characters pelo display_name

UPDATE bot_users bu
SET 
  phone_number = c.phone_number,
  updated_at = NOW()
FROM characters c
WHERE 
  bu.lid IS NOT NULL 
  AND bu.phone_number IS NULL
  AND bu.display_name IS NOT NULL
  AND c.character_name ILIKE bu.display_name
  AND c.phone_number IS NOT NULL
  AND c.phone_number != '';

-- Verificar resultado
-- SELECT 
--   display_name, 
--   phone_number, 
--   lid,
--   CASE 
--     WHEN phone_number IS NOT NULL AND lid IS NOT NULL THEN '✅ Completo'
--     WHEN phone_number IS NOT NULL THEN '📱 Só phone'
--     WHEN lid IS NOT NULL THEN '🆔 Só LID'
--   END as status
-- FROM bot_users
-- ORDER BY display_name;
