import { useEffect, useState, type FormEvent } from 'react';
import { getSessionCustomer, loginCustomer, registerCustomer, notifyAuthChanged } from '../lib/auth';

/**
 * Giriş / kayıt — CartPage'in busy/error desenini kullanır, fm-form/fm-field kalıbı.
 */
export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ id: string; email: string } | null | undefined>(undefined);

  useEffect(() => {
    void getSessionCustomer().then((customer) => {
      setExisting(customer ? { id: customer.id, email: customer.email } : null);
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await loginCustomer(email, password);
      } else {
        await registerCustomer({ email, password, first_name: firstName, last_name: lastName });
      }
      notifyAuthChanged();
      window.location.href = '/hesap';
    } catch {
      setError(
        mode === 'login'
          ? 'E-posta veya şifre hatalı.'
          : 'Kayıt oluşturulamadı, bu e-posta zaten kayıtlı olabilir.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (existing === undefined) {
    return <p className="fm-spinner-row">Yükleniyor…</p>;
  }

  if (existing) {
    return (
      <div className="fm-empty">
        <p>
          Zaten giriş yaptınız (<strong>{existing.email}</strong>).
        </p>
        <a href="/hesap" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
          hesabıma git
        </a>
      </div>
    );
  }

  return (
    <div className="fm-page" style={{ maxWidth: 420, margin: '0 auto' }}>
      <h1>{mode === 'login' ? 'giriş yap' : 'hesap oluştur'}</h1>
      <form className="fm-form" style={{ marginTop: 16 }} onSubmit={submit}>
        {mode === 'register' && (
          <div className="fm-form__grid">
            <div className="fm-field">
              <label htmlFor="first_name">Ad</label>
              <input
                id="first_name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="last_name">Soyad</label>
              <input
                id="last_name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="fm-field">
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="fm-field">
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="fm-notice">{error}</p>}
        <button type="submit" className="fm-button fm-button--primary" disabled={busy}>
          {busy ? 'gönderiliyor…' : mode === 'login' ? 'giriş yap' : 'hesap oluştur'}
        </button>
      </form>
      <p className="fm-small fm-muted" style={{ marginTop: 16 }}>
        {mode === 'login' ? (
          <>
            Hesabınız yok mu?{' '}
            <a
              href="#kayit"
              onClick={(e) => {
                e.preventDefault();
                setError(null);
                setMode('register');
              }}
            >
              hesap oluşturun
            </a>
          </>
        ) : (
          <>
            Zaten hesabınız var mı?{' '}
            <a
              href="#giris"
              onClick={(e) => {
                e.preventDefault();
                setError(null);
                setMode('login');
              }}
            >
              giriş yapın
            </a>
          </>
        )}
      </p>
    </div>
  );
}
