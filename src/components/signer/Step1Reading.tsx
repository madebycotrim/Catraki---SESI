import React from 'react';
import { ChevronRight, ShieldCheck, Info, Eye } from 'lucide-react';
import type { Institution } from '../../lib/types.ts';

interface Step1ReadingProps {
  document: {
    id: string;
    minor_name: string;
    minor_birth_date: string;
    parent_name?: string;
    procedure_title: string;
    procedure_description: string;
    content_markdown: string;
    content_sha256: string;
    legal_notice: string;
  };
  institution?: Institution | null;
  onProceed: () => void;
}

export const Step1Reading: React.FC<Step1ReadingProps> = ({ document, institution, onProceed }) => {
  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1">
      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4">
        {/* Cabeçalho com logo oficial */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/catraki.png"
              alt="Catraki"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
            <div className="h-6 w-px bg-slate-300 hidden sm:block" />
            <img
              src="/logo-1linha.svg"
              alt="SESI Saúde"
              className="h-7 sm:h-9 w-auto object-contain"
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              Escola Cidadã — Saúde em Movimento
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Doc. nº {document.id}
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-sm sm:text-base md:text-[12pt] font-bold text-slate-900 uppercase leading-snug tracking-tight m-0">
            BEM-VINDO(A) AO PROJETO ESCOLA CIDADÃ — SAÚDE EM MOVIMENTO
          </h1>
        </div>

        {/* Corpo da Carta de Boas-Vindas */}
        <div className="space-y-5 sm:space-y-6 text-slate-800 text-left sm:text-justify text-xs sm:text-sm md:text-[11pt] leading-relaxed">
          <p className="m-0 leading-relaxed">
            Prezado(a) Responsável,<br />
            Sabemos que a saúde e a segurança do(a) seu filho(a) são as suas maiores prioridades. É com esse mesmo cuidado que {institution?.name ? <strong>{institution.name}</strong> : 'a sua Escola'}, em parceria com a <strong>Universidade de Brasília (UnB)</strong>, o <strong>SESI-DF</strong> e a <strong>Finatec</strong>, traz até você esta iniciativa 100% gratuita de cuidado preventivo, saúde e cidadania.
          </p>

          <p className="m-0 leading-relaxed">
            Criamos este ambiente digital para que você possa autorizar o atendimento do(a) estudante com total transparência e comodidade, direto do seu celular, sem a necessidade de imprimir papéis.
          </p>

          {/* Subseção: Por que estou no sistema Catraki? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <ShieldCheck className="w-4 h-4 text-sesi-primary shrink-0" /> 
              <span>Por que estou no sistema Catraki?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              O Catraki é a plataforma digital utilizada para a formalização e registro desta autorização eletrônica. Para atender aos requisitos de conformidade da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), as comunicações utilizam conexão segura criptografada (HTTPS) e validação de identidade por código temporário de segurança enviado ao seu e-mail, sem a necessidade de criar conta ou memorizar senhas. Os dados coletados e os prontuários de atendimento destinam-se exclusivamente ao acompanhamento clínico realizado pelos profissionais de saúde responsáveis.
            </p>
          </div>

          {/* Subseção: O que você precisará autorizar? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <Info className="w-4 h-4 text-sesi-primary shrink-0" /> 
              <span>O que você precisará autorizar?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Na próxima etapa, tenha em mãos o seu CPF e o CPF do(a) estudante. Você precisará registrar suas escolhas sobre três pontos fundamentais:
            </p>
            <ul className="list-disc pl-6 sm:pl-12 text-slate-700 space-y-2 leading-relaxed text-xs sm:text-sm">
              <li>
                <strong className="text-slate-950">Atendimento de Saúde (Obrigatório):</strong> Autorização para que nossa equipe realize as consultas, triagens e avaliações clínicas no(a) aluno(a).
              </li>
              <li>
                <strong className="text-slate-950">Tratamento de Dados (Obrigatório):</strong> Permissão legal para o registro e armazenamento seguro do prontuário médico.
              </li>
              <li>
                <strong className="text-slate-950">Uso de Imagem (Opcional):</strong> Autorização para o registro de fotos institucionais do evento. A recusa desta opção não impede o atendimento do(a) estudante.
              </li>
            </ul>
          </div>

          {/* Subseção: Como proceder? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <Eye className="w-4 h-4 text-sesi-primary shrink-0" /> 
              <span>Como proceder?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Leia as próximas telas com atenção, marque as suas opções e, ao final, clique no botão de assinatura eletrônica para concluir. O processo inteiro leva menos de 2 minutos.
            </p>
          </div>

          {/* Botão de ação integrado na folha A4 */}
          <div className="pt-6 sm:pt-8 border-t border-slate-200 flex justify-end">
            <button
              id="btn-avancar-leitura"
              onClick={onProceed}
              className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-sesi-primary hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <span>Acessar Formulário de Autorização</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra institucional no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
          <img
            src="/barra.jpg"
            alt="Barra institucional SESI"
            className="w-full h-6 sm:h-9 object-cover object-center block"
          />
        </div>

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          1
        </div>
      </div>
    </div>
  );
};

