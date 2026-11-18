// Olwtelet: the visitor's sound choice. Written only when the visitor uses the Sound toggle; with no saved choice
// (or storage unavailable: private mode, blocked site data) sound is ON. A functional preference, not tracking.
export const SOUND_PREF_KEY = 'olwtelet:sound';

export type SoundPref = 'on' | 'off';

export function readSoundPref(): SoundPref | null {
  try {
    const v = localStorage.getItem(SOUND_PREF_KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

export function writeSoundPref(on: boolean) {
  try {
    localStorage.setItem(SOUND_PREF_KEY, on ? 'on' : 'off');
  } catch {}
}
