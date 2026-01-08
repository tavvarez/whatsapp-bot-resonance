-- ========================================
-- Adiciona coluna LID na tabela bot_users
-- ========================================

-- 1. Adicionar coluna lid
ALTER TABLE bot_users 
ADD COLUMN lid TEXT;

-- 2. Criar índice para buscas por LID
CREATE INDEX idx_bot_users_lid ON bot_users(lid);

-- 3. Tornar phone_number opcional (pode ser NULL se só tiver LID)
ALTER TABLE bot_users 
ALTER COLUMN phone_number DROP NOT NULL;

-- 4. Adicionar constraint: precisa ter pelo menos um (phone ou lid)
ALTER TABLE bot_users 
ADD CONSTRAINT check_phone_or_lid 
CHECK (phone_number IS NOT NULL OR lid IS NOT NULL);

-- 5. Criar índice único composto (evita duplicatas)
CREATE UNIQUE INDEX idx_bot_users_phone_lid ON bot_users(
  COALESCE(phone_number, ''), 
  COALESCE(lid, '')
);

-- ========================================
-- Migrar dados existentes
-- ========================================

-- Para usuários que foram cadastrados com LID no phone_number,
-- mover para coluna lid
UPDATE bot_users
SET 
  lid = phone_number,
  phone_number = NULL
WHERE LENGTH(phone_number) < 16  -- LIDs são mais curtos que telefones
  AND phone_number NOT LIKE '55%'; -- Números BR começam com 55

-- ========================================
-- Exemplo de cadastro com LID
-- ========================================

-- Cadastrar novo usuário com LID (sem phone ainda)
-- INSERT INTO bot_users (lid, role, display_name)
-- VALUES ('158029211242537', 'admin', 'Gabriel Tavares');

-- Atualizar com phone quando descobrir
-- UPDATE bot_users 
-- SET phone_number = '5547920034875'
-- WHERE lid = '158029211242537';

-- ========================================
-- Verificações
-- ========================================

-- Ver usuários com LID
-- SELECT * FROM bot_users WHERE lid IS NOT NULL;

-- Ver usuários com phone
-- SELECT * FROM bot_users WHERE phone_number IS NOT NULL;

-- Ver usuários com ambos
-- SELECT * FROM bot_users WHERE phone_number IS NOT NULL AND lid IS NOT NULL;
