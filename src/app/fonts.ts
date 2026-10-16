import localFont from 'next/font/local';

export const manrope = localFont({
  src: [
    { path: '../fonts/Manrope-latin-wght.woff2', weight: '200 800', style: 'normal' },
  ],
  variable: '--font-manrope',
  display: 'swap',
});

export const georgian = localFont({
  src: [{ path: '../fonts/NotoSansGeorgian-wght.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-georgian',
  display: 'swap',
});
