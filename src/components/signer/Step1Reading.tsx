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
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 sm:px-4 pb-12 pt-2">
      {/* Folha A4 — Padrão ABNT (210mm x 297mm | Margens: Sup/Esq 30mm, Inf/Dir 20mm) */}
      <div
        className="p-6 sm:p-0"
        style={{
          background: '#ffffff',
          paddingTop: '80px',
          paddingLeft: '80px',
          paddingRight: '60px',
          paddingBottom: '80px',
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          fontSize: '11pt',
          lineHeight: '1.6',
          color: '#000',
          minHeight: '297mm',
          position: 'relative',
          borderRadius: '0px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
          {/* Cabeçalho com logo oficial */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '28px',
            paddingBottom: '16px',
            borderBottom: '3px solid #034b7f',
          }}>
            <img
              src="/logo-1linha.svg"
              alt="SESI Saúde"
              style={{ height: '46px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '8.5pt', color: '#555', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Escola Cidadã — Saúde em Movimento
              </p>
              <p style={{ fontSize: '9pt', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>
                Doc. nº {document.id}
              </p>
              <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título Principal */}
          <div className="text-center mb-8">
            <h1 style={{ fontSize: '12pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: '#000' }}>
              BEM-VINDO(A) AO PROJETO ESCOLA CIDADÃ — SAÚDE EM MOVIMENTO
            </h1>
          </div>

          {/* Corpo da Carta de Boas-Vindas */}
          <div className="space-y-6 text-slate-800 text-justify" style={{ textIndent: '1.25cm' }}>
            <p className="m-0 leading-relaxed">
              Prezado(a) Responsável,<br />
              Sabemos que a saúde e a segurança do(a) seu filho(a) são as suas maiores prioridades. É com esse mesmo cuidado que {institution?.name ? <strong>{institution.name}</strong> : 'a sua Escola'}, em parceria com a <strong>Universidade de Brasília (UnB)</strong>, o <strong>SESI-DF</strong> e a <strong>Finatec</strong>, traz até você esta iniciativa 100% gratuita de cuidado preventivo, saúde e cidadania.
            </p>

            <p className="m-0 leading-relaxed">
              Criamos este ambiente digital para que você possa autorizar o atendimento do(a) estudante com total transparência e comodidade, direto do seu celular, sem a necessidade de imprimir papéis.
            </p>

            {/* Subseção: Por que estou no sistema Catraki? */}
            <div className="space-y-2 pt-2" style={{ textIndent: 0 }}>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sesi-primary shrink-0" /> Por que estou no sistema Catraki?
              </h2>
              <p className="leading-relaxed pl-6 text-slate-700 m-0">
                O Catraki é a plataforma digital utilizada para a formalização e registro desta autorização eletrônica. Para atender aos requisitos de conformidade da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), as comunicações utilizam conexão segura criptografada (HTTPS) e validação de identidade por código temporário de segurança enviado ao seu e-mail, sem a necessidade de criar conta ou memorizar senhas. Os dados coletados e os prontuários de atendimento destinam-se exclusivamente ao acompanhamento clínico realizado pelos profissionais de saúde responsáveis.
              </p>
            </div>

            {/* Subseção: O que você precisará autorizar? */}
            <div className="space-y-2 pt-2" style={{ textIndent: 0 }}>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Info className="w-4 h-4 text-sesi-primary shrink-0" /> O que você precisará autorizar?
              </h2>
              <p className="leading-relaxed pl-6 text-slate-700 m-0">
                Na próxima etapa, tenha em mãos o seu CPF e o CPF do(a) estudante. Você precisará registrar suas escolhas sobre três pontos fundamentais:
              </p>
              <ul className="list-disc pl-12 text-slate-700 space-y-1.5 leading-relaxed font-medium">
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
            <div className="space-y-2 pt-2" style={{ textIndent: 0 }}>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Eye className="w-4 h-4 text-sesi-primary shrink-0" /> Como proceder?
              </h2>
              <p className="leading-relaxed pl-6 text-slate-700 m-0">
                Leia as próximas telas com atenção, marque as suas opções e, ao final, clique no botão de assinatura digital para concluir. O processo inteiro leva menos de 2 minutos.
              </p>
            </div>

            {/* Botão de ação integrado na folha A4 */}
            <div className="pt-8 border-t border-slate-100 flex justify-end" style={{ textIndent: 0 }}>
              <button
                id="btn-avancar-leitura"
                onClick={onProceed}
                className="w-full sm:w-auto px-6 py-3 bg-sesi-primary hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                Acessar Formulário de Autorização
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra institucional no final da folha */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }}>
            <img
              src="/barra.jpg"
              alt="Barra institucional SESI"
              style={{ width: '100%', height: '36px', display: 'block', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>

          {/* Número de página (canto superior direito ABNT) */}
          <div style={{
            position: 'absolute',
            top:   '36px',
            right: '60px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '9.5pt',
            color: '#64748b',
          }}>
            1
          </div>
        </div>
    </div>
  );
};
