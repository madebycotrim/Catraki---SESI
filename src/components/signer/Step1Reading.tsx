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
        <div className="space-y-5 sm:space-y-6 text-slate-800 text-left sm:text-justify text-xs sm:text-sm md:text-[10pt] leading-relaxed">
          <p className="m-0 leading-relaxed">
            Prezado(a) Responsável,<br />
            Sabemos que a saúde e a segurança do(a) seu filho(a) são as suas maiores prioridades. É com esse mesmo cuidado que {institution?.name ? <strong>{institution.name}</strong> : <strong>o Centro de Ensino Médio Escola Industrial de Taguatinga (CEMEIT)</strong>}, em parceria com a <strong>Universidade de Brasília (UnB)</strong>, o <strong>SESI-DF</strong> e a <strong>Finatec</strong>, traz até você esta iniciativa 100% gratuita de cuidado preventivo, saúde e cidadania.
          </p>

          <p className="m-0 leading-relaxed">
            Criamos este ambiente digital para que você possa autorizar a participação do(a) estudante com total transparência, comodidade e segurança jurídica, direto do seu celular e sem a necessidade de imprimir papéis.
          </p>

          {/* Atividades e Serviços */}
          <div className="space-y-2.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0 border-b border-slate-100 pb-1">
              <Info className="w-4 h-4 text-sesi-primary shrink-0" />
              <span>Quais atividades e serviços poderão ser oferecidos?</span>
            </h2>
            <p className="m-0 text-slate-700 text-xs sm:text-sm">
              Neste projeto, o(a) estudante terá acesso a um circuito focado no bem-estar e na prevenção. Nossa equipe promoverá ações e atendimentos nas seguintes áreas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2 sm:pl-4">
              <div className="flex items-start gap-2">
                <span className="text-sesi-primary font-bold mt-0.5">•</span>
                <span className="text-xs sm:text-sm text-slate-700"><strong>Odontologia:</strong> Avaliação da saúde bucal e orientações de higiene.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sesi-primary font-bold mt-0.5">•</span>
                <span className="text-xs sm:text-sm text-slate-700"><strong>Oftalmologia:</strong> Triagem visual para identificar dificuldades de visão.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sesi-primary font-bold mt-0.5">•</span>
                <span className="text-xs sm:text-sm text-slate-700"><strong>Fonoaudiologia:</strong> Avaliação e triagem voltadas à audição e comunicação.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sesi-primary font-bold mt-0.5">•</span>
                <span className="text-xs sm:text-sm text-slate-700"><strong>Alimentação Saudável:</strong> Orientações nutricionais para o desenvolvimento adequado.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sesi-primary font-bold mt-0.5">•</span>
                <span className="text-xs sm:text-sm text-slate-700"><strong>Saúde Emocional:</strong> Acolhimento e avaliação do bem-estar psicológico.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sesi-primary font-bold mt-0.5">•</span>
                <span className="text-xs sm:text-sm text-slate-700"><strong>Oficinas Educativas:</strong> Atividades dinâmicas de conscientização e cidadania.</span>
              </div>
            </div>
            
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-3 mt-2 text-[11px] sm:text-xs text-amber-900 leading-normal">
              <strong>Aviso Importante:</strong> A participação no projeto não garante o atendimento em todos os serviços ofertados. As consultas e ações serão realizadas conforme a disponibilidade de vagas, critérios técnicos de triagem clínica, cronograma escolar e a organização geral das atividades do projeto.
            </div>
          </div>

          {/* Acompanhamento e Sigilo Médico */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <ShieldCheck className="w-4 h-4 text-sesi-primary shrink-0" />
              <span>Acompanhamento e Sigilo Médico</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Os resultados das avaliações e eventuais encaminhamentos clínicos serão comunicados diretamente aos responsáveis de forma segura. Ressaltamos que o prontuário gerado é estritamente confidencial: os dados médicos não serão compartilhados com a equipe pedagógica (professores ou coordenação), mantendo o rigoroso sigilo profissional.
            </p>
          </div>

          {/* Por que estou no sistema Catraki? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <ShieldCheck className="w-4 h-4 text-sesi-primary shrink-0" /> 
              <span>Por que estou no sistema Catraki?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              O Catraki é a plataforma digital utilizada para a formalização e registro rigoroso desta autorização eletrônica. Para garantir a sua privacidade, blindar o sistema contra o vazamento de informações e atender integralmente aos requisitos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), as comunicações utilizam conexão segura e criptografada de ponta a ponta. A sua identidade será validada por um código temporário de segurança enviado ao seu e-mail, sem a necessidade de criar conta ou memorizar senhas.
            </p>
          </div>

          {/* O que você precisará autorizar? */}
          <div className="space-y-1.5 pt-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 m-0">
              <Info className="w-4 h-4 text-sesi-primary shrink-0" /> 
              <span>O que você precisará autorizar?</span>
            </h2>
            <p className="leading-relaxed pl-2 sm:pl-6 text-slate-700 m-0 text-xs sm:text-sm">
              Na próxima etapa, tenha em mãos o seu CPF e o CPF do(a) estudante — dados necessários para garantir a validade jurídica da sua assinatura eletrônica. Você precisará registrar suas escolhas sobre três pontos fundamentais:
            </p>
            <ul className="list-disc pl-6 sm:pl-12 text-slate-700 space-y-1.5 leading-relaxed text-xs sm:text-sm">
              <li>
                <strong className="text-slate-950">Atendimento e Participação (Obrigatório):</strong> Autorização para que o(a) aluno(a) participe das ações do projeto e passe pelas triagens e avaliações clínicas detalhadas acima.
              </li>
              <li>
                <strong className="text-slate-950">Tratamento de Dados (Obrigatório):</strong> Permissão legal para o registro, proteção e armazenamento seguro do prontuário de saúde. Esta autorização é válida para o ciclo atual do projeto, resguardado o seu direito legal de revogar este consentimento a qualquer momento junto à administração do projeto.
              </li>
              <li>
                <strong className="text-slate-950">Uso de Imagem (Opcional):</strong> Autorização para o registro de fotos institucionais do evento. A recusa desta opção não impede a participação do(a) estudante no projeto.
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
              Leia as próximas telas com atenção, marque as suas opções e, ao final, clique no botão de assinatura eletrônica para concluir. O processo inteiro leva menos de 2 minutos.
            </p>
          </div>

          {/* Precisa de ajuda? */}
          <div className="bg-sky-50/60 border border-sky-100/80 rounded-xl p-3.5 mt-2 text-[11px] sm:text-xs text-sky-950 leading-relaxed">
            <strong className="text-sky-950 block mb-1">📞 Precisa de ajuda?</strong>
            Caso não receba o código de segurança em seu e-mail (verifique também a caixa de spam) ou enfrente alguma dificuldade de acesso durante a assinatura, entre em contato conosco através do e-mail <strong className="text-sky-900">suporte@catraki.com.br</strong>.
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

