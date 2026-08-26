import React, { useState } from 'react';
import { ChevronRight, Info, Eye, HelpCircle, AlertTriangle } from 'lucide-react';
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

export const Step1Reading: React.FC<Step1ReadingProps> = ({ document, onProceed }) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              PLATAFORMA CATRAKI — ASSINATURA ELETRÔNICA
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
        <div className="space-y-5 sm:space-y-6 text-slate-800 text-left sm:text-justify text-xs sm:text-sm md:text-[10pt] leading-relaxed">
          <p className="m-0 leading-relaxed font-semibold">
            Prezado(a) Responsável,
          </p>
          <p className="m-0 leading-relaxed">
            Sabemos que a saúde e a segurança do(a) seu filho(a) são as suas maiores prioridades. É com esse mesmo cuidado que a <strong>Universidade de Brasília (UnB)</strong> e o <strong>SESI-DF</strong> trazem até a comunidade escolar esta iniciativa de cuidado preventivo e cidadania. O projeto leva atendimento clínico gratuito nas especialidades de <strong>Oftalmologia, Odontologia, Fonoaudiologia (Audiometria), Terapia Comunitária Integrativa (Psicologia) e Oficinas de Alimentação Saudável (Nutrição)</strong> em unidades móveis para estudantes com idade <strong>a partir de 14 anos</strong>.
          </p>

          <p className="m-0 leading-relaxed">
            Criamos este ambiente digital para que você possa autorizar a participação do(a) estudante com total transparência, comodidade e segurança jurídica, direto do seu celular e sem a necessidade de imprimir papéis.
          </p>

          {/* Card de Atalho para Validação de Assinaturas Anteriores */}
          <div className="bg-slate-50/50 border border-slate-200 p-3 sm:p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 mt-2 shadow-3xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
              <span className="text-xs sm:text-sm text-slate-600 font-medium">Já assinou e deseja validar a autenticidade do seu comprovante?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/validar');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-[#004b8d] hover:text-[#003666] font-bold text-xs rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer text-center"
            >
              Validar Assinatura Realizada
            </button>
          </div>

          {/* Aviso Operacional Importante */}
          <div className="bg-amber-50/70 border border-amber-200 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-xs text-amber-950 mt-2 leading-relaxed">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <strong className="text-amber-950 block mb-0.5 text-xs sm:text-sm font-bold">Aviso Operacional Importante</strong>
              Este sistema digital serve exclusivamente para a autorização legal de atendimento. A autorização não garante a consulta imediata. O agendamento dos horários ocorre de forma presencial no estacionamento da escola, próximo às unidades móveis, e está estritamente sujeito à capacidade máxima diária de cada especialidade (vagas limitadas).
            </div>
          </div>

          {/* O que você precisará autorizar? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <Info className="w-4 h-4 text-sesi-primary shrink-0" />
              <span>O que você precisará autorizar?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Na próxima etapa, tenha em mãos o seu CPF e o CPF do(a) estudante. Você precisará registrar suas escolhas sobre três pontos:
            </p>
            <ul className="list-disc pl-6 sm:pl-12 text-slate-700 space-y-1.5 leading-relaxed text-xs sm:text-sm">
              <li>
                <strong className="text-slate-950">Atendimento e Participação (Obrigatório):</strong> Autorização para que o(a) aluno(a) participe das ações do projeto e passe pelas triagens clínicas nas unidades móveis.
              </li>
              <li>
                <strong className="text-slate-950">Tratamento de Dados (Obrigatório):</strong> Permissão legal para o registro e proteção dos dados pessoais do responsável e do estudante na plataforma, necessários para a validação jurídica da assinatura e controle de consentimento.
              </li>
              <li>
                <strong className="text-slate-950">Uso de Imagem (Opcional):</strong> Autorização para o registro de fotos institucionais do evento. A recusa desta opção não impede a participação do(a) estudante.
              </li>
            </ul>
          </div>

          {/* Como proceder? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <Eye className="w-4 h-4 text-sesi-primary shrink-0" />
              <span>Como proceder?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Leia as próximas telas com atenção, marque as suas opções e, ao final, clique no botão de assinatura eletrônica para concluir o processo.
            </p>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-xs text-blue-900 mt-4 sm:mt-6 leading-relaxed">
            <HelpCircle className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <strong className="text-blue-900 block mb-0.5 text-xs sm:text-sm font-bold">Precisa de ajuda?</strong>
              O código de segurança de 6 dígitos será enviado para o seu e-mail. Se demorar a chegar, confira também sua pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>. Caso precise de apoio, procure a nossa equipe presencial na escola ou envie um e-mail para <a href="mailto:suporte@catraki.com.br" className="text-sesi-primary font-bold underline hover:text-blue-900">suporte@catraki.com.br</a>.
            </div>
          </div>

          {/* Seção de Termos de Uso Independentes (Módulo 1 - LGPD) */}
          <div className="pt-4 sm:pt-5 border-t border-slate-200 space-y-3">
            <label className="flex items-start gap-3 p-3.5 bg-blue-50/50 hover:bg-blue-50/80 border border-blue-200/80 rounded-xl cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4.5 h-4.5 text-[#004b8d] border-slate-300 rounded focus:ring-[#004b8d] cursor-pointer"
              />
              <span className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                Li e concordo com os <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-[#004b8d] hover:underline font-bold" onClick={(e) => e.stopPropagation()}>Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-[#004b8d] hover:underline font-bold" onClick={(e) => e.stopPropagation()}>Política de Privacidade</a> da Plataforma Catraki. <span className="text-red-500 font-bold">* (Obrigatório)</span>
              </span>
            </label>

            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed italic m-0 text-justify">
              Você também autoriza o tratamento dos seus dados de identificação (IP, nome, e-mail e dispositivo) exclusivamente para fins de autenticidade, integridade e validade jurídica desta assinatura eletrônica, em plena conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </div>

          {/* Botão de ação integrado na folha A4 */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              id="btn-avancar-leitura"
              onClick={onProceed}
              disabled={!acceptedTerms}
              className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-[#004b8d] hover:bg-[#003666] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.99]"
            >
              <span>Continuar para Assinatura</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra institucional azul sólida no final da folha (Padronizada) */}
        <div className="absolute bottom-0 left-0 right-0 h-2.5 sm:h-3.5 bg-[#034b7f] pointer-events-none z-10" />

        {/* Número de página (canto superior direito ABNT) */}
        <div className="absolute top-4 sm:top-9 right-4 sm:right-12 font-sans text-xs text-slate-400">
          1
        </div>
      </div>
    </div>
  );
};

