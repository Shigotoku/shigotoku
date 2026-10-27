type BrandMarkProps = {
  className?: string;
  size?: number;
};

/** 公式アイコン（紫グラデーションの稲妻） */
export default function BrandMark({ className = '', size = 32 }: BrandMarkProps) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      decoding="async"
    />
  );
}
