const SUPABASE_URL = "https://gxzllogjxcnvahtfduny.supabase.co";

const SUPABASE_KEY = "sb_publishable_xSd8Pa_PThr2w8Q3v2FeFw_GUY7WJ9O";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Hadaf Meet: Supabase Connected");
