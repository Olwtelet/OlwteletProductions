// Olwtelet: the four Processo diagrams (ProcessSteps.tsx). One system for all four, so they read as a family:
//   - viewBox 520 × 360, a 40-unit construction grid, 1 px lines (non-scaling), dots of the site's Label bullet;
//   - three inputs enter at y = 90 / 180 / 270, level with the three mono labels set beside the drawing
//     (processSteps.module.css places them at 25 / 50 / 75 % of the height);
//   - colours are currentColor (the page's ink) and var(--color-secondary) (its paper), so they follow the page theme.
// Each drawing tells its step, and the Olwtelet mark moves from sketch to finished object along the way:
//   01 Ideia         the project's scope (dashed frame) and the mark only as a light outline: defined before formed;
//   02 Investigação  references / needs / constraints converge, three possibilities branch out, one is chosen;
//   03 Construção    content / interaction / technology as connected layers that hold the mark up;
//   04 Refinamento   test → review → adjust as a cycle; the finished mark with its adjusted piece and a ghost of before.
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

function Ideia() {
  const h = 280;
  const w = h * MARK_RATIO;
  return (
    <>
      <Grid />
      <rect className={`${s.DMuted} ${s.DDashed}`} x={140} y={20} width={320} height={320} />
      <Mark h={h} x={300 - w / 2} y={40} faceClass={() => s.DSketch} />
      {Y.map((y, i) => (
        <Lead key={i} i={i} x={140} y={y} />
      ))}
    </>
  );
}

function Wireframe({ y, chosen }: { y: number; chosen: boolean }) {
  const cls = chosen ? s.DLine : `${s.DMuted} ${s.DDashed}`;
  return (
    <g className={cls}>
      <path d={`M220 180 C 290 180, 290 ${y}, 340 ${y}`} />
      <rect x={340} y={y - 40} width={150} height={80} />
      <line x1={352} y1={y - 26} x2={420} y2={y - 26} />
      <line x1={352} y1={y - 12} x2={400} y2={y - 12} />
      <rect x={352} y={y} width={60} height={28} />
      <rect x={420} y={y} width={58} height={28} />
    </g>
  );
}

function Investigacao() {
  return (
    <>
      <Grid />
      {Y.map((y, i) => (
        <path key={i} className={s.DLine} d={`M0 ${y} C 120 ${y}, 130 180, 220 180`} />
      ))}
      <Dot x={220} y={180} r={6.5} />
      <Wireframe y={70} chosen={false} />
      <Wireframe y={290} chosen={false} />
      <Wireframe y={180} chosen />
      <Dot x={340} y={180} />
    </>
  );
}

function Construcao() {
  const cx = 320;
  const hw = 150;
  const hh = 42;
  const plate = (y: number) => `M${cx - hw} ${y} L${cx} ${y - hh} L${cx + hw} ${y} L${cx} ${y + hh} Z`;
  const h = 96;
  const w = h * MARK_RATIO;
  return (
    <>
      <Grid />
      {[cx - hw, cx + hw].map((x) => (
        <line key={x} className={`${s.DLine} ${s.DDashed}`} x1={x} y1={Y[0]} x2={x} y2={Y[2]} />
      ))}
      {[Y[2], Y[1], Y[0]].map((y) => (
        <path key={y} className={s.DPaper} d={plate(y)} />
      ))}
      {Y.map((y, i) => (
        <g key={i}>
          <Lead i={i} x={cx - hw} y={y} />
          <Dot x={cx + hw} y={y} r={3.5} />
        </g>
      ))}
      <Mark h={h} x={cx - w / 2} y={Y[0] - h + 14} faceClass={() => s.DSolid} />
    </>
  );
}

function Refinamento() {
  const nx = 70;
  const h = 230;
  const k = h / MARK_VIEWBOX.height;
  const x = 262;
  const y = (VH - h) / 2;
  // end of the crossbar's side face: where the adjustment tick sits
  const bx = x + MARK_VIEWBOX.width * k;
  const by = y + 699 * k;
  return (
    <>
      <Grid />
      <line className={s.DLine} x1={nx} y1={Y[0]} x2={nx} y2={Y[2]} />
      <path className={`${s.DLine} ${s.DDashed}`} d={`M${nx} ${Y[2]} C ${nx + 70} ${Y[2]}, ${nx + 70} ${Y[0]}, ${nx} ${Y[0]}`} />
      {Y.map((yy, i) => (
        <g key={i}>
          <line className={s.DLine} x1={0} y1={yy} x2={nx} y2={yy} />
          <Dot x={nx} y={yy} />
        </g>
      ))}
      <line className={s.DLine} x1={nx + 53} y1={Y[1]} x2={x - 18} y2={Y[1]} />
      {/* before: the crossbar where it was (dashed ghost), then the finished mark, its adjusted piece solid */}
      <g transform="translate(14 -10)">
        <Mark h={h} x={x} y={y} only={BAR} faceClass={() => `${s.DMuted} ${s.DDashed}`} />
      </g>
      <Mark h={h} x={x} y={y} faceClass={(f) => (BAR.includes(f) ? s.DSolid : s.DPaper)} />
      <g className={s.DLine}>
        <line x1={bx + 6} y1={by} x2={bx + 22} y2={by - 12} />
        <line x1={bx + 2} y1={by - 4} x2={bx + 10} y2={by + 4} />
        <line x1={bx + 18} y1={by - 16} x2={bx + 26} y2={by - 8} />
      </g>
    </>
  );
}

const DRAWINGS: Record<ProcessDiagramKind, () => JSX.Element> = {
  ideia: Ideia,
  investigacao: Investigacao,
  construcao: Construcao,
  refinamento: Refinamento,
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
