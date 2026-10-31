/**
 * framer-motion presets (docs/DESIGN.md section 6).
 *
 * Motion should feel like a page turning, not a toy bouncing: nothing over 220ms, no springs
 * with bounce, no infinite animation outside the skeleton.
 *
 * prefers-reduced-motion is read once at module load. A viewer who changes the OS setting
 * mid-session gets the new behaviour on the next reload, which is an acceptable trade for
 * not re-rendering every animated component on a media query change.
 */
const reduce =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const instant = { duration: 0 };

/** Route transitions: fade plus an 8px rise, 180ms ease-out. */
export const fadeRise = reduce
  ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: instant }
  : {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -4 },
      transition: { duration: 0.18, ease: 'easeOut' },
    };

/** Modal panel: a 2% scale-up, 200ms. */
export const modalPanel = reduce
  ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: instant }
  : {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.98 },
      transition: { duration: 0.2, ease: 'easeOut' },
    };

export const backdrop = reduce
  ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: instant }
  : {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2, ease: 'easeOut' },
    };

/** Drawer: slides in from the right on desktop, up from the bottom on a phone. */
export const drawerPanel = (fromBottom = false) => {
  if (reduce) {
    return { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: instant };
  }
  const axis = fromBottom ? 'y' : 'x';
  return {
    initial: { [axis]: '100%' },
    animate: { [axis]: 0 },
    exit: { [axis]: '100%' },
    transition: { duration: 0.2, ease: 'easeOut' },
  };
};

/** List rows: fade plus a 4px rise, staggered 30ms, first 12 items only. */
export const listContainer = reduce
  ? {}
  : { animate: { transition: { staggerChildren: 0.03 } } };

export const listItem = reduce
  ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
  : {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.15, ease: 'easeOut' },
    };

/** Toast and dropdown: a short slide plus fade. */
export const popIn = reduce
  ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: instant }
  : {
      initial: { opacity: 0, y: -4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -4 },
      transition: { duration: 0.15, ease: 'easeOut' },
    };

/** True when the viewer asked for reduced motion, for components that need to branch. */
export const prefersReducedMotion = reduce;

/** Only the first N list items animate; the rest appear immediately. */
export const STAGGER_LIMIT = 12;
