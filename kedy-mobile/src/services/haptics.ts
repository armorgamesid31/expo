import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const haptics = {
  light: () => !isWeb && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => !isWeb && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => !isWeb && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => !isWeb && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
