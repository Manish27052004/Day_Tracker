
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://smujdljfbpoqyibflkvp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdWpkbGpmYnBvcXlpYmZsa3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1ODc4MDIsImV4cCI6MjA4MTE2MzgwMn0.kIwgThmhNNW5wX1isblSQzLyMBGUeu5scwIwezAcS58";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('category');

    if (error) {
        console.error(error);
        return;
    }

    const catCounts: Record<string, number> = {};
    sessions?.forEach((s: any) => {
        let raw = s.category;
        if (raw === null || raw === undefined) raw = "NULL";
        const key = `"${raw}" (len=${raw.length})`;
        catCounts[key] = (catCounts[key] || 0) + 1;
    });

    console.log("Distinct Categories in Sessions:");
    console.log(catCounts);
}

checkCategories();
