import React, { useState, useMemo } from 'react';
import type { Patient } from '../types';
import { UserIcon, ClipboardDocumentListIcon, PhoneIcon } from './icons';

interface ClinicalHistorySearchProps {
  patients: Patient[];
  onSelectPatient: (id: number) => void;
}

const ClinicalHistorySearch: React.FC<ClinicalHistorySearchProps> = ({ patients, onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Normalize a string by removing spaces, dots, dashes
  const normalizeDni = (val: string) => {
    return val.replace(/[\s\.\-]/g, '').toLowerCase();
  };

  const filteredPatients = useMemo(() => {
    const query = normalizeDni(searchTerm);
    if (!query) return [];

    return patients.filter((patient) => {
      const pDni = normalizeDni(patient.dni || '');
      return pDni.includes(query);
    });
  }, [patients, searchTerm]);

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
      {/* Upper header information banner */}
      <div className="bg-gradient-to-r from-primary to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center p-4">
          <ClipboardDocumentListIcon className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight font-sans">
            Buscador de Historia Clínica
          </h2>
          <p className="text-sm text-teal-50 max-w-xl font-sans font-medium">
            Ingrese el DNI del paciente para acceder a su Historia Clinica Electronica de forma rápida y segura. Al encontrar coincidencia, podrá abrir su ficha directamente.
          </p>
        </div>
      </div>

      {/* Main Search Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-150 dark:border-slate-700/60 space-y-6">
        <div className="space-y-2">
          <label htmlFor="dni-search-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Número de DNI del Paciente
          </label>
          <div className="relative rounded-lg shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="dni-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ej: 29.123.456 o 29123456..."
              className="w-full pl-11 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium transition duration-200"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                id="search-clear-btn"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results section */}
        <div className="pt-2">
          {searchTerm.trim() === '' ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 bg-slate-50/40 dark:bg-slate-900/10">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-slate-350 dark:text-slate-500 mb-3" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 font-sans">
                Aún no ha ingresado ningún criterio de búsqueda.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-sans">
                Escriba el número de documento nacional de identidad en la barra superior.
              </p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 bg-slate-50/40 dark:bg-slate-900/10">
              <svg className="mx-auto h-12 w-12 text-red-400/90 dark:text-red-500/80 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-bold text-slate-750 dark:text-slate-200 font-sans">
                No se encontraron coincidencias para el DNI "{searchTerm}"
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 sm:max-w-md mx-auto font-sans leading-relaxed">
                Verifique que los números coincidan o intente buscar ingresando la identificación sin puntos ni espacios intermedios.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans">
                  Coincidencias Encontradas ({filteredPatients.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex flex-col p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-primary-400 dark:hover:border-primary-500/50 hover:bg-teal-50/10 dark:hover:bg-slate-750/30 transition-all duration-300 shadow-sm"
                    id={`patient-match-${patient.id}`}
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={patient.avatarUrl}
                        alt={`${patient.name} ${patient.lastName}`}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-primary object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate">
                          {patient.name} {patient.lastName}
                        </h4>
                        <div className="mt-1 space-y-0.5 font-sans text-xs text-slate-500 dark:text-slate-400">
                          <p className="flex items-center space-x-1 font-semibold text-slate-700 dark:text-slate-300">
                            <UserIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span>DNI: {patient.dni}</span>
                          </p>
                          <p className="flex items-center space-x-1.5">
                            <PhoneIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span>{patient.phone}</span>
                          </p>
                          <p className="truncate" title={patient.healthInsurance}>
                            🏥 {patient.healthInsurance} ({patient.insuranceId})
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => onSelectPatient(patient.id)}
                        className="w-full py-2 px-4 rounded-lg bg-primary hover:bg-primary-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition duration-150 cursor-pointer"
                        id={`open-patient-card-${patient.id}`}
                      >
                        <ClipboardDocumentListIcon className="w-4 h-4" />
                        <span>Abrir HISTORIA CLINICA</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalHistorySearch;
