export class GroupGuard {
    constructor(allowedGroupId) {
        this.allowedGroupId = allowedGroupId;
    }
    isAllowed(chatId) {
        return chatId === this.allowedGroupId;
    }
}
//# sourceMappingURL=GroupGuard.js.map