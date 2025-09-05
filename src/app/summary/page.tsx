import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SummaryClient from './summary-client';

export default async function SummaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  return (
    <div className="min-h-screen bg-background">
      <SummaryClient userId={user.id} />
    </div>
  );
}