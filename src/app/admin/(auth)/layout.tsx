import { Logo } from '@/components/site/logo';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[4px] border border-line bg-paper p-8">
        <Logo className="mb-6 h-7 w-auto" />
        {children}
      </div>
    </div>
  );
}
