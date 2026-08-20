import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, ShieldAlert } from 'lucide-react';

import type { SignerRelationship } from '../../lib/types.ts';

interface FormData {
  minorName: string;
  minorBirthDate: string;
  minorCpf: string;
  minorSeries: string;
  minorTurn: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral' | '';
  signerName: string;
  signerCpf: string;
  signerPhone: string;
  signerEmail: string;
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
    minorSeries: initialData?.minorSeries || '',
    minorTurn: initialData?.minorTurn || '',
    signerName: initialData?.signerName || '',
    signerCpf: initialData?.signerCpf || '',
    signerPhone: initialData?.signerPhone || '',
    signerEmail: initialData?.signerEmail || '',
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
    
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.minorName.trim()) newErrors.minorName = 'Nome do aluno é obrigatório';
    if (!formData.minorBirthDate) newErrors.minorBirthDate = 'Data de nascimento é obrigatória';
    if (formData.minorCpf.replace(/\D/g, '').length !== 11) newErrors.minorCpf = 'CPF do aluno inválido ou obrigatório';
    if (!formData.signerName.trim()) newErrors.signerName = 'Seu nome é obrigatório';
    if (formData.signerCpf.replace(/\D/g, '').length !== 11) newErrors.signerCpf = 'CPF inválido';
    if (formData.signerPhone.replace(/\D/g, '').length < 10) newErrors.signerPhone = 'Telefone inválido';
    if (formData.signerEmail.trim() && !/\S+@\S+\.\S+/.test(formData.signerEmail)) newErrors.signerEmail = 'E-mail inválido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onProceed(formData);
    }
  };

  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 pb-8">


      {/* Mesa / Fundo claro e moderno */}
      <div
        style={{
          background: '#f1f5f9',
          padding: '28px 20px',
          borderRadius: '8px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Folha A4 */}
        <div
          style={{
            background: '#fff',
            paddingTop:    '113px',
            paddingLeft:   '113px',
            paddingRight:  '76px',
            paddingBottom: '100px',
            fontFamily: "'Arial', sans-serif",
            fontSize: '11pt',
            lineHeight: '1.6',
            color: '#000',
            minHeight: '297mm',
            position: 'relative',
            boxShadow: '0 4px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.12)',
          }}
        >
          {/* Cabeçalho oficial */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '32px',
            paddingBottom: '20px',
            borderBottom: '3px solid #034b7f',
          }}>
            <img
              src="/logo-1linha.svg"
              alt="SESI Saúde"
              style={{ height: '52px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '9pt', color: '#555', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Escola Cidadã: Saúde em Movimento
              </p>
              <p style={{ fontSize: '9pt', color: '#333', margin: 0, fontWeight: 'bold' }}>
                Termo de Consentimento (TCLE)
              </p>
              <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título */}
          <div className="text-left mb-8">
            <h1 className="text-base font-bold uppercase tracking-wide text-slate-900 m-0">
              1. IDENTIFICAÇÃO DAS PARTES (PREENCHIMENTO)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Os dados abaixo serão vinculados de forma definitiva ao Termo de Consentimento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Bloco: Dados do Responsável Legal */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                DADOS DO RESPONSÁVEL LEGAL (Quem autoriza)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="signerName"
                    value={formData.signerName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:border-sesi-primary ${errors.signerName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                    placeholder="Como no documento oficial"
                  />
                  {errors.signerName && <span className="text-[10px] font-semibold text-red-500">{errors.signerName}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">CPF <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="signerCpf"
                    value={formData.signerCpf}
                    onChange={handleChange}
                    maxLength={14}
                    className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:border-sesi-primary ${errors.signerCpf ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                    placeholder="000.000.000-00"
                  />
                  {errors.signerCpf && <span className="text-[10px] font-semibold text-red-500">{errors.signerCpf}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vínculo com o menor <span className="text-red-500">*</span></label>
                  <select
                    name="signerRelationship"
                    value={formData.signerRelationship}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-sesi-primary bg-white"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                    <option value="Avô/Avó">Avô / Avó</option>
                    <option value="Tio/Tia">Tio / Tia</option>
                    <option value="Outro">Outro Responsável Legal</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Telefone (WhatsApp) <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    name="signerPhone"
                    value={formData.signerPhone}
                    onChange={handleChange}
                    maxLength={15}
                    className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:border-sesi-primary ${errors.signerPhone ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                    placeholder="(61) 99999-9999"
                  />
                  {errors.signerPhone && <span className="text-[10px] font-semibold text-red-500">{errors.signerPhone}</span>}
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail</label>
                  <input
                    type="email"
                    name="signerEmail"
                    value={formData.signerEmail}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:border-sesi-primary ${errors.signerEmail ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                    placeholder="exemplo@email.com"
                  />
                  {errors.signerEmail && <span className="text-[10px] font-semibold text-red-500">{errors.signerEmail}</span>}
                </div>
              </div>
            </div>

            {/* Bloco: Dados do Estudante */}
            <div className="space-y-4 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                DADOS DO(A) ESTUDANTE (Quem receberá o atendimento)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Completo do Aluno <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="minorName"
                    value={formData.minorName}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:border-sesi-primary ${errors.minorName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                    placeholder="Nome do estudante"
                  />
                  {errors.minorName && <span className="text-[10px] font-semibold text-red-500">{errors.minorName}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Data de Nascimento <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="minorBirthDate"
                    value={formData.minorBirthDate}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:border-sesi-primary ${errors.minorBirthDate ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.minorBirthDate && <span className="text-[10px] font-semibold text-red-500">{errors.minorBirthDate}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">CPF do Aluno</label>
                  <input
                    type="text"
                    name="minorCpf"
                    value={formData.minorCpf}
                    onChange={handleChange}
                    maxLength={14}
                    className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:border-sesi-primary ${errors.minorCpf ? 'border-red-400 bg-red-50/30' : 'border-slate-300'}`}
                    placeholder="000.000.000-00"
                  />
                  {errors.minorCpf && <span className="text-[10px] font-semibold text-red-500">{errors.minorCpf}</span>}
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Escola / Instituição</label>
                  <input
                    type="text"
                    readOnly
                    value="Centro de Ensino Médio EIT (CEMEIT)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded bg-slate-50 text-slate-600 focus:outline-none cursor-default font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Série e Turma</label>
                  <input
                    type="text"
                    name="minorSeries"
                    value={formData.minorSeries}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-sesi-primary"
                    placeholder="Ex: 1º Ano A"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Turno</label>
                  <select
                    name="minorTurn"
                    value={formData.minorTurn}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-sesi-primary bg-white"
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

            {/* Aviso de responsabilidade */}
            <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex gap-3 text-xs text-blue-900 mt-6 leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <strong className="text-blue-900">Veracidade das Declarações:</strong> As informações preenchidas acima possuem caráter de declaração legal sob as penas do Art. 299 do Código Penal. Verifique todos os campos antes de avançar para a próxima etapa.
              </div>
            </div>

            {/* Botões de Ação dentro do documento */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 mt-8">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-sesi-primary hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                Avançar para Autorizações
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* ─── Barra institucional no final da folha ─── */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <img
              src="/barra.jpg"
              alt="Barra institucional SESI"
              style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            />
          </div>

          {/* ─── Número de página (canto superior direito ABNT) ─── */}
          <div style={{
            position: 'absolute',
            top:   '76px',
            right: '76px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10pt',
            color: '#000',
          }}>
            2
          </div>
        </div>
      </div>
    </div>
  );
};
