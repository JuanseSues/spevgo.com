import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ChartCard({ title, children }: { title: string; children: JSX.Element }) {
  return (
    <div className="rounded-2xl border border-emerald-100/80 bg-white/95 p-4 shadow-sm">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

export function SimpleBar({ data }: { data: Array<{ name: string; total: number }> }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" fontSize={12} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#059669" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center text-sm text-slate-600">
      {text}
    </div>
  );
}
