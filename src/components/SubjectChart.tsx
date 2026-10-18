"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { useApp } from "./providers";

interface SubjectStat {
  subject_id: number;
  total: number;
  correct: number;
  accuracy: number;
}

interface SubjectChartDatum {
  name: string;
  accuracy: number;
  total: number;
}

export function SubjectChart({ data }: { data: SubjectStat[] }) {
  const { taxonomy, pick } = useApp();

  const formattedData = data.map((d) => {
    const subject = taxonomy.subjects.find((s) => s.id === d.subject_id);
    return {
      name: subject ? pick(subject.name_en, subject.name_hi) : `Sub ${d.subject_id}`,
      accuracy: d.accuracy,
      total: d.total,
    };
  });

  return (
    <div className="h-64 w-full text-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: "#78716c", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#78716c", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: "rgba(114, 47, 55, 0.05)" }}
            content={({ active, payload }: TooltipContentProps) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as SubjectChartDatum;
                return (
                  <div className="rounded-lg border border-gold/40 bg-white p-3 shadow-lg">
                    <div className="font-bold text-maroon">{d.name}</div>
                    <div className="text-stone-600">Accuracy: {d.accuracy}%</div>
                    <div className="text-xs text-stone-400">Total Attempts: {d.total}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="accuracy" fill="#722F37" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
