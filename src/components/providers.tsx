'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';
import { createContext, useContext, useState } from 'react';
const UI = createContext({ locale: 'th', toggle: () => {} });
export const useUI = () => useContext(UI);
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: true, retry: 1 } },
      }),
  );
  const [locale, setLocale] = useState('th');
  return (
    <UI.Provider value={{ locale, toggle: () => setLocale((x) => (x === 'th' ? 'en' : 'th')) }}>
      <NextIntlClientProvider locale={locale} messages={{}} timeZone="Asia/Bangkok">
        <QueryClientProvider client={client}>
          {children}
          <Toaster theme="dark" richColors position="top-center" />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </UI.Provider>
  );
}
