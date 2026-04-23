import { Image } from '@/tw/image';
import { Text, View } from '@/tw';

export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string | null; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join('');

  return (
    <View className="items-center justify-center rounded-full bg-muted" style={{ width: size, height: size }}>
      <Text className="text-xs font-semibold text-foreground">{initials || '?'}</Text>
    </View>
  );
}
