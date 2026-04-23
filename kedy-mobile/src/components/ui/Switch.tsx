import { Switch as RNSwitch } from 'react-native';

export function Switch(props: React.ComponentProps<typeof RNSwitch>) {
  return <RNSwitch trackColor={{ false: '#D4D4D8', true: '#F07122' }} {...props} />;
}
