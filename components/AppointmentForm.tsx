import React, { useState, useEffect } from 'react';
import type { Patient, Appointment, Professional } from '../types';
import { PROFESSIONALS } from '../constants';
import { PlusIcon } from './icons';

interface AppointmentFormProps {
    patients: Patient[];
    professionals?: Professional[];
    onSave: (data: Omit<Appointment, 'id' | 'status' | 'patientName'>) => void;
    onCancel: () => void;
    prefilledData?: { date: string; time: string; professionalId: number } | null;
    onAddPatient?: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
    patients, 
    professionals,
    onSave, 
    onCancel, 
    prefilledData,
    onAddPatient 
}) => {
    const activeProfessionals = professionals || PROFESSIONALS;
    const [patientId, setPatientId] = useState<string>('');
    const [professionalId, setProfessionalId] = useState<string>('1');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [reason, setReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (prefilledData) {
            setDate(prefilledData.date);
            setTime(prefilledData.time);
            setProfessionalId(prefilledData.professionalId.toString());
        } else if (activeProfessionals.length > 0) {
            setProfessionalId(activeProfessionals[0].id.toString());
        }
    }, [prefilledData, activeProfessionals]);

    useEffect(() => {
        // Default to first patient if none selected yet and available
        if (patients.length > 0 && !patientId) {
            setPatientId(patients[0].id.toString());
        }
    }, [patients, patientId]);

    const filteredPatients = patients.filter(p =>
        `${p.name} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.dni.includes(searchQuery)
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!patientId) {
            alert("Por favor, seleccione un paciente.");
            return;
        }
        if(!professionalId) {
            alert("Por favor, seleccione un profesional.");
            return;
        }
        onSave({
            patientId: parseInt(patientId, 10),
            professionalId: parseInt(professionalId, 10),
            date,
            time,
            reason
        });
    };

    const inputClass = "mt-1 block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm";
    const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profesional */}
            <div>
                <label htmlFor="professionalId" className={labelClass}>Especialista médico</label>
                <select 
                    id="professionalId" 
                    value={professionalId} 
                    onChange={(e) => setProfessionalId(e.target.value)} 
                    className={inputClass} 
                    required
                >
                    {activeProfessionals.map(prof => (
                        <option key={prof.id} value={prof.id}>
                            {prof.name} ({prof.specialty})
                        </option>
                    ))}
                </select>
            </div>

            {/* Paciente y Búsqueda */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <div className="flex justify-between items-center">
                    <span className={labelClass}>Paciente</span>
                    {onAddPatient && (
                        <button
                            type="button"
                            onClick={onAddPatient}
                            className="text-xs text-primary hover:text-primary-600 font-bold flex items-center space-x-1"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Registrar Paciente</span>
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o DNI..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 text-sm"
                    />
                    {searchQuery && (
                        <button 
                            type="button" 
                            onClick={() => setSearchQuery('')}
                            className="px-2 text-slate-500 hover:text-slate-800 text-xs text-slate-400"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <select 
                    id="patientId" 
                    value={patientId} 
                    onChange={(e) => setPatientId(e.target.value)} 
                    className="block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm" 
                    required
                >
                    <option value="" disabled>Seleccione un paciente de la lista...</option>
                    {filteredPatients.length > 0 ? (
                        filteredPatients.map(p => (
                            <option key={p.id} value={p.id}>{p.lastName}, {p.name} (DNI: {p.dni})</option>
                        ))
                    ) : (
                        <option disabled>No se encontraron pacientes...</option>
                    )}
                </select>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="date" className={labelClass}>Fecha</label>
                    <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
                </div>
                <div>
                    <label htmlFor="time" className={labelClass}>Hora</label>
                    <input type="time" id="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} required />
                </div>
            </div>

            {/* Motivo de la Cita */}
            <div>
                <label htmlFor="reason" className={labelClass}>Motivo de la Cita</label>
                <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} className={`${inputClass} min-h-[70px]`} placeholder="Ej. Limpieza, caries molar, consulta inicial" required />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end pt-4 space-x-3 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                  Agendar Cita
                </button>
            </div>
        </form>
    );
};

export default AppointmentForm;
