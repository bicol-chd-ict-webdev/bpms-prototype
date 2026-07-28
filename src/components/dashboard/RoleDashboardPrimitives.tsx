import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

type Tone = 'critical' | 'attention' | 'positive' | 'neutral';

const toneClasses: Record<Tone, { icon: string; value: string; border: string }> = {
 critical: { icon: 'bg-primary text-white', value: 'text-primary', border: 'border-primary/70' },
 attention: { icon: 'bg-amber-950 text-amber-300', value: 'text-amber-300', border: 'border-amber-900/70' },
 positive: { icon: 'bg-emerald-950 text-emerald-300', value: 'text-emerald-300', border: 'border-emerald-900/70' },
 neutral: { icon: 'bg-cyan-950 text-cyan-300', value: 'text-cyan-300', border: 'border-cyan-900/70' },
};

export const RoleDashboardHero: React.FC<{
 role: string;
 title: string;
 description: string;
 focus: string;
 actions?: React.ReactNode;
}> = ({ role, title, description, focus, actions }) => (
 <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 ">
 <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-6">
 <div>
 <div className="mb-3 flex flex-wrap items-center gap-2">
 <span className="rounded-md bg-primary px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-white">{role}</span>
 <span className="text-[11px] font-medium text-slate-400">Primary focus: <strong className="text-slate-200">{focus}</strong></span>
 </div>
 <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
 <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
 </div>
 {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
 </div>
 </section>
);

export const RoleMetricCard: React.FC<{
 label: string;
 value: React.ReactNode;
 detail: string;
 icon: LucideIcon;
 tone?: Tone;
 status?: React.ReactNode;
}> = ({ label, value, detail, icon: Icon, tone = 'neutral', status }) => {
 const classes = toneClasses[tone];

 return (
 <section className={`rounded-2xl border bg-slate-900 p-5 ${classes.border}`}>
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-xs font-medium text-slate-400">{label}</p>
 <p className={`mt-3 font-mono text-3xl font-black tracking-tight ${classes.value}`}>{typeof value === 'number' ? formatNumber(value) : value}</p>
 </div>
 <div className={`flex size-9 items-center justify-center rounded-xl ${classes.icon}`}>
 <Icon className="size-4" />
 </div>
 </div>
 <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
 <span className="text-slate-400">{detail}</span>
 {status && <span className={`font-semibold ${classes.value}`}>{status}</span>}
 </div>
 </section>
 );
};
