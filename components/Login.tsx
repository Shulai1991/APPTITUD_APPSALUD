import React, { useState } from 'react';
import type { User, MedicalCenter, Patient } from '../types';
import { MASTER_USER } from '../constants';
import { ApptitudLogo } from './icons';

interface LoginProps {
  onLogin: (user: User, centerId: string | null) => void;
  centers: MedicalCenter[];
  users: User[];
  patients?: Patient[];
}

const Login: React.FC<LoginProps> = ({ onLogin, centers, users, patients = [] }) => {
  const [selectedCenterId, setSelectedCenterId] = useState<string>(() => {
    const active = centers.find(c => c.active);
    return active ? active.id : (centers[0]?.id || '');
  });
  const [isMasterMode, setIsMasterMode] = useState(false);
  const [isPatientMode, setIsPatientMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactAsunto, setContactAsunto] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  const currentCenter = centers.find(c => c.id === selectedCenterId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim().toLowerCase();

    // 1. PATIENT LOGIN MODE (BY DNI)
    if (isPatientMode) {
      const patientDniInput = username.trim().replace(/\./g, '');
      if (!patientDniInput) {
        setError('Por favor, ingrese su número de DNI.');
        return;
      }

      const matchedPatient = (patients || []).find(p => {
        const cleanDni = p.dni.trim().replace(/\./g, '');
        return cleanDni === patientDniInput;
      });

      if (!matchedPatient) {
        setError('No se encontró ningún paciente registrado con ese número de DNI.');
        return;
      }

      const patientUser: User = {
        id: matchedPatient.id,
        username: matchedPatient.dni,
        fullName: `${matchedPatient.name} ${matchedPatient.lastName}`,
        role: 'patient',
        permissions: {
          canAccessBackoffice: false,
          canManageUsers: false,
          canEditSettings: false,
          canEditPatients: false,
          canManageAppointments: false,
          canViewClinicalHistory: true,
        },
        active: true,
        centerId: matchedPatient.centerId || selectedCenterId
      };

      onLogin(patientUser, matchedPatient.centerId || selectedCenterId);
      return;
    }

    // 2. MASTER LOGIN MODE
    if (isMasterMode) {
      if (trimmedUser === MASTER_USER.username && password === MASTER_USER.password) {
        onLogin(MASTER_USER, null);
      } else {
        setError('Credenciales de Usuario Maestro incorrectas.');
      }
      return;
    }

    // 3. CLINICAL USER LOGIN (SCOPED TO SELECTED CENTER)
    if (!currentCenter) {
      setError('Por favor, seleccione una clínica o sede válida.');
      return;
    }

    if (!currentCenter.active) {
      setError('La sede seleccionada se encuentra actualmente inactiva en el sistema.');
      return;
    }

    const foundUser = users.find(
      u => u.username.toLowerCase() === trimmedUser && u.centerId === selectedCenterId
    );

    if (!foundUser) {
      setError(`El usuario no existe o no tiene asignado acceso en la sede "${currentCenter.name}".`);
      return;
    }

    if (!foundUser.active) {
      setError('Esta cuenta de usuario se encuentra inactiva. Contacte al administrador.');
      return;
    }

    if (foundUser.password !== password) {
      setError('Contraseña incorrecta.');
      return;
    }

    onLogin(foundUser, selectedCenterId);
  };

  const desktopBanner = currentCenter?.loginBannerDesktop;
  const mobileBanner = currentCenter?.loginBannerMobile;

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden bg-slate-100 dark:bg-slate-900 transition-all duration-300">
      {/* Acceso disimulado para Usuario Maestro en el costado superior izquierdo */}
      <button
        type="button"
        id="hidden-master-btn"
        onClick={() => {
          setIsMasterMode(prev => !prev);
          setIsPatientMode(false);
          setError('');
          setUsername('');
          setPassword('');
        }}
        className="absolute top-4 left-4 z-50 p-2 rounded-xl text-slate-400/20 hover:text-slate-400 dark:text-slate-600/20 dark:hover:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer"
        title="Acceso de Administración"
      >
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>
      </button>

      {/* Background container for desktop banner */}
      {desktopBanner && (
        <div 
          className="hidden md:block fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat transition-all duration-500 animate-fade-in" 
          style={{ backgroundImage: `url(${desktopBanner})` }}
        />
      )}
      
      {/* Background container for mobile banner */}
      {mobileBanner && (
        <div 
          className="block md:hidden fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat transition-all duration-500 animate-fade-in" 
          style={{ backgroundImage: `url(${mobileBanner})` }}
        />
      )}

      {/* High-fidelity overlay if custom banner is displayed to guarantee text contrast while keeping the background image beautifully sharp and vivid */}
      {(desktopBanner || mobileBanner) && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-950/15" />
      )}

      {/* Symmetrical container for the login card */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Branding header: perfectly aligned, prolijo and professional */}
        <div className="text-center mb-6">
          <div className="flex justify-center items-center mb-2 transition-all duration-300">
            <ApptitudLogo />
          </div>
          
          <div className="bg-white/95 dark:bg-slate-850/95 backdrop-blur-md py-4 px-5 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 inline-block w-full">
            <div className="flex items-center justify-center gap-3.5 text-left">
              {!isMasterMode && currentCenter?.logo ? (
                <img 
                  src={currentCenter.logo} 
                  alt="Logo del Consultorio" 
                  className="w-12 h-12 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white p-1 flex-shrink-0 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary dark:bg-slate-700 text-2xl font-bold flex-shrink-0 border border-primary/10">
                  🏢
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight leading-snug truncate">
                  {isMasterMode ? "Portal de Infraestructura" : isPatientMode ? "Portal de Pacientes" : currentCenter?.name || "Seleccione su clínica"}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate leading-tight font-sans">
                  {isMasterMode 
                    ? "Gestión centralizada de instituciones odontológicas." 
                    : isPatientMode
                    ? "Acceso restringido para consultar su Historia Clínica."
                    : currentCenter?.address || "Por favor seleccione su consultorio asignado."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 py-6 px-4 shadow-2xl rounded-3xl sm:px-8 border border-slate-200/60 dark:border-slate-700/60 transition-all duration-300">
          
          {/* TAB / MODE SWITCHER */}
          {isMasterMode && (
            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl mb-6 font-sans">
              <button
                type="button"
                onClick={() => {
                  setIsMasterMode(false);
                  setIsPatientMode(false);
                  setError('');
                  setUsername('');
                  setPassword('');
                }}
                className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer truncate ${
                  !isMasterMode && !isPatientMode 
                    ? 'bg-white dark:bg-slate-650 text-slate-800 dark:text-slate-100 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                🏢 Sede
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMasterMode(true);
                  setIsPatientMode(false);
                  setError('');
                  setUsername('');
                  setPassword('');
                }}
                className="flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer truncate bg-primary text-white shadow-sm"
              >
                👑 Maestro
              </button>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900/30">
                ⚠️ {error}
              </div>
            )}

            {/* 1. CENTER SELECTOR (ONLY SHOWN IN NORMAL CLINIC USER LOGIN) */}
            {!isMasterMode && !isPatientMode && (
              <div>
                <label htmlFor="center" className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5 flex justify-between">
                  <span>Seleccione Sede / Institución</span>
                  {currentCenter && !currentCenter.active && (
                    <span className="text-red-650 dark:text-red-400 font-bold">🚫 Inactivo</span>
                  )}
                </label>
                <select
                  id="center"
                  value={selectedCenterId}
                  onChange={(e) => {
                    setSelectedCenterId(e.target.value);
                    setError('');
                  }}
                  className="block h-11 w-full px-3.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary text-sm bg-white dark:bg-slate-700 text-slate-850 dark:text-slate-100 font-medium cursor-pointer"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {!c.active ? "(🚫 Inactivo)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 dark:text-slate-305">
                {isPatientMode ? 'DNI del Paciente' : isMasterMode ? 'Usuario Maestro' : 'Usuario'}
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isPatientMode ? "ej. 29.123.456" : isMasterMode ? "master" : "ej. dra.juliana"}
                  className="appearance-none block h-11 w-full px-3.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium font-sans"
                />
              </div>
            </div>

            {!isPatientMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Contraseña
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="appearance-none block h-11 w-full px-3.5 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className={`w-full h-11 flex justify-center items-center px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white transition-colors cursor-pointer ${
                  isMasterMode 
                    ? 'bg-primary hover:bg-primary-650' 
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {isMasterMode ? 'Entrar a Infraestructura 👑' : isPatientMode ? 'Consultar Historia Clínica 🏥' : 'Conectar Consultorio 🔌'}
              </button>
            </div>
          </form>



        </div>

        {/* Footer Area with Copyright and professional Contact link */}
        <div className="mt-8 text-center space-y-2.5 relative z-10 select-none animate-fade-in">
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-450 font-medium">
            Todos los derechos reservados Apptitud ® | República Argentina
          </p>
          <div>
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-white/90 dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-teal-400/60 dark:hover:border-teal-650/60 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/80 transition-all shadow-sm cursor-pointer"
            >
              ✉️ Contacto
            </button>
          </div>
        </div>

      </div>

      {/* Dynamic contact modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60 p-6 md:p-8 space-y-5">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50 flex items-center gap-2 font-sans">
                  📬 Enviar Mensaje a Apptitud
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight font-sans">
                  Déjenos su consulta y nos pondremos en contacto a la brevedad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsContactOpen(false);
                  setIsSubmitSuccess(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isSubmitSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm border border-green-200 dark:border-green-800/40">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">
                    ¡Mensaje Preparado con Éxito!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px] mx-auto font-sans leading-relaxed">
                    Se abrirá su cliente de correo predeterminado para finalizar de forma segura el envío certificado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsContactOpen(false);
                    setIsSubmitSuccess(false);
                  }}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-750 hover:bg-slate-850 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer font-sans"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  
                  // Construct and trigger the mailto link
                  const subject = encodeURIComponent(`Mensaje Apptitud - ${contactAsunto || 'Consulta General'}`);
                  const bodyMsg = encodeURIComponent(
                    `Hola Juliana,\n\nHas recibido un nuevo mensaje de contacto a través de la aplicación:\n\n` +
                    `- Nombre y Apellido: ${contactName}\n` +
                    `- Teléfono de Contacto: ${contactPhone || 'No proporcionado'}\n` +
                    `- Asunto: ${contactAsunto}\n\n` +
                    `Mensaje:\n${contactMessage}\n\n--\nEnviado desde el Portal de Gestión de Apptitud.`
                  );
                  
                  window.location.href = `mailto:julianamariapelaez@gmail.com?subject=${subject}&body=${bodyMsg}`;
                  
                  setTimeout(() => {
                    setIsSubmitting(false);
                    setIsSubmitSuccess(true);
                    // Clear inputs
                    setContactName('');
                    setContactAsunto('');
                    setContactMessage('');
                    setContactPhone('');
                  }, 800);
                }}
                className="space-y-4 text-left"
              >
                {/* Nombre y Apellido */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-sans">
                    Nombre y Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 bg-slate-50/10 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 font-sans bg-transparent"
                  />
                </div>

                {/* Número de teléfono */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-sans">
                    Número de teléfono <span className="text-slate-400 italic font-normal text-[10px]">(Opcional)</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Ej. +54 9 11 1234-5678"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 bg-slate-50/10 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 font-sans bg-transparent"
                  />
                </div>

                {/* Asunto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-sans">
                    Asunto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactAsunto}
                    onChange={(e) => setContactAsunto(e.target.value)}
                    placeholder="Ej. Soporte Técnico / Consulta Comercial"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 bg-slate-50/10 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 font-sans bg-transparent"
                  />
                </div>

                {/* Mensaje */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-sans">
                    Mensaje <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escriba su mensaje aquí..."
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 bg-slate-50/10 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 resize-none font-sans bg-transparent"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsContactOpen(false);
                      setIsSubmitSuccess(false);
                    }}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer text-center font-sans"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-700/60 text-white text-xs font-bold rounded-lg transition shadow-md hover:shadow-lg disabled:cursor-not-allowed cursor-pointer text-center font-sans"
                  >
                    {isSubmitting ? 'Procesando...' : '🚀 Enviar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
