import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, ShieldAlert } from 'lucide-react';
import { isValidCPF } from '../../lib/schemas.ts';
import type { SignerRelationship, Institution } from '../../lib/types.ts';

interface FormData {
  minorName: string;
  minorBirthDate: string;
  minorCpf: string;
  minorSchool?: string;
  minorSeries: string;
  minorClass: string;
  minorTurn: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral' | '';
  signerName: string;
  signerCpf: string;
  signerPhone: string;
  signerEmail: string;
  signerRelationship: SignerRelationship | '';
}

interface Step2FormDataProps {
  initialData?: Partial<FormData>;
  institution?: Institution | null;
  onProceed: (data: FormData) => void;
  onBack: () => void;
}

export const Step2FormData: React.FC<Step2FormDataProps> = ({
  initialData,
  institution,
  onProceed,
  onBack,
}) => {
  const [formData, setFormData] = useState<FormData>({
    minorName: initialData?.minorName || '',
    minorBirthDate: initialData?.minorBirthDate || '',
    minorCpf: initialData?.minorCpf || '',
    minorSeries: initialData?.minorSeries || '',
    minorClass: initialData?.minorClass || '',
    minorTurn: initialData?.minorTurn || '',
    signerName: initialData?.signerName || '',
    signerCpf: initialData?.signerCpf || '',
    signerPhone: initialData?.signerPhone || '',
    signerEmail: initialData?.signerEmail || '',
    signerRelationship: initialData?.signerRelationship || '',
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
    
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.minorName.trim()) newErrors.minorName = 'Nome completo do aluno é obrigatório';
    if (!formData.minorBirthDate) {
      newErrors.minorBirthDate = 'Data de nascimento é obrigatória';
    } else {
      const birthDate = new Date(formData.minorBirthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 14) {
        newErrors.minorBirthDate = 'O estudante deve possuir no mínimo 14 anos de idade para participar.';
      }
    }
    if (formData.minorCpf.trim() && !isValidCPF(formData.minorCpf)) {
      newErrors.minorCpf = 'CPF do estudante inválido. Por favor, confira os números digitados.';
    }
    if (!formData.signerName.trim()) newErrors.signerName = 'Seu nome completo é obrigatório';
    if (!formData.signerCpf || !isValidCPF(formData.signerCpf)) {
      newErrors.signerCpf = 'CPF do responsável inválido. Por favor, confira os números digitados.';
    }
    if (!formData.signerRelationship) {
      newErrors.signerRelationship = 'Selecione o seu vínculo com o estudante';
    }
    if (formData.signerPhone.replace(/\D/g, '').length < 10) {
      newErrors.signerPhone = 'Por favor, insira o telefone com DDD (ex: 61 99999-9999).';
    }
    if (!formData.signerEmail.trim()) {
      newErrors.signerEmail = 'E-mail do responsável é obrigatório para envio do código de segurança';
    } else if (!/\S+@\S+\.\S+/.test(formData.signerEmail.trim())) {
      newErrors.signerEmail = 'Digite um e-mail válido (ex: nome@email.com)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onProceed(formData as any);
    }
  };

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4">
        {/* Cabeçalho oficial */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/catraki.png"
              alt="Catraki"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              Escola Cidadã — Saúde em Movimento
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Termo de Consentimento (TCLE)
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título */}
        <div className="text-left mb-6 sm:mb-8">
          <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-900 m-0">
            1. IDENTIFICAÇÃO DAS PARTES (PREENCHIMENTO)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Os dados informados serão utilizados para a identificação do signatário e do estudante no Termo de Consentimento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          
          {/* Bloco: Dados do Responsável Legal */}
          <div className="space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              DADOS DO RESPONSÁVEL LEGAL (Quem autoriza)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="field-signerName" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-signerName"
                  type="text"
                  name="signerName"
                  value={formData.signerName}
                  onChange={handleChange}
                  autoComplete="name"
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary ${errors.signerName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                  placeholder="Como no documento oficial"
                />
                {errors.signerName && <span className="text-[10px] font-semibold text-red-500">{errors.signerName}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="field-signerCpf" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-signerCpf"
                  type="text"
                  name="signerCpf"
                  value={formData.signerCpf}
                  onChange={handleChange}
                  maxLength={14}
                  inputMode="numeric"
                  autoComplete="off"
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary ${errors.signerCpf ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                  placeholder="000.000.000-00"
                />
                {errors.signerCpf && <span className="text-[10px] font-semibold text-red-500">{errors.signerCpf}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="field-signerRelationship" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  Vínculo com o menor <span className="text-red-500">*</span>
                </label>
                <select
                  id="field-signerRelationship"
                  name="signerRelationship"
                  value={formData.signerRelationship}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary bg-white cursor-pointer ${errors.signerRelationship ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                >
                  <option value="">Selecione...</option>
                  <option value="Mãe">Mãe</option>
                  <option value="Pai">Pai</option>
                  <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                  <option value="Responsável por Guarda Judicial">Responsável por Guarda Judicial</option>
                  <option value="Avô / Avó">Avô / Avó</option>
                  <option value="Tio / Tia">Tio / Tia</option>
                  <option value="Outro">Outro Responsável Legal</option>
                </select>
                {errors.signerRelationship && <span className="text-[10px] font-semibold text-red-500">{errors.signerRelationship}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="field-signerPhone" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  Telefone (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-signerPhone"
                  type="tel"
                  name="signerPhone"
                  value={formData.signerPhone}
                  onChange={handleChange}
                  maxLength={15}
                  inputMode="tel"
                  autoComplete="tel"
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary ${errors.signerPhone ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                  placeholder="(61) 99999-9999"
                />
                {errors.signerPhone && <span className="text-[10px] font-semibold text-red-500">{errors.signerPhone}</span>}
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1">
                  <label htmlFor="field-signerEmail" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                    E-mail do Responsável <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-sesi-primary font-medium">
                    O código de 6 dígitos para assinar será enviado para este e-mail
                  </span>
                </div>
                <input
                  id="field-signerEmail"
                  type="email"
                  name="signerEmail"
                  value={formData.signerEmail}
                  onChange={handleChange}
                  autoComplete="email"
                  inputMode="email"
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary ${errors.signerEmail ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                  placeholder="seu.email@exemplo.com"
                />
                {errors.signerEmail && <span className="text-[10px] font-semibold text-red-500">{errors.signerEmail}</span>}
              </div>
            </div>
          </div>

          {/* Bloco: Dados do Estudante */}
          <div className="space-y-4 pt-2 sm:pt-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
              DADOS DO(A) ESTUDANTE (Quem receberá o atendimento)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label htmlFor="field-minorName" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  Nome Completo do Aluno <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-minorName"
                  type="text"
                  name="minorName"
                  value={formData.minorName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary ${errors.minorName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                  placeholder="Nome do estudante"
                />
                {errors.minorName && <span className="text-[10px] font-semibold text-red-500">{errors.minorName}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="field-minorBirthDate" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  Data de Nascimento <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-minorBirthDate"
                  type="date"
                  name="minorBirthDate"
                  value={formData.minorBirthDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary ${errors.minorBirthDate ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                />
                {errors.minorBirthDate && <span className="text-[10px] font-semibold text-red-500">{errors.minorBirthDate}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="field-minorCpf" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  CPF do Aluno <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <input
                  id="field-minorCpf"
                  type="text"
                  name="minorCpf"
                  value={formData.minorCpf}
                  onChange={handleChange}
                  maxLength={14}
                  inputMode="numeric"
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary ${errors.minorCpf ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                  placeholder="000.000.000-00"
                />
                {errors.minorCpf && <span className="text-[10px] font-semibold text-red-500">{errors.minorCpf}</span>}
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label htmlFor="field-minorSchool" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">Escola / Instituição de Ensino</label>
                <input
                  id="field-minorSchool"
                  name="minorSchool"
                  type="text"
                  readOnly
                  value={institution?.name || 'Centro de Ensino Médio EIT (CEMEIT)'}
                  className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold focus:outline-none cursor-default"
                />
              </div>

              {/* Série / Ano e Turma lado a lado */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="field-minorSeries" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">Série / Ano</label>
                  <input
                    id="field-minorSeries"
                    type="text"
                    name="minorSeries"
                    value={formData.minorSeries}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary"
                    placeholder="Ex: 2º Ano"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="field-minorClass" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">Turma</label>
                  <input
                    id="field-minorClass"
                    type="text"
                    name="minorClass"
                    value={formData.minorClass}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary"
                    placeholder="Ex: A"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="field-minorTurn" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">Turno</label>
                <select
                  id="field-minorTurn"
                  name="minorTurn"
                  value={formData.minorTurn}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary bg-white"
                >
                  <option value="">Selecione...</option>
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                  <option value="Noturno">Noturno</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>
            </div>
          </div>

          {/* Declaração de veracidade */}
          <div className="bg-blue-50/70 border border-blue-200 p-3.5 sm:p-4 rounded-xl flex gap-3 text-xs text-blue-900 mt-4 sm:mt-6 leading-relaxed">
            <ShieldAlert className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <strong className="text-blue-900 block mb-0.5">Declaração de Veracidade:</strong> Ao prosseguir, você confirma sob as penas da lei que todas as informações declaradas acima são verdadeiras e corretas (Art. 299 do Código Penal).
            </div>
          </div>

          {/* Botões de Ação dentro do documento */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-6 sm:mt-8">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <span>Avançar para Autorizações</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Barra institucional no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
          <img
            src="/barra.jpg"
            alt="Barra institucional SESI"
            className="w-full h-6 sm:h-9 object-cover object-center block"
          />
        </div>

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          2
        </div>
      </div>
    </div>
  );
};

