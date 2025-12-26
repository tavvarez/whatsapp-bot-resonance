import { BaileysClient } from '../../infra/whatsapp/BaileysClient.js';
import { GroupGuard } from './GroupGuard.js';
import { CommandParser } from '../commands/CommandParser.js';
export declare class MessageListener {
    private whatsapp;
    private groupGuard;
    private parser;
    constructor(whatsapp: BaileysClient, groupGuard: GroupGuard, parser: CommandParser);
    listen(): void;
}
//# sourceMappingURL=MessageListener.d.ts.map