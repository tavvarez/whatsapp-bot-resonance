import type { CharacterRepository } from '../../domain/repositories/CharacterRepository.js';
export declare class FindCharacterUseCase {
    private repository;
    constructor(repository: CharacterRepository);
    execute(characterName: string): Promise<import("../../domain/entities/Character.js").Character | null>;
    private normalize;
}
//# sourceMappingURL=FindCharacterUseCase.d.ts.map