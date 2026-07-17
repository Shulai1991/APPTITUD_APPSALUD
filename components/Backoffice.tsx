import React, { useState } from 'react';
import type { User, UserRole, UserPermissions, ClinicSettings, Professional, Appointment } from '../types';
import { PlusIcon, TrashIcon, PencilSquareIcon } from './icons';
import Settings from './Settings';
import StatsDashboard from './StatsDashboard';
import ConfirmDialog from './ConfirmDialog';

interface BackofficeProps {
  currentUser: User;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  clinicSettings: ClinicSettings;
  onUpdateSettings: (settings: ClinicSettings) => void;
  professionals: Professional[];
  onUpdateProfessionals: (professionals: Professional[]) => void;
  appointments: Appointment[];
}

const Backoffice: React.FC<BackofficeProps> = ({
  currentUser,
  users,
  onUpdateUsers,
  clinicSettings,
  onUpdateSettings,
  professionals,
  onUpdateProfessionals,
  appointments = []
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'stats'>('users');
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
  
  // Selected user for editing/adding
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [license, setLicense] = useState('');
  const [role, setRole] = useState<UserRole>('odontologist');
  const [active, setActive] = useState(true);

  // Permissions form state
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAccessBackoffice: false,
    canManageUsers: false,
    canEditSettings: false,
    canEditPatients: true,
    canManageAppointments: true,
    canViewClinicalHistory: true,
  });

  // Handle role selection default presets
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    // Apply default permissions based on role to make it easier for user
    switch (newRole) {
      case 'admin':
        setPermissions({
          canAccessBackoffice: true,
          canManageUsers: true,
          canEditSettings: true,
          canEditPatients: true,
          canManageAppointments: true,
          canViewClinicalHistory: true,
        });
        break;
      case 'odontologist':
      case 'specialist':
        setPermissions({
          canAccessBackoffice: false,
          canManageUsers: false,
          canEditSettings: false,
          canEditPatients: true,
          canManageAppointments: true,
          canViewClinicalHistory: true,
        });
        break;
      case 'receptionist':
        setPermissions({
          canAccessBackoffice: false,
          canManageUsers: false,
          canEditSettings: false,
          canEditPatients: true,
          canManageAppointments: true,
          canViewClinicalHistory: false,
        });
        break;
      case 'assistant':
        setPermissions({
          canAccessBackoffice: false,
          canManageUsers: false,
          canEditSettings: false,
          canEditPatients: true,
          canManageAppointments: false,
          canViewClinicalHistory: false,
        });
        break;
    }
  };

  const startAddUser = () => {
    setUserId(null);
    setUsername('');
    setPassword('123');
    setFullName('');
    setLicense('');
    setRole('odontologist');
    setActive(true);
    setPermissions({
      canAccessBackoffice: false,
      canManageUsers: false,
      canEditSettings: false,
      canEditPatients: true,
      canManageAppointments: true,
      canViewClinicalHistory: true,
    });
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEditUser = (user: User) => {
    setUserId(user.id);
    setUsername(user.username);
    setPassword(user.password || '');
    setFullName(user.fullName);
    setLicense(user.license || '');
    setRole(user.role);
    setActive(user.active);
    setPermissions({ ...user.permissions });
    setIsEditing(true);
    setIsAdding(false);
  };

  const handlePermissionChange = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      alert('Por favor, complete todos los campos obligatorios.');
      return;
    }

    const dupUser = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== userId
    );
    if (dupUser) {
      alert('Ya existe un usuario registrado con ese nombre de usuario.');
      return;
    }

    if (isAdding) {
      const newUser: User = {
        id: Date.now(),
        username: username.trim(),
        password: password || '123',
        fullName: fullName.trim(),
        role,
        permissions,
        active,
        license: license.trim() || undefined,
      };
      onUpdateUsers([newUser, ...users]);
      alert('Usuario creado correctamente.');
    } else if (isEditing && userId) {
      const updated = users.map(u => {
        if (u.id === userId) {
          // Avoid key admins deactivating themselves or revoking their own backoffice access to prevent lockouts
          const isCurrentSelf = u.id === currentUser.id;
          return {
            ...u,
            username: username.trim(),
            password,
            fullName: fullName.trim(),
            role: isCurrentSelf ? u.role : role,
            active: isCurrentSelf ? true : active,
            permissions: isCurrentSelf ? u.permissions : permissions,
            license: license.trim() || undefined,
          };
        }
        return u;
      });
      onUpdateUsers(updated);
      alert('Usuario modificado correctamente.');
    }

    setIsAdding(false);
    setIsEditing(false);
  };

  const handleDeleteUser = (id: number) => {
    if (id === currentUser.id) {
      alert('Seguridad: No se puede eliminar a usted mismo del sistema.');
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: '¿Está completamente seguro que desea eliminar este usuario del sistema? Esta acción es irreversible.',
      danger: true,
      onConfirm: () => {
        onUpdateUsers(users.filter(u => u.id !== id));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        alert('Usuario eliminado correctamente.');
      }
    });
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return <span className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded">Admin</span>;
      case 'odontologist':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded">Profesional de la Salud</span>;
      case 'specialist':
        return <span className="bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 text-xs font-bold px-2 py-0.5 rounded">Especialista Médico</span>;
      case 'receptionist':
        return <span className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 text-xs font-bold px-2 py-0.5 rounded">Recepción</span>;
      case 'assistant':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 text-xs font-bold px-2 py-0.5 rounded">Asistente</span>;
    }
  };

  const inputClass = "mt-1 block h-10 w-full px-3 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-100";
  const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1";

  // Check if current user has user-management permissions
  const canManageCurrentUsers = currentUser.permissions.canManageUsers;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Panel de Administración de Backoffice</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestione de forma segura usuarios, perfiles, accesos y configuraciones del consultorio y centro de especialidades médicas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold">
            👤 Conectado: {currentUser.fullName} ({currentUser.role.toUpperCase()})
          </span>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-700 font-sans">
        <button
          onClick={() => { setActiveTab('users'); }}
          className={`py-3 px-6 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'users'
              ? 'border-primary text-primary dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Gestión de Usuarios y Permisos
        </button>
        <button
          onClick={() => { setActiveTab('stats'); }}
          className={`py-3 px-6 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'stats'
              ? 'border-primary text-primary dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          📊 Tablero de Estadísticas
        </button>
        <button
          onClick={() => { 
            if (!currentUser.permissions.canEditSettings) {
              alert('Error: Su cuenta no cuenta con permisos para modificar la configuración de la clínica.');
              return;
            }
            setActiveTab('settings'); 
          }}
          className={`py-3 px-6 font-bold text-sm transition-all border-b-2 ${
            !currentUser.permissions.canEditSettings 
              ? 'opacity-50 cursor-not-allowed text-slate-400' 
              : ''
          } ${
            activeTab === 'settings'
              ? 'border-primary text-primary dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title={!currentUser.permissions.canEditSettings ? 'No disponible para su nivel de permiso' : ''}
        >
          Configuración Global y Agendas {!currentUser.permissions.canEditSettings && '🔒'}
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-6">
          {!isEditing && !isAdding ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-100 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Usuarios Registrados</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Control de cuentas con acceso restringido.</p>
                </div>
                {canManageCurrentUsers && (
                  <button
                    onClick={startAddUser}
                    className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Crear Nuevo Usuario</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3">Nombre y Apellido</th>
                      <th className="px-6 py-3">Usuario (Login)</th>
                      <th className="px-6 py-3">Rol</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3">Resumen de Permisos</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-700 text-sm">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-350">
                        <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200">{u.fullName} {u.id === currentUser.id && '(Usted)'}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{u.username}</td>
                        <td className="px-6 py-4">
                          {getRoleBadge(u.role)}
                          {u.license && (
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1">
                              M.P. {u.license}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {u.active ? (
                            <span className="bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900/30">Activo</span>
                          ) : (
                            <span className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/30">Inactivo</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {u.permissions.canAccessBackoffice && (
                              <span className="bg-slate-100 dark:bg-slate-700/50 text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Backoffice</span>
                            )}
                            {u.permissions.canManageUsers && (
                              <span className="bg-slate-100 dark:bg-slate-700/50 text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Usuarios🔑</span>
                            )}
                            {u.permissions.canEditSettings && (
                              <span className="bg-slate-100 dark:bg-slate-700/50 text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Config🔧</span>
                            )}
                            {u.permissions.canEditPatients && (
                              <span className="bg-slate-100 dark:bg-slate-700/50 text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Fichas🦷</span>
                            )}
                            {u.permissions.canManageAppointments && (
                              <span className="bg-slate-100 dark:bg-slate-700/50 text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Agenda📅</span>
                            )}
                            {u.permissions.canViewClinicalHistory && (
                              <span className="bg-slate-100 dark:bg-slate-700/50 text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">H.Clínica📂</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5">
                          {canManageCurrentUsers ? (
                            <>
                              <button
                                onClick={() => startEditUser(u)}
                                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition text-xs font-semibold"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className={`p-1 px-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 rounded transition text-xs font-semibold ${
                                  u.id === currentUser.id ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                                disabled={u.id === currentUser.id}
                              >
                                Eliminar
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No tienes permisos</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Form Add/Edit user
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-100 dark:border-slate-700/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-150 dark:border-slate-700 pb-3 mb-6">
                {isAdding ? 'Registrar Cuenta de Usuario Clínico' : `Modificar Cuenta: ${username}`}
              </h3>

              <form onSubmit={handleSaveUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Nombre y Apellido *</label>
                    <input
                      type="text"
                      className={inputClass}
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="ej. Dr. Roberto Perez"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nombre de Usuario (Login) *</label>
                    <input
                      type="text"
                      className={inputClass}
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="ej. robertop"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Clave / Contraseña *</label>
                    <input
                      type="text"
                      className={inputClass}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="ej. ClaveDePrueba12"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Rol Organizativo (Predomina Permisos)</label>
                    <select
                      value={role}
                      onChange={e => handleRoleChange(e.target.value as UserRole)}
                      className={inputClass}
                    >
                      <option value="admin">Administrador (Acceso Total)</option>
                      <option value="odontologist">Profesional de la Salud</option>
                      <option value="specialist">Especialista Médico</option>
                      <option value="receptionist">Recepcionista / Administrativo</option>
                      <option value="assistant">Asistente Dental</option>
                    </select>
                  </div>
                  {(role === 'odontologist' || role === 'specialist') && (
                    <div>
                      <label className={labelClass}>Matrícula Provincial (Obligatoria para Profesionales)</label>
                      <input
                        type="text"
                        className={inputClass}
                        required
                        value={license}
                        onChange={e => setLicense(e.target.value)}
                        placeholder="ej. MP-8432-A"
                      />
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        disabled={userId === currentUser.id}
                        onChange={e => setActive(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600"
                      />
                      <span>Usuario Activo (Permite iniciar sesión)</span>
                    </label>
                    {userId === currentUser.id && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">Seguridad: No se permite auto Desactivarse para evitar bloqueos del sistema.</p>
                    )}
                  </div>
                </div>

                {/* Granular Permissions Section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h4 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    ⚙️ Asignación de Permisos Especiales (Personalizado)
                  </h4>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                    Defina de manera ultra-detallada las partes del sistema que este usuario tendrá habilitadas en este consultorio.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {/* Permission 1: Backoffice Access */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.canAccessBackoffice}
                          onChange={() => handlePermissionChange('canAccessBackoffice')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 mt-1"
                        />
                        <div>
                          <span className="text-sm font-bold block text-slate-800 dark:text-slate-200">Ingresar a Backoffice</span>
                          <span className="text-xs text-slate-500 block">Habilita poder ingresar a esta sección en la barra lateral.</span>
                        </div>
                      </label>
                    </div>

                    {/* Permission 2: Manage Users */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.canManageUsers}
                          onChange={() => handlePermissionChange('canManageUsers')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 mt-1"
                        />
                        <div>
                          <span className="text-sm font-bold block text-slate-800 dark:text-slate-200">Crear y Editar Usuarios</span>
                          <span className="text-xs text-slate-500 block">Permite configurar usuarios, contraseñas y permisos del personal.</span>
                        </div>
                      </label>
                    </div>

                    {/* Permission 3: Edit settings */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.canEditSettings}
                          onChange={() => handlePermissionChange('canEditSettings')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 mt-1"
                        />
                        <div>
                          <span className="text-sm font-bold block text-slate-800 dark:text-slate-200">Configuración de Consultorio</span>
                          <span className="text-xs text-slate-500 block">Habilita modificar el nombre del consultorio y las agendas de doctores.</span>
                        </div>
                      </label>
                    </div>

                    {/* Permission 4: Edit Patients */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.canEditPatients}
                          onChange={() => handlePermissionChange('canEditPatients')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 mt-1"
                        />
                        <div>
                          <span className="text-sm font-bold block text-slate-800 dark:text-slate-200">Gestionar Pacientes</span>
                          <span className="text-xs text-slate-500 block">Permite agregar nuevos pacientes, modificar datos de ficha, odontograma, etc.</span>
                        </div>
                      </label>
                    </div>

                    {/* Permission 5: Manage Appointments */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.canManageAppointments}
                          onChange={() => handlePermissionChange('canManageAppointments')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 mt-1"
                        />
                        <div>
                          <span className="text-sm font-bold block text-slate-800 dark:text-slate-200">Gestionar Citas de Agenda</span>
                          <span className="text-xs text-slate-500 block">Reservar turnos, editarlos, tacharlos y marcarlos como ausentes/presentes.</span>
                        </div>
                      </label>
                    </div>

                    {/* Permission 6: Clinical History */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.canViewClinicalHistory}
                          onChange={() => handlePermissionChange('canViewClinicalHistory')}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600 mt-1"
                        />
                        <div>
                          <span className="text-sm font-bold block text-slate-800 dark:text-slate-200">Acceso a Historia Clínica</span>
                          <span className="text-xs text-slate-500 block">Habilita leer o escribir diagnósticos clínicos sumamente confidenciales.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setIsEditing(false); }}
                    className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-5 rounded-lg transition"
                  >
                    Volver Atrás
                  </button>
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-6 rounded-lg transition"
                  >
                    {isAdding ? 'Crear Usuario' : 'Confirmar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : activeTab === 'settings' ? (
        // Settings inner render
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-100 dark:border-slate-700/50">
          <Settings
            settings={clinicSettings}
            onUpdateSettings={onUpdateSettings}
            professionals={professionals}
            onUpdateProfessionals={onUpdateProfessionals}
          />
        </div>
      ) : (
        // Stats Dashboard render
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-100 dark:border-slate-700/50">
          <StatsDashboard
            appointments={appointments}
            professionals={professionals}
            users={users}
          />
        </div>
      )}

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

export default Backoffice;
