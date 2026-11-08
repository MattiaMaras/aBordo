import React, { useState } from 'react';
import { Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../common/Button';
import { daysSince, MILEAGE_STALE_DAYS } from '../../utils/maintenanceUtils';

interface Props {
  currentMileage: number;
  mileageUpdatedAt?: string;
  /** Esiste almeno una scadenza a chilometri (es. AdBlue, olio): senza km aggiornati non è affidabile */
  hasKmBasedDeadlines: boolean;
  onUpdate: (km: number) => Promise<{ success: boolean; error?: string } | void>;
}

// Controllo periodico dinamico: se i km non sono aggiornati da oltre 30 giorni, le scadenze a km
// (AdBlue in primis) sono stime vecchie. Chiediamo i km attuali per ricalcolarle.
export const MileageCheckBanner: React.FC<Props> = ({ currentMileage, mileageUpdatedAt, hasKmBasedDeadlines, onUpdate }) => {
  const [value, setValue] = useState(String(currentMileage));
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  const stale = daysSince(mileageUpdatedAt) >= MILEAGE_STALE_DAYS;
  if (!hasKmBasedDeadlines || !stale || dismissed) return null;

  const km = Number(value);
  const invalid = !Number.isFinite(km) || km < currentMileage;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    const res = await onUpdate(km);
    setSaving(false);
    if (res && !res.success) toast.error(res.error || 'Impossibile aggiornare i km');
    else toast.success('Chilometri aggiornati: scadenze ricalcolate');
  };

  return (
    <form onSubmit={save} className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 sm:flex sm:items-center sm:gap-4" role="region" aria-label="Aggiorna i chilometri">
      <Gauge className="h-6 w-6 shrink-0 text-yellow-600 mb-2 sm:mb-0" aria-hidden="true" />
      <div className="flex-1 mb-3 sm:mb-0">
        <p className="text-sm font-semibold text-gray-900">Quanti km ha ora il veicolo?</p>
        <p className="text-xs text-gray-600">Non li aggiorni da {daysSince(mileageUpdatedAt)} giorni. Le scadenze a chilometri (AdBlue, olio) dipendono da questo dato.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number" min={currentMileage} value={value} onChange={(e) => setValue(e.target.value)}
          aria-label="Chilometraggio attuale" aria-invalid={invalid}
          className="w-28 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" size="sm" disabled={invalid || saving}>{saving ? 'Salvo…' : 'Aggiorna'}</Button>
        <button type="button" onClick={() => setDismissed(true)} className="text-xs text-gray-500 hover:text-gray-700 px-1.5">Dopo</button>
      </div>
    </form>
  );
};
