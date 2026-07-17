
import React, { useState, useEffect } from 'react';
import type { Patient, Invoice, InvoiceItem } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface InvoiceCreatorProps {
  patient: Patient;
  onSave: (invoice: Omit<Invoice, 'id'>) => void;
}

const InvoiceCreator: React.FC<InvoiceCreatorProps> = ({ patient, onSave }) => {
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const newTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    setTotal(newTotal);
  }, [items]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    (newItems[index] as any)[field] = field === 'description' ? value : (isNaN(numericValue) ? 0 : numericValue);
    setItems(newItems);
  };
  
  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: new Date().toISOString().split('T')[0],
      items,
      total,
      status: 'pending',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Paciente</label>
        <p className="mt-1 text-lg font-semibold">{patient.name} {patient.lastName}</p>
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Descripción"
              value={item.description}
              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary"
              required
            />
            <input
              type="number"
              placeholder="Cant."
              value={item.quantity}
              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
              className="w-20 p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary"
              min="1"
              required
            />
            <input
              type="number"
              placeholder="Precio"
              value={item.price}
              onChange={(e) => handleItemChange(index, 'price', e.target.value)}
              className="w-24 p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-primary focus:border-primary"
              min="0"
              step="0.01"
              required
            />
            <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:text-red-700">
                <TrashIcon />
            </button>
          </div>
        ))}
      </div>
      
      <button type="button" onClick={addItem} className="flex items-center space-x-2 text-sm text-primary hover:text-primary-700">
        <PlusIcon /><span>Agregar Ítem</span>
      </button>

      <div className="text-right text-xl font-bold pt-4 border-t border-slate-200 dark:border-slate-700">
        Total: ${total.toFixed(2)}
      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Guardar Factura
        </button>
      </div>
    </form>
  );
};

export default InvoiceCreator;