import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Redirect href={isAuthenticated ? '/(tabs)/schedule' : '/(auth)/login'} />;
}
