import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  return <Redirect href={session ? '/(app)' : '/login'} />;
}
