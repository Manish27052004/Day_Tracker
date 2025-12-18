
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('category, category_type');

    if (error) {
        console.error(error);
        return;
    }

    const catCounts: Record<string, number> = {};
    sessions?.forEach((s: any) => {
        const raw = s.category;
        const key = `"${raw}" (len=${raw.length})`;
        catCounts[key] = (catCounts[key] || 0) + 1;
    });

    console.log("Distinct Categories in Sessions:");
    console.log(catCounts);
}

checkCategories();
