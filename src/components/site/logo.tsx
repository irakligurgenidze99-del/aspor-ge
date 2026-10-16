import Image from 'next/image';

export function Logo({ inverse = false, className, priority }: { inverse?: boolean; className?: string; priority?: boolean }) {
  return (
    <Image
      src={inverse ? '/brand/aspor-logo-inverse.png' : '/brand/aspor-logo.png'}
      alt="ASPOR — Power your aspiration"
      width={839}
      height={266}
      priority={priority}
      className={className}
      sizes="160px"
    />
  );
}
