import React, { useState } from 'react';
import type { User, MedicalCenter, UserRole } from '../types';
import { PlusIcon, TrashIcon, PencilSquareIcon } from './icons';
import ConfirmDialog from './ConfirmDialog';
import { compressImage } from '../imageUtils';

interface MasterBackofficeProps {
  currentUser: User;
  centers: MedicalCenter[];
  onUpdateCenters: (centers: MedicalCenter[]) => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  onLogout: () => void;
}

const MasterBackoffice: React.FC<MasterBackofficeProps> = ({
  currentUser,
  centers,
  onUpdateCenters,
  users,
  onUpdateUsers,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'centers' | 'global_users'>('centers');
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Custom confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    danger: false,
  });
  
  // Center form state
  const [centerId, setCenterId] = useState('');
  const [centerName, setCenterName] = useState('');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerCuil, setCenterCuil] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerActive, setCenterActive] = useState(true);
  const [centerLogo, setCenterLogo] = useState<string | null>(null);
  const [centerBannerDesktop, setCenterBannerDesktop] = useState<string | null>(null);
  const [centerBannerMobile, setCenterBannerMobile] = useState<string | null>(null);

  // User form state (for global user management)
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('123');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [userCenterId, setUserCenterId] = useState('');
  const [userActive, setUserActive] = useState(true);

  // Helper to handle logo base64 conversion
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, 400, 400, 0.7)
        .then(compressedUrl => {
          setCenterLogo(compressedUrl);
        })
        .catch(err => {
          console.error("Error compressing logo:", err);
          const reader = new FileReader();
          reader.onloadend = () => {
            setCenterLogo(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const handleBannerDesktopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, 1920, 1080, 0.85)
        .then(compressedUrl => {
          setCenterBannerDesktop(compressedUrl);
        })
        .catch(err => {
          console.error("Error compressing desktop banner:", err);
          const reader = new FileReader();
          reader.onloadend = () => {
            setCenterBannerDesktop(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const handleBannerMobileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, 1080, 1920, 0.85)
        .then(compressedUrl => {
          setCenterBannerMobile(compressedUrl);
        })
        .catch(err => {
          console.error("Error compressing mobile banner:", err);
          const reader = new FileReader();
          reader.onloadend = () => {
            setCenterBannerMobile(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const startAddCenter = () => {
    setCenterId(`sede-${Date.now().toString().slice(-6)}`);
    setCenterName('');
    setCenterAddress('');
    setCenterCuil('');
    setCenterPhone('');
    setCenterActive(true);
    setCenterLogo(null);
    setCenterBannerDesktop(null);
    setCenterBannerMobile(null);
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEditCenter = (center: MedicalCenter) => {
    setCenterId(center.id);
    setCenterName(center.name);
    setCenterAddress(center.address);
    setCenterCuil(center.cuil);
    setCenterPhone(center.phone);
    setCenterActive(center.active);
    setCenterLogo(center.logo);
    setCenterBannerDesktop(center.loginBannerDesktop || null);
    setCenterBannerMobile(center.loginBannerMobile || null);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSaveCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerName.trim() || !centerAddress.trim() || !centerPhone.trim()) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    if (isAdding) {
      // Create new center
      const newCenter: MedicalCenter = {
        id: centerId || `sede-${Date.now().toString().slice(-6)}`,
        name: centerName.trim(),
        address: centerAddress.trim(),
        cuil: centerCuil.trim() || '30-XXXXXXXX-X',
        phone: centerPhone.trim(),
        active: centerActive,
        logo: centerLogo,
        loginBannerDesktop: centerBannerDesktop,
        loginBannerMobile: centerBannerMobile,
      };

      // Automatically seed a default clinical admin for this new center
      const sanitizedUsername = `admin.${newCenter.id.toLowerCase()}`;
      const seededAdmin: User = {
        id: Date.now(),
        username: sanitizedUsername,
        password: "123",
        fullName: `Admin ${centerName.trim()}`,
        role: "admin",
        permissions: {
          canAccessBackoffice: true,
          canManageUsers: true,
          canEditSettings: true,
          canEditPatients: true,
          canManageAppointments: true,
          canViewClinicalHistory: true,
        },
        active: true,
        centerId: newCenter.id,
      };

      onUpdateCenters([...centers, newCenter]);
      onUpdateUsers([seededAdmin, ...users]);
      alert(`Sede "${newCenter.name}" creada e inicializada.\n\nSe creó automáticamente la cuenta administrador:\n- Usuario: ${sanitizedUsername}\n- Contraseña: 123`);
    } else if (isEditing) {
      // Edit center
      onUpdateCenters(centers.map(c => {
        if (c.id === centerId) {
          return {
            ...c,
            name: centerName.trim(),
            address: centerAddress.trim(),
            cuil: centerCuil.trim(),
            phone: centerPhone.trim(),
            active: centerActive,
            logo: centerLogo,
            loginBannerDesktop: centerBannerDesktop,
            loginBannerMobile: centerBannerMobile,
          };
        }
        return c;
      }));
      alert('Sede dental modificada exitosamente.');
    }

    setIsAdding(false);
    setIsEditing(false);
  };

  const handleDeleteCenter = (id: string, name: string) => {
    if (centers.length <= 1) {
      alert('Debe mantener por lo menos una institución dental activa en el sistema.');
      return;
    }
    const hasUsers = users.some(u => u.centerId === id);
    let extraWarning = '';
    if (hasUsers) {
      extraWarning = '\nATENCIÓN: Se eliminaran también todos los usuarios asignados a esta sede.';
    }

    setConfirmState({
      isOpen: true,
      title: 'Eliminar Sede',
      message: `¿Seguro que desea eliminar por completo la sede "${name}"?${extraWarning}`,
      danger: true,
      onConfirm: () => {
        onUpdateCenters(centers.filter(c => c.id !== id));
        onUpdateUsers(users.filter(u => u.centerId !== id));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        alert('Sede eliminada del sistema.');
      }
    });
  };

  // User Management Forms
  const startAddUser = () => {
    if (centers.length === 0) {
      alert('Primero registre una institución / centro para poder asignar usuarios.');
      return;
    }
    setUserId(null);
    setUserUsername('');
    setUserPassword('123');
    setUserFullName('');
    setUserRole('admin');
    setUserCenterId(centers[0].id);
    setUserActive(true);
    setIsUserEditing(false);
    setIsUserFormOpen(true);
  };

  const startEditUser = (u: User) => {
    setUserId(u.id);
    setUserUsername(u.username);
    setUserPassword(u.password || '');
    setUserFullName(u.fullName);
    setUserRole(u.role);
    setUserCenterId(u.centerId || '');
    setUserActive(u.active);
    setIsUserEditing(true);
    setIsUserFormOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUsername.trim() || !userFullName.trim() || !userCenterId) {
      alert('Complete todos los campos obligatorios.');
      return;
    }

    // Check username duplicates within same center
    const isDup = users.find(u => u.username.toLowerCase() === userUsername.trim().toLowerCase() && u.centerId === userCenterId && u.id !== userId);
    if (isDup) {
      alert(`El nombre de usuario "${userUsername}" ya se encuentra registrado en ese centro clínico.`);
      return;
    }

    // Assign full preset roles to center users
    const defaultPermissions = {
      canAccessBackoffice: userRole === 'admin',
      canManageUsers: userRole === 'admin',
      canEditSettings: userRole === 'admin',
      canEditPatients: ['admin', 'odontologist', 'specialist', 'receptionist'].includes(userRole),
      canManageAppointments: ['admin', 'odontologist', 'specialist', 'receptionist'].includes(userRole),
      canViewClinicalHistory: ['admin', 'odontologist', 'specialist'].includes(userRole),
    };

    if (isUserEditing && userId) {
      onUpdateUsers(users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            username: userUsername.toLowerCase().trim(),
            password: userPassword,
            fullName: userFullName.trim(),
            role: userRole,
            centerId: userCenterId,
            active: userActive,
            permissions: defaultPermissions,
          };
        }
        return u;
      }));
      alert('Usuario modificado.');
    } else {
      const newUser: User = {
        id: Date.now(),
        username: userUsername.toLowerCase().trim(),
        password: userPassword,
        fullName: userFullName.trim(),
        role: userRole,
        centerId: userCenterId,
        active: userActive,
        permissions: defaultPermissions,
      };
      onUpdateUsers([newUser, ...users]);
      alert('Se ha registrado el nuevo usuario clínico.');
    }

    setIsUserFormOpen(false);
  };

  const handleDeleteUser = (id: number, name: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `¿Seguro que desea eliminar al usuario clínico "${name}"?`,
      danger: true,
      onConfirm: () => {
        onUpdateUsers(users.filter(u => u.id !== id));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        alert('Usuario eliminado.');
      }
    });
  };

  const getCenterName = (id?: string) => {
    return centers.find(c => c.id === id)?.name || <span className="text-slate-400 italic">No asignado / Global</span>;
  };

  const inputClass = "mt-1 block h-10 w-full px-3 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-100";
  const labelClass = "block text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-wide mb-1";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-xl px-6 py-4 flex flex-col sm:flex-row justify-between items-center z-10 gap-4">
        <div className="flex items-center space-x-3.5">
          <span className="text-3xl">👑</span>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase flex items-center gap-1.5 text-primary">
              Infraestructura General Central
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Control Maestro de Clínicas y Usuarios Multi-Tenant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-slate-800/80 text-[10px] font-bold py-1.5 px-3 rounded-md border border-slate-700/60 font-mono">
            👤 Conectado: {currentUser.fullName}
          </span>
          <button
            onClick={onLogout}
            className="bg-red-650 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition duration-150 cursor-pointer"
          >
            Cerrar Sesión 💻
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setActiveTab('centers'); setIsAdding(false); setIsEditing(false); }}
            className={`py-3 px-6 font-bold text-sm transition border-b-2 ${
              activeTab === 'centers' && !isAdding && !isEditing
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-slate-550 hover:text-slate-805 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            🏢 Gestión de Centros e Instituciones ({centers.length})
          </button>
          <button
            onClick={() => { setActiveTab('global_users'); setIsUserFormOpen(false); }}
            className={`py-3 px-6 font-bold text-sm transition border-b-2 ${
              activeTab === 'global_users' && !isUserFormOpen
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-slate-550 hover:text-slate-805 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            👥 Cuentas de Personal de Clínicas ({users.length})
          </button>
        </div>

        {activeTab === 'centers' ? (
          <>
            {!isAdding && !isEditing ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200/55 dark:border-slate-750 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Instituciones y Sedes</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Gestione las sedes y centros médicos registrados en la red.</p>
                  </div>
                  <button
                    onClick={startAddCenter}
                    className="bg-primary hover:bg-primary-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusIcon className="w-4.5 h-4.5" />
                    <span>Crear Nuevo Centro</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-6 py-3.5">Logo</th>
                        <th className="px-6 py-3.5">Identificador de Sede</th>
                        <th className="px-6 py-3.5">Nombre Institucional</th>
                        <th className="px-6 py-3.5">Dirección y Contacto</th>
                        <th className="px-6 py-3.5">CUIT / CUIL</th>
                        <th className="px-6 py-3.5">Estado</th>
                        <th className="px-6 py-3.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      {centers.map(center => {
                        const count = users.filter(u => u.centerId === center.id).length;
                        return (
                          <tr key={center.id} className="hover:bg-slate-550/10 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300">
                            <td className="px-6 py-4">
                              {center.logo ? (
                                <img
                                  src={center.logo}
                                  alt="Logo"
                                  className="h-10 w-10 rounded-lg object-cover bg-slate-100"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
                                  🏥
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">{center.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-850 dark:text-slate-100">{center.name}</div>
                              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-750 dark:text-indigo-400 py-0.5 px-1.5 rounded-full font-bold">
                                {count} {count === 1 ? 'Usuario' : 'Usuarios'} clínico/s
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-slate-800 dark:text-slate-250 font-medium">{center.address}</p>
                              <p className="text-xs text-slate-450 mt-0.5">Te: {center.phone}</p>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs">{center.cuil || '--'}</td>
                            <td className="px-6 py-4">
                              {center.active ? (
                                <span className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 text-xs font-bold px-2.5 py-0.5 rounded-full">Activo</span>
                              ) : (
                                <span className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-350 text-xs font-bold px-2.5 py-0.5 rounded-full">Inactivo</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => startEditCenter(center)}
                                className="px-2.5 py-1 text-slate-705 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-xs font-bold transition cursor-pointer"
                              >
                                Configurar
                              </button>
                              <button
                                onClick={() => handleDeleteCenter(center.id, center.name)}
                                className="px-2.5 py-1 text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-105 border border-transparent hover:border-red-200 rounded text-xs font-bold transition cursor-pointer"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Form to Add/Edit Centers
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200/55 dark:border-slate-700/60 max-w-3xl mx-auto">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-55 border-b border-slate-200 dark:border-slate-700 pb-3 mb-6 flex items-center gap-1.5">
                  🏥 {isAdding ? 'Crear Nueva Sede / Consultorio Clínico' : `Configurar Sede: ${centerName}`}
                </h3>

                <form onSubmit={handleSaveCenter} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>Identificador Único (ID) *</label>
                      <input
                        type="text"
                        required
                        disabled={isEditing}
                        value={centerId}
                        onChange={e => setCenterId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        className={`${inputClass} font-mono uppercase text-indigo-650`}
                        placeholder="ej. sede-almagro"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 italic">Nombre clave código único sin espacios.</p>
                    </div>

                    <div>
                      <label className={labelClass}>Nombre Institucional *</label>
                      <input
                        type="text"
                        required
                        value={centerName}
                        onChange={e => setCenterName(e.target.value)}
                        className={inputClass}
                        placeholder="ej. Centro Dental San Miguel"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>CUIT / CUIL *</label>
                      <input
                        type="text"
                        required
                        value={centerCuil}
                        onChange={e => setCenterCuil(e.target.value)}
                        className={inputClass}
                        placeholder="ej. 30-12345678-9"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Teléfono de Contacto *</label>
                      <input
                        type="text"
                        required
                        value={centerPhone}
                        onChange={e => setCenterPhone(e.target.value)}
                        className={inputClass}
                        placeholder="ej. +54 11 4321-8765"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Dirección Física Completa *</label>
                      <input
                        type="text"
                        required
                        value={centerAddress}
                        onChange={e => setCenterAddress(e.target.value)}
                        className={inputClass}
                        placeholder="ej. Av. Cabildo 2000, 3° Piso, Belgrano, CABA"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Subir Logo del Centro (Opcional)</label>
                      <div className="mt-1 flex items-center gap-4">
                        {centerLogo ? (
                          <img
                            src={centerLogo}
                            alt="Preview Logo"
                            className="h-14 w-14 rounded-lg object-cover bg-slate-100 shadow border border-slate-300"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xl border">
                            🏢
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* BANNERS PERSONALIZADOS DE FONDO DE INICIO DE SESIÓN */}
                    <div className="sm:col-span-2 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl bg-slate-50/40 dark:bg-slate-800/10 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                          🖼️ Banners de Fondo Personalizados para el Inicio de Sesión
                        </h4>
                        <p className="text-xs text-slate-550 dark:text-slate-400">
                          Configure imágenes personalizadas exclusivamente para el fondo de pantalla del inicio de sesión de esta sede. Puede subirlas desde el equipo o insertar una dirección web interactiva.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* COMPUTER VERSION BANNER */}
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">🖥️ Versión Computadora (Escritorio)</span>
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block mt-0.5">Medida recomendada: 1920x1080 px (16:9)</span>
                            </div>
                            {centerBannerDesktop && (
                              <button 
                                type="button" 
                                onClick={() => setCenterBannerDesktop(null)}
                                className="text-[9.5px] font-bold bg-red-50 text-red-600 hover:bg-red-100 py-0.5 px-1.5 rounded cursor-pointer animate-fade-in"
                              >
                                Quitar
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">Cargar Archivo del Equipo:</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerDesktopUpload}
                                className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer"
                              />
                            </div>
                            
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">O pegar dirección Web (URL):</span>
                              <input
                                type="text"
                                value={centerBannerDesktop?.startsWith('data:') ? '' : (centerBannerDesktop || '')}
                                onChange={e => setCenterBannerDesktop(e.target.value || null)}
                                placeholder="https://ejemplo.com/fondo-escritorio.jpg"
                                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-650 bg-slate-50/20 text-xs focus:ring-1 focus:ring-primary/45 text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            {centerBannerDesktop && (
                              <div className="mt-2 text-center">
                                <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Vista Previa:</span>
                                <img
                                  src={centerBannerDesktop}
                                  alt="Preview Desktop"
                                  className="w-full h-20 object-cover rounded border border-slate-200 dark:border-slate-700 bg-slate-100"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/1920x1080/e2e8f0/64748b?text=Error+al+cargar+URL";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* MOBILE VERSION BANNER */}
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">📱 Versión Celular (Móvil)</span>
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block mt-0.5">Medida recomendada: 1080x1920 px (9:16)</span>
                            </div>
                            {centerBannerMobile && (
                              <button 
                                type="button" 
                                onClick={() => setCenterBannerMobile(null)}
                                className="text-[9.5px] font-bold bg-red-50 text-red-600 hover:bg-red-100 py-0.5 px-1.5 rounded cursor-pointer animate-fade-in"
                              >
                                Quitar
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">Cargar Archivo del Equipo:</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerMobileUpload}
                                className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer"
                              />
                            </div>
                            
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">O pegar dirección Web (URL):</span>
                              <input
                                type="text"
                                value={centerBannerMobile?.startsWith('data:') ? '' : (centerBannerMobile || '')}
                                onChange={e => setCenterBannerMobile(e.target.value || null)}
                                placeholder="https://ejemplo.com/fondo-movil.jpg"
                                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-650 bg-slate-50/20 text-xs focus:ring-1 focus:ring-primary/45 text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            {centerBannerMobile && (
                              <div className="mt-2 text-center flex flex-col items-center">
                                <span className="text-[9.5px] font-bold text-slate-400 block mb-1">Vista Previa:</span>
                                <img
                                  src={centerBannerMobile}
                                  alt="Preview Mobile"
                                  className="w-16 h-20 object-cover rounded border border-slate-200 dark:border-slate-700 bg-slate-100"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://placehold.co/1080x1920/e2e8f0/64748b?text=Error+URL";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex items-center space-x-2.5 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={centerActive}
                          onChange={e => setCenterActive(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600"
                        />
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Sede Activa (Permite el ingreso de usuarios asignados)
                        </div>
                      </label>
                    </div>
                  </div>

                  {isAdding && (
                    <div className="p-4 bg-teal-50 dark:bg-slate-700/40 text-teal-800 dark:text-teal-300 text-xs rounded-xl border border-teal-200 dark:border-slate-650/50">
                      💡 <strong>Estrategia de Inicialización Automática:</strong><br/>
                      Para simplificar sus pruebas, al crear esta sede, el sistema registrará de oficio un usuario administrador clínico: <br />
                      <strong>Usuario:</strong> <span className="font-mono text-indigo-700 font-bold dark:text-indigo-300">admin.{centerId || 'su-id'}</span> | <strong>Clave:</strong> <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">123</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => { setIsAdding(false); setIsEditing(false); }}
                      className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-5 rounded-lg transition text-xs cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:bg-primary-600 text-white font-bold py-2.5 px-6 rounded-lg transition text-xs cursor-pointer"
                    >
                      {isAdding ? 'Sellar y Crear Sede' : 'Confirmar Ajustes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          // Tab: Clinical accounts view
          <div className="space-y-6">
            {!isUserFormOpen ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200/55 dark:border-slate-750 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Cuentas con Acceso en Sedes</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Cuentas asignadas a consultorios específicos para dentistas, recepcionistas e informantes.</p>
                  </div>
                  <button
                    onClick={startAddUser}
                    className="bg-primary hover:bg-primary-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusIcon className="w-4.5 h-4.5" />
                    <span>Crear Usuario Clínico</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-202 dark:divide-slate-700 text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-6 py-3.5">Nombre Completo</th>
                        <th className="px-6 py-3.5">Clínica / Sede</th>
                        <th className="px-6 py-3.5">Credencial (Login)</th>
                        <th className="px-6 py-3.5">Contraseña</th>
                        <th className="px-6 py-3.5">Rol de Sistema</th>
                        <th className="px-6 py-3.5">Estado</th>
                        <th className="px-6 py-3.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-805/40 text-slate-700 dark:text-slate-300">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{u.fullName}</td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-teal-655 dark:text-teal-400">
                            {getCenterName(u.centerId)}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{u.username}</td>
                          <td className="px-6 py-4 font-mono text-xs font-semibold">{u.password || '--'}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold uppercase bg-slate-100 dark:bg-slate-700 py-0.5 px-2 rounded-md">
                              {u.role === 'admin' && 'Administrador'}
                              {u.role === 'master' && 'Master'}
                              {u.role === 'odontologist' && 'Profesional de la Salud'}
                              {u.role === 'specialist' && 'Especialista Médico'}
                              {u.role === 'receptionist' && 'Recepción'}
                              {u.role === 'assistant' && 'Asistente'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.active ? (
                              <span className="bg-green-105 text-green-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Activo</span>
                            ) : (
                              <span className="bg-red-105 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Inactivo</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => startEditUser(u)}
                              className="px-2 py-1 text-slate-705 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-xs font-bold transition cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.fullName)}
                              className="px-2 py-1 text-red-656 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 rounded text-xs font-bold transition cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // User creation/edit inside Master Panel
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200/55 dark:border-slate-700 max-w-2xl mx-auto">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b pb-3 mb-5">
                  👤 {isUserEditing ? `Editar Usuario: ${userUsername}` : 'Crear Usuario Clínico'}
                </h3>

                <form onSubmit={handleSaveUser} className="space-y-4">
                  <div>
                    <label className={labelClass}>Nombre y Apellido Clínico *</label>
                    <input
                      type="text"
                      required
                      value={userFullName}
                      onChange={e => setUserFullName(e.target.value)}
                      className={inputClass}
                      placeholder="ej. Dra. Laura Colombo"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Nombre de Usuario (Login) *</label>
                      <input
                        type="text"
                        required
                        value={userUsername}
                        onChange={e => setUserUsername(e.target.value.toLowerCase().trim())}
                        className={inputClass}
                        placeholder="ej. lauracolombo"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Clave/Contraseña *</label>
                      <input
                        type="text"
                        required
                        value={userPassword}
                        onChange={e => setUserPassword(e.target.value)}
                        className={inputClass}
                        placeholder="ej. 123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Asignar Sede / Centro Clave *</label>
                      <select
                        required
                        value={userCenterId}
                        onChange={e => setUserCenterId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Seleccione un Centro...</option>
                        {centers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Rol de Trabajo</label>
                      <select
                        value={userRole}
                        onChange={e => setUserRole(e.target.value as UserRole)}
                        className={inputClass}
                      >
                        <option value="admin">Administrador Clínico (Acceso Backoffice Sede)</option>
                        <option value="odontologist">Profesional de la Salud</option>
                        <option value="specialist">Especialista Médico</option>
                        <option value="receptionist">Recepcionista (Solo Agenda y Ficha básica)</option>
                        <option value="assistant">Asistente Dental</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userActive}
                        onChange={e => setUserActive(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Usuario Activo con Permiso de Login</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setIsUserFormOpen(false)}
                      className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition text-xs cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-5 rounded-lg transition text-xs cursor-pointer"
                    >
                      Confirmar Alta de Cuenta
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        danger={confirmState.danger}
      />
    </div>
  );
};

export default MasterBackoffice;
