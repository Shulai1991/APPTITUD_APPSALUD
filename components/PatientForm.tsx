import React, { useState, useEffect, useRef } from 'react';
import type { Patient } from '../types';
import { CameraIcon, ArrowUpTrayIcon, UserIcon } from './icons';
import { compressImage } from '../imageUtils';

interface PatientFormProps {
  patient: Patient | null;
  onSave: (data: Omit<Patient, 'id' | 'clinicalHistory' | 'odontogram' | 'invoices' | 'prescriptions'>) => void;
  onCancel: () => void;
  onOpenCameraModal: () => void;
  newAvatarFromCamera: string | null;
}

const PatientForm: React.FC<PatientFormProps> = ({ patient, onSave, onCancel, onOpenCameraModal, newAvatarFromCamera }) => {
    const [formData, setFormData] = useState({
        name: '',
        lastName: '',
        dni: '',
        phone: '',
        email: '',
        address: '',
        healthInsurance: '',
        insuranceId: '',
    });

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (patient) {
            setFormData({
                name: patient.name,
                lastName: patient.lastName,
                dni: patient.dni,
                phone: patient.phone,
                email: patient.email || '',
                address: patient.address || '',
                healthInsurance: patient.healthInsurance,
                insuranceId: patient.insuranceId,
            });
            setAvatarPreview(patient.avatarUrl);
        } else {
             setFormData({ 
                 name: '', 
                 lastName: '', 
                 dni: '', 
                 phone: '', 
                 email: '', 
                 address: '', 
                 healthInsurance: '', 
                 insuranceId: '',
             });
             setAvatarPreview(null);
        }
    }, [patient]);

    useEffect(() => {
        if (newAvatarFromCamera) {
            setAvatarPreview(newAvatarFromCamera);
        }
    }, [newAvatarFromCamera]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            compressImage(file, 200, 200, 0.7)
                .then(compressedUrl => {
                    setAvatarPreview(compressedUrl);
                })
                .catch(err => {
                    console.error("Error compressing file:", err);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setAvatarPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            ...formData, 
            avatarUrl: avatarPreview || `https://picsum.photos/seed/${encodeURIComponent(formData.name)}/200/200`
        });
    };

    const inputClass = "mt-1 block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm text-slate-900 dark:text-white";
    const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-primary-200" />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <UserIcon className="w-10 h-10 text-slate-400" />
                    </div>
                )}
                <div className="flex flex-col space-y-1.5 w-full sm:w-auto">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg, image/png" />
                    <div className="flex gap-2">
                        <button type="button" onClick={onOpenCameraModal} className="flex items-center space-x-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold py-1.5 px-3 rounded-lg transition-colors text-xs">
                            <CameraIcon className="w-4 h-4" />
                            <span>Tomar Foto</span>
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-1.5 bg-slate-500 hover:bg-slate-600 text-white font-bold py-1.5 px-3 rounded-lg transition-colors text-xs">
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            <span>Subir Imagen</span>
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className={labelClass}>Nombre</label>
                  <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>Apellido</label>
                  <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="dni" className={labelClass}>DNI</label>
                  <input type="text" name="dni" id="dni" value={formData.dni} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>Teléfono</label>
                  <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputClass} required placeholder="Ej. +54911..." />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className={labelClass}>Dirección</label>
                  <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className={inputClass} placeholder="Ej. Av. Rivadavia 1234" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="Ej. paciente@email.com" />
                </div>
                <div>
                  <label htmlFor="healthInsurance" className={labelClass}>Obra Social / Prepaga</label>
                  <input type="text" name="healthInsurance" id="healthInsurance" value={formData.healthInsurance} onChange={handleChange} className={inputClass} placeholder="Ej. OSDE 310" />
                </div>
                <div>
                  <label htmlFor="insuranceId" className={labelClass}>Nº de Afiliado</label>
                  <input type="text" name="insuranceId" id="insuranceId" value={formData.insuranceId} onChange={handleChange} className={inputClass} placeholder="Nº credencial" />
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end pt-4 space-x-3 border-t border-slate-200 dark:border-slate-750">
                <button type="button" onClick={onCancel} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" className="bg-primary hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                  Guardar Paciente
                </button>
            </div>
        </form>
    );
};

export default PatientForm;
