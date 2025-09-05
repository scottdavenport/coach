import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import JournalClient from './journal-client';

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  return (
    <div className="min-h-screen bg-background">
      <JournalClient userId={user.id} />
    </div>
  );
}