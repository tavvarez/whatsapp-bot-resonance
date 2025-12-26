export class FindCharacterUseCase {
    constructor(repository) {
        this.repository = repository;
    }
    async execute(characterName) {
        const normalizedName = this.normalize(characterName);
        return this.repository.findByNormalizedName(normalizedName);
    }
    normalize(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove acentos
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }
}
//# sourceMappingURL=FindCharacterUseCase.js.map