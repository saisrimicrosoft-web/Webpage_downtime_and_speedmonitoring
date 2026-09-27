'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { CheckLog } from '../lib/api';

interface ChartProps {
  data: CheckLog[];
  url: string;
}

export default function UrlPerformanceChart({ data, url }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-[400px] flex items-center justify-center shadow-sm">
        <p className="text-zinc-500">No performance data available for {url}</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map((log) => ({
    ...log,
    formattedTime: format(parseISO(log.checked_at), 'HH:mm'),
    latency: log.response_ms,
    isDown: !log.is_up,
  }));

  // Identify downtime periods to shade them red
  const downtimeAreas = [];
  let currentDownStart = null;

  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].isDown && currentDownStart === null) {
      currentDownStart = chartData[i].formattedTime;
    } else if (!chartData[i].isDown && currentDownStart !== null) {
      downtimeAreas.push({ start: currentDownStart, end: chartData[i].formattedTime });
      currentDownStart = null;
    }
  }
  // If it's down at the end
  if (currentDownStart !== null) {
    downtimeAreas.push({ start: currentDownStart, end: chartData[chartData.length - 1].formattedTime });
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm mb-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Response Time Performance</h2>
        <p className="text-sm text-zinc-500">{url}</p>
      </div>
      
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}ms`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
              formatter={(value: number) => [`${value} ms`, 'Latency']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            
            {/* Shade downtime areas */}
            {downtimeAreas.map((area, index) => (
              <ReferenceArea 
                key={index} 
                x1={area.start} 
                x2={area.end} 
                fillOpacity={0.15} 
                fill="#ef4444" 
              />
            ))}
            
            <Line 
              type="monotone" 
              dataKey="latency" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
