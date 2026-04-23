import { Text, View } from '@/tw';

export function Badge({ label }: { label: string }) {
  return (
    <View className="self-start rounded-full bg-secondary/15 px-2 py-1">
      <Text className="text-xs font-medium text-secondary">{label}</Text>
    </View>
  );
}
