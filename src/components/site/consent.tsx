'use client';
import Script from 'next/script';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Consent-gated analytics. GA4 and Meta Pixel load ONLY when (a) a real ID is
 * configured via NEXT_PUBLIC_* env and (b) the visitor chose "Accept all".
 * Choice is stored in a first-party cookie for 180 days.
 */
const COOKIE = 'aspor_consent';
type Choice = 'all' | 'necessary' | null;

function readChoice(): Choice {
  const m = document.cookie.match(/(?:^|; )aspor_consent=(all|necessary)/);
  return (m?.[1] as Choice) ?? null;
}
function writeChoice(c: 'all' | 'necessary') {
  document.cookie = `${COOKIE}=${c}; Max-Age=${180 * 86400}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  window.dispatchEvent(new Event('aspor-consent'));
}

export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button type="button" className="hover:text-paper" onClick={() => window.dispatchEvent(new Event('aspor-consent-open'))}>
      {label}
    </button>
  );
}

export function ConsentAndAnalytics({ ga4Id, pixelId }: { ga4Id: string; pixelId: string }) {
  const t = useTranslations('consent');
  // Cookie is external state → useSyncExternalStore. Server snapshot 'ssr' renders nothing.
  const choice = useSyncExternalStore<Choice | 'ssr'>(
    (cb) => {
      window.addEventListener('aspor-consent', cb);
      return () => window.removeEventListener('aspor-consent', cb);
    },
    () => readChoice(),
    () => 'ssr',
  );
  const [reopened, setReopened] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hasTrackers = !!(ga4Id || pixelId);
  useEffect(() => {
    const onOpen = () => { setReopened(true); setDismissed(false); };
    window.addEventListener('aspor-consent-open', onOpen);
    return () => window.removeEventListener('aspor-consent-open', onOpen);
  }, []);
  const show = !dismissed && choice !== 'ssr' && (reopened || (hasTrackers && choice === null));
  const setShow = (v: boolean) => { if (!v) { setDismissed(true); setReopened(false); } };

  const pathname = usePathname();
  // Never load third-party trackers on account pages (one-time tokens live in those URLs).
  const allowed = choice === 'all' && !pathname.startsWith('/account');
  return (
    <>
      {allowed && ga4Id && /^G-[A-Z0-9]+$/.test(ga4Id) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {allowed && pixelId && /^\d{6,20}$/.test(pixelId) && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}</Script>
      )}
      {show && (
        <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-[4px] border border-line bg-paper p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] sm:inset-x-6">
          <h2 id="consent-title" className="text-base font-bold">{t('title')}</h2>
          <p className="mt-1 text-sm text-graphite">
            {t('body')} <Link href="/cookies" className="underline underline-offset-2">{t('more')}</Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="h-10 rounded-[3px] bg-ink px-4 text-sm font-semibold text-paper" onClick={() => { writeChoice('all'); setShow(false); }}>{t('accept')}</button>
            <button type="button" className="h-10 rounded-[3px] border border-ink px-4 text-sm font-semibold" onClick={() => { writeChoice('necessary'); setShow(false); }}>{t('reject')}</button>
          </div>
        </div>
      )}
    </>
  );
}
