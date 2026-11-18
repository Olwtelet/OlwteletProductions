'use client';
// Complexity slider of the contact form — original components (chunk 665 module 95192):
//   `tr` SliderTrackSvg (memo): dotted ruler + 3 primary ticks, viewBox `0 0 (w+1) 16`
//   `td` Slider (memo): track + thumb area (role=slider, NO tabIndex in the original → not keyboard-focusable;
//        the keydown handler is therefore unreachable, kept as shipped), drag with window mouse/touch listeners,
//        release snaps to Math.round(map(x,0,100,min,max)); thumb transform `translateX(<0..100>%)` with
//        `transition: transform 600ms ease` on value change and `unset` while dragging.
//   `tx` ContactFormSlider: slider + aria-hidden row of label buttons (click = set value).
// Quirk kept: the ruler width is read from the track ref DURING RENDER (`ref.current?.clientWidth`), so it is 0 on
// the very first render and only follows the track size on later re-renders (the original never observes resizes).
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type TouchEvent } from 'react';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import styles from './contactForm.module.css';

/** module 7755 `qE` (clamp) and `my` (linear map) */
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const mapRange = (v: number, a: number, b: number, c: number, d: number) => ((v - a) * (d - c)) / (b - a) + c;

type Theme = 'primary' | 'inverted';

interface TrackSvgProps {
  theme: Theme;
  activeIndex: number;
  numberOfStops: number;
  width?: number;
  verticalPadding?: number;
  height?: number;
  primaryMarkingWidth?: number;
  secondaryMarkingWidth?: number;
  secondaryMarkingHeight?: number;
  markingsTargetSpacing?: number;
}

const TrackSvg = memo(function TrackSvg({
  theme,
  activeIndex,
  numberOfStops,
  width = 0,
  verticalPadding = 4,
  height = 8,
  primaryMarkingWidth = 1,
  secondaryMarkingWidth = 1,
  secondaryMarkingHeight = 1,
  markingsTargetSpacing = 6,
}: TrackSvgProps) {
  const stops = Array(numberOfStops).fill(null);
  const secondary = useMemo(() => {
    const count = Math.floor(width / markingsTargetSpacing);
    const step = width / count;
    return Array(count)
      .fill(0)
      .map((_, i) => i * step);
  }, [width, markingsTargetSpacing]);
  const h = height + 2 * verticalPadding;
  return (
    <svg className={styles.SvgWrapper} style={{ width: '100%', height: h }} viewBox={`0 0 ${width + primaryMarkingWidth} ${h}`}>
      {secondary.map((x) => (
        <rect
          key={x}
          className={cx(styles.SecondaryMarking, theme === 'primary' ? styles.SecondaryMarking_PrimaryTheme : styles.SecondaryMarking_InvertedTheme)}
          width={secondaryMarkingWidth}
          height={secondaryMarkingHeight}
          x={x}
          y={verticalPadding + height / 2 - secondaryMarkingHeight / 2}
        />
      ))}
      {stops.map((_, i) => (
        <rect
          key={i}
          className={cx(
            styles.PrimaryMarking,
            theme === 'primary' ? styles.PrimaryMarking_PrimaryTheme : styles.PrimaryMarking_InvertedTheme,
            activeIndex === i && styles.PrimaryMarking_Active,
          )}
          width={primaryMarkingWidth}
          height={height}
          x={(i * width) / (numberOfStops - 1)}
          y={verticalPadding}
        />
      ))}
    </svg>
  );
});

const TRANSITION_FAST = 'unset';
const TRANSITION_SLOW = 'transform 600ms ease';

interface SliderProps {
  min?: number;
  max: number;
  value: number;
  setValue: (v: number) => void;
  labelledBy: string;
  valueLabels?: string[];
  theme?: Theme;
}

type PointerLike = { clientX: number };
const pointX = (e: MouseEvent | TouchEvent | globalThis.MouseEvent | globalThis.TouchEvent, changed = false): number =>
  'touches' in e ? (changed ? e.changedTouches[0] : e.touches[0]).clientX : (e as PointerLike).clientX;

export const Slider = memo(function Slider({ min = 0, max, value, setValue, labelledBy, valueLabels, theme = 'primary' }: SliderProps) {
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const [sliding, setSliding] = useState(false);

  function percentAt(clientX: number) {
    if (!track.current) throw Error('ref not assigned');
    const left = track.current.getBoundingClientRect().left;
    const w = track.current.clientWidth;
    return mapRange(clamp(clientX - left, 0, w), 0, w, 0, 100);
  }

  const commit = useCallback((pct: number) => setValue(Math.round(mapRange(pct, 0, 100, min, max))), [max, min, setValue]);

  const moveTo = useCallback(
    (clientX: number) => {
      if (!thumb.current) return;
      const pct = percentAt(clientX);
      commit(pct);
      thumb.current.style.transform = `translateX(${pct}%)`;
      thumb.current.style.transition = TRANSITION_FAST;
    },
    [commit],
  );

  const onMove = useCallback(
    (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      e.preventDefault();
      if (sliding && thumb.current) moveTo(pointX(e));
    },
    [moveTo, sliding],
  );

  const onUp = useCallback(
    (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (!sliding) return;
      commit(percentAt(pointX(e, true)));
      setSliding(false);
    },
    [sliding, commit],
  );

  useEffect(() => {
    if (sliding || !thumb.current) return;
    const pct = mapRange(value, min, max, 0, 100);
    thumb.current.style.transform = `translateX(${pct}%)`;
    thumb.current.style.transition = TRANSITION_SLOW;
  }, [value, min, max, sliding]);

  useEffect(() => {
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchmove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchmove', onMove);
    };
  }, [onMove, onUp]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          setValue(Math.min(max, value + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          setValue(Math.max(min, value - 1));
          break;
        case 'Home':
          setValue(min);
          break;
        case 'End':
          setValue(max);
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [max, min, setValue, value],
  );

  const onDown = (e: MouseEvent | TouchEvent) => {
    setSliding(true);
    moveTo(pointX(e));
  };

  return (
    <div className={styles.Track} ref={track} onMouseDown={onDown} onTouchStart={onDown}>
      <TrackSvg numberOfStops={3} theme={theme} activeIndex={value} width={track.current?.clientWidth} />
      <div
        ref={thumb}
        className={cx(styles.ThumbArea, sliding && styles.ThumbArea_Sliding)}
        onMouseDown={onDown}
        onTouchStart={onDown}
        onKeyDown={onKeyDown}
        aria-labelledby={labelledBy}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueLabels && valueLabels[value]}
        role="slider"
      >
        <div className={styles.Thumb} />
      </div>
    </div>
  );
});

export function ContactFormSlider({
  labelledBy,
  labels,
  tabIndex,
  value,
  setValue,
}: {
  labelledBy: string;
  labels: string[];
  tabIndex: number;
  value: number;
  setValue: (v: number) => void;
}) {
  return (
    <div className={styles.ContactFormSlider}>
      <Slider max={labels.length - 1} labelledBy={labelledBy} valueLabels={labels} value={value} setValue={setValue} />
      <div className={styles.ContactFormSliderLabels} aria-hidden>
        {labels.map((l, i) => (
          <button key={i} className={cx(styles.SliderLabel, typography.MonoDetail)} onClick={() => setValue(i)} type="button" tabIndex={tabIndex}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
