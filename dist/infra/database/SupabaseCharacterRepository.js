import { createClient } from '@supabase/supabase-js';
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
}
//# sourceMappingURL=SupabaseCharacterRepository.js.map