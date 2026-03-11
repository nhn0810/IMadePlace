require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function clean() {
  // We can't do a straightforward `DELETE WHERE sender_id = receiver_id` with supabase JS easily 
  // without calling a postgres function or fetching them first.
  const { data, error } = await supabase.from('messages').select('id, sender_id, receiver_id');
  if (error) {
    console.error(error);
    return;
  }
  
  const toDelete = data.filter(m => m.sender_id === m.receiver_id).map(m => m.id);
  
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('messages').delete().in('id', toDelete);
    if (delErr) {
      console.error(delErr);
    } else {
      console.log(`Deleted ${toDelete.length} self-messages`);
    }
  } else {
    console.log('No self-messages found.');
  }
}

clean();
