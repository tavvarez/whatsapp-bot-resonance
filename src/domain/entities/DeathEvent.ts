export interface DeathEvent {
    id?: string
  
    world: string
    guild: string
  
    playerName: string
    level: number
  
    occurredAt: Date
    rawText: string
  
    hash: string
  
    createdAt?: Date
    notifiedAt?: Date | null
  }
  