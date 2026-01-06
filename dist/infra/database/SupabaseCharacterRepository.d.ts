import type { CharacterRepository, CreateCharacterInput } from '../../domain/repositories/CharacterRepository.js';
import type { Character } from '../../domain/entities/Character.js';
export declare class SupabaseCharacterRepository implements CharacterRepository {
    private client;
    findByNormalizedName(normalizedName: string): Promise<Character | null>;
    existsByName(normalizedName: string): Promise<boolean>;
    save(input: CreateCharacterInput): Promise<Character>;
}
//# sourceMappingURL=SupabaseCharacterRepository.d.ts.map