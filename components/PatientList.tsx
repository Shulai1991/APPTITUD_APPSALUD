import React, { useState } from 'react';
import type { Patient, Appointment, Professional } from '../types';
import { PhoneIcon, EnvelopeIcon, PlusIcon, CalendarDaysIcon, UserIcon } from './icons';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (id: number) => void;
  onAddPatient: () => void;
  canEditPatients?: boolean;
  appointments?: Appointment[];
  professionals?: Professional[];
  viewMode?: 'grid' | 'table';
}

const PatientList: React.FC<PatientListProps> = ({ 
  patients, 
  onSelectPatient, 
  onAddPatient, 
  canEditPatients,
  appointments = [],
  professionals = [],
  viewMode = 'grid'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'present_history'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only appointments from the current patient list (scoped to the center, etc.) that are 'present'
  const patientIds = new Set(patients.map(p => p.id));
  const presentAppointments = appointments.filter(apt => apt.status === 'present' && patientIds.has(apt.patientId));

  // Filter patients by name, lastname, or specifically DNI (ignoring dots if clean query is searched)
  const filteredPatients = patients.filter(patient => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const cleanDni = (patient.dni || '').replace(/\D/g, '');
    const cleanQuery = query.replace(/\D/g, '');

    return (
      (patient.name || '').toLowerCase().includes(query) ||
      (patient.lastName || '').toLowerCase().includes(query) ||
      (patient.dni || '').toLowerCase().includes(query) ||
      (cleanQuery && cleanDni.includes(cleanQuery))
    );
  });

  return (
    <div className="animate-fade-in">
      {/* Sub tabs switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-6 gap-4">
        <div className="flex space-x-1 bg-slate-200/80 dark:bg-slate-800/60 p-1 rounded-xl self-start font-sans">
          <button
            type="button"
            onClick={() => setActiveSubTab('list')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            👥 Directorio de Pacientes
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('present_history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'present_history'
                ? 'bg-white dark:bg-slate-700 text-slate-850 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            ✅ Historial de Presentes
          </button>
        </div>

        {activeSubTab === 'list' && (
          <div>
            {canEditPatients !== false ? (
              <button onClick={onAddPatient} className="flex items-center space-x-1.5 bg-primary hover:bg-primary-600 text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm shadow-sm">
                  <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Nuevo Paciente</span>
              </button>
            ) : (
              <span className="text-[10px] sm:text-xs font-sans font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 py-1.5 px-2.5 sm:py-2.5 sm:px-3 rounded-lg border border-slate-250 dark:border-slate-755" title="Su cuenta no tiene permisos para crear pacientes.">
                🔒 Registro Bloqueado
              </span>
            )}
          </div>
        )}
      </div>

      {activeSubTab === 'list' ? (
        <div>
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/60">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white font-sans">Directorio de Pacientes</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filtre y busque de manera instantánea ingresando el DNI, Nombre o Apellido.</p>
            </div>
            
            <div className="relative w-full md:max-w-xs" id="pacientes-search-container">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar por DNI o Nombre..."
                className="block w-full pl-9 pr-8 py-2 border border-slate-300 dark:border-slate-650 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-205 placeholder-slate-450 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                id="search-input-dni"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-205 dark:border-slate-705 p-6 space-y-3 font-sans">
              <span className="text-4xl block">🔍</span>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">No se encontraron pacientes para "{searchQuery}"</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">Verifique el número de documento ingresado o intente buscando por el apellido o nombre de pila del afiliado.</p>
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
              >
                Limpiar Búsqueda
              </button>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/60 font-sans">
              <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-700/60">
                <thead className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider">Paciente</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider">Identificación</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider">Contacto</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider">Dirección Sede</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                  {filteredPatients.map(patient => (
                    <tr 
                      key={patient.id} 
                      onClick={() => onSelectPatient(patient.id)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap flex items-center">
                        <img 
                          src={patient.avatarUrl} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover mr-3 border border-slate-205 dark:border-slate-650"
                        />
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">{patient.name} {patient.lastName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">P-{String(patient.id).padStart(4, '0')}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-primary dark:text-primary-400">DNI {patient.dni || 'S/D'}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-650 dark:text-slate-300">
                        <div className="flex items-center">
                          <PhoneIcon className="w-3 h-3 mr-1 text-primary dark:text-primary-400" />
                          <span>{patient.phone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-[220px]" title={patient.email || ''}>
                        {patient.email ? (
                          <div className="flex items-center">
                            <EnvelopeIcon className="w-3 h-3 mr-1 text-primary dark:text-primary-400" />
                            <span>{patient.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">S/D</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-[220px]" title={patient.address || ''}>
                        {patient.address || <span className="text-slate-450 italic">Sin dirección</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient.id)}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer p-5 flex flex-col border border-slate-100 dark:border-slate-700/40"
                >
                  <div className="flex items-center mb-4">
                    <img
                      src={patient.avatarUrl}
                      alt={`${patient.name} ${patient.lastName}`}
                      className="w-16 h-16 rounded-full mr-4 border-2 border-primary object-cover"
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-white">
                        {patient.name} {patient.lastName}
                      </h3>
                      <p className="text-xs text-indigo-650 dark:text-indigo-400 font-bold mt-0.5">DNI: {patient.dni || 'S/D'}</p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">Ficha: P-{String(patient.id).padStart(4, '0')}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-auto text-xs">
                      <div className="flex items-center text-slate-600 dark:text-slate-350">
                          <PhoneIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                          <span>{patient.phone}</span>
                      </div>
                      {patient.email && (
                          <div className="flex items-center text-slate-600 dark:text-slate-350">
                              <EnvelopeIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                              <span className="truncate">{patient.email}</span>
                          </div>
                      )}
                      {patient.address && (
                          <div className="flex items-center text-slate-500 dark:text-slate-400">
                            <svg className="w-3.5 h-3.5 mr-2 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{patient.address}</span>
                          </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <span>✅ Historial de Pacientes Presentes en la Clínica</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                {presentAppointments.length} turnos completados
              </span>
            </h3>
          </div>

          {presentAppointments.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400 font-sans">
              No se registran pacientes con turnos en estado "Presente" en el sistema.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-2">Fecha y Hora</th>
                    <th className="py-3 px-2">Paciente</th>
                    <th className="py-3 px-2">Profesional</th>
                    <th className="py-3 px-2">Motivo de Turno</th>
                    <th className="py-3 px-2">Sede/Administrador</th>
                    <th className="py-3 px-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-750 font-sans text-slate-700 dark:text-slate-350">
                  {presentAppointments
                    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
                    .map(apt => {
                      const patient = patients.find(p => p.id === apt.patientId);
                      const prof = professionals.find(p => p.id === apt.professionalId);
                      
                      return (
                        <tr key={apt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                          <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-white">
                            <span className="block text-primary">{apt.date.split('-').reverse().join('/')}</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-400 font-normal">{apt.time} hs</span>
                          </td>
                          <td className="py-3.5 px-2">
                            <button 
                              type="button" 
                              onClick={() => { if (patient) onSelectPatient(patient.id); }}
                              className="font-bold flex items-center space-x-2 text-primary hover:underline group cursor-pointer text-left focus:outline-none"
                            >
                              {patient ? (
                                <>
                                  <img src={patient.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover border border-primary-200" />
                                  <span>{patient.name} {patient.lastName}</span>
                                </>
                              ) : (
                                <span>{apt.patientName}</span>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-2">
                            <span className="font-semibold block">{prof?.name || `Profesional #${apt.professionalId}`}</span>
                            <span className="text-[10px] text-slate-405 dark:text-slate-400 font-normal">{prof?.specialty || 'Odontología'}</span>
                          </td>
                          <td className="py-3.5 px-2">
                             <span className="italic block max-w-xs truncate" title={apt.reason}>{apt.reason || 'Consulta'}</span>
                          </td>
                          <td className="py-3.5 px-2">
                            <span className="opacity-90">{apt.createdBy || 'Sistema'}</span>
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            {patient && (
                              <button 
                                type="button" 
                                onClick={() => onSelectPatient(patient.id)}
                                className="px-2.5 py-1 text-[10px] font-extrabold bg-primary hover:bg-primary-600 text-white rounded transition shadow-sm cursor-pointer"
                              >
                                Ver Ficha
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientList;
