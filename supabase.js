import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://jnmgncodjjilbxynhuyi.supabase.co';  // بدون /rest/v1/
const supabaseKey = 'sb_publishable_aWMTLp8GZDjKSwBN9H65-w_5W8g_G-2';

export const supabase = createClient(supabaseUrl, supabaseKey);
