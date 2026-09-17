import { useEffect, useState, type FormEvent } from 'react';
import { getSessionCustomer, loginCustomer, registerCustomer, notifyAuthChanged } from '../lib/auth';

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
          ? 'e-posta veya şifre hatalı.'
          : 'kayıt oluşturulamadı, bu e-posta zaten kayıtlı olabilir.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (existing === undefined) {
    return (
      <div className="fm-auth-page">
        <p className="fm-spinner-row">Yükleniyor…</p>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="fm-auth-page">
        <div className="fm-auth-card">
          <div className="fm-auth-card__brand">
            <span className="fm-auth-card__brand-icon" aria-hidden="true">
              <i className="ti ti-leaf" />
            </span>
            fabrmatch
          </div>
          <div className="fm-empty" style={{ padding: '16px 0' }}>
            <p>
              Zaten giriş yaptınız (<strong>{existing.email}</strong>).
            </p>
            <a href="/hesap" className="fm-button fm-button--primary" style={{ marginTop: 12 }}>
              <i className="ti ti-user" aria-hidden="true" /> hesabıma git
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fm-auth-page">
      <div className="fm-auth-card">
        {/* Marka */}
        <div className="fm-auth-card__brand">
          <span className="fm-auth-card__brand-icon" aria-hidden="true">
            <i className="ti ti-leaf" />
          </span>
          fabrmatch
        </div>

        {/* Başlık */}
        <div className="fm-auth-card__head">
          <h1>{mode === 'login' ? 'giriş yap' : 'hesap oluştur'}</h1>
          <p className="fm-auth-card__sub">
            {mode === 'login'
              ? 'Siparişlerinizi takip etmek için giriş yapın.'
              : 'Hesabınızı oluşturun, siparişlerinizi takip edin.'}
          </p>
        </div>

        {/* Form */}
        <form className="fm-form" onSubmit={submit}>
          {mode === 'register' && (
            <div className="fm-form__grid">
              <div className="fm-field">
                <label htmlFor="first_name">Ad</label>
                <input
                  id="first_name"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="fm-field">
                <label htmlFor="last_name">Soyad</label>
                <input
                  id="last_name"
                  required
                  autoComplete="family-name"
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
              autoComplete="email"
              placeholder="ornek@eposta.com"
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
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="fm-notice">{error}</p>}
          <button type="submit" className="fm-button fm-button--primary fm-button--full" disabled={busy}>
            {busy ? (
              <>
                <i className="ti ti-loader-2 fm-spin" aria-hidden="true" /> gönderiliyor…
              </>
            ) : mode === 'login' ? (
              <>
                <i className="ti ti-login" aria-hidden="true" /> giriş yap
              </>
            ) : (
              <>
                <i className="ti ti-user-plus" aria-hidden="true" /> hesap oluştur
              </>
            )}
          </button>
        </form>

        {/* Geçiş linki */}
        <div className="fm-auth-card__footer">
          {mode === 'login' ? (
            <>
              <span>Hesabınız yok mu?</span>
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
              <span>Zaten hesabınız var mı?</span>
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
        </div>
      </div>
    </div>
  );
}
