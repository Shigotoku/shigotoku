import { getSnsNavPlatform } from '../lib/snsPlatforms';

type Props = {
  platformId: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
};

export default function PlatformBadge({ platformId, size = 'sm', showLabel = false, className = '' }: Props) {
  const platform = getSnsNavPlatform(platformId);
  if (!platform) return null;

  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`${dotSize} shrink-0 rounded-full`}
        style={{ backgroundColor: platform.brandColor }}
        aria-hidden
      />
      {showLabel && (
        <span className={`${textSize} font-medium text-neutral-700`}>{platform.shortLabel}</span>
      )}
    </span>
  );
}
