import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F07122',
      }}>
      <Tabs.Screen
        name="schedule/index"
        options={{
          title: 'Randevular',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers/index"
        options={{
          title: 'Müşteriler',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{
          title: 'Oluştur',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="conversations/index"
        options={{
          title: 'Konuşmalar',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu/index"
        options={{
          title: 'Menü',
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="schedule/new" options={{ href: null }} />
      <Tabs.Screen name="schedule/waitlist/new" options={{ href: null }} />
      <Tabs.Screen name="customers/new" options={{ href: null }} />
      <Tabs.Screen name="customers/risk-menu" options={{ href: null }} />
      <Tabs.Screen name="customers/attendance-settings" options={{ href: null }} />
      <Tabs.Screen name="conversations/[conversationId]" options={{ href: null }} />
    </Tabs>
  );
}
