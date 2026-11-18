// Olwtelet: the Processo diagrams (ProcessSteps.tsx), one per step. One system for all of them, so they read as a family:
//   - viewBox 520 × 360, a 40-unit construction grid, 1 px lines (non-scaling), dots of the site's Label bullet;
//   - three labels set beside the drawing at 25 / 50 / 75 % of its height (processSteps.module.css), each with a leader
//     entering the drawing at y = 90 / 180 / 270;
//   - colours are currentColor (the page's ink) and var(--color-secondary) (its paper), so they follow the page theme.
// The owner's process: a project is born from an epiphany; when it proves promising, the idea goes into analysis and
// development. Each drawing tells its step, and the Olwtelet mark goes from sketch to finished object along the way:
//   01 Epifania         among faint ideas, one bursts out: the epiphany, and the mark appears beside it, only sketched;
//   02 Análise          the epiphany meets a decision: the promising way goes on to the mark, now outlined and measured
//                       (dimension lines); the other way stops (not every epiphany becomes a project);
//   03 Desenvolvimento  the finished mark and what the idea becomes: software, a game, a web application (the kinds of
//                       project the Estúdio page names).
// Decorative: the figure is aria-hidden in ProcessSteps (every word in it is in the step's text).
import type { JSX } from 'react';
import { MARK_FACES, MARK_VIEWBOX } from '@/content/brand-mark';
import type { ProcessDiagramKind } from './types';
import s from './processSteps.module.css';

const VW = 520;
const VH = 360;
const Y = [90, 180, 270] as const;
type Face = keyof typeof MARK_FACES;
const BAR: Face[] = ['crossbarTop', 'crossbarFront', 'sideFace'];
const MARK_RATIO = MARK_VIEWBOX.width / MARK_VIEWBOX.height;

function Grid() {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = 40; x < VW; x += 40) xs.push(x);
  for (let y = 40; y < VH; y += 40) ys.push(y);
  return (
    <g className={s.DGrid}>
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} y1={0} x2={x} y2={VH} />
      ))}
      {ys.map((y) => (
        <line key={`y${y}`} x1={0} y1={y} x2={VW} y2={y} />
      ))}
    </g>
  );
}

const Dot = ({ x, y, r = 4.5 }: { x: number; y: number; r?: number }) => <circle className={s.DDot} cx={x} cy={y} r={r} />;

/** a label's leader: from the left edge at its height, then into the drawing at (x, y) */
function Lead({ i, x, y }: { i: number; x: number; y: number }) {
  return (
    <>
      <path className={s.DLine} d={`M0 ${Y[i]} L${x - 30} ${Y[i]} L${x} ${y}`} />
      <Dot x={x} y={y} />
    </>
  );
}

/** the mark at height h with its top-left corner at (x, y); `faceClass` per face */
function Mark({ h, x, y, faceClass, only }: { h: number; x: number; y: number; faceClass: (f: Face) => string; only?: Face[] }) {
  const k = h / MARK_VIEWBOX.height;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      {(Object.keys(MARK_FACES) as Face[])
        .filter((f) => !only || only.includes(f))
        .map((f) => (
          <path key={f} className={faceClass(f)} d={MARK_FACES[f]} />
        ))}
    </g>
  );
}

/** the left edge of the mark (its slab) at height `atY`, for a mark of height h placed at (x, y): where a leader meets it */
function markLeft(h: number, x: number, y: number, atY: number) {
  // the slab's outer edge runs from the apex (143.8, 0) to the foot (0, 872.1) of the mark's own box
  const v = ((atY - y) / h) * MARK_VIEWBOX.height;
  const u = 143.8 - (143.8 / 872.1) * Math.min(Math.max(v, 0), 872.1);
  return x + (u / MARK_VIEWBOX.width) * h * MARK_RATIO;
}

/** an epiphany: a point and its rays (none horizontal, so a leader can reach the point between them) */
function Burst({ x, y, inner, outer, r = 6.5 }: { x: number; y: number; inner: number; outer: number; r?: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => ((i + 0.5) * Math.PI) / 4);
  return (
    <>
      <g className={s.DLine}>
        {rays.map((a, i) => (
          <line key={i} x1={x + inner * Math.cos(a)} y1={y + inner * Math.sin(a)} x2={x + outer * Math.cos(a)} y2={y + outer * Math.sin(a)} />
        ))}
      </g>
      <Dot x={x} y={y} r={r} />
    </>
  );
}

function Epifania() {
  const h = 250;
  const mx = 290;
  const my = (VH - h) / 2;
  const bx = 210;
  const by = Y[1];
  // faint ideas around the one that bursts out (none on a leader's way)
  const ideas: [number, number][] = [
    [80, 40],
    [160, 70],
    [60, 140],
    [130, 130],
    [150, 230],
    [70, 220],
    [110, 310],
    [200, 300],
  ];
  return (
    <>
      <Grid />
      {ideas.map(([x, y]) => (
        <circle key={`${x}-${y}`} className={s.DMuted} cx={x} cy={y} r={5} />
      ))}
      <Lead i={0} x={110} y={Y[0]} />
      <path className={`${s.DMuted} ${s.DDashed}`} d={`M${110 + 8} ${Y[0] + 6} C 160 ${Y[0] + 40}, ${bx - 40} ${by - 30}, ${bx - 12} ${by - 12}`} />
      <Burst x={bx} y={by} inner={14} outer={34} />
      <Lead i={1} x={bx} y={by} />
      <path className={`${s.DMuted} ${s.DDashed}`} d={`M${bx + 40} ${by} L${markLeft(h, mx, my, by) - 10} ${by}`} />
      <Mark h={h} x={mx} y={my} faceClass={() => s.DSketch} />
      <Lead i={2} x={markLeft(h, mx, my, Y[2])} y={Y[2]} />
    </>
  );
}

function Analise() {
  const h = 230;
  const w = h * MARK_RATIO;
  const mx = 300;
  const my = 65;
  const bx = 110;
  const dx = 220;
  const dy = Y[1];
  const d = 22; // the decision's half diagonal
  const ex = mx + w + 18; // the vertical dimension line
  const ey = my + h + 22; // the horizontal one
  const tick = 6;
  return (
    <>
      <Grid />
      {/* the epiphany, smaller now, and its way to the decision */}
      <Burst x={bx} y={Y[0]} inner={10} outer={22} r={5.5} />
      <Lead i={0} x={bx} y={Y[0]} />
      <path className={s.DLine} d={`M${bx + 24} ${Y[0] + 10} C ${dx - 40} ${Y[0] + 10}, ${dx} ${dy - d - 40}, ${dx} ${dy - d}`} />
      {/* the decision: promising or not */}
      <path className={s.DLine} d={`M${dx} ${dy - d} L${dx + d} ${dy} L${dx} ${dy + d} L${dx - d} ${dy} Z`} />
      <Lead i={1} x={dx - d} y={dy} />
      {/* not every epiphany goes on: that way stops */}
      <path className={`${s.DMuted} ${s.DDashed}`} d={`M${dx} ${dy + d} L${dx} ${dy + 60}`} />
      <line className={s.DMuted} x1={dx - 10} y1={dy + 60} x2={dx + 10} y2={dy + 60} />
      {/* the promising one: into analysis */}
      <line className={s.DLine} x1={dx + d} y1={dy} x2={markLeft(h, mx, my, dy) - 4} y2={dy} />
      <Dot x={markLeft(h, mx, my, dy) - 4} y={dy} r={3.5} />
      <Mark h={h} x={mx} y={my} faceClass={() => s.DLine} />
      {/* measured: height and width */}
      <g className={s.DLine}>
        <line x1={ex} y1={my} x2={ex} y2={my + h} />
        <line x1={ex - tick} y1={my} x2={ex + tick} y2={my} />
        <line x1={ex - tick} y1={my + h} x2={ex + tick} y2={my + h} />
        <line x1={mx} y1={ey} x2={mx + w} y2={ey} />
        <line x1={mx} y1={ey - tick} x2={mx} y2={ey + tick} />
        <line x1={mx + w} y1={ey - tick} x2={mx + w} y2={ey + tick} />
      </g>
      <Lead i={2} x={markLeft(h, mx, my, Y[2])} y={Y[2]} />
    </>
  );
}

function Desenvolvimento() {
  const h = 250;
  const mx = 300;
  const my = (VH - h) / 2;
  const gx = 150; // the centre of the three outcomes
  const gw = 70;
  const gh = 44;
  const left = gx - gw / 2;
  const right = gx + gw / 2;
  const board = 48; // the game's 3 × 3 board
  const cell = board / 3;
  const into = markLeft(h, mx, my, Y[1]) - 4;
  return (
    <>
      <Grid />
      {/* software: a terminal window and its prompt */}
      <g className={s.DLine}>
        <rect x={left} y={Y[0] - gh / 2} width={gw} height={gh} />
        <path d={`M${left + 12} ${Y[0] - 8} L${left + 20} ${Y[0]} L${left + 12} ${Y[0] + 8}`} />
        <line x1={left + 26} y1={Y[0] + 8} x2={left + 40} y2={Y[0] + 8} />
      </g>
      {/* a game: a board with its squares */}
      <g className={s.DLine}>
        <rect x={gx - board / 2} y={Y[1] - board / 2} width={board} height={board} />
      </g>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2]
          .filter((c) => (r + c) % 2 === 0)
          .map((c) => <rect key={`${r}${c}`} className={s.DSolid} x={gx - board / 2 + c * cell} y={Y[1] - board / 2 + r * cell} width={cell} height={cell} />),
      )}
      {/* a web application: a browser window */}
      <g className={s.DLine}>
        <rect x={left} y={Y[2] - gh / 2} width={gw} height={gh} />
        <line x1={left} y1={Y[2] - gh / 2 + 11} x2={right} y2={Y[2] - gh / 2 + 11} />
      </g>
      {[0, 1, 2].map((i) => (
        <Dot key={i} x={left + 7 + i * 7} y={Y[2] - gh / 2 + 5.5} r={1.8} />
      ))}
      <Lead i={0} x={left} y={Y[0]} />
      <Lead i={1} x={gx - board / 2} y={Y[1]} />
      <Lead i={2} x={left} y={Y[2]} />
      {/* the three come from the finished mark */}
      <g className={s.DLine}>
        <path d={`M${right} ${Y[0]} C ${right + 50} ${Y[0]}, ${into - 50} ${Y[1]}, ${into} ${Y[1]}`} />
        <line x1={gx + board / 2} y1={Y[1]} x2={into} y2={Y[1]} />
        <path d={`M${right} ${Y[2]} C ${right + 50} ${Y[2]}, ${into - 50} ${Y[1]}, ${into} ${Y[1]}`} />
      </g>
      <Dot x={into} y={Y[1]} r={3.5} />
      <Mark h={h} x={mx} y={my} faceClass={(f) => (BAR.includes(f) ? s.DSolid : s.DPaper)} />
    </>
  );
}

const DRAWINGS: Record<ProcessDiagramKind, () => JSX.Element> = {
  epifania: Epifania,
  analise: Analise,
  desenvolvimento: Desenvolvimento,
};

export function ProcessDiagram({ kind, className }: { kind: ProcessDiagramKind; className?: string }) {
  const Drawing = DRAWINGS[kind];
  if (!Drawing) return null;
  return (
    <svg className={className} viewBox={`0 0 ${VW} ${VH}`} focusable="false" aria-hidden="true">
      <Drawing />
    </svg>
  );
}

export default ProcessDiagram;
