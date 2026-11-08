import React from 'react';
import {
  Wrench, ClipboardCheck, ShieldCheck, FileCheck2, Gauge, ChevronDown, Search, MapPin, ArrowLeft, Receipt, CircleDot,
  Wind, Droplets, Fuel, AlertTriangle,
} from 'lucide-react';
import { Vehicle } from '../../types/vehicle';
import { normalizeMaintenanceList, normalizeServiceList } from '../../api/normalizers';
import { formatDate, toInputDate } from '../../utils/dateUtils';
import { API_URL, apiFetch, getAuthHeaders } from '../../api/client';

type Props = { vehicles: Vehicle[]; onBack: () => void };

type Kind = 'maintenance' | 'service' | 'inspection' | 'insurance' | 'tax';
type Category = 'all' | 'maintenance' | 'service' | 'inspection' | 'insurance' | 'tax';

interface Entry {
  key: string;
  vehicleId: string;
  kind: Kind;
  icon: React.ElementType;
  tone: string;
  title: string;
  subtitle?: string;
  date: string;
  cost: number;
  mileage?: number;
  // dettagli tecnici (mostrati nell'espansione, senza perdere nulla)
  description?: string;
  location?: string;
  notes?: string;
  nextDue?: string;
  nextMileage?: number;
}

const eur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
// Il server invia le date come timestamp (es. 2026-08-31T22:00:00Z per il 1° settembre in Italia):
// vanno ricondotte al giorno locale, altrimenti mese e anno risultano sbagliati.
const day = (v: unknown): string => {
  if (!v) return '';
  const str = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? '' : toInputDate(d);
};
const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0);

const MAINT_META: Record<string, { label: string; icon: React.ElementType }> = {
  oil: { label: 'Cambio olio', icon: Fuel },
  filters: { label: 'Filtri', icon: Wind },
  brakes: { label: 'Freni', icon: AlertTriangle },
  tires: { label: 'Gomme', icon: CircleDot },
  adblue: { label: 'AdBlue', icon: Droplets },
  other: { label: 'Manutenzione', icon: Wrench },
};

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'Tutto' },
  { id: 'maintenance', label: 'Manutenzioni' },
  { id: 'service', label: 'Tagliandi' },
  { id: 'inspection', label: 'Revisioni' },
  { id: 'insurance', label: 'Assicurazioni' },
  { id: 'tax', label: 'Bolli' },
];

// Interventi = lavori sul veicolo; pagamenti = assicurazione e bollo
const isPayment = (k: Kind) => k === 'insurance' || k === 'tax';

const toEntries = (data: any, vehicleId: string): Entry[] => {
  const out: Entry[] = [];

  normalizeMaintenanceList(Array.isArray(data.maintenances) ? data.maintenances : [], vehicleId).forEach((m) => {
    const meta = MAINT_META[m.type] ?? MAINT_META.other;
    out.push({
      key: `m-${m.id}`, vehicleId, kind: 'maintenance', icon: meta.icon, tone: 'text-yellow-700 bg-yellow-50',
      title: m.title && m.title !== 'Manutenzione' ? m.title : meta.label, subtitle: meta.label,
      date: day(m.date), cost: m.cost, mileage: m.mileage, description: m.description, location: m.location,
      notes: m.notes, nextDue: day(m.nextDue) || undefined, nextMileage: m.nextMileage,
    });
  });

  normalizeServiceList(Array.isArray(data.services) ? data.services : [], vehicleId).forEach((s) => {
    out.push({
      key: `s-${s.id}`, vehicleId, kind: 'service', icon: Gauge, tone: 'text-blue-700 bg-blue-50',
      title: s.serviceType === 'major' ? 'Tagliando maggiore' : 'Tagliando', date: day(s.lastServiceDate), cost: 0,
      mileage: s.lastServiceMileage, nextMileage: s.nextServiceMileage,
      description: s.serviceInterval ? `Intervallo previsto: ${s.serviceInterval.toLocaleString()} km` : undefined,
    });
  });

  (Array.isArray(data.inspections) ? data.inspections : []).forEach((i: any) => {
    out.push({
      key: `i-${i.id}`, vehicleId, kind: 'inspection', icon: ClipboardCheck, tone: 'text-green-700 bg-green-50',
      title: 'Revisione', date: day(i.lastInspectionDate ?? i.last_inspection_date), cost: num(i.cost),
      location: i.inspectionCenter ?? i.inspection_center ?? undefined, nextDue: day(i.nextInspectionDate ?? i.next_inspection_date) || undefined,
    });
  });

  (Array.isArray(data.insurances) ? data.insurances : []).forEach((ins: any) => {
    out.push({
      key: `a-${ins.id}`, vehicleId, kind: 'insurance', icon: ShieldCheck, tone: 'text-purple-700 bg-purple-50',
      title: `Assicurazione${ins.company ? ` ${ins.company}` : ''}`,
      date: day(ins.createdAt ?? ins.created_at ?? ins.expiryDate ?? ins.expiry_date), cost: num(ins.annualPremium ?? ins.annual_premium),
      nextDue: day(ins.expiryDate ?? ins.expiry_date) || undefined,
      description: (ins.policyNumber ?? ins.policy_number) ? `Polizza n. ${ins.policyNumber ?? ins.policy_number}` : undefined,
    });
  });

  (Array.isArray(data.taxes) ? data.taxes : []).forEach((t: any) => {
    out.push({
      key: `t-${t.id}`, vehicleId, kind: 'tax', icon: FileCheck2, tone: 'text-orange-700 bg-orange-50',
      title: `Bollo${t.region ? ` ${t.region}` : ''}`,
      date: day(t.createdAt ?? t.created_at ?? t.expiryDate ?? t.expiry_date), cost: num(t.amount),
      nextDue: day(t.expiryDate ?? t.expiry_date) || undefined,
    });
  });

  return out;
};

const monthKey = (d: string) => (d ? d.slice(0, 7) : 'none');
const monthLabel = (k: string) => {
  if (k === 'none') return 'Senza data';
  const [y, m] = k.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const PAGE = 25;

export const HistoryPage: React.FC<Props> = ({ vehicles, onBack }) => {
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [vehicleId, setVehicleId] = React.useState('all');
  const [category, setCategory] = React.useState<Category>('all');
  const [year, setYear] = React.useState<'all' | string>('all');
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [visible, setVisible] = React.useState(PAGE);

  React.useEffect(() => {
    if (!vehicles.length) { setEntries([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        // in parallelo (prima era una richiesta alla volta)
        const results = await Promise.all(vehicles.map(async (v) => {
          const resp = await apiFetch(`${API_URL}/vehicles/${v.id}`, { headers: getAuthHeaders() });
          return resp.ok ? toEntries(await resp.json(), String(v.id)) : [];
        }));
        if (!cancelled) setEntries(results.flat());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Errore sconosciuto');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vehicles]);

  const vehicleById = React.useMemo(() => new Map(vehicles.map((v) => [String(v.id), v])), [vehicles]);
  const years = React.useMemo(
    () => Array.from(new Set(entries.map((e) => e.date.slice(0, 4)).filter(Boolean))).sort().reverse(),
    [entries]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (vehicleId === 'all' || e.vehicleId === vehicleId)
        && (category === 'all' || e.kind === category)
        && (year === 'all' || e.date.startsWith(year))
        && (!q || `${e.title} ${e.subtitle ?? ''} ${e.description ?? ''} ${e.location ?? ''} ${e.notes ?? ''}`.toLowerCase().includes(q)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [entries, vehicleId, category, year, query]);

  React.useEffect(() => { setVisible(PAGE); }, [vehicleId, category, year, query]);

  const totals = React.useMemo(() => {
    const interventions = filtered.filter((e) => !isPayment(e.kind));
    const payments = filtered.filter((e) => isPayment(e.kind));
    return {
      spent: filtered.reduce((s, e) => s + e.cost, 0),
      interventions: interventions.length,
      payments: payments.length,
      last: interventions[0]?.date,
    };
  }, [filtered]);

  const shown = filtered.slice(0, visible);
  const groups: { key: string; items: Entry[] }[] = [];
  shown.forEach((e) => {
    const k = monthKey(e.date);
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.items.push(e); else groups.push({ key: k, items: [e] });
  });

  const toggle = (key: string) => setOpen((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Storico</h1>
          <p className="text-sm text-gray-600 mt-1">Interventi e pagamenti di tutti i tuoi veicoli, con ogni dettaglio.</p>
        </div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </button>
      </div>

      {/* Riepilogo del periodo filtrato */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Speso', value: eur(totals.spent), mono: true },
          { label: 'Interventi', value: String(totals.interventions), mono: true },
          { label: 'Pagamenti', value: String(totals.payments), mono: true },
          { label: 'Ultimo intervento', value: totals.last ? formatDate(totals.last) : '—', mono: false },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-surface p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-xl font-semibold text-gray-900 ${c.mono ? 'font-mono tabular-nums' : ''}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div className="rounded-xl border border-gray-200 bg-surface p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categoria">
          {CATEGORIES.map((c) => (
            <button
              key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] ${category === c.id ? 'bg-blue-500 border-blue-500' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              style={category === c.id ? { color: '#0A0C10' } : undefined}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cerca nello storico"
              placeholder="Cerca per titolo, officina, note…" className={`${field} w-full pl-9`} />
          </div>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} aria-label="Veicolo" className={field}>
            <option value="all">Tutti i veicoli</option>
            {vehicles.map((v) => <option key={v.id} value={String(v.id)}>{v.brand} {v.model} · {v.plateNumber}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Anno" className={field}>
            <option value="all">Tutti gli anni</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3 animate-pulse" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl border border-gray-200 bg-surface" />)}
        </div>
      ) : error ? (
        <p className="text-red-600" role="alert">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-surface p-12 text-center">
          <Receipt className="h-10 w-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="font-medium text-gray-900">Niente da mostrare</p>
          <p className="text-sm text-gray-500 mt-1">Cambia i filtri o aggiungi interventi dalla pagina del veicolo.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} aria-label={monthLabel(g.key)}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{monthLabel(g.key)}</h2>
              <ul className="space-y-2">
                {g.items.map((e) => {
                  const v = vehicleById.get(e.vehicleId);
                  const expanded = open.has(e.key);
                  const hasDetails = Boolean(e.description || e.location || e.notes || e.nextDue || e.nextMileage || typeof e.mileage === 'number');
                  return (
                    <li key={e.key} className="rounded-xl border border-gray-200 bg-surface">
                      <button
                        type="button" onClick={() => hasDetails && toggle(e.key)} aria-expanded={hasDetails ? expanded : undefined}
                        disabled={!hasDetails}
                        className="w-full flex items-center gap-4 p-4 text-left rounded-xl transition-colors duration-150 hover:bg-gray-100 disabled:hover:bg-transparent disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${e.tone}`}>
                          <e.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{e.title}</span>
                            <span className={`hidden sm:inline rounded-full px-2 py-0.5 text-[11px] font-medium ${isPayment(e.kind) ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                              {isPayment(e.kind) ? 'Pagamento' : 'Intervento'}
                            </span>
                          </span>
                          <span className="block text-xs text-gray-500 truncate">
                            {e.date ? formatDate(e.date) : 'Data non indicata'}
                            {v && <> · {v.brand} {v.model}</>}
                            {typeof e.mileage === 'number' && <> · <span className="font-mono">{e.mileage.toLocaleString()} km</span></>}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-sm font-medium text-gray-900">{e.cost > 0 ? eur(e.cost) : '—'}</span>
                        {hasDetails && (
                          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ease-out ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                        )}
                      </button>

                      {/* Espansione: grid-rows 0fr→1fr, senza animare l'altezza */}
                      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-200 px-4 py-4 text-sm">
                            {typeof e.mileage === 'number' && <div><dt className="text-gray-500">Chilometri all'intervento</dt><dd className="font-mono text-gray-900">{e.mileage.toLocaleString()} km</dd></div>}
                            {e.location && <div><dt className="text-gray-500">Luogo</dt><dd className="text-gray-900 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />{e.location}</dd></div>}
                            {e.nextDue && <div><dt className="text-gray-500">{isPayment(e.kind) ? 'Scadenza' : 'Prossima scadenza'}</dt><dd className="text-gray-900">{formatDate(e.nextDue)}</dd></div>}
                            {typeof e.nextMileage === 'number' && e.nextMileage > 0 && <div><dt className="text-gray-500">Prossimo a</dt><dd className="font-mono text-gray-900">{e.nextMileage.toLocaleString()} km</dd></div>}
                            {e.description && <div className="sm:col-span-2"><dt className="text-gray-500">Descrizione</dt><dd className="text-gray-900">{e.description}</dd></div>}
                            {e.notes && <div className="sm:col-span-2"><dt className="text-gray-500">Note</dt><dd className="text-gray-900">{e.notes}</dd></div>}
                          </dl>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {visible < filtered.length && (
            <button type="button" onClick={() => setVisible((n) => n + PAGE)}
              className="w-full rounded-lg border border-gray-200 bg-surface py-2.5 text-sm font-medium text-gray-700 transition-[background-color,transform] duration-150 hover:bg-gray-100 active:scale-[0.99]">
              Mostra altri ({filtered.length - visible})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
