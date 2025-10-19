'use client';

import { useEffect, useRef } from 'react';
import embed from 'vega-embed';

interface VegaLiteChartProps {
  spec: object;
}

export default function VegaLiteChart({ spec }: VegaLiteChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Clear previous chart
      containerRef.current.innerHTML = '';

      // Embed the Vega-Lite specification
      embed(containerRef.current, spec, {
        actions: {
          export: true,
          source: false,
          compiled: false,
          editor: false
        },
        renderer: 'canvas'
      }).catch(err => {
        console.error('Error rendering Vega-Lite chart:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = '<p class="text-red-500">Error rendering chart</p>';
        }
      });
    }
  }, [spec]);

  return <div ref={containerRef} className="w-full my-4" />;
}
