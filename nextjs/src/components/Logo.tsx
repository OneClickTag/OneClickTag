import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: 'default' | 'light';
}

export function Logo({ className = '', width = 160, height = 30, variant = 'default' }: LogoProps) {
  const src = variant === 'light' ? '/logo-light.svg' : '/logo.svg';

  return (
    <Image
      src={src}
      alt="OneClickTag"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
