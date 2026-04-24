import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ApiError } from '@/lib/http';
import { useAuth } from '@/providers/AuthProvider';
import { useToasts } from '@/providers/ToastProvider';
import { Text, View } from '@/tw';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      const code =
        typeof error.body === 'object' && error.body && 'code' in error.body
          ? String((error.body as { code?: string }).code || '')
          : '';
      if (code === 'API_BASE_URL_MISSING') {
        return 'Uygulama yapılandırması eksik. EXPO_PUBLIC_API_BASE_URL ayarlanmalı ve uygulama yeniden başlatılmalı.';
      }
      return 'Sunucuya ulaşılamadı. İnternet bağlantısını ve API adresini kontrol edin.';
    }
    if (error.status === 401) return 'E-posta veya şifre hatalı.';
    if (error.status === 429) return 'Çok fazla deneme yapıldı. Lütfen kısa süre sonra tekrar deneyin.';
    if (error.status >= 500) return 'Sunucu geçici olarak kullanılamıyor. Lütfen tekrar deneyin.';
    return error.message || 'Giriş başarısız.';
  }

  if (error instanceof Error) return error.message;
  return 'Giriş başarısız.';
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToasts();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setSubmitError(null);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setSubmitError(null);
  }, []);

  const validationError = useMemo(() => {
    if (!email.trim() && !password.trim()) return null;
    if (!EMAIL_REGEX.test(email.trim())) return 'Geçerli bir e-posta girin.';
    if (password.length < 6) return 'Şifre en az 6 karakter olmalı.';
    return null;
  }, [email, password]);

  const canSubmit = useMemo(
    () => !busy && !validationError && Boolean(email.trim()) && Boolean(password),
    [busy, validationError, email, password]
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit || busy) return;
    void (async () => {
      setBusy(true);
      setSubmitError(null);
      try {
        await login(normalizedEmail, password);
        router.replace('/(tabs)/schedule');
      } catch (error) {
        const userMessage = mapLoginError(error);
        setSubmitError(userMessage);
        showToast(userMessage, 'error');
      } finally {
        setBusy(false);
      }
    })();
  }, [canSubmit, busy, login, normalizedEmail, password, router, showToast]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Salon Mobil Giriş" subtitle="Hesabınızla giriş yapın.">
        <Card>
          <Text className="mb-2 text-sm text-muted-foreground">E-posta</Text>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@salon.com"
            value={email}
            onChangeText={handleEmailChange}
            autoCorrect={false}
            editable={!busy}
            returnKeyType="next"
          />
          <Text className="mb-2 mt-3 text-sm text-muted-foreground">Şifre</Text>
          <Input
            secureTextEntry
            placeholder="Şifrenizi girin"
            value={password}
            onChangeText={handlePasswordChange}
            autoCorrect={false}
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <View className="mt-3 gap-1">
            {validationError ? <Text className="text-xs text-destructive">{validationError}</Text> : null}
            {submitError ? <Text className="text-xs text-destructive">{submitError}</Text> : null}
          </View>
          <Button title={busy ? 'Giriş yapılıyor...' : 'Giriş Yap'} loading={busy} disabled={!canSubmit} onPress={handleSubmit} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
