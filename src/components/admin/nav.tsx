'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const groups: { title: string; items: [string, string][] }[] = [
  { title: '', items: [['/admin', 'მიმოხილვა']] },
  { title: 'კატალოგი', items: [['/admin/products', 'პროდუქტები'], ['/admin/categories', 'კატეგორიები'], ['/admin/imports', 'იმპორტი / ექსპორტი'], ['/admin/media', 'მედია']] },
  { title: 'B2B', items: [['/admin/applications', 'განაცხადები'], ['/admin/partners', 'პარტნიორები']] },
  { title: 'კონტენტი', items: [['/admin/pages', 'გვერდები'], ['/admin/banners', 'ბანერები'], ['/admin/stores', 'მაღაზიები'], ['/admin/translations', 'თარგმანები'], ['/admin/settings', 'პარამეტრები / SEO']] },
  { title: 'კომუნიკაცია', items: [['/admin/messages', 'შეტყობინებები'], ['/admin/emails', 'ელფოსტის ჟურნალი']] },
  { title: 'უსაფრთხოება', items: [['/admin/security', 'MFA / აღდგენის კოდები'], ['/admin/audit', 'აუდიტის ჟურნალი']] },
];

export function AdminNav() {
  const p = usePathname();
  return (
    <nav aria-label="Admin" className="px-3 pb-4">
      {groups.map((g) => (
        <div key={g.title} className="mt-3">
          {g.title && <p className="px-2 pb-1 text-[11px] font-semibold text-mute">{g.title}</p>}
          <ul>
            {g.items.map(([href, label]) => {
              const active = href === '/admin' ? p === '/admin' : p.startsWith(href);
              return (
                <li key={href}>
                  <Link href={href} aria-current={active ? 'page' : undefined} className={cn('block rounded-[3px] px-2 py-1.5 text-sm', active ? 'bg-ink font-semibold text-paper' : 'text-graphite hover:bg-studio hover:text-ink')}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
