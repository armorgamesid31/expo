import { ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '@/services/haptics';
import { Pressable, Text, View } from '@/tw';

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const className =
    variant === 'secondary'
      ? 'bg-secondary'
      : variant === 'outline'
        ? 'bg-transparent border border-border'
        : 'bg-primary';

  return (
    <Pressable
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 25, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 25, stiffness: 400 });
      }}
      onPress={() => {
        haptics.light();
        onPress?.();
      }}>
      <Animated.View style={animStyle}>
        <View className={`h-12 rounded-xl items-center justify-center ${className} ${(disabled || loading) ? 'opacity-60' : ''}`}>
          {loading ? (
            <ActivityIndicator color={variant === 'outline' ? '#1A1A1A' : '#FFFFFF'} />
          ) : (
            <Text className={`text-sm font-semibold ${variant === 'outline' ? 'text-foreground' : 'text-primary-foreground'}`}>
              {title}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}
