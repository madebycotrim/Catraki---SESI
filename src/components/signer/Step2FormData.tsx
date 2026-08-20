import React, { useState } from 'react';
import { User, FileText, ChevronRight, ChevronLeft, ShieldAlert } from 'lucide-react';
import type { SignerRelationship } from '../../lib/types.ts';

interface FormData {
  minorName: string;
  minorBirthDate: string;
  minorCpf: string;
  signerName: string;
  signerCpf: string;
  signerPhone: string;
  signerRelationship: SignerRelationship;
}

interface Step2FormDataProps {
  initialData?: Partial<FormData>;
  onProceed: (data: FormData) => void;
  onBack: () => void;
}

export const Step2FormData: React.FC<Step2FormDataProps> = ({
  initialData,
  onProceed,
  onBack,
}) => {
  const [formData, setFormData] = useState<FormData>({
    minorName: initialData?.minorName || '',
    minorBirthDate: initialData?.minorBirthDate || '',
    minorCpf: initialData?.minorCpf || '',
    signerName: initialData?.signerName || '',
    signerCpf: initialData?.signerCpf || '',
    signerPhone: initialData?.signerPhone || '',
    signerRelationship: initialData?.signerRelationship || 'Mãe',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };
  
  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    if (name === 'minorCpf' || name === 'signerCpf') {
      formattedValue = formatCpf(value);
    } else if (name === 'signerPhone') {
      formattedValue = formatPhone(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
    
    // Clear error when typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.minorName.trim()) newErrors.minorName = 'Nome do aluno é obrigatório';
    if (!formData.minorBirthDate) newErrors.minorBirthDate = 'Data de nascimento é obrigatória';
    if (!formData.signerName.trim()) newErrors.signerName = 'Seu nome é obrigatório';
    if (formData.signerCpf.replace(/\D/g, '').length !== 11 && formData.signerCpf.replace(/\D/g, '').length !== 14) newErrors.signerCpf = 'CPF inválido';
    if (formData.signerPhone.replace(/\D/g, '').length < 10) newErrors.signerPhone = 'Telefone inválido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onProceed(formData);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header do Formulário */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 sm:px-10 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sesi-primary shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Identificação e Qualificação</h2>
              <p className="text-sm text-slate-500 mt-1">
                Preencha cuidadosamente os dados abaixo. Eles integrarão o termo legal de autorização.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-10">
          
          {/* Seção: Dados do Aluno */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-sesi-secondary" />
              <h3 className="text-base font-bold text-slate-800 tracking-wide uppercase">Dados do Aluno (Paciente)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Nome Completo do Aluno <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="minorName"
                  value={formData.minorName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sesi-primary transition-all shadow-sm ${errors.minorName ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-sesi-primary'}`}
                  placeholder="Ex: João Silva Souza"
                />
                {errors.minorName && <span className="text-xs font-semibold text-red-500">{errors.minorName}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Data de Nascimento <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="minorBirthDate"
                  value={formData.minorBirthDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sesi-primary transition-all shadow-sm ${errors.minorBirthDate ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-sesi-primary'}`}
                />
                {errors.minorBirthDate && <span className="text-xs font-semibold text-red-500">{errors.minorBirthDate}</span>}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">CPF do Aluno (Se houver)</label>
                <input
                  type="text"
                  name="minorCpf"
                  value={formData.minorCpf}
                  onChange={handleChange}
                  maxLength={14}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary transition-all shadow-sm"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          {/* Seção: Dados do Responsável Legal */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <ShieldAlert className="w-5 h-5 text-sesi-primary" />
              <h3 className="text-base font-bold text-slate-800 tracking-wide uppercase">Dados do Responsável Legal (Assinante)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Seu Nome Completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="signerName"
                  value={formData.signerName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sesi-primary transition-all shadow-sm ${errors.signerName ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-sesi-primary'}`}
                  placeholder="Como consta no seu documento oficial"
                />
                {errors.signerName && <span className="text-xs font-semibold text-red-500">{errors.signerName}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Seu CPF <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="signerCpf"
                  value={formData.signerCpf}
                  onChange={handleChange}
                  maxLength={14}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sesi-primary transition-all shadow-sm ${errors.signerCpf ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-sesi-primary'}`}
                  placeholder="000.000.000-00"
                />
                {errors.signerCpf && <span className="text-xs font-semibold text-red-500">{errors.signerCpf}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Seu Telefone (WhatsApp) <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  name="signerPhone"
                  value={formData.signerPhone}
                  onChange={handleChange}
                  maxLength={15}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-sesi-primary transition-all shadow-sm ${errors.signerPhone ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-sesi-primary'}`}
                  placeholder="(00) 00000-0000"
                />
                {errors.signerPhone && <span className="text-xs font-semibold text-red-500">{errors.signerPhone}</span>}
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Seu vínculo com o aluno <span className="text-red-500">*</span></label>
                <select
                  name="signerRelationship"
                  value={formData.signerRelationship}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary transition-all shadow-sm appearance-none"
                >
                  <option value="Mãe">Mãe</option>
                  <option value="Pai">Pai</option>
                  <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                  <option value="Avô/Avó">Avô / Avó</option>
                  <option value="Tio/Tia">Tio / Tia</option>
                  <option value="Outro">Outro Responsável Legal</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
            <ShieldAlert className="w-5 h-5 shrink-0 text-blue-600" />
            <p className="leading-relaxed font-medium">
              As informações preenchidas acima possuem caráter legal e serão atreladas à sua assinatura. 
              Ao avançar, você confirma a veracidade destes dados.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar e Revisar</span>
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-sesi-primary hover:bg-blue-800 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Confirmar Dados e Assinar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
