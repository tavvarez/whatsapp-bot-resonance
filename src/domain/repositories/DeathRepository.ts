import type { DeathEvent } from '../entities/DeathEvent.js'

export interface DeathRepository {
  save(event: DeathEvent): Promise<void>
  existsByHash(hash: string): Promise<boolean>

  findUnnotified(limit?: number): Promise<DeathEvent[]>
  markAsNotified(ids: string[]): Promise<void>
  getLastNotificationTime(): Promise<Date | null>
}
