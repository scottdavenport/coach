import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to chat since dashboard is now a modal feature
  redirect('/chat');
}
