import React from 'react';
import { ArrowLeft, Printer, ShieldCheck, Mail, HeartHandshake } from 'lucide-react';

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
      
      {/* Botões de Ação Superior */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4 px-1 no-print">
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

      {/* Folha A4 — Padrão ABNT / Leitura Limpa */}
      <div className="document-sheet-a4 space-y-6">
        
        {/* Cabeçalho */}
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
              PLATAFORMA CATRAKI
            </p>
            <p className="text-xs sm:text-[9pt] text-slate-800 m-0 font-bold">
              Política de Privacidade e Proteção de Informações
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
            <span>Transparência e Cuidado com Seus Dados</span>
          </div>
          <h1 className="text-sm sm:text-base md:text-[13pt] font-extrabold uppercase text-slate-900 tracking-tight m-0">
            POLÍTICA DE PRIVACIDADE DA PLATAFORMA CATRAKI
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 m-0">
            Saiba exatamente quais informações coletamos, como elas são protegidas e com quem você pode falar
          </p>
        </div>

        {/* Conteúdo em Linguagem Clara */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed text-left sm:text-justify">
          
          {/* Seção 1 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">1</span>
              <span>Nosso Compromisso com a sua Privacidade</span>
            </h2>
            <p className="m-0 pl-7">
              A privacidade e a segurança das informações de famílias e estudantes são prioridades fundamentais. Esta política explica de maneira simples e direta como as informações são tratadas quando você utiliza o <strong>Catraki</strong> para assinar a autorização de atendimento do projeto <strong>"Escola Cidadã: Saúde em Movimento"</strong> (realizado pelo <strong>SESI-DF</strong> e pela <strong>Faculdade de Ciências da Saúde da UnB</strong>).
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">2</span>
              <span>Quais Informações são Preenchidas e Por Quê?</span>
            </h2>
            <p className="m-0 pl-7">
              Solicitamos apenas as informações estritamente necessárias para identificar a família e emitir a autorização correta:
            </p>
            <div className="ml-7 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-2">
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside m-0">
                <li><strong>Dados do Responsável (Nome, CPF, E-mail e Telefone):</strong> Utilizados para confirmar quem está autorizando e para enviar o código de segurança de 6 dígitos no seu e-mail;</li>
                <li><strong>Dados do Estudante (Nome, CPF, Data de Nascimento, Turma e Turno):</strong> Utilizados para que a coordenação escolar e as equipes de atendimento saibam exatamente qual aluno foi autorizado pelos pais;</li>
                <li><strong>Suas Escolhas de Autorização:</strong> O registro claro de se você autoriza as consultas de saúde, o tratamento cadastral e, opcionalmente, o uso de fotos institucionais do evento.</li>
              </ul>
            </div>
            <p className="m-0 pl-7 font-medium text-slate-800">
              🔒 <strong>Garantia de Não Comercialização:</strong> Seus dados e os dados do seu filho(a) <strong>nunca serão vendidos, alugados, repassados a empresas de publicidade ou utilizados para qualquer fim comercial</strong>.
            </p>
          </section>

          {/* Seção 3 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">3</span>
              <span>Atendimentos de Saúde e Sigilo dos Alunos</span>
            </h2>
            <div className="ml-7 p-3.5 sm:p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs sm:text-sm leading-relaxed space-y-2">
              <p className="font-bold text-emerald-950 flex items-center gap-1.5 m-0">
                <HeartHandshake className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Atendimentos Conduzidos por Equipes Habilitadas:</span>
              </p>
              <p className="m-0 text-emerald-900">
                As triagens e consultas (Oftalmologia, Odontologia, Audiometria, Psicologia e Nutrição) são realizadas <strong>exclusivamente pelos profissionais de saúde do SESI-DF e da UnB</strong> dentro das unidades móveis nas escolas.
              </p>
              <p className="m-0 text-emerald-900">
                A plataforma Catraki atua apenas como o software de autorização prévia e não guarda prontuários médicos confidenciais. O sigilo dos atendimentos cabe diretamente aos profissionais de saúde e às instituições organizadoras.
              </p>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">4</span>
              <span>Como Protegemos as Informações no Sistema?</span>
            </h2>
            <div className="ml-7 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside m-0">
                <li><strong>Conexão Segura:</strong> Toda a navegação é protegida por criptografia moderna de ponta a ponta (HTTPS);</li>
                <li><strong>Validação por E-mail:</strong> A assinatura só é concluída após você digitar o código recebido no seu e-mail;</li>
                <li><strong>Dados Criptografados:</strong> Informações sensíveis e assinaturas são gravadas de forma cifrada no banco de dados;</li>
                <li><strong>Comprovante Verificável:</strong> Cada documento gera um código único que impede qualquer adulteração posterior.</li>
              </ul>
            </div>
          </section>

          {/* Seção 5 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">5</span>
              <span>Seus Direitos e Como Falar Conosco</span>
            </h2>
            <p className="m-0 pl-7">
              Você tem total controle sobre as autorizações concedidas. A qualquer momento, você pode:
            </p>
            <div className="ml-7 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm text-slate-700">
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside m-0">
                <li>Conferir a autenticidade e o status do termo assinado no validador público (<a href="https://catraki.com.br/validar" target="_blank" rel="noopener noreferrer" className="text-sesi-primary font-bold underline">catraki.com.br/validar</a>);</li>
                <li>Solicitar a correção de dados cadastrais incorretos;</li>
                <li>Solicitar a revogação de uma autorização concedida ou cancelamento de uso de imagem.</li>
              </ul>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1.5 m-0">
                  <Mail className="w-4 h-4 text-sesi-primary" />
                  <span>Canal de Atendimento e Dúvidas:</span>
                </p>
                <p className="m-0 text-slate-600">
                  Para dúvidas técnicas sobre o sistema ou solicitações sobre suas informações:
                </p>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-slate-900 font-bold text-xs inline-block">
                  E-mail: <a href="mailto:suporte@catraki.com.br" className="text-sesi-primary underline hover:text-blue-900">suporte@catraki.com.br</a>
                </div>
                <p className="text-[11px] text-slate-500 m-0">
                  Para dúvidas sobre datas das consultas ou atendimentos na escola, você também pode procurar diretamente a equipe presencial do SESI/UnB na sua unidade escolar.
                </p>
              </div>
            </div>
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

        {/* Barra institucional azul sólida no final da folha */}
        <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-2.5 bg-[#034b7f] pointer-events-none z-10" />

      </div>
    </div>
  );
};
