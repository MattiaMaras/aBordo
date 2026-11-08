import React, { useState } from 'react';
import { X, Check, ArrowLeft, ArrowRight, Car, FileText, Wrench, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { toInputDate } from '../../utils/dateUtils';

type Result = { success: boolean; error?: string };

interface Props {
  onSubmit: (payload: unknown) => Promise<Result>;
  onCancel: () => void;
}

const REGIONS = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli Venezia Giulia', 'Lazio', 'Liguria',
  'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
];

const STEPS = [
  { title: 'Il veicolo', icon: Car },
  { title: 'Documenti', icon: FileText },
  { title: 'Manutenzione', icon: Wrench },
  { title: 'Extra', icon: Sparkles },
];

const today = toInputDate(new Date());
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

interface FormState {
  plateNumber: string; brand: string; model: string; year: string; currentMileage: string; fuelType: string;
  insCompany: string; insExpiry: string; insPremium: string;
  taxRegion: string; taxExpiry: string; taxAmount: string;
  inspLast: string; inspCenter: string;
  serviceDate: string; serviceKm: string;
  tiresDate: string; filtersDate: string;
  oilOn: boolean; oilDate: string; oilKm: string;
  brakesOn: boolean; brakesDate: string;
  beltsOn: boolean; beltsDate: string;
  adblueOn: boolean; adblueDate: string; adblueKm: string;
}

const initial: FormState = {
  plateNumber: '', brand: '', model: '', year: String(new Date().getFullYear()), currentMileage: '', fuelType: 'gasoline',
  insCompany: '', insExpiry: '', insPremium: '',
  taxRegion: '', taxExpiry: '', taxAmount: '',
  inspLast: '', inspCenter: '',
  serviceDate: '', serviceKm: '',
  tiresDate: '', filtersDate: '',
  oilOn: false, oilDate: '', oilKm: '',
  brakesOn: false, brakesDate: '',
  beltsOn: false, beltsDate: '',
  adblueOn: false, adblueDate: '', adblueKm: '',
};

const Field: React.FC<{ id: string; label: string; hint?: string; error?: string; children: React.ReactNode }> = ({ id, label, hint, error, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {error ? <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      : hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="rounded-lg border border-gray-200 p-4">
    <legend className="px-2 text-sm font-semibold text-gray-900">{title}</legend>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  </fieldset>
);

export const VehicleOnboardingWizard: React.FC<Props> = ({ onSubmit, onCancel }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [f, setF] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setF(prev => ({ ...prev, [k]: value }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    const req = (k: keyof FormState, msg = 'Campo obbligatorio') => { if (!String(f[k]).trim()) e[k] = msg; };
    const notFuture = (k: keyof FormState) => { if (f[k] && String(f[k]) > today) e[k] = 'La data non può essere futura'; };
    if (s === 0) {
      req('plateNumber'); req('brand'); req('model');
      const y = Number(f.year);
      if (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear() + 1) e.year = 'Anno non valido';
      if (f.currentMileage === '' || Number(f.currentMileage) < 0) e.currentMileage = 'Inserisci i km attuali';
    }
    if (s === 1) {
      req('insCompany'); req('insExpiry'); req('taxRegion'); req('taxExpiry'); req('inspLast');
      notFuture('inspLast');
    }
    if (s === 2) {
      req('serviceDate'); req('serviceKm'); req('tiresDate'); req('filtersDate');
      notFuture('serviceDate'); notFuture('tiresDate'); notFuture('filtersDate');
      if (f.serviceKm !== '' && Number(f.serviceKm) > Number(f.currentMileage)) {
        e.serviceKm = `Non può superare i km attuali (${Number(f.currentMileage).toLocaleString()})`;
      }
    }
    if (s === 3) {
      if (f.oilOn) { req('oilDate'); notFuture('oilDate'); }
      if (f.brakesOn) { req('brakesDate'); notFuture('brakesDate'); }
      if (f.beltsOn) { req('beltsDate'); notFuture('beltsDate'); }
      if (f.fuelType === 'diesel' && f.adblueOn) {
        req('adblueDate'); req('adblueKm'); notFuture('adblueDate');
        if (f.adblueKm !== '' && Number(f.adblueKm) > Number(f.currentMileage)) e.adblueKm = 'Non può superare i km attuali';
      }
    }
    return e;
  };

  const go = (target: number) => {
    setDirection(target > step ? 'forward' : 'back');
    setStep(target);
    setServerError(null);
  };

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length === 0) go(step + 1);
  };

  const buildPayload = () => {
    const num = (v: string) => (v === '' ? undefined : Number(v));
    return {
      vehicle: {
        plateNumber: f.plateNumber.trim(), brand: f.brand.trim(), model: f.model.trim(),
        year: Number(f.year), currentMileage: Number(f.currentMileage), fuelType: f.fuelType,
      },
      insurance: { company: f.insCompany.trim(), expiryDate: f.insExpiry, annualPremium: num(f.insPremium) },
      tax: { region: f.taxRegion, expiryDate: f.taxExpiry, amount: num(f.taxAmount) },
      inspection: { lastInspectionDate: f.inspLast, inspectionCenter: f.inspCenter.trim() || null },
      service: { lastServiceDate: f.serviceDate, lastServiceMileage: Number(f.serviceKm) },
      tires: { lastDate: f.tiresDate },
      filters: { lastDate: f.filtersDate },
      extras: {
        ...(f.oilOn ? { oilChange: { lastDate: f.oilDate, lastMileage: num(f.oilKm) } } : {}),
        ...(f.brakesOn ? { brakes: { lastDate: f.brakesDate } } : {}),
        ...(f.beltsOn ? { belts: { lastDate: f.beltsDate } } : {}),
        ...(f.fuelType === 'diesel' && f.adblueOn ? { adblue: { lastDate: f.adblueDate, lastMileage: Number(f.adblueKm) } } : {}),
      },
    };
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    if (step < STEPS.length - 1) { next(); return; }
    const e = validate(3);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await onSubmit(buildPayload());
      if (!res.success) setServerError(res.error || 'Operazione non riuscita');
    } finally {
      setSubmitting(false);
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <Modal onClose={onCancel} labelledBy="onboarding-title" className="max-w-xl max-h-[92vh] flex flex-col" closeOnBackdrop={false}>
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="onboarding-title" className="text-xl font-semibold text-gray-900">Aggiungi veicolo</h2>
            <p className="text-sm text-gray-600">Passo {step + 1} di {STEPS.length} · {STEPS[step].title}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Chiudi" className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <div className="wizard-progress h-full w-full bg-blue-600 rounded-full" style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} />
        </div>
        <ol className="mt-3 flex justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            return (
              <li key={s.title} className={`flex items-center gap-1.5 text-xs font-medium ${i === step ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                <span className="hidden sm:inline">{s.title}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={submit} noValidate className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div key={step} className={direction === 'forward' ? 'wizard-step-forward space-y-5' : 'wizard-step-back space-y-5'}>
            {step === 0 && (
              <>
                <p className="text-sm text-gray-600">Cominciamo dai dati base. Li trovi sul libretto di circolazione.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="ob-plate" label="Targa" error={errors.plateNumber}>
                    <input id="ob-plate" className={`${inputCls} uppercase`} value={f.plateNumber} onChange={set('plateNumber')} placeholder="AB123CD" maxLength={20} autoFocus />
                  </Field>
                  <Field id="ob-year" label="Anno di immatricolazione" error={errors.year}>
                    <input id="ob-year" type="number" className={inputCls} value={f.year} onChange={set('year')} />
                  </Field>
                  <Field id="ob-brand" label="Marca" error={errors.brand}>
                    <input id="ob-brand" className={inputCls} value={f.brand} onChange={set('brand')} placeholder="Fiat, BMW…" />
                  </Field>
                  <Field id="ob-model" label="Modello" error={errors.model}>
                    <input id="ob-model" className={inputCls} value={f.model} onChange={set('model')} placeholder="Panda, Serie 3…" />
                  </Field>
                  <Field id="ob-km" label="Chilometraggio attuale" error={errors.currentMileage}>
                    <input id="ob-km" type="number" min={0} className={inputCls} value={f.currentMileage} onChange={set('currentMileage')} placeholder="es. 48500" />
                  </Field>
                  <Field id="ob-fuel" label="Alimentazione">
                    <select id="ob-fuel" className={inputCls} value={f.fuelType} onChange={set('fuelType')}>
                      <option value="gasoline">Benzina</option><option value="diesel">Gasolio</option>
                      <option value="hybrid">Ibrida</option><option value="electric">Elettrica</option>
                      <option value="lpg">GPL</option><option value="methane">Metano</option>
                    </select>
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <p className="text-sm text-gray-600">Servono per avvisarti prima che scadano. Controlla polizza, ricevuta del bollo e ultimo tagliando di revisione.</p>
                <Section title="Assicurazione">
                  <Field id="ob-ins-co" label="Compagnia" error={errors.insCompany}>
                    <input id="ob-ins-co" className={inputCls} value={f.insCompany} onChange={set('insCompany')} placeholder="Allianz, Unipol…" />
                  </Field>
                  <Field id="ob-ins-exp" label="Scadenza polizza" error={errors.insExpiry}>
                    <input id="ob-ins-exp" type="date" className={inputCls} value={f.insExpiry} onChange={set('insExpiry')} />
                  </Field>
                  <Field id="ob-ins-prem" label="Premio annuo (€) — facoltativo">
                    <input id="ob-ins-prem" type="number" min={0} step="0.01" className={inputCls} value={f.insPremium} onChange={set('insPremium')} />
                  </Field>
                </Section>
                <Section title="Bollo auto">
                  <Field id="ob-tax-reg" label="Regione" error={errors.taxRegion}>
                    <select id="ob-tax-reg" className={inputCls} value={f.taxRegion} onChange={set('taxRegion')}>
                      <option value="">Seleziona…</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field id="ob-tax-exp" label="Prossima scadenza" error={errors.taxExpiry}>
                    <input id="ob-tax-exp" type="date" className={inputCls} value={f.taxExpiry} onChange={set('taxExpiry')} />
                  </Field>
                  <Field id="ob-tax-amt" label="Importo (€) — facoltativo">
                    <input id="ob-tax-amt" type="number" min={0} step="0.01" className={inputCls} value={f.taxAmount} onChange={set('taxAmount')} />
                  </Field>
                </Section>
                <Section title="Revisione">
                  <Field id="ob-insp" label="Data ultima revisione" error={errors.inspLast} hint="La prossima viene calcolata in automatico (+2 anni).">
                    <input id="ob-insp" type="date" max={today} className={inputCls} value={f.inspLast} onChange={set('inspLast')} />
                  </Field>
                  <Field id="ob-insp-c" label="Centro — facoltativo">
                    <input id="ob-insp-c" className={inputCls} value={f.inspCenter} onChange={set('inspCenter')} />
                  </Field>
                </Section>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-gray-600">Indica l'ultima volta che hai fatto questi interventi: da qui calcoliamo quando avvisarti.</p>
                <Section title="Ultimo tagliando">
                  <Field id="ob-svc-d" label="Data" error={errors.serviceDate}>
                    <input id="ob-svc-d" type="date" max={today} className={inputCls} value={f.serviceDate} onChange={set('serviceDate')} />
                  </Field>
                  <Field id="ob-svc-km" label="Km al tagliando" error={errors.serviceKm} hint="Prossimo previsto dopo 15.000 km.">
                    <input id="ob-svc-km" type="number" min={0} className={inputCls} value={f.serviceKm} onChange={set('serviceKm')} />
                  </Field>
                </Section>
                <Section title="Gomme">
                  <Field id="ob-tires" label="Ultima sostituzione o inversione" error={errors.tiresDate} hint="Promemoria dopo 6 mesi.">
                    <input id="ob-tires" type="date" max={today} className={inputCls} value={f.tiresDate} onChange={set('tiresDate')} />
                  </Field>
                </Section>
                <Section title="Filtri aria e abitacolo">
                  <Field id="ob-filt" label="Ultima sostituzione" error={errors.filtersDate} hint="Promemoria dopo 12 mesi.">
                    <input id="ob-filt" type="date" max={today} className={inputCls} value={f.filtersDate} onChange={set('filtersDate')} />
                  </Field>
                </Section>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm text-gray-600">Facoltativo: quelli che le persone dimenticano più spesso. Attiva solo quelli che conosci.</p>
                {([
                  ['oilOn', 'Cambio olio', 'oilDate', 'oilKm'],
                  ['brakesOn', 'Controllo freni (pastiglie/dischi)', 'brakesDate', null],
                  ['beltsOn', 'Cinghia di distribuzione', 'beltsDate', null],
                ] as const).map(([onKey, label, dateKey, kmKey]) => (
                  <div key={onKey} className="rounded-lg border border-gray-200 p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={f[onKey]} onChange={set(onKey)} />
                      {label}
                    </label>
                    {f[onKey] && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field id={`ob-${dateKey}`} label="Data ultimo intervento" error={errors[dateKey]}>
                          <input id={`ob-${dateKey}`} type="date" max={today} className={inputCls} value={f[dateKey]} onChange={set(dateKey)} />
                        </Field>
                        {kmKey && (
                          <Field id={`ob-${kmKey}`} label="Km all'intervento — facoltativo" hint="Se lo indichi, avvisiamo anche per km (15.000).">
                            <input id={`ob-${kmKey}`} type="number" min={0} className={inputCls} value={f[kmKey]} onChange={set(kmKey)} />
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {f.fuelType === 'diesel' && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={f.adblueOn} onChange={set('adblueOn')} />
                      AdBlue (ultimo rabbocco)
                    </label>
                    <p className="mt-1 text-xs text-gray-500">Il consumo varia: ti avvisiamo in base ai km e ti chiediamo ogni tanto di aggiornarli.</p>
                    {f.adblueOn && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field id="ob-adblueDate" label="Data rabbocco" error={errors.adblueDate}>
                          <input id="ob-adblueDate" type="date" max={today} className={inputCls} value={f.adblueDate} onChange={set('adblueDate')} />
                        </Field>
                        <Field id="ob-adblueKm" label="Km al rabbocco" error={errors.adblueKm}>
                          <input id="ob-adblueKm" type="number" min={0} className={inputCls} value={f.adblueKm} onChange={set('adblueKm')} />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-medium mb-1">Cosa succede ora</p>
                  <p>Creiamo il veicolo e tutte le scadenze in un solo passaggio. Se qualcosa va storto non viene salvato nulla.</p>
                </div>
                {serverError && <p className="text-sm text-red-600" role="alert">{serverError}</p>}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => go(step - 1)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />Indietro
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
          )}
          <Button type="submit" className="flex-1" disabled={submitting}>
            {isLast ? (submitting ? 'Creazione in corso…' : 'Crea veicolo') : <>Continua<ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" /></>}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
