import React from 'react';

const iconProps = {
  className: "w-6 h-6",
  strokeWidth: 1.5,
  stroke: "currentColor",
  fill: "none",
  viewBox: "0 0 24 24"
};

export const UserGroupIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962A3.75 3.75 0 0115 9.75c0 1.036-.393 2.004-.959 2.753M15 3a3.75 3.75 0 01.94 7.428m-9.445-4.28a3.75 3.75 0 01.94 7.428m-9.445-4.28a3.75 3.75 0 01.94 7.428M3 13.5a3.75 3.75 0 01.94-7.428m-9.445 4.28a3.75 3.75 0 01.94-7.428" /></svg>;
export const DocumentTextIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
export const HomeIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
export const PhoneIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
export const EnvelopeIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
export const CakeIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15.75a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V14.25m18 1.5v-1.5a.75.75 0 00-.75-.75H3.75a.75.75 0 00-.75.75v1.5m18-1.5H3.75a.75.75 0 00-.75.75v1.5a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75v-1.5a.75.75 0 00-.75-.75zM12 6.75v3.75m-3.75-3.75v3.75m7.5-3.75v3.75M3 12h18M3 12a9 9 0 0018 0H3z" /></svg>;
export const UserIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
export const ClipboardDocumentListIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25v8.25A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" /></svg>;
export const CurrencyDollarIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.577-.437 1.28-.659 2.003-.659 1.519 0 2.98.835 3.96 2.088v-2.148c-1.246-1.168-3.04-1.89-4.96-1.89-3.326 0-6.19 2.501-6.19 6.22 0 3.469 2.373 5.868 5.433 6.22" /></svg>;
export const PencilSquareIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
export const DocumentPlusIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
export const ArrowDownTrayIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
export const PaperAirplaneIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;
// Fix: Corrected typo from `export.const` to `export const`.
export const PlusIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
export const TrashIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
export const XMarkIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
export const AppLogoIcon: React.FC<{className?: string}> = ({className}) => <svg fill="currentColor" viewBox="0 0 24 24" {...iconProps} className={className || iconProps.className}><path d="M12.9,2.62a1,1,0,0,0-1.8,0L10,5.78,9,5.22a1,1,0,0,0-1.28.84l-.5,3.31L4.08,9.08a1,1,0,0,0-1.4.58l-1.5,3.2a1,1,0,0,0,.6,1.55l3.2,1.5, .29,1a1,1,0,0,0,1,.8H9.36l.29,1,3.2,1.5a1,1,0,0,0,1.15-.22,1,1,0,0,0,.45-1.33l-1.5-3.2a1,1,0,0,0-1.4-.58L8.38,13l-.5-3.31a1,1,0,0,0-1.28-.84L5.5,9.39l1.5-3.2,3.14.29a1,1,0,0,0,1-.8Z M19.82,2.18a1,1,0,0,0-1.4,0l-6,6a1,1,0,0,0,0,1.4l6,6a1,1,0,0,0,1.4,0l6-6a1,1,0,0,0,0-1.4Z"/></svg>;
export const SunIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
export const MoonIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25c0 5.385 4.365 9.75 9.75 9.75 2.572 0 4.921-.996 6.752-2.625z" /></svg>;
export const Cog6ToothIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.03.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.645.87l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.127.332-.183.582-.495.645-.87l.213-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
export const DocumentArrowDownIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
export const CalendarDaysIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zm-3-3h.008v.008H9v-.008zm0 3h.008v.008H9v-.008zm-3-3h.008v.008H6v-.008zm0 3h.008v.008H6v-.008zm6-3h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zm3-3h.008v.008H15v-.008zm0 3h.008v.008H15v-.008z" /></svg>;
export const CameraIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008v-.008z" /></svg>;
export const ArrowUpTrayIcon: React.FC<{className?: string}> = ({className}) => <svg {...iconProps} className={className || iconProps.className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;

export const VideoCameraIcon: React.FC<{className?: string}> = ({className}) => (
  <svg {...iconProps} className={className || iconProps.className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export const ApptitudLogo: React.FC<{className?: string}> = ({className}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className || ''}`}>
      <svg viewBox="0 0 400 240" className="w-[190px] sm:w-[210px] h-auto select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rocketGrad" x1="140" y1="180" x2="260" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="aGrad" x1="160" y1="190" x2="220" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
        
        {/* Main stylized A */}
        <path d="M 160,190 L 195,100 L 210,100 L 240,190 H 218 L 211,162 H 178 L 170,190 Z" fill="url(#aGrad)" />
        <path d="M 183,148 L 206,148 L 202,130 L 187,130 Z" fill="#ffffff" opacity="0.15" />
        
        {/* Sweep curve representing propulsion trail */}
        <path d="M 172,150 Q 210,145 250,118 T 305,52" stroke="url(#rocketGrad)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
        
        {/* Propulsion bubbles */}
        <circle cx="272" cy="118" r="3.5" fill="#14B8A6" />
        <circle cx="286" cy="103" r="4.5" fill="#0D9488" />
        <circle cx="300" cy="87" r="5" fill="#14B8A6" />
        <circle cx="258" cy="132" r="2.5" fill="#1e3a8a" />
        <circle cx="242" cy="144" r="2" fill="#0f172a" />

        {/* Rocket ship pointing to upper right */}
        <g transform="translate(305, 52) rotate(45) scale(0.9)">
          {/* Flame */}
          <path d="M -15,0 C -22,-5 -25,0 -35,0 C -25,5 -22,-5 -15,0" fill="#f97316" />
          <path d="M -15,-2 C -18,-5 -20,-2 -26,-2 C -20,0 -18,-2 -15,-2" fill="#eab308" />
          
          {/* Main rocket capsule */}
          <path d="M -15,-8 L 5,-8 C 15,-8 22,-3 28,0 C 22,3 15,8 5,8 L -15,8 Z" fill="url(#rocketGrad)" />
          
          {/* Fins */}
          <path d="M -14,-8 L -20,-15 L -10,-8" fill="#1e293b" />
          <path d="M -14,8 L -20,15 L -10,8" fill="#1e293b" />
          <path d="M -7,-8 L -14,-17 L 0,-8" fill="url(#rocketGrad)" />
          <path d="M -7,8 L -14,17 L 0,8" fill="url(#rocketGrad)" />
          
          {/* Window */}
          <circle cx="2" cy="0" r="3.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        </g>

        {/* Business typography matching official logo */}
        <text x="200" y="210" textAnchor="middle" fill="#0c2340" className="font-sans dark:fill-white" style={{ fontSize: '27px', letterSpacing: '0.07em', fontWeight: 900 }}>
          APP-TITUD
        </text>
        <text x="200" y="232" textAnchor="middle" fill="#64748B" className="font-sans dark:fill-slate-400" style={{ fontSize: '13px', letterSpacing: '0.26em', fontWeight: 500 }}>
          Soluciones Integrales
        </text>
      </svg>
    </div>
  );
};

export const PaintbrushIcon: React.FC<{className?: string}> = ({className}) => (
  <svg {...iconProps} className={className || iconProps.className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l1.5 1.5.75-.75V8.25M3 16.25v2.5a1.5 1.5 0 001.5 1.5h2.5l5.22-5.22a2.121 2.121 0 013-3l1.78 1.78a2.12 2.12 0 01.3 3L11.75 22m4.5-9L21 6.12a3 3 0 00-4.24-4.24L9.53 9.11m5.47 2.14l-1.5-1.5" />
  </svg>
);

export const LayoutIcon: React.FC<{className?: string}> = ({className}) => (
  <svg {...iconProps} className={className || iconProps.className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18M2.25 9h19.5" />
  </svg>
);