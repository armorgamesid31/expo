import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View } from '@/tw';

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 py-4 gap-4">
        <View className="gap-1">
          <Text className="text-2xl font-semibold text-foreground">{title}</Text>
          {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
