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
            <div className="h-6 w-px bg-slate-300 hidden sm:block" />
            <img src="/logo-1linha.svg" alt="SESI Saúde" className="h-8 w-auto" />
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
            Plataforma Catraki • SESI-DF • Universidade de Brasília (UnB) • FINATEC
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
              A presente Política de Privacidade regula o tratamento de dados pessoais e de saúde de crianças, adolescentes e seus respectivos responsáveis legais no âmbito das ações clínicas e preventivas do projeto <strong>Escola Cidadã: Saúde em Movimento</strong>, executado pelo <strong>SESI-DF</strong> em parceria com a <strong>Universidade de Brasília (UnB)</strong> e a <strong>Fundação de Empreendimentos Científicos e Tecnológicos (FINATEC)</strong>, operacionalizado através da plataforma tecnológica <strong>Catraki</strong>.
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
              <li><strong>Finalidade Clínica:</strong> Realização de triagens odontológicas, oftalmológicas, fonoaudiológicas, testes de acuidade visual e encaminhamentos médicos preventivos.</li>
              <li><strong>Finalidade Institucional:</strong> Comprovação de autoria da autorização, prestação de contas pedagógicas e geração de laudos em saúde escolar.</li>
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
              <li><strong>Imutabilidade e Não-Repúdio:</strong> Toda assinatura eletrônica gera um resumo criptográfico SHA-256 e trilha de auditoria digital com validade jurídica perante a <strong>MP 2.200-2/2001</strong> e <strong>Lei nº 14.063/2020</strong>.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900">
              4. Prazo de Retenção e Descarte Seguro de Dados
            </h2>
            <p>
              Os dados coletados são mantidos pelo período estritamente necessário para o cumprimento das finalidades assistenciais do projeto escolar (prazo padrão de <strong>3 anos</strong> após a conclusão das ações), sendo posteriormente submetidos ao processo de anonimização ou expurgo seguro, ressalvadas as obrigações legais de guarda de prontuários estabelecidas pelo Conselho Federal de Medicina (CFM).
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900">
              5. Direitos do Titular e Canal Oficial do Encarregado (DPO)
            </h2>
            <p>
              Conforme o <strong>Artigo 18 da LGPD</strong>, o responsável legal tem o direito de solicitar a qualquer tempo a confirmação da existência de tratamento, o acesso aos dados, a correção de dados incompletos ou a <strong>revogação do consentimento</strong>.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-1.5 mt-2">
              <p className="font-bold text-slate-900 m-0">Canal de Atendimento do Titular / DPO:</p>
              <p className="m-0"><strong>E-mail Oficial:</strong> <a href="mailto:autorizacoes@catraki.com.br" className="text-sesi-primary font-mono underline">autorizacoes@catraki.com.br</a></p>
              <p className="m-0"><strong>Portal Digital de Revogação:</strong> <a href="/revogar" className="text-sesi-primary underline">https://www.catraki.com.br/revogar</a></p>
              <p className="m-0 text-slate-500 text-[11px]">Prazo regulamentar de resposta: até 15 (quinze) dias úteis.</p>
            </div>
          </section>

        </div>

        {/* Rodapé e Barra Institucional */}
        <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <p className="m-0">Atualizado e homologado em 21 de agosto de 2026 • Catraki & SESI Saúde</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none z-10 leading-none">
          <img src="/barra.jpg" alt="Barra institucional SESI" className="w-full h-4 sm:h-5 object-cover object-center block" />
        </div>

      </div>
    </div>
  );
};
