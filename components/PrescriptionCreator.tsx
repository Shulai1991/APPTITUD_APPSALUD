
import React, { useState } from 'react';
import type { Patient, Prescription } from '../types';
import { PaperAirplaneIcon } from './icons';

interface PrescriptionCreatorProps {
  patient: Patient;
  onSave: (prescription: Omit<Prescription, 'id'>) => void;
}

const PrescriptionCreator: React.FC<PrescriptionCreatorProps> = ({ patient, onSave }) => {
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');

  const getWhatsAppMessage = () => {
    return `Receta para ${patient.name} ${patient.lastName}:\n\n*Medicamento:* ${medication}\n*Dosis:* ${dosage}\n*Instrucciones:* ${instructions}\n\n---\nEste es un mensaje autogenerado. Por favor, consulte a su odontólogo ante cualquier duda.`;
  };

  const handleSendWhatsApp = () => {
    const message = getWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: new Date().toISOString().split('T')[0],
      medication,
      dosage,
      instructions,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Paciente</label>
        <p className="mt-1 text-lg font-semibold">{patient.name} {patient.lastName}</p>
      </div>
      
      <div>
        <label htmlFor="medication" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Medicamento</label>
        <input
          id="medication"
          type="text"
          value={medication}
          onChange={(e) => setMedication(e.target.value)}
          className="mt-1 block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary"
          required
        />
      </div>

      <div>
        <label htmlFor="dosage" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Dosis</label>
        <input
          id="dosage"
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          className="mt-1 block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary"
          required
        />
      </div>
      
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Instrucciones</label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="mt-1 block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary"
          required
        />
      </div>

      <div className="flex justify-end pt-4 space-x-3">
        <button type="submit" className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Guardar Receta
        </button>
        <button
          type="button"
          onClick={handleSendWhatsApp}
          disabled={!medication || !dosage || !instructions}
          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon /><span>Enviar por WhatsApp</span>
        </button>
      </div>
    </form>
  );
};

export default PrescriptionCreator;
