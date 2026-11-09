import { IconStar } from './icons.tsx';

export function StarRating({ stars, className = 'w-4 h-4' }: { stars: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`おすすめ度 ${stars} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar key={i} className={`${i <= stars ? 'text-sun-500' : 'text-sand-300'} ${className}`} />
      ))}
    </span>
  );
}
