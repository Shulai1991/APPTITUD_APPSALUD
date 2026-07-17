
import React, { useState } from 'react';
import type { ClinicalHistoryEntry, Professional, User } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface ClinicalHistoryFormProps {
  onSave: (entry: Omit<ClinicalHistoryEntry, 'file'>) => void;
  onCancel: () => void;
  professionals?: Professional[];
  currentUser?: User;
  initialEntry?: ClinicalHistoryEntry;
}

const ClinicalHistoryForm: React.FC<ClinicalHistoryFormProps> = ({ onSave, onCancel, professionals = [], currentUser, initialEntry }) => {
  const [date, setDate] = useState(() => {
    if (initialEntry) return initialEntry.date;
    return new Date().toISOString().split('T')[0];
  });
  const [time, setTime] = useState(() => {
    if (initialEntry && initialEntry.time) return initialEntry.time;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [reason, setReason] = useState(() => {
    if (initialEntry) return initialEntry.reason || initialEntry.description || '';
    return '';
  });
  const [diagnosis, setDiagnosis] = useState(() => {
    if (initialEntry) return initialEntry.diagnosis || '';
    return '';
  });
  const [procedures, setProcedures] = useState<string[]>(() => {
    if (initialEntry?.procedures) return initialEntry.procedures.length > 0 ? initialEntry.procedures : [''];
    return [''];
  });
  const [suggestedTreatment, setSuggestedTreatment] = useState(() => {
    if (initialEntry) return initialEntry.suggestedTreatment || '';
    return '';
  });

  const isProfessionalUser = currentUser?.role === 'odontologist' || currentUser?.role === 'specialist';

  // Professional selection states
  const [selectedProfId, setSelectedProfId] = useState<string>(() => {
    if (initialEntry?.professionalName) return 'manual';
    if (isProfessionalUser) return 'current-user';
    return professionals && professionals.length > 0 ? professionals[0].id.toString() : 'manual';
  });
  const [profName, setProfName] = useState<string>(() => {
    if (initialEntry?.professionalName) return initialEntry.professionalName;
    if (isProfessionalUser && currentUser) return currentUser.fullName;
    return professionals && professionals.length > 0 ? professionals[0].name : '';
  });
  const [profLicense, setProfLicense] = useState<string>(() => {
    if (initialEntry?.professionalName) return initialEntry.professionalLicense || '';
    if (isProfessionalUser && currentUser) return currentUser.license || '';
    return professionals && professionals.length > 0 ? (professionals[0].license || '') : '';
  });

  const handleProfessionalSelect = (idStr: string) => {
    setSelectedProfId(idStr);
    if (idStr === 'manual') {
      setProfName('');
      setProfLicense('');
    } else {
      const selected = professionals.find(p => p.id.toString() === idStr);
      if (selected) {
        setProfName(selected.name);
        setProfLicense(selected.license || '');
      }
    }
  };

  const handleProcedureChange = (index: number, value: string) => {
    const newProcedures = [...procedures];
    newProcedures[index] = value;
    setProcedures(newProcedures);
  };

  const addProcedure = () => {
    setProcedures([...procedures, '']);
  };

  const removeProcedure = (index: number) => {
    if (procedures.length > 1) {
      setProcedures(procedures.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialEntry?.id,
      date,
      time,
      createdAtISO: initialEntry?.createdAtISO || new Date().toISOString(),
      reason,
      diagnosis,
      procedures: procedures.filter(p => p.trim() !== ''),
      suggestedTreatment,
      professionalName: profName.trim() || undefined,
      professionalLicense: profLicense.trim() || undefined,
    });
  };

  const inputClass = "mt-1 block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm";
  const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1";
  const textareaClass = `${inputClass} min-h-[60px]`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isProfessionalUser ? (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/30 p-4 rounded-xl flex items-center space-x-3">
          <div className="text-xl">👩‍⚕️</div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Profesional Tratante (Activo)</p>
            <p className="font-bold text-sm text-indigo-700 dark:text-indigo-400 mt-0.5">
              {profName} {profLicense && <span className="font-mono text-xs text-slate-500 dark:text-slate-400 ml-1.5">(M.P. {profLicense})</span>}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic">La firma y matrícula provincial se asocian de forma fija a su identidad de usuario.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="sm:col-span-2">
            <h4 className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/60 pb-1.5 mb-3">
              Especialista Tratante
            </h4>
          </div>
          <div>
            <label htmlFor="profSelect" className={labelClass}>Seleccionar Odontólogo / Especialista</label>
            <select
              id="profSelect"
              value={selectedProfId}
              onChange={e => handleProfessionalSelect(e.target.value)}
              className={inputClass}
            >
              {professionals.map(p => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name} {p.specialty ? `(${p.specialty})` : ''}
                </option>
              ))}
              <option value="manual">✍ Especialista externo o personalizado...</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
            <div>
              <label htmlFor="profName" className={labelClass}>Nombre Especialista *</label>
              <input
                type="text"
                id="profName"
                value={profName}
                onChange={e => {
                  setProfName(e.target.value);
                  setSelectedProfId('manual');
                }}
                placeholder="Ej. Dra. Juliana María"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="profLicense" className={labelClass}>Matrícula Provincial</label>
              <input
                type="text"
                id="profLicense"
                value={profLicense}
                onChange={e => {
                  setProfLicense(e.target.value);
                  setSelectedProfId('manual');
                }}
                placeholder="Ej. MP-8432-A"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className={labelClass}>Fecha de Atención</label>
          <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label htmlFor="time" className={labelClass}>Hora de Atención</label>
          <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} required />
        </div>
      </div>
      <div>
        <label htmlFor="reason" className={labelClass}>Motivo de Consulta</label>
        <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} className={textareaClass} required />
      </div>
      <div>
        <label htmlFor="diagnosis" className={labelClass}>Diagnóstico Presuntivo</label>
        <textarea id="diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className={textareaClass} />
      </div>
      <div>
        <label className={labelClass}>Procedimiento Realizado</label>
        <div className="space-y-2 mt-1">
          {procedures.map((procedure, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                placeholder={`Procedimiento #${index + 1}`}
                value={procedure}
                onChange={(e) => handleProcedureChange(index, e.target.value)}
                className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm"
              />
              {procedures.length > 1 && (
                <button type="button" onClick={() => removeProcedure(index)} className="p-2 text-red-505 hover:text-red-700">
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addProcedure} className="flex items-center space-x-2 text-xs text-primary hover:text-primary-700 font-bold mt-2 pb-1">
          <PlusIcon /><span>Agregar Procedimiento</span>
        </button>
      </div>
      <div>
        <label htmlFor="suggestedTreatment" className={labelClass}>Tratamiento Sugerido</label>
        <textarea id="suggestedTreatment" value={suggestedTreatment} onChange={e => setSuggestedTreatment(e.target.value)} className={textareaClass} />
      </div>
      <div className="flex justify-end pt-4 space-x-3 border-t border-slate-200 dark:border-slate-700">
        <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-200 text-xs font-bold py-2.5 px-4 rounded-lg transition-colors">
          Cancelar
        </button>
        <button type="submit" className="bg-primary hover:bg-primary-600 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors">
          Guardar Entrada
        </button>
      </div>
    </form>
  );
};

export default ClinicalHistoryForm;
