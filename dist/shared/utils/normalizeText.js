export function normalizeText(value) {
    return value
        .normalize('NFD') // remove acentos
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}
//# sourceMappingURL=normalizeText.js.map