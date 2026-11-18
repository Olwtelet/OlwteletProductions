'use client';
// Header clock — original chunk 3764 (loaded by the header through next/dynamic with ssr:false, so it is absent
// from the SSR HTML and mounts a little after the rest of the header). Olwtelet Productions: one row,
// "Brasília, BR" + local time; the dot blinks in daytime (08–18 h there), the moon shows at night.
// Strings start empty and are filled by the mount effect; refresh every 60 s from mount (not minute-aligned).
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CHROME_DELAY } from '@/components/ui/motion';
import { typography } from '@/components/ui/typography';
import { cx } from '@/lib/cx';
import { EASE_UO } from '@/lib/easings';
import { CLOCK_REFRESH_MS, CLOCKS, formatClock, isDaytime } from '@/lib/time';
import s from './timezones.module.css';

/** Inner moon (verbatim `<svg id="moon" fill="var(--color-primary)" viewBox="0 0 8 8">` with a 30 % crescent). */
function MoonSvg() {
  return (
    <svg id="moon" fill="var(--color-primary)" viewBox="0 0 8 8">
      <path
        opacity=".3"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.644.723a.133.133 0 0 0-.17-.175A3.84 3.84 0 0 0 0 4.14C0 6.27 1.73 8 3.86 8a3.84 3.84 0 0 0 3.592-2.474.133.133 0 0 0-.175-.17 3.371 3.371 0 0 1-1.288.248 3.595 3.595 0 0 1-3.593-3.593c0-.455.084-.89.248-1.288Z"
      />
    </svg>
  );
}

const Dot = () => (
  <svg className={cx(s.TimezoneIcon, s.TimezoneIcon_Dot)} role="presentation" aria-hidden="true">
    <circle cx="4" cy="4" r="4" />
  </svg>
);
const Moon = () => (
  <svg className={cx(s.TimezoneIcon, s.TimezoneIcon_Moon)} role="presentation" aria-hidden="true">
    <MoonSvg />
  </svg>
);

export default function Timezones() {
  const [time, setTime] = useState('');
  const [day, setDay] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const tick = () => {
      const t = formatClock(new Date(), CLOCKS[0].timeZone);
      setTime(t);
      setDay(isDaytime(t));
    };
    tick();
    const id = setInterval(tick, CLOCK_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div className={s.Timezones} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: CHROME_DELAY, ease: EASE_UO }}>
      <div className={s.Timezone}>
        <div className={cx(s.TimezonesLabel, typography.MonoDetail)}>
          {day === false ? <Moon /> : <Dot />}
          {CLOCKS[0].label}
        </div>
        <div className={typography.MonoDetail}>{time}</div>
      </div>
    </motion.div>
  );
}
