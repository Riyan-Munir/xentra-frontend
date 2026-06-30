export default function Skeleton({ variant = 'text', count = 1, className = '' }) {
    const variants = {
        card: 'h-40 w-full rounded-xl bg-white/5 animate-pulse',
        profile: 'h-24 w-full rounded-xl bg-white/5 animate-pulse',
        stat: 'h-20 w-40 rounded-xl bg-white/5 animate-pulse',
        circle: 'h-12 w-12 rounded-full bg-white/5 animate-pulse shrink-0',
        text: 'h-4 w-full rounded bg-white/5 animate-pulse',
        form: 'h-10 w-full rounded-lg bg-white/5 animate-pulse',
    }

    const cls = variants[variant] || variants.text

    return (
        <div className={`space-y-3 ${className}`} role="status" aria-label="Loading">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={cls} />
            ))}
        </div>
    )
}
