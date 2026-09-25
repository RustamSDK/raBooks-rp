import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import gsap from 'gsap';
import { useLedger } from '../../db/repository-context';
import { CanonicalTransaction } from '../../core/models/transaction';
import { formatPaiseToInr, formatCompactPaise } from '../../core/formatters/currency';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  X,
  Building2,
  Maximize2,
  Minimize2,
  Activity,
  Layers,
} from 'lucide-react';

interface BalanceTrendChartProps {
  selectedPartyId: string | null;
  onSelectParty: (partyId: string | null) => void;
}

interface TrendPoint {
  id: string;
  date: Date;
  dateStr: string;
  balancePaise: number;
  deltaPaise: number;
  type: 'GIVEN' | 'TAKEN' | 'BASELINE';
  partyName: string;
  notes: string;
  referenceId?: string;
  splitsSummary: string;
}

type TimeHorizon = '30D' | '90D' | '1Y' | 'ALL';

export const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({
  selectedPartyId,
  onSelectParty,
}) => {
  const { transactions, parties } = useLedger();

  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('ALL');
  const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 260 });

  // Handle responsive resize with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({
            width,
            height: isExpanded ? 380 : 250,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isExpanded]);

  // Selected party object
  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Process and sort transactions chronologically
  const chronologicalData = useMemo(() => {
    // 1. Filter by party if selected
    const partyFiltered = transactions.filter((t) => {
      if (t.status !== 'Confirmed') return false;
      if (selectedPartyId && t.partyId !== selectedPartyId) return false;
      return true;
    });

    if (partyFiltered.length === 0) {
      return [];
    }

    // 2. Filter by time horizon
    const now = new Date();
    const horizonFiltered = partyFiltered.filter((t) => {
      if (timeHorizon === 'ALL') return true;
      const txnDate = new Date(t.date);
      const diffDays = (now.getTime() - txnDate.getTime()) / (1000 * 3600 * 24);
      if (timeHorizon === '30D') return diffDays <= 30;
      if (timeHorizon === '90D') return diffDays <= 90;
      if (timeHorizon === '1Y') return diffDays <= 365;
      return true;
    });

    // 3. Sort ascending by date
    const sorted = [...horizonFiltered].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sorted.length === 0) {
      return [];
    }

    const partyMap = new Map(parties.map((p) => [p.id, p.name]));

    // 4. Calculate cumulative running balance
    let currentBalancePaise = 0;
    const points: TrendPoint[] = [];

    // Optional: Prepend baseline zero point 1 day before earliest transaction
    const firstDate = new Date(sorted[0].date);
    const baselineDate = new Date(firstDate);
    baselineDate.setDate(baselineDate.getDate() - 1);

    points.push({
      id: 'baseline-zero',
      date: baselineDate,
      dateStr: baselineDate.toISOString().split('T')[0],
      balancePaise: 0,
      deltaPaise: 0,
      type: 'BASELINE',
      partyName: selectedParty ? selectedParty.name : 'Ledger Opening Position',
      notes: 'Initial opening ledger position before disbursements and collections',
      splitsSummary: 'Zero Parity Baseline',
    });

    for (const txn of sorted) {
      const delta = txn.type === 'GIVEN' ? txn.totalAmountPaise : -txn.totalAmountPaise;
      currentBalancePaise += delta;

      const splitsText = txn.splits
        .map((s) => `${s.method}: ₹${(s.amountPaise / 100).toFixed(2)}`)
        .join('; ');

      points.push({
        id: txn.id,
        date: new Date(txn.date),
        dateStr: txn.date,
        balancePaise: currentBalancePaise,
        deltaPaise: txn.totalAmountPaise,
        type: txn.type,
        partyName: partyMap.get(txn.partyId) || txn.partyId,
        notes: txn.notes,
        referenceId: txn.splits[0]?.paymentReferenceId,
        splitsSummary: splitsText,
      });
    }

    return points;
  }, [transactions, selectedPartyId, timeHorizon, parties, selectedParty]);

  // Aggregate statistics for the current view
  const stats = useMemo(() => {
    if (chronologicalData.length === 0) {
      return {
        currentBalancePaise: 0,
        peakBalancePaise: 0,
        troughBalancePaise: 0,
        totalDisbursedPaise: 0,
        totalCollectedPaise: 0,
        movementCount: 0,
      };
    }

    const nonBaseline = chronologicalData.filter((p) => p.type !== 'BASELINE');
    const currentBalancePaise = chronologicalData[chronologicalData.length - 1].balancePaise;

    let peak = -Infinity;
    let trough = Infinity;
    let totalDisbursedPaise = 0;
    let totalCollectedPaise = 0;

    for (const p of nonBaseline) {
      if (p.balancePaise > peak) peak = p.balancePaise;
      if (p.balancePaise < trough) trough = p.balancePaise;
      if (p.type === 'GIVEN') totalDisbursedPaise += p.deltaPaise;
      if (p.type === 'TAKEN') totalCollectedPaise += p.deltaPaise;
    }

    return {
      currentBalancePaise,
      peakBalancePaise: peak === -Infinity ? 0 : peak,
      troughBalancePaise: trough === Infinity ? 0 : trough,
      totalDisbursedPaise,
      totalCollectedPaise,
      movementCount: nonBaseline.length,
    };
  }, [chronologicalData]);

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || chronologicalData.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 24, right: 32, bottom: 32, left: 64 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);

    // Scales
    const xExtent = d3.extent(chronologicalData, (d) => d.date) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const yMinRaw = d3.min(chronologicalData, (d) => d.balancePaise) || 0;
    const yMaxRaw = d3.max(chronologicalData, (d) => d.balancePaise) || 0;

    // Buffer on y domain for visual breathing room
    const yBuffer = Math.max(Math.abs(yMaxRaw - yMinRaw) * 0.15, 500000); // at least ₹5,000 buffer
    const yMin = Math.min(0, yMinRaw - yBuffer);
    const yMax = Math.max(0, yMaxRaw + yBuffer);

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]).nice();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define Gradients and clip paths
    const defs = svg.append('defs');

    // Positive Gradient (Emerald)
    const positiveGradient = defs
      .append('linearGradient')
      .attr('id', 'trendPositiveGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    positiveGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#059669')
      .attr('stop-opacity', 0.28);

    positiveGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.0);

    // Gridlines
    const yAxisGrid = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-width', 1);

    g.selectAll('.grid .domain').remove();

    // Zero-Line (Parity line)
    if (yMin <= 0 && yMax >= 0) {
      const zeroY = yScale(0);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', zeroY)
        .attr('y2', zeroY)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1.25)
        .attr('stroke-dasharray', '3,3');

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', zeroY - 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text('₹0 Parity');
    }

    // Area Generator
    const areaGenerator = d3
      .area<TrendPoint>()
      .x((d) => xScale(d.date))
      .y0(yScale(0))
      .y1((d) => yScale(d.balancePaise))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chronologicalData)
      .attr('fill', 'url(#trendPositiveGradient)')
      .attr('d', areaGenerator);

    // Line Generator
    const lineGenerator = d3
      .line<TrendPoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.balancePaise))
      .curve(d3.curveMonotoneX);

    const isCurrentPositive = stats.currentBalancePaise >= 0;
    const strokeColor = isCurrentPositive ? '#059669' : '#e11d48';

    const trendPath = g
      .append('path')
      .datum(chronologicalData)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2.25)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // GSAP stroke drawing animation according to gsap-core and gsap-performance guidelines
    const pathNode = trendPath.node();
    if (pathNode && typeof pathNode.getTotalLength === 'function') {
      try {
        const totalLength = pathNode.getTotalLength();
        if (totalLength > 0) {
          gsap.fromTo(
            pathNode,
            { strokeDasharray: totalLength, strokeDashoffset: totalLength },
            { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }
          );
        }
      } catch {
        // Fallback gracefully if geometry method is unavailable
      }
    }

    // Transaction Data Points (Dots)
    const pointsGroup = g.append('g').attr('class', 'points');
    chronologicalData
      .filter((d) => d.type !== 'BASELINE')
      .forEach((d) => {
        const cx = xScale(d.date);
        const cy = yScale(d.balancePaise);
        const isTaken = d.type === 'TAKEN';

        pointsGroup
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 3.5)
          .attr('fill', '#ffffff')
          .attr('stroke', isTaken ? '#059669' : '#e11d48')
          .attr('stroke-width', 1.75)
          .attr('cursor', 'pointer');
      });

    // X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(4, Math.floor(innerWidth / 110)))
      .tickFormat((d) => d3.timeFormat('%b %d')(d as Date));

    const gx = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    gx.selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif');

    gx.select('.domain').attr('stroke', '#e2e8f0');
    gx.selectAll('.tick line').attr('stroke', '#e2e8f0');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => formatCompactPaise(d as number));

    const gy = g.append('g').call(yAxis);

    gy.selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace');

    gy.select('.domain').remove();
    gy.selectAll('.tick line').remove();

    // Interactive Overlay & Crosshair
    const bisectDate = d3.bisector<TrendPoint, Date>((d) => d.date).center;

    const crosshair = g
      .append('g')
      .attr('class', 'crosshair')
      .style('display', 'none');

    const verticalLine = crosshair
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    const focusCircleHalo = crosshair
      .append('circle')
      .attr('r', 7)
      .attr('fill', strokeColor)
      .attr('fill-opacity', 0.2);

    const focusCircle = crosshair
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', '#ffffff')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2);

    // Mouse Tracking Rect
    svg
      .append('rect')
      .attr('class', 'overlay')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, g.node());
        const xDate = xScale.invert(mx);
        const index = bisectDate(chronologicalData, xDate);
        const point = chronologicalData[index];

        if (point) {
          const px = xScale(point.date);
          const py = yScale(point.balancePaise);

          crosshair.style('display', null);
          verticalLine.attr('x1', px).attr('x2', px);
          focusCircleHalo.attr('cx', px).attr('cy', py);
          focusCircle.attr('cx', px).attr('cy', py);

          setHoveredPoint(point);
          setHoverPos({
            x: px + margin.left,
            y: py + margin.top,
          });
        }
      })
      .on('mouseleave', () => {
        crosshair.style('display', 'none');
        setHoveredPoint(null);
        setHoverPos(null);
      });
  }, [chronologicalData, dimensions, stats]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative overflow-hidden transition-all"
    >
      {/* Widget Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 tracking-tight">
              <Activity className="size-4 text-indigo-600" />
              <span>Balance Trend</span>
            </div>

            {/* Active Counterparty Filter Tag */}
            {selectedParty ? (
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
                <Building2 className="size-3.5 text-indigo-600" />
                <span>{selectedParty.name}</span>
                <button
                  type="button"
                  onClick={() => onSelectParty(null)}
                  title="Clear party filter"
                  className="hover:bg-indigo-100 rounded-full p-0.5 text-indigo-600 hover:text-indigo-900 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : (
              <span className="text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                All Parties
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {selectedParty
              ? `Chronological balance history with ${selectedParty.name}`
              : 'Receivables & payables balance trend over time'}
          </p>
        </div>

        {/* Header Right Tools: Party Switcher & Horizon Pills */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {/* Quick Counterparty Selector */}
          <div className="relative">
            <select
              value={selectedPartyId || ''}
              onChange={(e) => onSelectParty(e.target.value ? e.target.value : null)}
              className="text-xs py-1.5 pl-2.5 pr-7 border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Horizon Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(['30D', '90D', '1Y', 'ALL'] as TimeHorizon[]).map((horizon) => (
              <button
                key={horizon}
                type="button"
                onClick={() => setTimeHorizon(horizon)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  timeHorizon === horizon
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {horizon}
              </button>
            ))}
          </div>

          {/* Expand/Collapse Height */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse chart' : 'Expand chart'}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors hidden sm:block"
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Snapshot Financial KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 pb-2">
        <div className="bg-slate-50/70 border border-slate-100 rounded-lg p-2.5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Current Running Balance
          </div>
          <div
            className={`text-base sm:text-lg font-bold font-mono mt-0.5 ${
              stats.currentBalancePaise >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatPaiseToInr(stats.currentBalancePaise)}
          </div>
          <div className="text-[10px] text-slate-500">
            {stats.currentBalancePaise >= 0 ? 'Receivable (Due to you)' : 'Payable (You owe)'}
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5">
          <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Total Taken (Money In)</span>
            <TrendingUp className="size-3 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-900 mt-0.5 tabular-nums">
            {formatPaiseToInr(stats.totalCollectedPaise)}
          </div>
          <div className="text-[10px] text-emerald-700">Money Received</div>
        </div>

        <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-2.5">
          <div className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider flex items-center justify-between">
            <span>Total Given (Money Out)</span>
            <TrendingDown className="size-3 text-rose-600" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-rose-900 mt-0.5 tabular-nums">
            {formatPaiseToInr(stats.totalDisbursedPaise)}
          </div>
          <div className="text-[10px] text-rose-700">Money Given / Paid</div>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5">
          <div className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider flex items-center justify-between">
            <span>Peak Balance (High)</span>
            <Layers className="w-3 h-3 text-indigo-600" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-indigo-900 mt-0.5">
            {formatPaiseToInr(stats.peakBalancePaise)}
          </div>
          <div className="text-[10px] text-indigo-700">
            {stats.movementCount} confirmed movements
          </div>
        </div>
      </div>

      {/* D3 SVG Canvas Area */}
      {chronologicalData.length > 1 ? (
        <div className="relative mt-2">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full overflow-visible select-none"
          />

          {/* Interactive Floating Tooltip (Crosshair HUD) */}
          {hoveredPoint && hoverPos && (
            <div
              className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 transition-transform duration-75"
              style={{
                left: Math.min(
                  Math.max(10, hoverPos.x - 120),
                  dimensions.width - 240
                ),
                top: Math.max(10, hoverPos.y - 120),
                width: '230px',
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span className="font-mono text-[11px] text-slate-300">
                  {hoveredPoint.dateStr}
                </span>
                {hoveredPoint.id !== 'baseline-zero' && (
                  <span className="font-mono text-[10px] text-indigo-300 bg-indigo-950 px-1 py-0.5 rounded border border-indigo-800">
                    {hoveredPoint.id}
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Running Net Balance
                </div>
                <div
                  className={`text-sm font-bold font-mono ${
                    hoveredPoint.balancePaise >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatPaiseToInr(hoveredPoint.balancePaise)}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {hoveredPoint.balancePaise.toLocaleString()} paise
                </div>
              </div>

              {hoveredPoint.type !== 'BASELINE' && (
                <div className="pt-1 border-t border-slate-800 text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Movement:</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        hoveredPoint.type === 'TAKEN'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {hoveredPoint.type === 'TAKEN' ? '+ ' : '- '}
                      {formatPaiseToInr(hoveredPoint.deltaPaise)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Entity:</span>
                    <span className="truncate max-w-[140px] font-medium">
                      {hoveredPoint.partyName}
                    </span>
                  </div>

                  {hoveredPoint.referenceId && (
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                      <span>Ref / UTR:</span>
                      <span className="text-indigo-300 truncate max-w-[120px]">
                        {hoveredPoint.referenceId}
                      </span>
                    </div>
                  )}

                  {hoveredPoint.notes && (
                    <div className="text-[10px] text-slate-400 italic truncate pt-0.5">
                      "{hoveredPoint.notes}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 mt-2">
          <Calendar className="w-8 h-8 text-slate-400" />
          <div className="text-xs font-semibold text-slate-700">
            Insufficient Transaction Velocity for Trend Projection
          </div>
          <p className="text-[11px] text-slate-500 max-w-sm">
            {selectedParty
              ? `No confirmed transactions found for ${selectedParty.name} within the selected ${timeHorizon} window.`
              : 'Add disbursements or collections to activate the interactive D3 running ledger balance trajectory.'}
          </p>
          {selectedParty && (
            <button
              type="button"
              onClick={() => onSelectParty(null)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline mt-1"
            >
              Show All Counterparties
            </button>
          )}
        </div>
      )}
    </div>
  );
};
