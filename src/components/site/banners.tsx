import Image from 'next/image';
import { listActiveBanners } from '@/server/services/content';
import type { Locale } from '@/server/services/catalog';
import { safeHref } from '@/lib/urls';
import { Container } from '../ui/container';

/** CMS banners for a placement (admin → ბანერები). Renders nothing when none are active. */
export async function BannerStrip({ placement, locale }: { placement: string; locale: Locale }) {
  const banners = await listActiveBanners(placement, locale);
  if (!banners.length) return null;
  return (
    <section aria-label="Banners">
      <Container className="grid gap-px border border-line bg-line py-0 md:grid-cols-2">
        {banners.map((b) => {
          const href = safeHref(b.linkUrl, '');
          const inner = (
            <div className="flex h-full items-center gap-6 bg-paper p-6">
              {b.imageUrl && <Image src={b.imageUrl} alt="" width={160} height={120} className="h-24 w-32 shrink-0 object-contain" />}
              <div>
                <h2 className="text-lg font-bold">{b.title}</h2>
                {b.text && <p className="mt-1 text-sm text-graphite">{b.text}</p>}
              </div>
            </div>
          );
          return href ? <a key={b.id} href={href} className="block hover:opacity-90">{inner}</a> : <div key={b.id}>{inner}</div>;
        })}
      </Container>
    </section>
  );
}
