import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pcbqmjyfbkcwlmoztkem.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnFtanlmYmtjd2xtb3p0a2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjU3NTgsImV4cCI6MjA5NDkwMTc1OH0._zVPKJTF0Yk_1UhLem-L217aypkhrFenzA_RrADmwEs"; // deinen ganzen Key hier einfügen

export const supabase = createClient(supabaseUrl, supabaseKey);