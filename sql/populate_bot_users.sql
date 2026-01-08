-- ========================================
-- SQL para popular a tabela bot_users
-- baseado nos dados da tabela characters
-- ========================================

-- Este script insere todos os usuários únicos da tabela 'characters'
-- na tabela 'bot_users' com a role 'member'.
-- Admins devem ser promovidos manualmente depois usando o comando
-- @bot promote <número> ou atualizando diretamente no banco.

-- IMPORTANTE:
-- - Executa apenas se o usuário ainda não existir (ON CONFLICT DO NOTHING)
-- - Todos começam como 'member'
-- - Promova admins manualmente depois

INSERT INTO bot_users (phone_number, role, display_name)
SELECT DISTINCT
  phone_number,
  'member' AS role,
  -- Pega o primeiro character_name encontrado para cada telefone como display_name
  (
    SELECT character_name
    FROM characters c2
    WHERE c2.phone_number = c1.phone_number
    LIMIT 1
  ) AS display_name
FROM characters c1
WHERE phone_number IS NOT NULL
  AND phone_number != ''
ON CONFLICT (phone_number) DO NOTHING;

-- ========================================
-- Verificação: Contagem de usuários
-- ========================================

-- Após executar, você pode verificar com:
-- SELECT COUNT(*) as total_usuarios FROM bot_users;
-- SELECT role, COUNT(*) as quantidade FROM bot_users GROUP BY role;

-- ========================================
-- Promover um usuário específico a admin
-- ========================================

-- Para promover um usuário a admin, execute:
-- UPDATE bot_users
-- SET role = 'admin', updated_at = NOW()
-- WHERE phone_number = '5511999999999';

-- Ou use o comando do bot:
-- @bot promote 5511999999999

-- ========================================
-- Popular tabela bot_groups (MANUAL)
-- ========================================

-- Você precisa pegar os IDs dos grupos do WhatsApp e inserir manualmente:

-- Grupo de Membros (onde comandos member funcionam)
-- INSERT INTO bot_groups (group_id, group_type, description, is_active)
-- VALUES ('SEU_GROUP_ID_MEMBERS@g.us', 'member', 'Grupo da guild - comandos gerais', true);

-- Grupo de Admins (onde comandos admin funcionam)
-- INSERT INTO bot_groups (group_id, group_type, description, is_active)
-- VALUES ('SEU_GROUP_ID_ADMINS@g.us', 'admin', 'Grupo de admins - comandos administrativos', true);

-- Grupo de Notificações de Deaths
-- INSERT INTO bot_groups (group_id, group_type, description, is_active)
-- VALUES ('SEU_GROUP_ID_NOTIFY_DEATHS@g.us', 'notification', 'Notificações de deaths', true);

-- ========================================
-- Como pegar o group_id?
-- ========================================

-- 1. Adicione um console.log temporário no MessageListener.ts:
--    console.log('Group ID:', message.key.remoteJid)
--
-- 2. Envie uma mensagem no grupo
--
-- 3. Copie o ID que aparece no log (formato: 1234567890-1234567890@g.us)
--
-- 4. Use esse ID nas queries acima

-- ========================================
-- Exemplo completo de setup inicial
-- ========================================

/*
-- 1. Popular usuários (executar este arquivo)
\i sql/populate_bot_users.sql

-- 2. Promover você mesmo a admin
UPDATE bot_users
SET role = 'admin', updated_at = NOW()
WHERE phone_number = 'SEU_NUMERO';

-- 3. Adicionar os grupos (substitua os IDs reais)
INSERT INTO bot_groups (group_id, group_type, description, is_active) VALUES
  ('123456789-123456789@g.us', 'member', 'Grupo principal da guild', true),
  ('987654321-987654321@g.us', 'admin', 'Grupo de administração', true),
  ('111111111-111111111@g.us', 'notification', 'Notificações de deaths', true);

-- 4. Verificar tudo
SELECT * FROM bot_users WHERE role = 'admin';
SELECT * FROM bot_groups WHERE is_active = true;
*/
