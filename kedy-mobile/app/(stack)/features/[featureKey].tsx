import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/features/PlaceholderScreen';

export default function FeatureDetailScreen() {
  const { featureKey } = useLocalSearchParams<{ featureKey: string }>();
  return <PlaceholderScreen title={`Feature: ${featureKey || '-'}`} />;
}
