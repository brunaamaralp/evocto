import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  addDaysYmd,
  formatYmdBr,
  listYmdsInclusive,
  todayYmd,
} from '@/lib/businessDaysCore';

const DAY_PX_DESKTOP = 28;
const DAY_PX_MOBILE = 20;
const ROW_H = 40;

/**
 * Gantt leve por etapas (pointer drag, sem deps extras).
 * @param {{
 *   rows: Array<{ id: string, name: string, planned_start: string, planned_end: string, duration_business_days: number, status?: string, pct?: number }>,
 *   onMove: (id: string, planned_start: string, planned_end: string) => void,
 * }} props
 */
export default function StageGantt({ rows = [], onMove }) {
  const trackRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [dayPx, setDayPx] = useState(DAY_PX_DESKTOP);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setDayPx(mq.matches ? DAY_PX_MOBILE : DAY_PX_DESKTOP);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const range = useMemo(() => {
    if (!rows.length) {
      const t = todayYmd();
      return { from: t, to: addDaysYmd(t, 28) };
    }
    let from = rows[0].planned_start;
    let to = rows[0].planned_end;
    for (const r of rows) {
      if (r.planned_start < from) from = r.planned_start;
      if (r.planned_end > to) to = r.planned_end;
    }
    from = addDaysYmd(from, -3);
    to = addDaysYmd(to, 7);
    return { from, to };
  }, [rows]);

  const days = useMemo(() => listYmdsInclusive(range.from, range.to), [range]);
  const today = todayYmd();

  const xForYmd = useCallback(
    (ymd) => {
      const idx = days.indexOf(String(ymd).slice(0, 10));
      return idx < 0 ? 0 : idx * dayPx;
    },
    [days, dayPx]
  );

  const beginDrag = (e, row, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    setDrag({
      id: row.id,
      mode,
      originX: e.clientX - rect.left + track.scrollLeft,
      start: row.planned_start,
      end: row.planned_end,
    });
  };

  const onPointerMove = (e) => {
    if (!drag || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + trackRef.current.scrollLeft;
    const deltaDays = Math.round((x - drag.originX) / dayPx);

    let start = drag.start;
    let end = drag.end;
    if (drag.mode === 'move') {
      start = addDaysYmd(drag.start, deltaDays);
      end = addDaysYmd(drag.end, deltaDays);
    } else if (drag.mode === 'start') {
      start = addDaysYmd(drag.start, deltaDays);
      if (start > end) start = end;
    } else if (drag.mode === 'end') {
      end = addDaysYmd(drag.end, deltaDays);
      if (end < start) end = start;
    }

    setDrag((prev) => (prev ? { ...prev, previewStart: start, previewEnd: end } : null));
  };

  const endDrag = () => {
    if (!drag) return;
    const start = drag.previewStart || drag.start;
    const end = drag.previewEnd || drag.end;
    if (start !== drag.start || end !== drag.end) {
      onMove?.(drag.id, start, end);
    }
    setDrag(null);
  };

  if (!rows.length) {
    return <p className="text-sm text-slate-500">Sem etapas no cronograma.</p>;
  }

  return (
    <div
      className="stage-gantt border border-slate-200 rounded-lg overflow-hidden bg-white"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div className="flex">
        <div className="w-28 sm:w-44 shrink-0 border-r border-slate-200 bg-slate-50">
          <div className="h-8 border-b border-slate-200 px-2 flex items-center text-[11px] font-medium text-slate-500">
            Etapa
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="px-2 flex flex-col justify-center border-b border-slate-100"
              style={{ height: ROW_H }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {r.weekLabel && (
                  <span className="text-[10px] font-bold text-teal-700 shrink-0">{r.weekLabel}</span>
                )}
                <span className="text-xs font-medium text-slate-800 truncate">{r.name}</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {r.duration_business_days}d úteis
                {typeof r.pct === 'number' ? ` · ${r.pct}%` : ''}
              </span>
            </div>
          ))}
        </div>

        <div
          className="flex-1 overflow-x-auto overscroll-x-contain"
          ref={trackRef}
          style={{ touchAction: drag ? 'none' : 'pan-x' }}
        >
          <div style={{ width: days.length * dayPx, position: 'relative' }}>
            {rows.some((r) => r.weekLabel && r.planned_start && r.planned_end) && (
              <div className="h-6 border-b border-slate-200 relative sticky top-0 bg-slate-50 z-20">
                {rows.map((r) => {
                  if (!r.planned_start || !r.planned_end) return null;
                  const left = xForYmd(r.planned_start);
                  const startIdx = days.indexOf(r.planned_start);
                  const endIdx = days.indexOf(r.planned_end);
                  const width =
                    startIdx >= 0 && endIdx >= 0
                      ? Math.max(dayPx, (endIdx - startIdx + 1) * dayPx)
                      : dayPx;
                  return (
                    <div
                      key={`weekband-${r.id}`}
                      className="absolute h-6 flex items-center justify-center text-[10px] font-semibold text-teal-800 bg-teal-50 border-r border-teal-100"
                      style={{ left, width }}
                      title={`${r.weekLabel} · ${r.name}`}
                    >
                      {r.weekLabel}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="h-8 border-b border-slate-200 flex sticky top-0 bg-white z-10">
              {days.map((ymd) => {
                const d = new Date(`${ymd}T12:00:00`);
                const isToday = ymd === today;
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={ymd}
                    className={`shrink-0 text-center border-r border-slate-100 text-[9px] leading-8 ${
                      isToday ? 'bg-blue-50 text-blue-700 font-semibold' : weekend ? 'bg-slate-50 text-slate-400' : 'text-slate-500'
                    }`}
                    style={{ width: dayPx }}
                    title={formatYmdBr(ymd)}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {rows.map((r) => {
              const isDragging = drag?.id === r.id;
              const start = isDragging && drag.previewStart ? drag.previewStart : r.planned_start;
              const end = isDragging && drag.previewEnd ? drag.previewEnd : r.planned_end;
              const left = xForYmd(start);
              const startIdx = days.indexOf(start);
              const endIdx = days.indexOf(end);
              const calWidth =
                startIdx >= 0 && endIdx >= startIdx
                  ? (endIdx - startIdx + 1) * dayPx
                  : dayPx;

              return (
                <div
                  key={r.id}
                  className="relative border-b border-slate-100"
                  style={{ height: ROW_H }}
                >
                  {days.map((ymd, i) => {
                    const d = new Date(`${ymd}T12:00:00`);
                    if (d.getDay() !== 0 && d.getDay() !== 6) return null;
                    return (
                      <div
                        key={`w-${ymd}`}
                        className="absolute top-0 bottom-0 bg-slate-50/80 pointer-events-none"
                        style={{ left: i * dayPx, width: dayPx }}
                      />
                    );
                  })}
                  {days.includes(today) ? (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-blue-400 pointer-events-none z-[1]"
                      style={{ left: xForYmd(today) + dayPx / 2 }}
                    />
                  ) : null}
                  <div
                    className={`absolute top-2 h-6 rounded-md bg-slate-700 text-white text-[10px] flex items-center select-none touch-none ${
                      isDragging ? 'opacity-90 ring-2 ring-blue-400' : 'hover:bg-slate-800'
                    }`}
                    style={{ left, width: calWidth, cursor: 'grab' }}
                    onPointerDown={(e) => beginDrag(e, r, 'move')}
                    title={`${formatYmdBr(start)} → ${formatYmdBr(end)}`}
                  >
                    <span
                      className="absolute left-0 top-0 bottom-0 w-2.5 sm:w-1.5 cursor-ew-resize rounded-l-md bg-slate-500/50"
                      onPointerDown={(e) => beginDrag(e, r, 'start')}
                    />
                    <span className="px-2 truncate pointer-events-none">{r.name}</span>
                    <span
                      className="absolute right-0 top-0 bottom-0 w-2.5 sm:w-1.5 cursor-ew-resize rounded-r-md bg-slate-500/50"
                      onPointerDown={(e) => beginDrag(e, r, 'end')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 px-3 py-2 border-t border-slate-100">
        Arraste a barra para mover · handles nas bordas para redimensionar · fim de semana não conta na
        duração útil (cascade desligado no drag).
      </p>
    </div>
  );
}
