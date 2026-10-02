const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = process.env.SUPABASE_URL || 'https://yiigaohjvvieeooxsban.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPA_KEY) {
  console.error('SUPABASE_KEY ou SUPABASE_ANON_KEY é necessária em variável de ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

async function checkSchema() {
  const { data, error } = await supabase
    .from('expeditions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching expeditions:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

checkSchema();
