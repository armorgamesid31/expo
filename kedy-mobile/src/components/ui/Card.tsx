import { View } from '@/tw';

export function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl border border-border bg-card p-4">{children}</View>;
}
