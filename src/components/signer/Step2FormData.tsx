import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, AlertTriangle, AlertCircle, Loader2, FileSearch } from 'lucide-react';
import { isValidCPF, isValidFullName, calcularIdade } from '../../lib/schemas.ts';
import { apiClient } from '../../lib/api.ts';
import type { SignerRelationship, Institution, DuplicateStudentCheckResponse } from '../../lib/types.ts';

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
  onNavigateToValidator?: (hash: string) => void;
}

export const Step2FormData: React.FC<Step2FormDataProps> = ({
  initialData,
  institution,
  onProceed,
  onBack,
  onNavigateToValidator,
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
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateStudentCheckResponse | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [isAdultStudent, setIsAdultStudent] = useState(false);


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

    if (name === 'minorCpf' || name === 'minorName') {
      if (duplicateInfo) setDuplicateInfo(null);
    }
  };


  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!isAdultStudent) {
      // 1. Nome do Responsável
      if (!formData.signerName.trim()) {
        newErrors.signerName = 'Informe o seu nome completo conforme documento oficial.';
      } else if (!isValidFullName(formData.signerName)) {
        newErrors.signerName = 'Por favor, digite seu nome completo como consta no documento oficial (ex: João da Silva Santos). Apelidos ou nomes incompletos não são aceitos.';
      }

      // 2. CPF do Responsável
      if (!formData.signerCpf.trim()) {
        newErrors.signerCpf = 'Informe o seu número de CPF.';
      } else if (!isValidCPF(formData.signerCpf)) {
        newErrors.signerCpf = 'CPF inválido. Confira os 11 dígitos digitados.';
      }

      // 3. Vínculo com o Responsável (sempre obrigatório)
      if (!formData.signerRelationship) {
        newErrors.signerRelationship = 'Selecione o seu vínculo ou grau de parentesco com o estudante.';
      }
    }

    // 4. Telefone (WhatsApp)
    const cleanPhone = formData.signerPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.signerPhone = 'Informe um número de telefone com DDD para contato.';
    } else if (cleanPhone.length < 10) {
      newErrors.signerPhone = 'Telefone incompleto. Digite o DDD seguido do número com 9 dígitos (ex: (61) 99999-9999).';
    }

    // 5. E-mail do Responsável
    if (!formData.signerEmail.trim()) {
      newErrors.signerEmail = 'Informe o e-mail onde você receberá o código de segurança de 6 dígitos.';
    } else if (!/\S+@\S+\.\S+/.test(formData.signerEmail.trim())) {
      newErrors.signerEmail = 'Digite um e-mail válido (exemplo: seu.nome@email.com).';
    }

    // 6. Nome do Aluno
    if (!formData.minorName.trim()) {
      newErrors.minorName = 'Informe o nome completo do estudante.';
    } else if (!isValidFullName(formData.minorName)) {
      newErrors.minorName = 'Digite o nome e sobrenome válidos do estudante (sem repetições ou apelidos).';
    }

    // 7. Data de Nascimento do Aluno
    if (!formData.minorBirthDate) {
      newErrors.minorBirthDate = 'Informe a data de nascimento do estudante.';
    } else {
      const birthDate = new Date(formData.minorBirthDate);
      const today = new Date();
      if (isNaN(birthDate.getTime()) || birthDate > today) {
        newErrors.minorBirthDate = 'Data de nascimento inválida.';
      } else {
        const age = calcularIdade(formData.minorBirthDate, today);
        if (age < 14) {
          newErrors.minorBirthDate = 'Este projeto é destinado a estudantes a partir de 14 anos completos.';
        }
        if (isAdultStudent && age < 18) {
          newErrors.minorBirthDate = 'Você marcou que é maior de idade, mas a data informada indica menos de 18 anos.';
        }
      }
    }

    // 8. CPF do Aluno
    if (!formData.minorCpf.trim()) {
      newErrors.minorCpf = 'Informe o número de CPF do estudante.';
    } else if (!isValidCPF(formData.minorCpf)) {
      newErrors.minorCpf = 'CPF do estudante inválido. Confira os 11 dígitos digitados.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setCheckingDuplicate(true);
    try {
      const dup = await apiClient.checkStudentDuplicate({
        minor_cpf: formData.minorCpf,
        minor_name: formData.minorName,
        minor_birth_date: formData.minorBirthDate,
      });

      if (dup.hasExistingSignature) {
        setDuplicateInfo(dup);
        return;
      }
    } catch (err) {
      console.error('Erro ao verificar duplicidade de estudante:', err);
    } finally {
      setCheckingDuplicate(false);
    }

    const submitData = { ...formData };
    if (isAdultStudent) {
      submitData.signerName = submitData.minorName;
      submitData.signerCpf = submitData.minorCpf;
      submitData.signerRelationship = 'Próprio Estudante (Maior de Idade)';
    }

    onProceed(submitData as any);
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
              PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA
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
            1. IDENTIFICAÇÃO DO RESPONSÁVEL E DO ESTUDANTE
          </h1>
          {/* Texto explicativo padrão — sempre o mesmo independente da idade do estudante */}
          <div className="text-xs text-slate-500 mt-1.5 space-y-1 leading-relaxed">
            <p className="m-0">
              <strong>Quem deve preencher:</strong> Este formulário deve ser preenchido pelo <strong>responsável legal</strong> (mãe, pai, tutor ou guardião judicial) que irá assinar eletronicamente o termo.
            </p>
            <p className="m-0">
               <strong>Como funciona a verificação:</strong> As informações fornecidas serão conferidas automaticamente com o cadastro escolar do <strong>SESI-DF</strong> para confirmar o seu vínculo com o(a) estudante. Se a confirmação automática não for possível, a plataforma pedirá que você envie uma foto do seu documento de identidade e da certidão de nascimento do(a) estudante na próxima etapa. Essa verificação é feita de forma manual pela equipe responsável, com segurança e sigilo.
             </p>
            <p className="m-0 text-sesi-primary font-medium">
              🔒 <strong>Privacidade Garantida:</strong> Todo o tratamento de dados pessoais é criptografado e segue estritamente as diretrizes da LGPD (Lei nº 13.709/2018).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          
          {/* Seletor Minimalista de Perfil do Assinante */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">
              Perfil do assinante:
            </span>

            <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsAdultStudent(false);
                  setFormData((prev) => ({ ...prev, signerRelationship: '' }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  !isAdultStudent
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Responsável Legal
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdultStudent(true);
                  setFormData((prev) => ({
                    ...prev,
                    signerRelationship: 'Próprio Estudante (Maior de Idade)',
                  }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isAdultStudent
                    ? 'bg-[#004b8d] text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Estudante (18+)
              </button>
            </div>
          </div>
          
          {/* Bloco: Dados do Responsável Legal / Estudante */}
          {!isAdultStudent && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.signerName ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                  placeholder="Como no documento oficial"
                />
                {errors.signerName && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.signerName}</span>
                  </span>
                )}
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
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.signerCpf ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                  placeholder="000.000.000-00"
                />
                {errors.signerCpf && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.signerCpf}</span>
                  </span>
                )}
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
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none bg-white cursor-pointer transition-colors ${errors.signerRelationship ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                >
                  <option value="">Selecione...</option>
                  <option value="Mãe">Mãe</option>
                  <option value="Pai">Pai</option>
                  <option value="Tutor(a) Legal">Tutor(a) Legal</option>
                  <option value="Responsável por Guarda Judicial">Responsável por Guarda Judicial</option>
                  <option value="Avô/Avó">Avô/Avó</option>
                  <option value="Tio/Tia">Tio/Tia</option>
                  <option value="Próprio Estudante (Maior de Idade)">Próprio Estudante (Maior de Idade)</option>
                </select>
                {errors.signerRelationship && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.signerRelationship}</span>
                  </span>
                )}
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
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.signerPhone ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                  placeholder="(61) 99999-9999"
                />
                {errors.signerPhone && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.signerPhone}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1">
                  <label htmlFor="field-signerEmail" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                    E-mail do Responsável <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-sesi-primary font-medium">
                    O código de segurança de 6 dígitos para concluir a assinatura será enviado para este e-mail
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
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.signerEmail ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                  placeholder="seu.email@exemplo.com"
                />
                {errors.signerEmail && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.signerEmail}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          )}

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
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.minorName ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                  placeholder="Nome do estudante"
                />
                {errors.minorName && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.minorName}</span>
                  </span>
                )}
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
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.minorBirthDate ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                />
                {errors.minorBirthDate && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.minorBirthDate}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="field-minorCpf" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                  CPF do Aluno <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-minorCpf"
                  type="text"
                  name="minorCpf"
                  value={formData.minorCpf}
                  onChange={handleChange}
                  maxLength={14}
                  inputMode="numeric"
                  className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.minorCpf ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : duplicateInfo ? 'border-amber-400 bg-amber-50/20' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                  placeholder="000.000.000-00"
                />
                {checkingDuplicate && (
                  <span className="text-[10px] text-sesi-primary flex items-center gap-1 mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verificando autorizações existentes...
                  </span>
                )}
                {errors.minorCpf && (
                  <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{errors.minorCpf}</span>
                  </span>
                )}
              </div>

              {/* Contato do Estudante Maior de Idade (Telefone e E-mail antes da Escola) */}
              {isAdultStudent && (
                <>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="field-signerPhone" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                      Seu Telefone (WhatsApp) <span className="text-red-500">*</span>
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
                      className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.signerPhone ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                      placeholder="(61) 99999-9999"
                    />
                    {errors.signerPhone && (
                      <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{errors.signerPhone}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-1">
                      <label htmlFor="field-signerEmail" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">
                        Seu E-mail <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-sesi-primary font-medium">
                        Para envio do código
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
                      className={`w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border rounded-lg focus:outline-none transition-colors ${errors.signerEmail ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-300 focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary'}`}
                      placeholder="seu.email@exemplo.com"
                    />
                    {errors.signerEmail && (
                      <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{errors.signerEmail}</span>
                      </span>
                    )}
                  </div>

                  {/* Linha separadora entre Telefone/Email e Escola */}
                  <div className="md:col-span-2 my-1 border-t border-slate-200" />
                </>
              )}

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

              {/* Série/Ano, Turma e Turno organizados */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="field-minorSeries" className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase">Série / Ano</label>
                  <select
                    id="field-minorSeries"
                    name="minorSeries"
                    value={formData.minorSeries}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sesi-primary focus:ring-1 focus:ring-sesi-primary bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="7º Ano do Ensino Fundamental">7º Ano</option>
                    <option value="8º Ano do Ensino Fundamental">8º Ano</option>
                    <option value="9º Ano do Ensino Fundamental">9º Ano</option>
                    <option value="1ª Série do Ensino Médio">1ª Série do Ens. Médio</option>
                    <option value="2ª Série do Ensino Médio">2ª Série do Ens. Médio</option>
                    <option value="3ª Série do Ensino Médio">3ª Série do Ens. Médio</option>
                  </select>
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
                    placeholder="Ex: A, B, C..."
                  />
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
          </div>

          {/* Card de Alerta de Autorização Já Existente (Prevenção de Duplicidade) */}
          {duplicateInfo && duplicateInfo.hasExistingSignature && (
            <div className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 my-4 text-amber-950 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-2.5 flex-1 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-200/80 pb-2">
                    <h4 className="text-sm sm:text-base font-bold text-amber-950 m-0 flex items-center gap-1.5">
                      Autorização Já Registrada para este(a) Estudante
                    </h4>
                    {duplicateInfo.existingValidationCode && (
                      <span className="font-mono text-xs font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full inline-block w-fit shadow-2xs">
                        {duplicateInfo.existingValidationCode}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs sm:text-sm text-amber-900 leading-relaxed m-0">
                    O(A) estudante <strong>{duplicateInfo.minorName || formData.minorName}</strong> já possui uma autorização médica e termo de consentimento assinado e válido no sistema, emitido por <strong>{duplicateInfo.signerNameMasked || 'Responsável Legal'}</strong> em {new Date(duplicateInfo.signedAt || new Date()).toLocaleDateString('pt-BR')}.
                  </p>
                  
                  <div className="p-2.5 bg-amber-100/70 rounded-xl border border-amber-200 text-[11px] sm:text-xs text-amber-900 leading-normal">
                    ℹ️ <strong>Não é necessário assinar novamente:</strong> Cada estudante precisa de apenas uma autorização ativa para receber todos os atendimentos do projeto.
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                    {duplicateInfo.existingValidationCode && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToValidator && duplicateInfo.existingValidationCode) {
                            onNavigateToValidator(duplicateInfo.existingValidationCode);
                          } else {
                            window.location.href = `/validar/${duplicateInfo.existingValidationCode}`;
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                      >
                        <FileSearch className="w-4 h-4" />
                        <span>Ver Comprovante Existente</span>
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setDuplicateInfo(null)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Corrigir CPF / Dados Digitados
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}



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
              disabled={checkingDuplicate}
              className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 bg-sesi-primary hover:bg-blue-900 disabled:opacity-70 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              {checkingDuplicate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Continuar para Escolha das Autorizações</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Barra institucional azul sólida no final da folha (Padronizada) */}
        <div className="absolute bottom-0 left-0 right-0 h-2.5 sm:h-3.5 bg-[#034b7f] pointer-events-none z-10" />

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          2
        </div>
      </div>
    </div>
  );
};

