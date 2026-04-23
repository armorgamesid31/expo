import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function Skeleton({ height = 16 }: { height?: number }) {
  const opacity = useSharedValue(0.5);
  opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, height }));
  return <Animated.View style={style} className="w-full rounded-lg bg-muted" />;
}
