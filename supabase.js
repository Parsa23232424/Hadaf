import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://jnmgncodjjilbxynhuyi.supabase.co/rest/v1/';  // <-- فقط همین، بدون هیچ چیز اضافه
const supabaseKey = 'sb_publishable_aWMTLp8GZDjKSwBN9H65-w_5W8g_G-2';

export const supabase = createClient(supabaseUrl, supabaseKey);
