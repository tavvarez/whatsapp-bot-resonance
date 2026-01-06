import { createClient } from '@supabase/supabase-js';
import { DatabaseError } from '../../shared/errors/index.js';
import { normalizeText } from '../../shared/utils/normalizeText.js';
export class SupabaseCharacterRepository {
    constructor() {
        this.client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    async findByNormalizedName(normalizedName) {
        const { data, error } = await this.client
            .from('characters')
            .select('*')
            .eq('name_normalized', normalizedName)
            .single();
        if (error || !data)
            return null;
        return {
            id: data.id,
            characterName: data.character_name,
            phoneNumber: data.phone_number,
            type: data.character_type
        };
    }
    async existsByName(normalizedName) {
        const { data } = await this.client
            .from('characters')
            .select('id')
            .eq('name_normalized', normalizedName)
            .maybeSingle();
        return !!data;
    }
    async save(input) {
        const normalizedName = normalizeText(input.characterName);
        const { data, error } = await this.client
            .from('characters')
            .insert({
            character_name: input.characterName,
            name_normalized: normalizedName,
            phone_number: input.phoneNumber,
            character_type: input.type
        })
            .select()
            .single();
        if (error) {
            throw new DatabaseError('Erro ao salvar personagem', error);
        }
        return {
            id: data.id,
            characterName: data.character_name,
            phoneNumber: data.phone_number,
            type: data.character_type
        };
    }
}
//# sourceMappingURL=SupabaseCharacterRepository.js.map