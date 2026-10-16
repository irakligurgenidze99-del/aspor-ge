'use client';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/cn';

type Img = { url: string; width: number | null; height: number | null; alt: string };

export function Gallery({ images, name, labels }: { images: Img[]; name: string; labels: { gallery: string; image: string; noImage: string } }) {
  const [i, setI] = useState(0);
  if (!images.length) return <div className="flex aspect-square items-center justify-center border border-line text-sm text-mute">{labels.noImage}</div>;
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div className="relative aspect-square border border-line bg-paper">
        <Image src={cur.url} alt={cur.alt || name} fill priority sizes="(min-width:1024px) 55vw, 100vw" className="object-contain p-8 sm:p-12" />
      </div>
      {images.length > 1 && (
        <ul aria-label={labels.gallery} className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((im, idx) => (
            <li key={im.url}>
              <button
                type="button"
                onClick={() => setI(idx)}
                aria-label={labels.image.replace('{n}', String(idx + 1))}
                aria-pressed={idx === i}
                className={cn('relative block aspect-square w-full border bg-paper', idx === i ? 'border-ink' : 'border-line hover:border-graphite')}
              >
                <Image src={im.url} alt="" fill sizes="96px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
