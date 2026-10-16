import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ProductCardDTO } from '@/server/services/catalog';
import { PriceTag } from './price';

/**
 * `price`: undefined → viewer not authorised (nothing rendered);
 * null → authorised but no price set; string → amount.
 */
export async function ProductCard({ p, price, priority }: { p: ProductCardDTO; price?: string | null; priority?: boolean }) {
  const t = await getTranslations('product');
  return (
    <article className="group relative flex flex-col bg-paper has-[a:focus-visible]:z-10 has-[a:focus-visible]:outline has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-ink">
      <div className="relative aspect-square overflow-hidden bg-paper">
        {p.image ? (
          <Image
            src={p.image.url}
            alt={p.image.alt}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-contain p-6 transition-transform duration-500 ease-out-quart group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-mute">{t('noImage')}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-line px-4 pb-4 pt-3">
        <p className="text-xs text-mute">
          <span className="font-semibold text-graphite">{p.sku}</span>
          {p.color && <span> · {p.color}</span>}
        </p>
        <h3 className="text-sm font-semibold leading-snug">
          <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.name}
          </Link>
        </h3>
        <div className="mt-auto pt-2">
          <PriceTag amount={price} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
