import type { CharacterRepository } from '../../domain/repositories/CharacterRepository.js';
import type { Character } from '../../domain/entities/Character.js';
export declare class SupabaseCharacterRepository implements CharacterRepository {
    private client;
    findByNormalizedName(normalizedName: string): Promise<Character | null>;
}
//# sourceMappingURL=SupabaseCharacterRepository.d.ts.map