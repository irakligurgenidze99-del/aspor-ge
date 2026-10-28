import { requireAdmin } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { Card, PageHead } from '@/components/admin/shell';
import { ActionForm, Submit } from '@/components/admin/forms';
import { TextField } from '@/components/ui/field';
import { saveSettingsAction } from '@/server/actions/admin/content';
import { SETTING_KEYS } from '@/lib/settings';
import { publicEnv } from '@/lib/public-env';

export const metadata = { title: 'პარამეტრები' };

const LABELS: Record<string, string> = { 'company.name': 'კომპანიის იურიდიული დასახელება (მაგ. შპს „…“)', 'company.code': 'საიდენტიფიკაციო კოდი', 'company.address': 'იურიდიული მისამართი', 'contact.email': 'საკონტაქტო ელფოსტა', 'contact.phone': 'ტელეფონი', 'contact.address': 'მისამართი', 'contact.hours': 'სამუშაო საათები', 'social.facebook': 'Facebook (https)', 'social.instagram': 'Instagram (https)' };

export default async function Settings() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const rows = await db.siteSetting.findMany();
  const get = (k: string) => rows.find((r) => r.key === k);
  return (
    <>
      <PageHead title="პარამეტრები / SEO" desc="საკონტაქტო მონაცემები ჩანს ფუტერში და კონტაქტის გვერდზე. ცარიელი ველი არ გამოჩნდება — არასოდეს ჩაწეროთ დროებითი/მოგონილი მონაცემები. კომპანიის რეკვიზიტები და კონტაქტი ავტომატურად ჩაჯდება კონფიდენციალურობის პოლიტიკაში, წესებსა და პირობებში და Cookie პოლიტიკაში." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <ActionForm action={saveSettingsAction} className="space-y-4">
            {SETTING_KEYS.map((k) => (
              <div key={k} className="grid gap-3 sm:grid-cols-2">
                <TextField label={`${LABELS[k]} — ქართ.`} name={`${k}:ka`} defaultValue={get(k)?.valueKa ?? ''} />
                <TextField label={`${LABELS[k]} — EN (არასავალდ.)`} name={`${k}:en`} defaultValue={get(k)?.valueEn ?? ''} />
              </div>
            ))}
            <Submit>შენახვა</Submit>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">ინტეგრაციები (გარემოს ცვლადები)</h2>
          <p className="mb-3 text-sm text-graphite">ეს მნიშვნელობები ყენდება Vercel-ში (Environment Variables) და ჩაირთვება მხოლოდ რეალური ID-ით.</p>
          <ul className="space-y-2 text-sm">
            <li>GA4: <strong>{publicEnv.ga4Id || 'არ არის'}</strong></li>
            <li>Meta Pixel: <strong>{publicEnv.metaPixelId || 'არ არის'}</strong></li>
            <li>Search Console verification: <strong>{publicEnv.googleSiteVerification ? 'დაყენებულია' : 'არ არის'}</strong></li>
            <li>საიტის URL: <strong>{publicEnv.siteUrl}</strong></li>
          </ul>
          <p className="mt-3 text-xs text-mute">ანალიტიკა იტვირთება მხოლოდ ვიზიტორის თანხმობის შემდეგ (cookie ბანერი).</p>
        </Card>
      </div>
    </>
  );
}
