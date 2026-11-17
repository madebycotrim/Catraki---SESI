import React from 'react';
import { ArrowLeft, Printer, CheckCircle2 } from 'lucide-react';
import { DocumentSheetLayout } from './DocumentSheetLayout.tsx';

interface TermsOfUseProps {
  onBack?: () => void;
}

export const TermsOfUse: React.FC<TermsOfUseProps> = ({ onBack }) => {
  return (
    <DocumentSheetLayout
      kicker="PLATAFORMA CATRAKI"
      subtitle="Termos e Condições de Uso"
      topActions={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Início</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs sm:text-sm font-bold bg-sesi-primary hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Título Principal */}
        <div className="text-center mb-6 sm:mb-8 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-sesi-primary border border-blue-200 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sesi-primary" />
            <span>Uso Simples, Seguro e Transparente</span>
          </div>
          <h1 className="text-sm sm:text-base md:text-[13pt] font-extrabold uppercase text-slate-900 tracking-tight m-0">
            TERMOS DE USO DA PLATAFORMA CATRAKI
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 m-0">
            Orientações sobre a plataforma, assinatura eletrônica simples e responsabilidades
          </p>
        </div>

        {/* Conteúdo em Linguagem Clara */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed text-left sm:text-justify">
          
          {/* Seção 1 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">1</span>
              <span>O que é a Plataforma Catraki?</span>
            </h2>
            <p className="m-0 pl-7">
              O <strong>Catraki</strong> é uma ferramenta de tecnologia desenvolvida para facilitar o preenchimento, a assinatura e a conferência de autorizações escolares de forma 100% eletrônica, rápida e sem necessidade de papel.
            </p>
            <p className="m-0 pl-7">
              O sistema é utilizado no projeto <strong>"Escola Cidadã: Saúde em Movimento"</strong>, uma parceria entre o <strong>SESI-DF</strong> e a <strong>Universidade de Brasília</strong>, permitindo que pais e responsáveis autorizem com segurança a participação dos estudantes nas triagens e atendimentos de saúde.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">2</span>
              <span>Como Funciona a Assinatura Eletrônica?</span>
            </h2>
            <p className="m-0 pl-7">
              Para garantir que a autorização é autêntica e partiu realmente de você, o processo de assinatura é simples e protegido por duas etapas:
            </p>
            <div className="ml-7 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside m-0">
                <li><strong>Código de Segurança por E-mail:</strong> Enviamos um código numérico de 6 dígitos para o seu e-mail para validar sua identidade;</li>
                <li><strong>Assinatura na Tela:</strong> Você faz o desenho da sua assinatura na tela do celular ou computador;</li>
                <li><strong>Comprovante com Código de Validação:</strong> Ao finalizar, o sistema gera um comprovante eletrônico oficial com código alfanumérico e QR Code único para conferência na escola.</li>
              </ul>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">3</span>
              <span>Informações Fornecidas e Responsabilidade</span>
            </h2>
            <p className="m-0 pl-7">
              Ao assinar o termo, você declara ser o pai, mãe ou responsável legal pelo estudante indicado e que os dados informados (como nomes e CPFs) são verdadeiros e de sua titularidade. O fornecimento de informações corretas é essencial para a segurança do estudante e para a organização dos atendimentos na escola.
            </p>
          </section>

          {/* Seção 4 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">4</span>
              <span>Quem é Responsável pelo Quê?</span>
            </h2>
            <div className="ml-7 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed space-y-2">
              <p className="m-0">
                <strong>Catraki (Tecnologia do Sistema):</strong> Atua estritamente como a ferramenta de software que emite o código, registra o horário e gera o comprovante de assinatura. O sistema não interfere nas consultas, não decide sobre atendimentos e não comercializa dados.
              </p>
              <p className="m-0">
                <strong>SESI-DF e Faculdade de Ciências da Saúde da UnB (Realização e Saúde):</strong> São as instituições promotoras e realizadoras do projeto, responsáveis pelos médicos, dentistas, psicólogos, nutricionistas, unidades móveis e pelo cuidado com a saúde dos alunos na escola.
              </p>
            </div>
          </section>

          {/* Seção 5 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">5</span>
              <span>Conferência de Autenticidade e Suporte</span>
            </h2>
            <p className="m-0 pl-7">
              A qualquer momento, os pais, a direção escolar ou a equipe do projeto podem conferir se uma autorização é autêntica acessando a página de validação pública da plataforma (<a href="https://catraki.com.br/validar" target="_blank" rel="noopener noreferrer" className="text-sesi-primary font-bold underline">catraki.com.br/validar</a>).
            </p>
            <p className="m-0 pl-7">
              Se tiver dúvidas técnicas sobre o uso da plataforma ou dificuldades com o código de e-mail, entre em contato pelo e-mail <a href="mailto:suporte@catraki.com.br" className="text-sesi-primary font-bold underline">suporte@catraki.com.br</a>.
            </p>
          </section>

        </div>

        {/* Rodapé e Barra Institucional */}
        <div className="pt-6 border-t border-slate-200 text-center text-[11px] sm:text-xs text-slate-500 space-y-1 mt-8">
          <p className="m-0 font-semibold text-slate-600">
            Plataforma Catraki • Tecnologia em Assinaturas Eletrônicas e Governança
          </p>
          <p className="m-0 text-slate-400">
            Projeto Escola Cidadã: Saúde em Movimento • Cooperação SESI-DF e UnB
          </p>
        </div>
      </div>
    </DocumentSheetLayout>
  );
};
