import React from 'react';
import { ChevronRight, Info, HelpCircle, AlertTriangle } from 'lucide-react';
import { DocumentSheetLayout } from '../common/DocumentSheetLayout.tsx';
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
  return (
    <DocumentSheetLayout
      subtitle="Termo de Consentimento (TCLE)"
      docNumber={document.id}
      institutionName={institution?.name}
      pageNumber={1}
    >

        {/* Título Principal */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-sm sm:text-base md:text-[12pt] font-bold text-slate-900 uppercase leading-snug tracking-tight m-0">
           CARTA DE BOAS-VINDAS — PROJETO ESCOLA CIDADÃ — SAÚDE EM MOVIMENTO
          </h1>
          {institution?.name && (
            <p className="text-xs sm:text-sm font-semibold text-[#004b8d] mt-1.5">
              Unidade Escolar: {institution.name} ({institution.city}/{institution.state})
            </p>
          )}
        </div>

        {/* Corpo da Carta de Boas-Vindas */}
        <div className="space-y-5 sm:space-y-6 text-slate-800 text-left sm:text-justify text-xs sm:text-sm md:text-[10pt] leading-relaxed">
          <p className="m-0 leading-relaxed font-semibold">
            Prezado(a) Responsável,
          </p>
          <p className="m-0 leading-relaxed">
             Sabemos que a saúde e a segurança do(a) estudante são a sua prioridade — e é com esse mesmo cuidado que a <strong>Universidade de Brasília (UnB)</strong> e o <strong>SESI-DF</strong> trazem até a comunidade escolar esta iniciativa de promoção da saúde. O projeto leva atendimento clínico gratuito nas especialidades de <strong>Oftalmologia, Odontologia, Fonoaudiologia (Audiometria), Terapia Comunitária Integrativa e Oficinas de Alimentação Saudável (Nutrição)</strong> em unidades móveis para estudantes com idade <strong>a partir de 14 anos</strong>.
          </p>

          <p className="m-0 leading-relaxed">
            Criamos este ambiente eletrônico para que você possa autorizar a participação do(a) estudante com total transparência e comodidade, direto do seu celular e sem a necessidade de imprimir papéis.
          </p>


          {/* Atalho de Validação — compacto */}
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" />
            <span>Já assinou?</span>
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/validar');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-[#004b8d] hover:underline font-semibold cursor-pointer transition-colors"
            >
              Verificar autenticidade do comprovante →
            </button>
          </div>


          {/* Aviso Operacional Importante */}
          <div className="bg-amber-50/70 border border-amber-200 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-xs text-amber-950 mt-2 leading-relaxed">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <strong className="text-amber-950 block mb-0.5 text-xs sm:text-sm font-bold">Aviso Operacional Importante</strong>
               Esta autorização eletrônica é o primeiro passo — mas não garante atendimento imediato. O agendamento das consultas é feito <strong>presencialmente na escola</strong>, junto às unidades móveis do projeto, e está sujeito à capacidade diária de cada especialidade. <strong>Vagas são limitadas.</strong>
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
                <strong className="text-slate-950">Tratamento de Dados (Obrigatório):</strong> Autorização para que seus dados pessoais e os do(a) estudante sejam registrados e protegidos na plataforma. Esses dados são usados exclusivamente para a correta identificação deste aceite e para que você possa revogar a autorização a qualquer momento, se necessário.
              </li>
              <li>
                <strong className="text-slate-950">Uso de Imagem (Opcional):</strong> Autorização para o registro de fotos institucionais do evento. A recusa desta opção não impede a participação do(a) estudante.
              </li>
            </ul>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-xs text-blue-900 mt-4 sm:mt-6 leading-relaxed">
            <HelpCircle className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <strong className="text-blue-900 block mb-0.5 text-xs sm:text-sm font-bold">Precisa de ajuda?</strong>
              O código de segurança de 6 dígitos será enviado para o seu e-mail. Se demorar a chegar, confira também sua pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>. Caso precise de apoio, procure a nossa equipe presencial na escola ou envie um e-mail para <a href="mailto:suporte@catraki.com.br" className="text-sesi-primary font-bold underline hover:text-blue-900">suporte@catraki.com.br</a>.
            </div>
          </div>

          <div className="pt-4 sm:pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] sm:text-xs text-slate-500 m-0">
              Na etapa de assinatura você revisará e confirmará formalmente os{' '}
              <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-[#004b8d] hover:underline font-semibold">Termos de Uso</a>{' '}e a{' '}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-[#004b8d] hover:underline font-semibold">Política de Privacidade</a>.
            </p>
            <button
              id="btn-avancar-leitura"
              type="button"
              onClick={onProceed}
              className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-[#004b8d] hover:bg-[#003666] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.99] touch-manipulation relative z-20 shrink-0"
            >
              <span>Continuar para Preencher o Formulário</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
    </DocumentSheetLayout>
  );
};

