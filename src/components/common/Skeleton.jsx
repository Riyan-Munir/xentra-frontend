import React, { useState, useLayoutEffect, useRef } from 'react';

/**
 * Auto-Sizing Skeleton — renders generic geometric patterns that auto-size
 * to the container using ResizeObserver. No hardcoded pixel dimensions.
 *
 * Templates define consistent geometric patterns (NOT data-field-specific):
 *   "profile" — avatar circle + name/subtitle lines
 *   "card"    — icon + title + description block (reusable)
 *   "form"    — label + input bar + hint groups
 *   "stat"    — compact value + label, centered
 *   "text"    — N text lines filling available height
 *   "circle"  — perfect circle placeholder
 *
 * Usage:
 *   <Skeleton template="profile" />
 *   <Skeleton template="card" count={3} />
 *   <Skeleton template="form" count={2} />
 *   <Skeleton template="stat" />
 *   <Skeleton template="text" lines={3} />
 */

const RADIUS = 4;
const GAP = 6;

/* ─── Generic Geometric Templates ─── */
/* Each receives { w, h, lines } and returns geometric bars only.
   No pixel dimensions are stored — all values are computed from { w, h }. */

const TEMPLATES = {
  /** Large circle + name line + subtitle line (side-by-side) */
  profile: ({ w, h }) => {
    const avatar = Math.max(32, Math.min(w * 0.13, 72, h * 0.55));
    const nameH  = Math.max(14, Math.min(h * 0.15, 22));
    const subH   = Math.max(10, Math.min(h * 0.11, 16));
    return (
      <div className="skeleton-profile-row">
        <div
          className="skeleton-circle"
          style={{ width: avatar, height: avatar, borderRadius: '50%', flexShrink: 0 }}
        />
        <div className="skeleton-text-block" style={{ flex: 1 }}>
          <div
            className="skeleton-line"
            style={{ width: `${w * 0.35}px`, height: nameH, borderRadius: RADIUS, marginBottom: GAP }}
          />
          <div
            className="skeleton-line"
            style={{ width: `${w * 0.25}px`, height: subH, borderRadius: RADIUS }}
          />
        </div>
      </div>
    );
  },

  /** Compact stat: value bar + label bar, vertically centered */
  stat: ({ w, h }) => {
    const pad  = Math.max(6, Math.min(w * 0.06, 14));
    const valH = Math.max(14, h * 0.38);
    return (
      <div className="skeleton-card-inner" style={{ padding: pad, justifyContent: 'center' }}>
        <div
          className="skeleton-line"
          style={{ width: `${Math.max(24, w * 0.35)}px`, height: valH, borderRadius: RADIUS, marginBottom: GAP }}
        />
        <div
          className="skeleton-line"
          style={{ width: `${Math.max(20, w * 0.25)}px`, height: valH * 0.6, borderRadius: RADIUS }}
        />
      </div>
    );
  },

  /** Form group: label + input bar + hint text */
  form: ({ w, h }) => {
    const pad     = Math.max(8, Math.min(w * 0.03, 16));
    const inputH  = Math.max(24, Math.min(h * 0.17, 40));
    const labelH  = Math.max(8, Math.min(h * 0.07, 12));
    return (
      <div className="skeleton-card-inner" style={{ padding: pad }}>
        <div
          className="skeleton-line"
          style={{ width: `${Math.max(40, w * 0.2)}px`, height: labelH, borderRadius: RADIUS, marginBottom: GAP }}
        />
        <div
          className="skeleton-line"
          style={{ width: '100%', height: inputH, borderRadius: Math.min(RADIUS * 2, 8), marginBottom: GAP * 0.6 }}
        />
        <div
          className="skeleton-line"
          style={{ width: `${Math.max(50, w * 0.3)}px`, height: labelH * 0.75, borderRadius: RADIUS }}
        />
      </div>
    );
  },

  /** Generic card row: icon circle + title + subtitle, then description bar */
  card: ({ w, h }) => {
    const icon    = Math.max(20, Math.min(w * 0.08, 40, h * 0.35));
    const pad     = Math.max(8, Math.min(w * 0.03, 14));
    const innerW  = w - pad * 2;
    return (
      <div className="skeleton-card-inner" style={{ padding: pad }}>
        <div className="skeleton-card-row" style={{ gap: 10, alignItems: 'center' }}>
          <div
            className="skeleton-circle"
            style={{ width: icon, height: icon, borderRadius: '50%', flexShrink: 0 }}
          />
          <div className="skeleton-text-block" style={{ flex: 1 }}>
            <div
              className="skeleton-line"
              style={{ width: `${innerW * 0.35}px`, height: Math.max(10, h * 0.16), borderRadius: RADIUS, marginBottom: GAP }}
            />
            <div
              className="skeleton-line"
              style={{ width: `${innerW * 0.55}px`, height: Math.max(8, h * 0.12), borderRadius: RADIUS }}
            />
          </div>
        </div>
        <div
          className="skeleton-line"
          style={{ width: '100%', height: Math.max(6, h * 0.1), borderRadius: RADIUS, marginTop: GAP }}
        />
      </div>
    );
  },

  /** N text lines filling available height */
  text: ({ w, h, lines = 1 }) => {
    const count    = Math.max(1, Math.min(lines, 8));
    const gaps     = (count - 1) * GAP;
    const lineH    = Math.max(8, (h - gaps) / count);
    return (
      <div className="skeleton-text-block">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="skeleton-line"
            style={{
              width: count > 1 && i === count - 1 ? `${w * 0.5}px` : '100%',
              height: lineH,
              borderRadius: RADIUS,
              marginBottom: i < count - 1 ? GAP : 0,
            }}
          />
        ))}
      </div>
    );
  },

  /** Perfect circle */
  circle: ({ w, h }) => {
    const size = Math.max(8, Math.min(w, h));
    return (
      <div
        className="skeleton-circle"
        style={{ width: size, height: size, borderRadius: '50%' }}
      />
    );
  },
};

/* ─── Auto-Sizing Skeleton ─── */

const Skeleton = ({ template = 'text', lines = 1, count = 1, className = '' }) => {
  const ref   = useRef(null);
  const [dims, setDims] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { offsetWidth, offsetHeight } = el;
      if (offsetWidth > 0 && offsetHeight > 0) {
        setDims({ w: offsetWidth, h: offsetHeight });
      }
    };

    // Synchronous measure — captures dimensions before first paint
    measure();

    // Observe parent for size changes (throttled via rAF)
    let rafId = null;
    const ro = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const shapeFn = TEMPLATES[template] || TEMPLATES.text;

  return (
    <div ref={ref} className={'skeleton' + (className ? ' ' + className : '')} aria-hidden="true">
      {dims ? (
        Array.from({ length: count }, (_, i) => (
          <div key={i} style={{ height: dims.h / Math.max(1, count) }}>
            {shapeFn({ w: dims.w, h: dims.h / Math.max(1, count), lines })}
          </div>
        ))
      ) : (
        /* Invisible space-fillers — maintain layout dimensions before first measure.
           The parent container (flex/grid) determines size, these empty flex-1 divs
           fill that space without causing layout shift. */
        Array.from({ length: count }, (_, i) => (
          <div key={i} className="skeleton-text-block" style={{ flex: 1 }} />
        ))
      )}
    </div>
  );
};

export default React.memo(Skeleton);
export const SkeletonCard    = React.memo((p) => <Skeleton template="card" {...p} />);
export const SkeletonProfile = React.memo((p) => <Skeleton template="profile" {...p} />);
export const SkeletonStat    = React.memo((p) => <Skeleton template="stat" {...p} />);
export const SkeletonCircle  = React.memo((p) => <Skeleton template="circle" {...p} />);
export const SkeletonText    = React.memo((p) => <Skeleton template="text" {...p} />);
export const SkeletonForm    = React.memo((p) => <Skeleton template="form" {...p} />);
