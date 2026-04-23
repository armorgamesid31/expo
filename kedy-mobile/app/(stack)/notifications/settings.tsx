import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Switch } from '@/components/ui/Switch';
import { Text, View } from '@/tw';

const KEY_APPOINTMENT = 'kedy.notifications.appointment';
const KEY_REPORT = 'kedy.notifications.report';
const KEY_HANDOVER = 'kedy.notifications.handover';

export default function NotificationSettingsScreen() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [appointment, setAppointment] = useState(true);
  const [report, setReport] = useState(true);
  const [handover, setHandover] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ status }, a, r, h] = await Promise.all([
        Notifications.getPermissionsAsync(),
        AsyncStorage.getItem(KEY_APPOINTMENT),
        AsyncStorage.getItem(KEY_REPORT),
        AsyncStorage.getItem(KEY_HANDOVER),
      ]);
      setPermission(status);
      setAppointment(a !== '0');
      setReport(r !== '0');
      setHandover(h !== '0');
    })();
  }, []);

  const persist = async (key: string, value: boolean) => {
    await AsyncStorage.setItem(key, value ? '1' : '0');
  };

  return (
    <Screen title="Notification Settings" subtitle="Minimum usable bildirim tercihleri">
      <Card>
        <Text className="text-base font-semibold text-foreground">Push izin durumu</Text>
        <Text className="mt-2 text-sm text-muted-foreground">{permission}</Text>
        <View className="mt-3">
          <Button
            title="İzinleri Yenile"
            variant="outline"
            onPress={() => {
              void (async () => {
                const req = await Notifications.requestPermissionsAsync();
                setPermission(req.status);
              })();
            }}
          />
        </View>
      </Card>

      <Card>
        <Text className="text-base font-semibold text-foreground">Kategori tercihleri</Text>
        <View className="mt-3 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-foreground">Randevu bildirimleri</Text>
            <Switch
              value={appointment}
              onValueChange={(v) => {
                setAppointment(v);
                void persist(KEY_APPOINTMENT, v);
              }}
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-foreground">Rapor bildirimleri</Text>
            <Switch
              value={report}
              onValueChange={(v) => {
                setReport(v);
                void persist(KEY_REPORT, v);
              }}
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-foreground">Handover bildirimleri</Text>
            <Switch
              value={handover}
              onValueChange={(v) => {
                setHandover(v);
                void persist(KEY_HANDOVER, v);
              }}
            />
          </View>
        </View>
      </Card>
    </Screen>
  );
}
