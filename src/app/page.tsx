import { AuthForm } from '@/components/auth/auth-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, redirect to chat
  if (user) {
    redirect('/chat');
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_0%,hsl(var(--primary)/0.06),transparent_60%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text mb-2">Coach</h1>
          <p className="text-muted">Your AI Health & Fitness Companion</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
