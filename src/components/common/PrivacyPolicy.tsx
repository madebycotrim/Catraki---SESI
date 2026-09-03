import React from 'react';
import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-1 sm:px-4 pb-10 pt-1 text-slate-800">
      
      {/* Botões de Ação Superior (fora da folha A4) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4 px-1 no-print">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Sistema</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Folha A4 — Padrão ABNT Responsivo */}
      <div className="document-sheet-a4 space-y-6">
        
        {/* Cabeçalho oficial com logo e divisa */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b-2 sm:border-b-3 border-[#034b7f]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/catraki.png"
              alt="Catraki"
              className="h-8 sm:h-10 w-auto object-contain rounded"
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-[8.5pt] text-slate-500 m-0 uppercase tracking-wider font-semibold">
              PLATAFORMA CATRAKI — GOVERNANÇA & SEGURANÇA
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Política de Privacidade e Proteção de Dados
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-6 sm:mb-8 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Conformidade Integral LGPD (Lei nº 13.709/2018)</span>
          </div>
          <h1 className="text-sm sm:text-base md:text-[13pt] font-extrabold uppercase text-slate-900 tracking-tight m-0">
            POLÍTICA DE PRIVACIDADE E SEGURANÇA DA INFORMAÇÃO
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 m-0">
            Governança de Dados Pessoais • Criptografia e Exercício de Direitos do Titular
          </p>
        </div>

        {/* Conteúdo Estruturado */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed text-left sm:text-justify">
          
          {/* Seção 1 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">1</span>
              <span>Compromisso com a Privacidade e o Sigilo</span>
            </h2>
            <p className="m-0 pl-7">
              A presente Política de Privacidade regula o tratamento de dados pessoais e de saúde de crianças, adolescentes e seus respectivos responsáveis legais no âmbito das ações clínicas e preventivas do projeto de extensão e promoção da saúde <strong>Escola Cidadã — Saúde em Movimento</strong>. O projeto é executado em regime de <strong>controladoria conjunta</strong> pela <strong>Universidade de Brasília (Faculdade de Ciências da Saúde — FS/UnB)</strong> e pelo <strong>SESI-DF</strong>, com recursos de emenda parlamentar, e operado por meio da plataforma <strong>Catraki</strong>.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">2</span>
              <span>Bases Legais e Finalidade do Tratamento</span>
            </h2>
            <p className="m-0 pl-7">
              O tratamento de dados pessoais comuns e dados pessoais sensíveis de saúde é realizado em estrita observância aos <strong>Artigos 7º (inciso I), 11 (inciso I) e 14 da Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>, com base no consentimento específico e em destaque concedido pelos responsáveis legais em favor do melhor interesse do menor (ECA, Lei nº 8.069/1990).
            </p>
            <div className="ml-7 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside m-0">
                <li><strong>Finalidade Clínica e Assistencial:</strong> Realização de triagens e atendimentos nas especialidades oficiais do projeto: Oftalmologia, Audiometria, Odontologia, Psicologia e Nutrição nas unidades móveis.</li>
                <li><strong>Finalidade Científica e de Extensão:</strong> Geração de estatísticas agregadas e anonimizadas para acompanhamento epidemiológico escolar e projetos de pesquisa/extensão da Faculdade de Ciências da Saúde (FS/UnB).</li>
                <li><strong>Finalidade Institucional:</strong> Comprovação de autoria do consentimento, segurança jurídica, prestação de contas pedagógicas e geração de laudos em saúde escolar.</li>
              </ul>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">3</span>
              <span>Medidas de Segurança e Criptografia da Plataforma</span>
            </h2>
            <p className="m-0 pl-7">
              A plataforma Catraki emprega padrões rigorosos de segurança da informação, em conformidade com as melhores práticas do mercado:
            </p>
            <div className="ml-7 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside m-0">
                <li><strong>Criptografia em Repouso:</strong> Dados confidenciais (CPFs, contatos e assinaturas) são armazenados cifrados com algoritmo padrão <strong>AES-GCM de 256 bits</strong> com chaves derivadas por PBKDF2.</li>
                <li><strong>Criptografia em Trânsito:</strong> Toda a comunicação é protegida via protocolo seguro <strong>TLS 1.3</strong> com cabeçalhos HSTS rígidos.</li>
                <li><strong>Autenticidade e Rastreabilidade:</strong> Cada assinatura gera um código de integridade único (SHA-256) e uma trilha de auditoria digital imutável, com validade jurídica nos termos do <strong>Art. 10, § 2º da MP nº 2.200-2/2001</strong>, da <strong>Lei nº 14.063/2020</strong>, dos <strong>Arts. 104 e 107 do Código Civil</strong>, dos <strong>Arts. 411 e 441 do CPC</strong> e da jurisprudência consolidada do STJ (REsp 2.205.708/PR).</li>
              </ul>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">4</span>
              <span>Prazo de Retenção e Descarte Seguro de Dados</span>
            </h2>
            <p className="m-0 pl-7">
              Os dados coletados são mantidos pelo período mínimo necessário para garantir a validade legal do consentimento — normalmente <strong>20 anos</strong>, em conformidade com os prazos de responsabilidade civil e guarda de prontuários em saúde. Após esse período, os dados são anonimizados ou excluídos de forma definitiva e segura, conforme a legislação vigente.
            </p>
          </section>

          {/* Seção 5 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">5</span>
              <span>Direitos do Titular e Canais de Atendimento de Privacidade</span>
            </h2>
            <p className="m-0 pl-7">
              Conforme o <strong>Artigo 18 da LGPD</strong>, o responsável legal tem o direito de solicitar a qualquer tempo a confirmação da existência de tratamento, o acesso aos dados, a portabilidade, a correção de dados incompletos ou a <strong>revogação do consentimento</strong>.
            </p>
            <div className="ml-7 bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2 text-xs sm:text-sm text-slate-700">
              <p className="font-bold text-slate-900 m-0">Canais Oficiais de Atendimento para Exercício de Direitos:</p>
              <ul className="space-y-1.5 text-xs text-slate-600 m-0 list-disc list-inside">
                <li><strong>E-mail de Contato para Privacidade:</strong> <a href="mailto:suporte@catraki.com.br" className="text-sesi-primary font-bold underline hover:text-blue-900">suporte@catraki.com.br</a></li>
                <li><strong>Portal de Autoatendimento do Titular:</strong> Acesse a seção de privacidade disponível no validador público da plataforma para consultar, corrigir ou solicitar a exportação ou exclusão dos seus dados.</li>
                <li><strong>Prazos de Atendimento:</strong> Conforme os prazos regulamentares da Autoridade Nacional de Proteção de Dados (ANPD).</li>
              </ul>
            </div>
          </section>

          {/* Seção 6 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">6</span>
              <span>Agentes de Tratamento e Isenção de Responsabilidade</span>
            </h2>
            <p className="m-0 pl-7">
              As decisões referentes ao tratamento dos dados pessoais e de saúde competem exclusivamente aos <strong>Controladores</strong> do projeto: o <strong>Serviço Social da Indústria (SESI-DF)</strong> e a <strong>Universidade de Brasília (FS/UnB)</strong>.
            </p>
            <div className="ml-7 p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 text-xs sm:text-sm leading-relaxed space-y-2">
              <p className="m-0">
                <strong>Testemunha Tecnológica (Isenção de Responsabilidade):</strong> A Plataforma Catraki <strong>não possui CNPJ</strong>, não acessa os dados de saúde e não decide nada sobre o conteúdo dos documentos. Sua função é exclusivamente registrar a autoria, o momento e a integridade das assinaturas — como uma “testemunha digital” imparcial. Todas as decisões sobre os dados de saúde são de responsabilidade exclusiva dos <strong>Controladores do projeto</strong>: o <strong>SESI-DF</strong> e a <strong>FS/UnB</strong>.
              </p>
            </div>
          </section>

        </div>

        {/* Rodapé e Barra Institucional */}
        <div className="pt-6 border-t border-slate-200 text-center text-[11px] sm:text-xs text-slate-500 space-y-1 mt-8">
          <p className="m-0 font-semibold text-slate-600">
            Plataforma Catraki • Governança, Integridade e Proteção de Dados
          </p>
          <p className="m-0 text-slate-400">
            Em conformidade com a MP nº 2.200-2/2001, Lei nº 14.063/2020, Código Civil, CPC e LGPD (Lei nº 13.709/2018)
          </p>
        </div>

        {/* Barra institucional azul sólida no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-2.5 bg-[#034b7f] pointer-events-none z-10" />

      </div>
    </div>
  );
};
