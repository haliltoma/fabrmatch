import { useCallback, useEffect, useState } from 'react';
import { getSessionCustomer, AUTH_CHANGED_EVENT, type StoreCustomer } from '../lib/auth';

/**
 * Header'daki hesap bağlantısı (CartCount deseni — ilk render null).
 * Girişsiz → /giris, girişli → /hesap.
 */
export default function AccountLink() {
  const [customer, setCustomer] = useState<StoreCustomer | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    setCustomer(await getSessionCustomer());
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
  }, [refresh]);

  if (customer === undefined) {
    return null;
  }

  return (
    <a href={customer ? '/hesap' : '/giris'} className="fm-cart-link" aria-label="Hesabım">
      <i className="ti ti-user" aria-hidden="true"></i>
      {customer ? 'hesabım' : 'giriş'}
    </a>
  );
}
