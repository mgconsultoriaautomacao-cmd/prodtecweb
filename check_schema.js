const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = 'https://yiigaohjvvieeooxsban.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaWdhb2hqdnZpZWVvb3hzYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTY1NzksImV4cCI6MjA5MDE5MjU3OX0.CjzcyltkTXHsi0zO7IL-sb5Psy7yMTAnJ7GRQ4maFK8';

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
