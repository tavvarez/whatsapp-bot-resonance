import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixHashes() {
  const { data: deaths, error } = await client
    .from('death_events')
    .select('id, world, guild, player_name, occurred_at, level')

  if (error) {
    console.error('Erro ao buscar:', error)
    return
  }

  console.log(`🔧 Corrigindo ${deaths?.length} hashes...`)

  for (const death of deaths ?? []) {
    const occurredAt = new Date(death.occurred_at).toISOString()
    
    const newHash = crypto
      .createHash('sha1')
      .update(`${death.world}|${death.guild}|${death.player_name}|${occurredAt}|${death.level}`)
      .digest('hex')

    await client
      .from('death_events')
      .update({ hash: newHash })
      .eq('id', death.id)

    console.log(`✅ ${death.player_name} -> ${newHash.slice(0, 8)}...`)
  }

  console.log('🎉 Concluído!')
}

fixHashes()