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
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              {institution?.name || 'Escola Cidadã — Saúde em Movimento'}
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
            Sabemos que a saúde e a segurança do(a) seu filho(a) são as suas maiores prioridades. É com esse mesmo cuidado que a <strong>Universidade de Brasília (UnB)</strong>, o <strong>SESI-DF</strong> e a <strong>Finatec</strong> trazem até a comunidade escolar esta iniciativa de cuidado preventivo e cidadania. O projeto é viabilizado por meio de emenda parlamentar e leva atendimento gratuito em unidades móveis para estudantes <strong>a partir de 14 anos</strong>.
          </p>

          <p className="m-0 leading-relaxed">
            Criamos este ambiente digital para que você possa autorizar a participação do(a) estudante com total transparência, comodidade e segurança jurídica, direto do seu celular e sem a necessidade de imprimir papéis.
          </p>

          {/* Quais serviços estão disponíveis */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <Info className="w-4 h-4 text-sesi-primary shrink-0" />
              <span>Quais serviços estão disponíveis nas Unidades Móveis?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Neste projeto itinerante, a nossa equipe multiprofissional oferecerá atendimentos focados na promoção da saúde, prevenção e qualidade de vida. As áreas de atuação contemplam:
            </p>
            <ul className="list-disc pl-6 sm:pl-12 text-slate-700 space-y-1.5 leading-relaxed text-xs sm:text-sm">
              <li>
                <strong className="text-slate-950 font-semibold">Oftalmologia:</strong> Triagem visual e identificação de necessidades clínicas.
              </li>
              <li>
                <strong className="text-slate-950 font-semibold">Audiometria:</strong> Triagem auditiva para detecção precoce de alterações.
              </li>
              <li>
                <strong className="text-slate-950 font-semibold">Odontologia:</strong> Avaliação da saúde bucal e ações preventivas.
              </li>
              <li>
                <strong className="text-slate-950 font-semibold">Psicologia:</strong> Acolhimento e oficinas voltadas às competências socioemocionais e sociorrelacionais.
              </li>
              <li>
                <strong className="text-slate-950 font-semibold">Nutrição:</strong> Avaliação e oficinas focadas em alimentação saudável.
              </li>
            </ul>
          </div>

          {/* Aviso Operacional Importante */}
          <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 mt-2 text-xs text-amber-950 leading-relaxed">
            <strong className="text-amber-950 block mb-1">⚠️ Aviso Operacional Importante:</strong>
            Este sistema digital serve exclusivamente para a autorização legal de atendimento. A autorização não garante a consulta imediata. O agendamento dos horários ocorre de forma presencial no estacionamento da escola, próximo às unidades móveis, e está estritamente sujeito à capacidade máxima diária de cada especialidade (vagas limitadas).
          </div>

          {/* Por que estou no sistema Catraki? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <ShieldCheck className="w-4 h-4 text-sesi-primary shrink-0" />
              <span>Por que estou no sistema Catraki?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              O Catraki é a plataforma digital utilizada para a formalização e registro rigoroso desta autorização eletrônica. Para garantir a sua privacidade, blindar o sistema contra o vazamento de informações e atender integralmente aos requisitos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), as comunicações utilizam conexão segura e criptografada. A sua identidade será validada por um código temporário de segurança enviado ao seu e-mail, sem a necessidade de criar conta ou memorizar senhas.
            </p>
          </div>

          {/* O que você precisará autorizar? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <Info className="w-4 h-4 text-sesi-primary shrink-0" />
              <span>O que você precisará autorizar?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Na próxima etapa, tenha em mãos o seu CPF e o CPF do(a) estudante — dados necessários para a validação da idade mínima (14 anos) e para garantir a validade jurídica da assinatura eletrônica. Você precisará registrar suas escolhas sobre três pontos fundamentais:
            </p>
            <ul className="list-disc pl-6 sm:pl-12 text-slate-700 space-y-1.5 leading-relaxed text-xs sm:text-sm">
              <li>
                <strong className="text-slate-950">Atendimento e Participação (Obrigatório):</strong> Autorização para que o(a) aluno(a) participe das ações do projeto e passe pelas triagens clínicas nas unidades móveis.
              </li>
              <li>
                <strong className="text-slate-950">Tratamento de Dados (Obrigatório):</strong> Permissão legal para o registro, proteção e armazenamento seguro do prontuário de saúde. Os dados médicos são estritamente confidenciais e restritos aos profissionais de saúde.
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

          {/* Precisa de suporte? */}
          <div className="bg-sky-50/60 border border-sky-100/80 rounded-xl p-3.5 mt-2 text-[11px] sm:text-xs text-sky-950 leading-relaxed">
            <strong className="text-sky-950 block mb-1">📞 Precisa de suporte?</strong>
            Caso não receba o código de segurança em seu e-mail (verifique também a caixa de spam) ou enfrente dificuldades com a validação do CPF, procure a equipe de apoio presencial do projeto ou a coordenação da escola.
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
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
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

