import { sdk } from './sdk';

/**
 * Müşteri oturumu — Medusa SDK 2.x JWT'yi varsayılan olarak localStorage'a
 * (`medusa_auth_token`) yazar ve her istekte otomatik `Authorization` başlığı
 * ekler; ayrı bir auth-storage modülü gerekmez. Token süresi dolarsa retrieve
 * 401 döner → token temizlenip misafir sayılır (refresh kapsamda değil).
 */

export const AUTH_CHANGED_EVENT = 'fm:auth-changed';

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export type StoreCustomer = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

function toCustomer(customer: { id: string; email: string; first_name?: string | null; last_name?: string | null }): StoreCustomer {
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name ?? null,
    last_name: customer.last_name ?? null,
  };
}

/** Girişli müşteriyi döndürür; token yoksa veya 401 ise null. */
export async function getSessionCustomer(): Promise<StoreCustomer | null> {
  const token = await sdk.client.getToken();
  if (!token) return null;
  try {
    const { customer } = await sdk.store.customer.retrieve();
    return toCustomer(customer);
  } catch {
    await sdk.client.clearToken();
    return null;
  }
}

export async function loginCustomer(email: string, password: string): Promise<StoreCustomer> {
  await sdk.auth.login('customer', 'emailpass', { email, password });
  const { customer } = await sdk.store.customer.retrieve();
  return toCustomer(customer);
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}): Promise<StoreCustomer> {
  // 2 adım: aktörsüz token ile kayıt → customer oluştur → gerçek token için login
  await sdk.auth.register('customer', 'emailpass', {
    email: input.email,
    password: input.password,
  });
  await sdk.store.customer.create({
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
  });
  return loginCustomer(input.email, input.password);
}

export async function logoutCustomer() {
  try {
    await sdk.auth.logout();
  } finally {
    await sdk.client.clearToken();
  }
}
