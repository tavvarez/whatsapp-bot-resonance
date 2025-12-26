export class GroupGuard {
    constructor(private allowedGroupId: string) {}
  
    isAllowed(chatId: string) {
      return chatId === this.allowedGroupId
    }
  }
  