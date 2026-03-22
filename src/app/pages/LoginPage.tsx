import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Giriş başarısız oldu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--luxury-bg)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex justify-center">
          <div className="rounded-xl border border-border/70 bg-background px-3 py-2">
            <img
              src="https://cdn.kedyapp.com/kedylogo_koyu.png"
              alt="Kedy Logo"
              className="h-10 w-auto dark:hidden"
              loading="eager"
            />
            <img
              src="https://cdn.kedyapp.com/kedylogo_acik.png"
              alt="Kedy Logo"
              className="hidden h-10 w-auto dark:block"
              loading="eager"
            />
          </div>
        </div>
        <h1 className="text-xl font-semibold">Salon Mobile Giriş</h1>
        <p className="text-sm text-muted-foreground mt-1">Hesabınız ile giriş yapın.</p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm block mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[var(--rose-gold)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
