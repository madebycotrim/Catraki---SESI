import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-sesi-primary transition-colors cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Sistema</span>
        </button>
      )}

      {/* Folha A4 Institucional de Privacidade */}
      <div className="document-sheet-a4 space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b-2 border-sesi-primary">
          <div className="flex items-center gap-3">
            <img src="/catraki.png" alt="Catraki" className="h-9 w-auto rounded" />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider m-0">
              Escola Cidadã — Saúde em Movimento
            </p>
            <p className="text-xs font-bold text-slate-800 m-0">
              Política de Privacidade e Proteção de Dados
            </p>
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center pb-2 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sesi-primary border border-sky-200 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Conformidade Integral LGPD (Lei 13.709/2018)</span>
          </div>
          <h1 className="text-base sm:text-xl font-bold uppercase text-slate-900 m-0">
            POLÍTICA DE PRIVACIDADE E SEGURANÇA DA INFORMAÇÃO
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plataforma Catraki • SESI-DF • Universidade de Brasília (UnB)
          </p>
        </div>

        {/* Conteúdo Jurídico Estruturado */}
        <div className="space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
          
          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-sesi-primary" />
              <span>1. Compromisso com a Privacidade e o Sigilo</span>
            </h2>
            <p>
              A presente Política de Privacidade regula o tratamento de dados pessoais e de saúde de crianças, adolescentes e seus respectivos responsáveis legais no âmbito das ações clínicas e preventivas do projeto de extensão e promoção da saúde <strong>Escola Cidadã — Saúde em Movimento</strong>. O projeto é executado em regime de <strong>controladoria conjunta</strong> pela <strong>Universidade de Brasília (Faculdade de Ciências da Saúde — FS/UnB)</strong> e pelo <strong>SESI-DF</strong>, com recursos de emenda parlamentar, e operado por meio da plataforma <strong>Catraki</strong>.
            </p>
          </section>
 
          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sesi-primary" />
              <span>2. Bases Legais e Finalidade do Tratamento</span>
            </h2>
            <p>
              O tratamento de dados pessoais comuns e dados pessoais sensíveis de saúde é realizado em estrita observância aos <strong>Artigos 7º (inciso I), 11 (inciso I) e 14 da Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>, com base no consentimento específico e em destaque concedido pelos responsáveis legais em favor do melhor interesse do menor (ECA, Lei nº 8.069/1990).
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-slate-600">
              <li><strong>Finalidade Clínica e Assistencial:</strong> Realização de triagens e atendimentos nas especialidades oficiais do projeto: Oftalmologia, Audiometria, Odontologia, Psicologia e Nutrição nas unidades móveis.</li>
              <li><strong>Finalidade Científica e de Extensão:</strong> Geração de estatísticas agregadas e anonimizadas para acompanhamento epidemiológico escolar e projetos de pesquisa/extensão da Faculdade de Ciências da Saúde (FS/UnB).</li>
              <li><strong>Finalidade Institucional:</strong> Comprovação de autoria do consentimento, segurança jurídica, prestação de contas pedagógicas e geração de laudos em saúde escolar.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>3. Medidas de Segurança e Criptografia da Plataforma</span>
            </h2>
            <p>
              A plataforma Catraki emprega padrões bancários de segurança da informação:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Criptografia em Repouso:</strong> Dados confidenciais (CPFs, contatos e assinaturas) são armazenados cifrados com algoritmo padrão <strong>AES-GCM de 256 bits</strong> com chaves derivadas por PBKDF2.</li>
              <li><strong>Criptografia em Trânsito:</strong> Toda a comunicação é protegida via protocolo seguro <strong>TLS 1.3</strong> com cabeçalhos HSTS rígidos.</li>
              <li><strong>Autenticidade e Rastreabilidade:</strong> Cada assinatura gera um código de integridade único (SHA-256) e uma trilha de auditoria digital imutável, com plena validade jurídica nos termos do <strong>Art. 4º, II da Lei nº 14.063/2020</strong>, da <strong>MP 2.200-2/2001</strong> e da jurisprudência consolidada do STJ.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900">
              4. Prazo de Retenção e Descarte Seguro de Dados
            </h2>
            <p>
              Os dados coletados são mantidos pelo período mínimo necessário para garantir a validade legal do consentimento — normalmente <strong>20 anos</strong>, em conformidade com os prazos de responsabilidade civil. Após esse período, os dados são anonimizados ou excluídos de forma definitiva e segura, conforme a legislação vigente.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900">
              5. Direitos do Titular e Canal de Atendimento de Privacidade
            </h2>
            <p>
              Conforme o <strong>Artigo 18 da LGPD</strong>, o responsável legal tem o direito de solicitar a qualquer tempo a confirmação da existência de tratamento, o acesso aos dados, a portabilidade, a correção de dados incompletos ou a <strong>revogação do consentimento</strong>.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2 mt-2 text-xs sm:text-sm text-slate-700">
              <p className="font-bold text-slate-900 m-0">Canais de Atendimento para Exercício de Direitos:</p>
              <ul className="space-y-1 text-xs text-slate-600 m-0 list-disc list-inside">
                <li><strong>E-mail de Contato para Privacidade:</strong> <a href="mailto:dpo@catraki.com.br" className="text-sesi-primary font-bold underline">dpo@catraki.com.br</a></li>
                <li><strong>Portal de Autoatendimento do Titular:</strong> Acesse a seção de privacidade disponível no validador público da plataforma para consultar, corrigir ou solicitar a exclusão dos seus dados.</li>
                <li><strong>Prazos de Atendimento:</strong> Conforme os prazos regulamentares da Autoridade Nacional de Proteção de Dados (ANPD)</li>
              </ul>
            </div>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900">
              6. Agentes de Tratamento e Isenção de Responsabilidade
            </h2>
            <p>
              As decisões referentes ao tratamento dos dados pessoais e de saúde competem exclusivamente aos <strong>Controladores</strong> do projeto: o <strong>Serviço Social da Indústria (SESI-DF)</strong> e a <strong>Universidade de Brasília (FS/UnB)</strong>.
            </p>
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 text-blue-950 text-xs sm:text-sm leading-relaxed">
              <strong>Testemunha Tecnológica (Isenção de Responsabilidade):</strong> A Plataforma Catraki <strong>não possui CNPJ</strong>, não acessa os dados de saúde e não decide nada sobre o conteúdo dos documentos. Sua função é exclusivamente registrar a autoria, o momento e a integridade das assinaturas — como uma “testemunha digital” imparcial. Todas as decisões sobre os dados de saúde são de responsabilidade exclusiva dos <strong>Controladores do projeto</strong>: o <strong>SESI-DF</strong> e a <strong>FS/UnB</strong>.
            </div>
          </section>

        </div>

        {/* Rodapé e Barra Institucional */}
        <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <p className="m-0">Atualizado e homologado em 2026 • Plataforma Catraki</p>
        </div>

        {/* Barra institucional azul sólida no final da folha A5 (Padronizada) */}
        <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-2.5 bg-[#034b7f] pointer-events-none z-10" />

      </div>
    </div>
  );
};
