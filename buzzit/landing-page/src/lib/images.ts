import { assetPath } from './urls';

/** 生成済みコラージュ（npm run generate:images） */
export const images = {
  heroCollage: assetPath('images/hero-collage.webp'),
  /** セクション内の単体写真（Unsplash） */
  salonInterior:
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
  teamWork:
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  reelsContent:
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80',
  cafeStore:
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
  /** Googleマップ・店舗集客（Features カード背景） */
  googleMapsLocal:
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
} as const;

/** 全幅フォトストリップ用（生成済み WebP タイル） */
export const photoStripImages = [
  { src: assetPath('images/strip/strip-01.webp'), alt: 'サロン店内' },
  { src: assetPath('images/strip/strip-02.webp'), alt: 'カフェ' },
  { src: assetPath('images/strip/strip-03.webp'), alt: 'スパ・クリニック' },
  { src: assetPath('images/strip/strip-04.webp'), alt: 'レストラン' },
  { src: assetPath('images/strip/strip-05.webp'), alt: 'オフィス' },
  { src: assetPath('images/strip/strip-06.webp'), alt: 'ライフスタイル' },
  { src: assetPath('images/strip/strip-07.webp'), alt: '店舗' },
  { src: assetPath('images/strip/strip-08.webp'), alt: 'チーム' },
] as const;
