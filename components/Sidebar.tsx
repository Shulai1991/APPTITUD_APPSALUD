import React from 'react';
import type { View, User, Professional } from '../types';
import { UserIcon, HomeIcon, Cog6ToothIcon, CalendarDaysIcon, CurrencyDollarIcon, ClipboardDocumentListIcon, VideoCameraIcon } from './icons';

interface SidebarProps {
  view: View;
  setView: (view: View) => void;
  currentUser: User;
  onLogout: () => void;
  clinicLogo: string | null;
  clinicName: string;
  telemedicineActive?: boolean;
  professionals?: Professional[];
  layout?: 'sidebar' | 'topnav';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  view, 
  setView, 
  currentUser, 
  onLogout, 
  clinicLogo, 
  clinicName, 
  telemedicineActive,
  professionals = [],
  layout = 'sidebar'
}) => {
  const baseItems = currentUser.role === 'patient'
    ? [
        { name: 'HISTORIA CLÍNICA', view: 'patient_detail', icon: <UserIcon /> }
      ]
    : [
        { name: 'AGENDA', view: 'calendar', icon: <CalendarDaysIcon /> },
        { name: 'ARANCELES', view: 'price_list', icon: <CurrencyDollarIcon /> },
        { name: 'PACIENTES', view: 'patient_list', icon: <UserIcon /> },
        { name: 'FACTURACIÓN y CAJA', view: 'billing', icon: <CurrencyDollarIcon /> },
        { 
          name: 'BOT de WHATSAPP', 
          view: 'whatsapp_bot', 
          icon: (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )
        },
      ];

  const isProfessionalRole = currentUser.role === 'odontologist' || currentUser.role === 'specialist';
  const isTelemedicineEnabledForUser = !isProfessionalRole || professionals.some(p => {
    const cleanString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const matchLicense = currentUser.license && p.license && currentUser.license.trim() === p.license.trim();
    const matchName = cleanString(currentUser.fullName).includes(cleanString(p.name)) || cleanString(p.name).includes(cleanString(currentUser.fullName));
    return (matchLicense || matchName) && p.telemedicineEnabled;
  });

  const showTelemedicine = telemedicineActive && currentUser.role !== 'patient' && isTelemedicineEnabledForUser;

  const navItems = showTelemedicine
    ? [
        ...baseItems,
        { name: 'TELEMEDICINA', view: 'telemedicine', icon: <VideoCameraIcon /> }
      ]
    : baseItems;

  // Only show Backoffice option to users with permissions
  const showBackoffice = currentUser.role !== 'patient' && currentUser.permissions.canAccessBackoffice;

  if (layout === 'topnav') {
    return (
      <nav className="w-full h-14 bg-white dark:bg-slate-800 flex items-center justify-between px-3 sm:px-6 shadow-md border-b border-slate-200 dark:border-slate-700 font-sans z-20 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden select-none mr-4">
          {clinicLogo ? (
            <img 
              src={clinicLogo} 
              className="w-7 h-7 rounded-md object-contain bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-700/60 p-0.5 flex-shrink-0" 
              alt="Logo" 
            />
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-primary/10 dark:bg-primary-950/45 flex items-center justify-center text-primary dark:text-primary-450 font-bold flex-shrink-0 text-xs sm:text-sm border border-primary/15">
              {clinicName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-primary font-extrabold text-xs sm:text-sm uppercase tracking-wider truncate max-w-[120px] sm:max-w-[200px]">{clinicName}</span>
        </div>

        {/* Menu items horizontal */}
        <ul className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1 flex-1 px-2 no-scrollbar justify-center sm:justify-start">
          {navItems.map(item => {
            const isActive = view === item.view || (item.view === 'patient_list' && view === 'patient_detail');
            return (
              <li key={item.name} className="flex-shrink-0">
                <button
                  onClick={() => setView(item.view as View)}
                  className={`flex items-center px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold dark:bg-primary-950/20 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-100'
                  }`}
                  title={item.name}
                >
                  {React.cloneElement(item.icon as React.ReactElement, { className: 'w-4 h-4 flex-shrink-0' })}
                  <span className="ml-1.5 hidden lg:block text-xs font-semibold">{item.name}</span>
                </button>
              </li>
            );
          })}

          {showBackoffice && (
            <li className="flex-shrink-0">
              <button
                onClick={() => setView('backoffice')}
                className={`flex items-center px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  view === 'backoffice'
                    ? 'bg-primary/10 text-primary font-bold dark:bg-primary-950/20 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
                title="Administración"
              >
                <Cog6ToothIcon className="w-4 h-4 flex-shrink-0" />
                <span className="ml-1.5 hidden lg:block text-xs font-semibold">ADMINISTRACIÓN</span>
              </button>
            </li>
          )}
        </ul>

        {/* User / Logout Right section */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pl-2">
          <div className="hidden sm:block text-right pr-2 border-r border-slate-205 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{currentUser.fullName}</p>
            <span className="text-[8px] uppercase font-semibold text-primary dark:text-primary-450 block">Rol: {currentUser.role}</span>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 sm:p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-650 hover:text-red-700 dark:text-red-400 transition-colors font-semibold cursor-pointer"
            title="Cerrar Sesión"
          >
            <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-14 md:w-64 bg-white dark:bg-slate-800 flex flex-col shadow-lg h-screen">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 h-14 flex items-center justify-center md:justify-start gap-2 overflow-hidden select-none">
        {clinicLogo ? (
          <img 
            src={clinicLogo} 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md object-contain bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-700/60 p-0.5 flex-shrink-0" 
            alt="Logo" 
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-primary/10 dark:bg-primary-950/45 flex items-center justify-center text-primary dark:text-primary-450 font-bold flex-shrink-0 text-xs sm:text-sm border border-primary/15">
            {clinicName.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="hidden md:flex flex-col min-w-0 flex-1">
          <span className="text-primary font-extrabold text-[12px] leading-tight uppercase tracking-wider break-words">{clinicName}</span>
          <span className="text-[10px] text-bordo dark:text-bordo-400 font-normal tracking-widest leading-none uppercase mt-0.5">PANEL</span>
        </div>
      </div>
      
      {/* Menu items */}
      <ul className="flex-1 p-1.5 font-sans overflow-y-auto">
        {navItems.map(item => {
          const isActive = view === item.view || (item.view === 'patient_list' && view === 'patient_detail');
          return (
            <li key={item.name}>
              <button
                onClick={() => setView(item.view as View)}
                className={`w-full flex items-center p-2.5 my-0.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold dark:bg-primary-950/20 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement, { className: 'w-4 h-4 md:w-4.5 md:h-4.5 flex-shrink-0' })}
                <span className="ml-2 hidden md:block text-xs md:text-sm">{item.name}</span>
              </button>
            </li>
          );
        })}

        {/* Backoffice Button (Dynamic by permission) */}
        {showBackoffice && (
          <li>
            <button
              onClick={() => setView('backoffice')}
              className={`w-full flex items-center p-2.5 my-0.5 rounded-lg transition-colors cursor-pointer ${
                view === 'backoffice'
                  ? 'bg-primary/10 text-primary font-bold dark:bg-primary-950/20 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <Cog6ToothIcon className="w-4 h-4 md:w-4.5 md:h-4.5 flex-shrink-0" />
              <span className="ml-2 hidden md:block text-xs md:text-sm">ADMINISTRACIÓN / BACK</span>
            </button>
          </li>
        )}
      </ul>

      {/* User Info / Logout Section */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 font-sans flex-shrink-0">
        <div className="hidden md:block mb-2 px-1.5">
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.fullName}</p>
          <span className="text-[8.5px] uppercase font-bold tracking-wider text-primary dark:text-primary-450 block mt-0.5">
            Rol: {currentUser.role}
          </span>
        </div>

        <button
          onClick={onLogout}
          className="w-full h-9 flex items-center justify-center md:justify-start p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-400 transition-colors font-semibold text-xs cursor-pointer"
        >
          {/* Logout Icon */}
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span className="ml-2 hidden md:block text-xs">Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
