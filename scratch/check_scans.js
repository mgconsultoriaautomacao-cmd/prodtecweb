const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://yiigaohjvvieeooxsban.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaWdhb2hqdnZpZWVvb3hzYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTY1NzksImV4cCI6MjA5MDE5MjU3OX0.CjzcyltkTXHsi0zO7IL-sb5Psy7yMTAnJ7GRQ4maFK8');

async function check() {
  const { data, error } = await sb.from('production_scans').select('*').limit(5).order('ts', { ascending: false });
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
check();
