import { cn } from '@/lib/utils';

type Tone = 'dark' | 'light';

const TONES: Record<Tone, { primary: string; secondary: string; icon: string }> = {
  dark: {
    primary: 'text-primary',
    secondary: 'text-on-surface-variant',
    icon: 'bg-surface border border-outline-variant/60 shadow-sm',
  },
  light: {
    primary: 'text-white',
    secondary: 'text-white/70',
    icon: 'bg-white/10 text-white border border-white/20',
  },
};

export function BrandLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl bg-surface border border-outline-variant/60 shadow-sm relative overflow-visible',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* Stylized 'g' with orange droplet */}
      <div 
        className="font-black leading-none text-[#3FA9F5] select-none flex items-center justify-center h-full" 
        style={{ fontSize: size * 0.7 }}
      >
        <span>g</span>
        <span 
          className="absolute text-[#F07043]"
          style={{
            top: '10%',
            right: '20%',
          }}
        >
          <svg width={size * 0.28} height={size * 0.28} viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 0 C8 3, 8 7, 5 10 C2 7, 2 3, 5 0 Z" transform="rotate(25 5 5)" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function BrandWordmark({
  size = 'md',
  tone = 'dark',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone;
  className?: string;
}) {
  const sizes = {
    sm: { primary: 'text-[16px]', secondary: 'text-[9px]' },
    md: { primary: 'text-[20px]', secondary: 'text-[10px]' },
    lg: { primary: 'text-[28px]', secondary: 'text-[12px]' },
  };
  const s = sizes[size];
  const t = TONES[tone];
  const isLight = tone === 'light';

  return (
    <div className={cn('wordmark leading-none select-none flex flex-col', className)}>
      <div className={cn(s.primary, 'font-bold tracking-tight flex items-baseline leading-none')}>
        <span className={isLight ? 'text-white' : 'text-[#3D3D40]'}>lo</span>
        {/* Stylized 'g' with orange droplet */}
        <span className="relative inline-flex items-baseline leading-none">
          <span className="text-[#3FA9F5]">g</span>
          <span 
            className="absolute text-[#F07043] leading-none"
            style={{
              top: '-15%',
              right: '-10%',
            }}
          >
            <svg className="w-[0.38em] h-[0.38em]" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 0 C8 3, 8 7, 5 10 C2 7, 2 3, 5 0 Z" transform="rotate(25 5 5)" />
            </svg>
          </span>
        </span>
        <span className={isLight ? 'text-white' : 'text-[#3D3D40]'}>istika</span>
      </div>
      <p className={cn(s.secondary, t.secondary, 'mt-1 font-semibold tracking-wide uppercase text-[8px]')}>
        Salud · Reclamos
      </p>
    </div>
  );
}

export function BrandLockup({
  size = 'md',
  tone = 'dark',
  logoSize,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone;
  logoSize?: number;
  className?: string;
}) {
  const fallback = { sm: 32, md: 44, lg: 56 };
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandLogo size={logoSize ?? fallback[size]} />
      <BrandWordmark size={size} tone={tone} />
    </div>
  );
}
