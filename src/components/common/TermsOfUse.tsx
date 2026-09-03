import React from 'react';
import { ArrowLeft, Printer, Scale, Lock } from 'lucide-react';

interface TermsOfUseProps {
  onBack?: () => void;
}

export const TermsOfUse: React.FC<TermsOfUseProps> = ({ onBack }) => {
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
              Termos e Condições Gerais de Uso
            </p>
            <p className="text-[10px] sm:text-[8pt] text-slate-500 m-0">
              {dataHoje}
            </p>
          </div>
        </div>

        {/* Título Principal */}
        <div className="text-center mb-6 sm:mb-8 pb-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-sesi-primary border border-blue-200 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2.5">
            <Scale className="w-3.5 h-3.5 text-sesi-primary" />
            <span>Termos Gerais de Uso e Validade Jurídica</span>
          </div>
          <h1 className="text-sm sm:text-base md:text-[13pt] font-extrabold uppercase text-slate-900 tracking-tight m-0">
            TERMOS E CONDIÇÕES GERAIS DE USO DA PLATAFORMA
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 m-0">
            Regulamento do Sistema Tecnológico • Resguardo Legal e Responsabilidade
          </p>
        </div>

        {/* Conteúdo Estruturado */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed text-left sm:text-justify">
          
          {/* Seção 1 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">1</span>
              <span>Objeto e Finalidade da Plataforma</span>
            </h2>
            <p className="m-0 pl-7">
              A <strong>Plataforma Catraki</strong> é um sistema tecnológico especializado em registrar, validar e guardar de forma segura as autorizações e assinaturas eletrônicas realizadas pelos responsáveis legais dos estudantes. Ela opera a serviço de instituições educacionais e entidades parceiras, com destaque para as ações do programa <strong>Escola Cidadã — Saúde em Movimento</strong> (cooperação técnica entre o SESI-DF e a Universidade de Brasília — UnB).
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">2</span>
              <span>Validade Jurídica da Assinatura Eletrônica</span>
            </h2>
            <p className="m-0 pl-7">
              Ao utilizar este ambiente para firmar termos de consentimento, o signatário e a entidade controladora concordam expressamente com a utilização do meio eletrônico como prova de manifestação da vontade, nos termos do <strong>Artigo 10, § 2º da Medida Provisória nº 2.200-2/2001</strong>, da <strong>Lei Federal nº 14.063/2020</strong>, dos <strong>Arts. 104 e 107 do Código Civil</strong> e dos <strong>Arts. 411 e 441 do Código de Processo Civil</strong>.
            </p>
            <p className="m-0 pl-7">
              As assinaturas emitidas nesta plataforma são dotadas de eficácia probatória e presunção de veracidade, respaldadas pela jurisprudência consolidada do Superior Tribunal de Justiça (<strong>STJ — REsp nº 2.205.708/PR</strong>), sendo vinculadas ao signatário através de:
            </p>
            <div className="ml-7 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside m-0">
                <li>Verificação em dois passos por código numérico de uso único enviado ao seu e-mail (OTP de 6 dígitos);</li>
                <li>Registro de carimbo de tempo (Timestamp NTP.br) e geolocalização IP;</li>
                <li>Assinatura grafativa digitalizada em tela de alta resolução;</li>
                <li>Cadeia criptográfica encadeada (Hash Chain SHA-256) e imutabilidade de banco de dados.</li>
              </ul>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">3</span>
              <span>Declaração de Responsabilidade Legal e Resguardo Penal</span>
            </h2>
            <div className="ml-7 p-3.5 sm:p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed space-y-1.5">
              <p className="font-bold text-amber-950 flex items-center gap-1.5 m-0">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Advertência Legal Expressa — Tipificação de Falsidade Ideológica:</span>
              </p>
              <p className="m-0 text-amber-900">
                Ao assinar este documento, você declara, sob as penas da lei, ser o pai, a mãe, o(a) tutor(a) ou o(a) responsável por guarda judicial do(a) estudante indicado(a). <strong>Fornecer informações falsas neste ato, com o objetivo de obter vantagem indevida ou prejudicar terceiros, configura crime de Falsidade Ideológica (Art. 299 do Código Penal), com pena de reclusão de 1 a 5 anos, acrescida de multa.</strong>
              </p>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">4</span>
              <span>Guarda e Retenção de Registros de Conexão (Marco Civil da Internet)</span>
            </h2>
            <p className="m-0 pl-7">
              Em estrito cumprimento ao <strong>Artigo 15 da Lei Federal nº 12.965/2014 (Marco Civil da Internet)</strong>, a plataforma mantém os registros de acesso a aplicações de internet (endereço IP, data e hora da conexão em padrão UTC) sob sigilo pelo prazo mínimo regulamentar de <strong>6 meses (180 dias)</strong>, disponibilizados exclusivamente mediante ordem judicial ou requisição legalmente autorizada.
            </p>
          </section>

          {/* Seção 5 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">5</span>
              <span>Disponibilidade e Validação Pública de Autenticidade</span>
            </h2>
            <p className="m-0 pl-7">
              A qualquer momento, o responsável signatário, a coordenação escolar ou autoridades públicas podem verificar a autenticidade e a integridade de qualquer termo assinado por meio do <strong>Portal de Validação Pública Catraki</strong>, utilizando o código alfanumérico impresso no comprovante ou escaneando o QR Code.
            </p>
          </section>

          {/* Seção 6 */}
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2 m-0">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] font-extrabold flex items-center justify-center text-xs shrink-0">6</span>
              <span>Isenção de Responsabilidade e Natureza da Infraestrutura Tecnológica</span>
            </h2>
            <div className="ml-7 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed space-y-2">
              <p className="m-0">
                Os dados de saúde, triagens clínicas e autorizações são geridos e controlados exclusivamente pelas entidades promotoras e realizadoras do projeto (<strong>Serviço Social da Indústria — SESI-DF</strong> e <strong>Universidade de Brasília — FS/UnB</strong>), na qualidade de Controladoras do tratamento de dados pessoais (Art. 5º, VI da LGPD).
              </p>
              <p className="m-0 font-semibold text-slate-900">
                A Plataforma Catraki atua como <strong>testemunha tecnológica</strong>: registra o momento exato da assinatura, gera selos de autenticidade digitais e garante que o documento não foi alterado. A Catraki <strong>não possui CNPJ</strong>, não acessa os dados de saúde dos estudantes e não interfere no conteúdo acordado entre as partes — essa responsabilidade é dos Controladores do projeto: o <strong>SESI-DF</strong> e a <strong>FS/UnB</strong>.
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
