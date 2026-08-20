import React from 'react';
import { ChevronRight, ShieldCheck, Info, Eye } from 'lucide-react';

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
  onProceed: () => void;
}

export const Step1Reading: React.FC<Step1ReadingProps> = ({ document, onProceed }) => {
  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 pb-8">
      {/* Mesa / Fundo claro e moderno */}
      <div
        style={{
          background: '#f1f5f9',
          padding:    '28px 20px',
          borderRadius: '8px',
          boxShadow:  'inset 0 2px 4px rgba(0,0,0,0.06)',
          border:     '1px solid #e2e8f0',
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
            fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
            fontSize:    '11pt',
            lineHeight:  '1.6',
            color:       '#000',
            minHeight:   '297mm',
            position:    'relative',
            boxShadow:   '0 4px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.12)',
          }}
        >
          {/* Cabeçalho com logo oficial */}
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
                Doc. nº {document.id}
              </p>
              <p style={{ fontSize: '8pt', color: '#888', margin: 0 }}>
                {dataHoje}
              </p>
            </div>
          </div>

          {/* Título Principal */}
          <div className="text-center mb-8">
            <h1 style={{ fontSize: '11pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: '#000', whiteSpace: 'nowrap' }}>
              Bem-vindo(a) ao Projeto Escola Cidadã: Saúde em Movimento
            </h1>
          </div>

          {/* Corpo da Carta de Boas-Vindas */}
          <div className="space-y-6 text-slate-800 text-justify" style={{ textIndent: '1.25cm' }}>
            <p className="m-0 leading-relaxed">
              Prezado(a) Responsável,<br />
              Sabemos que a saúde e a segurança do(a) seu filho(a) são as suas maiores prioridades. É com esse mesmo cuidado que a Escola CEMEIT, em parceria com a <strong>Universidade de Brasília (UnB)</strong>, o <strong>SESI-DF</strong> e a <strong>Finatec</strong>, traz até você esta iniciativa 100% gratuita de cuidado preventivo, saúde e cidadania.
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
                O Catraki é a plataforma digital oficial utilizada para o registro desta autorização. Para garantir que o documento possua total validade jurídica, o sistema coleta os dados necessários de forma criptografada. Nossa infraestrutura conta com tecnologia de ponta, tornando o ambiente altamente seguro contra qualquer tipo de invasão hacker ou vazamento de dados, em rigoroso cumprimento à Lei Geral de Proteção de Dados (LGPD). Os prontuários e informações de saúde do(a) estudante são confidenciais e acessados exclusivamente pela equipe médica.
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
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <img
              src="/barra.jpg"
              alt="Barra institucional SESI"
              style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            />
          </div>

          {/* Número de página */}
          <div style={{
            position: 'absolute',
            top:   '76px',
            right: '76px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10pt',
            color: '#000',
          }}>
            1
          </div>
        </div>
      </div>
    </div>
  );
};
