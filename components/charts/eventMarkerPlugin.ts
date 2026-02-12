import type { Chart, Plugin } from 'chart.js/auto';
import type { HealthEvent, EventCategory } from '@/lib/types';

export interface MarkerHitbox {
  x: number;
  width: number;
  top: number;
  bottom: number;
  event: HealthEvent;
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  exercise: '#55efc4',
  meal: '#ffeaa7',
  medical: '#ff6b6b',
  'sleep-aid': '#74b9ff',
  note: '#a8a8c0',
  custom: '#dfe6e9',
};

const CATEGORY_LETTERS: Record<EventCategory, string> = {
  exercise: 'E',
  meal: 'M',
  medical: '+',
  'sleep-aid': 'S',
  note: 'N',
  custom: 'C',
};

function getEventColor(event: HealthEvent): string {
  return event.color || CATEGORY_COLORS[event.category] || '#dfe6e9';
}

export { CATEGORY_COLORS };

export interface EventMarkerPluginOptions {
  events: HealthEvent[];
  effectiveStart: number;
}

// Augment Chart.js types to allow the custom eventMarkers plugin option
declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends import('chart.js').ChartType> {
    eventMarkers?: EventMarkerPluginOptions;
  }
}

/**
 * Creates a Chart.js inline plugin that draws vertical dashed event markers.
 * The hitboxRef array is populated on each draw for click detection.
 */
export function createEventMarkerPlugin(
  hitboxRef: { current: MarkerHitbox[] },
): Plugin {
  return {
    id: 'eventMarkers',

    afterDatasetsDraw(chart: Chart) {
      const pluginOpts = (chart.options.plugins as Record<string, unknown>)?.eventMarkers as
        | EventMarkerPluginOptions
        | undefined;
      if (!pluginOpts?.events?.length) {
        hitboxRef.current = [];
        return;
      }

      const { events, effectiveStart } = pluginOpts;
      const ctx = chart.ctx;
      const xScale = chart.scales['x'];
      const chartArea = chart.chartArea;
      if (!xScale || !chartArea) return;

      const hitboxes: MarkerHitbox[] = [];

      for (const event of events) {
        const [hStr, mStr] = event.time.split(':');
        let hour = parseInt(hStr, 10) + parseInt(mStr, 10) / 60;

        // Wrap to the chart's visible range
        while (hour < effectiveStart) hour += 24;
        while (hour >= effectiveStart + 24) hour -= 24;

        const x = xScale.getPixelForValue(hour);
        if (x < chartArea.left || x > chartArea.right) continue;

        const color = getEventColor(event);
        const letter = CATEGORY_LETTERS[event.category] || 'C';

        // Draw dashed vertical line
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
        ctx.restore();

        // Draw label badge at top
        const badgeSize = 16;
        const badgeY = chartArea.top - badgeSize - 4;

        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 1;
        ctx.fillText(letter, x, badgeY + badgeSize / 2);
        ctx.restore();

        hitboxes.push({
          x: x - badgeSize / 2,
          width: badgeSize,
          top: badgeY,
          bottom: chartArea.bottom,
          event,
        });
      }

      hitboxRef.current = hitboxes;
    },
  };
}
