import React, { useState } from 'react';
import type { Patient, Certificate, User } from '../types';
import { PaperAirplaneIcon } from './icons';

interface CertificateCreatorProps {
  patient: Patient;
  currentUser?: User;
  onSave: (certificate: Omit<Certificate, 'id'>) => void;
}

const CertificateCreator: React.FC<CertificateCreatorProps> = ({ patient, currentUser, onSave }) => {
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getCurrentTime = () => {
    const today = new Date();
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [date, setDate] = useState(getTodayDate());
  const [time, setTime] = useState(getCurrentTime());
  const [diagnosis, setDiagnosis] = useState('');
  const [restDays, setRestDays] = useState<string>('');

  const professionalName = currentUser?.fullName || 'Profesional no registrado';
  const professionalLicense = currentUser?.license || 'M.P. No informada';

  const getWhatsAppMessage = () => {
    const restText = restDays ? `\nSe recomienda reposo por: ${restDays} días.` : '';
    return `*CONSTANCIA DE ATENCIÓN MÉDICA*\n\nPor la presente se deja constancia de que el/la paciente *${patient.name} ${patient.lastName}* (DNI: ${patient.dni}) fue atendido/a en nuestro centro médico el día *${date.split('-').reverse().join('/')}* a las *${time} hs*.\n\n*Diagnóstico:* ${diagnosis}${restText}\n\n*Firmado por:* Dr/a. ${professionalName}\n*Matrícula:* ${professionalLicense}\n\n---\nEste es un documento emitido electrónicamente.`;
  };

  const handleSendWhatsApp = () => {
    const message = getWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date,
      time,
      diagnosis,
      restDays: restDays ? parseInt(restDays, 10) : undefined,
      professionalName,
      professionalLicense,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left font-sans">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-150 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Paciente</span>
          <span className="font-bold text-slate-800 dark:text-white">{patient.name} {patient.lastName}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">DNI</span>
          <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{patient.dni}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cert-date" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Fecha de Atención
          </label>
          <input
            id="cert-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-650 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 bg-transparent"
            required
          />
        </div>

        <div>
          <label htmlFor="cert-time" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Hora de Atención
          </label>
          <input
            id="cert-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-650 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 bg-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="cert-diagnosis" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          Diagnóstico y Observaciones Clinicas
        </label>
        <textarea
          id="cert-diagnosis"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Ej: Paciente asiste a consulta de urgencia por odontalgia aguda en pieza 46. Se realiza apertura de cámara y toilette de conducto..."
          rows={4}
          className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 bg-transparent resize-y"
          required
        />
      </div>

      <div>
        <label htmlFor="cert-rest" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          Recomendación de Reposo Médico (Días - Opcional)
        </label>
        <input
          id="cert-rest"
          type="number"
          min="0"
          value={restDays}
          onChange={(e) => setRestDays(e.target.value)}
          placeholder="Ej. 2 (Dejar vacío si no requiere)"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-650 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 bg-transparent"
        />
      </div>

      {/* RÚBRICA AUTOMÁTICA DEL USUARIO LOGUEADO */}
      <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
        <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>✍️ Firma y Matrícula Electrónica Automática</span>
        </h4>
        
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-1">
          <div>
            <span className="text-[9px] uppercase text-slate-400 font-bold block">Profesional Firmante</span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase">Dr/a. {professionalName}</span>
          </div>
          <div className="sm:text-right">
            <span className="text-[9px] uppercase text-slate-400 font-bold block">Matrícula Provincial / Nacional</span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{professionalLicense}</span>
          </div>
        </div>
        
        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic leading-snug">
          Al guardar esta constancia, se registrará de forma inalterable y automática con su usuario en el expediente clínico del paciente.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3">
        <button
          type="submit"
          className="order-1 sm:order-2 bg-primary hover:bg-primary-600 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition shadow-md cursor-pointer text-center"
        >
          Guardar Constancia
        </button>
        <button
          type="button"
          onClick={handleSendWhatsApp}
          disabled={!diagnosis}
          className="order-2 sm:order-1 flex items-center justify-center space-x-1.5 bg-green-600 hover:bg-green-750 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition disabled:bg-slate-350 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer text-center"
        >
          <PaperAirplaneIcon className="w-4 h-4" />
          <span>Compartir WhatsApp</span>
        </button>
      </div>
    </form>
  );
};

export default CertificateCreator;
