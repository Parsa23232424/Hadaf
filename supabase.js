import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ======================== تنظیمات Supabase ========================
// اینجا آدرس و کلید پروژه‌ات رو بذار
const supabaseUrl = 'https://jnmgncodjjilbxynhuyi.supabase.co/rest/v1/';   // <-- Project URL رو عوض کن
const supabaseKey = 'sb_publishable_aWMTLp8GZDjKSwBN9H65-w_5W8g_G-2';  // <-- 
// ==================================================================

export const supabase = createClient(supabaseUrl, supabaseKey);
