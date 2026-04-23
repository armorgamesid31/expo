import { TextInput, View } from '@/tw';

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View className="rounded-xl border border-border bg-input-background px-3 py-1">
      <TextInput className="h-10 text-base text-foreground" placeholderTextColor="#9CA3AF" {...props} />
    </View>
  );
}
