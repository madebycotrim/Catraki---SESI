import React from 'react';
import { ArrowLeft, Scale, Lock } from 'lucide-react';

interface TermsOfUseProps {
  onBack: () => void;
}

export const TermsOfUse: React.FC<TermsOfUseProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in text-slate-800">
      
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao Formulário</span>
      </button>

      {/* Cartão Principal de Conteúdo A4-Like */}
      <div className="bg-white rounded-none shadow-xl border border-slate-200 p-6 sm:p-10 space-y-6 relative overflow-hidden">
        
        {/* Cabeçalho Oficial */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img src="/catraki.png" alt="Logo Catraki" className="h-10 sm:h-12 w-auto object-contain" />
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#034b7f] uppercase block">
                Plataforma Tecnológica de Assinaturas
              </span>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                Termos e Condições Gerais de Uso da Plataforma
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#034b7f] text-[11px] font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Vigência 2026</span>
          </div>
        </div>

        {/* Corpo dos Termos de Uso */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
          
          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] flex items-center justify-center text-xs">1</span>
              Objeto e Finalidade da Plataforma
            </h2>
            <p>
              A plataforma digital <strong>Catraki</strong> é um sistema tecnológico especializado na coleta, validação e custódia pericial de consentimentos e assinaturas eletrônicas avançadas, operando a serviço de instituições educacionais e entidades parceiras, com destaque para as ações do programa <strong>Escola Cidadã: Saúde em Movimento</strong> (cooperação técnica entre o SESI-DF e a Universidade de Brasília — UnB).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] flex items-center justify-center text-xs">2</span>
              Validade Jurídica da Assinatura Eletrônica Avançada
            </h2>
            <p>
              Ao utilizar este ambiente para firmar termos de consentimento, o signatário e a entidade controladora concordam expressamente com a utilização do meio eletrônico como prova de manifestação da vontade, nos termos do <strong>Artigo 4º, Inciso II da Lei Federal nº 14.063/2020</strong> e do <strong>Artigo 10, § 2º da Medida Provisória nº 2.200-2/2001</strong>.
            </p>
            <p>
              As assinaturas emitidas nesta plataforma são dotadas de plena eficácia probatória e presunção de veracidade, respaldadas pela jurisprudência pacificada do Superior Tribunal de Justiça (<strong>STJ — REsp nº 2.205.708/PR</strong>), sendo vinculadas ao signatário através de:
            </p>
            <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside bg-slate-50 p-3 rounded-xl border border-slate-200">
              <li>Autenticação de duplo fator por código numérico de uso único (OTP 6 Dígitos);</li>
              <li>Registro de carimbo de tempo (Timestamp NTP.br) e geolocalização IP;</li>
              <li>Assinatura grafoscópica digitalizada em canvas de alta resolução;</li>
              <li>Cadeia criptográfica encadeada (Hash Chain SHA-256) e imutabilidade de banco de dados.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] flex items-center justify-center text-xs">3</span>
              Declaração de Responsabilidade e Advertência Penal (Art. 299 CP)
            </h2>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm leading-relaxed space-y-1.5">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-700" />
                Advertência Legal Expressa — Tipificação de Falsidade Ideológica:
              </p>
              <p>
                O signatário declara, sob as penas da lei, ser o legítimo pai, mãe, tutor ou detentor de guarda legal do menor indicado no termo. Inserir declaração falsa ou diversa da que devia ser escrita com o fim de prejudicar direito ou criar obrigação constitui o crime tipificado no <strong>Artigo 299 do Código Penal Brasileiro</strong>, sujeito a pena de reclusão de 1 a 5 anos e multa.
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] flex items-center justify-center text-xs">4</span>
              Guarda e Retenção de Registros de Conexão (Marco Civil da Internet)
            </h2>
            <p>
              Em estrito cumprimento ao <strong>Artigo 15 da Lei Federal nº 12.965/2014 (Marco Civil da Internet)</strong>, a plataforma mantém os registros de acesso a aplicações de internet (endereço IP, data e hora da conexão em padrão UTC) sob sigilo pelo prazo mínimo regulamentar de <strong>6 meses (180 dias)</strong>, disponibilizados exclusivamente mediante ordem judicial ou requisição legalmente autorizada.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#034b7f] flex items-center justify-center text-xs">5</span>
              Disponibilidade e Validação Pública de Autenticidade
            </h2>
            <p>
              A qualquer momento, o signatário, a coordenação escolar ou autoridades públicas podem verificar a autenticidade e a integridade de qualquer termo assinado através do <strong>Portal de Validação Pública Catraki</strong>, utilizando o código alfanumérico impresso no documento ou a leitura do QR Code.
            </p>
          </section>

        </div>

        {/* Rodapé do Termo */}
        <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <p className="m-0">Plataforma Tecnológica Catraki • Conformidade Integral com as Leis Brasileiras</p>
        </div>

        {/* Barra institucional azul sólida no final da folha A5 (Padronizada) */}
        <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-2.5 bg-[#034b7f] pointer-events-none z-10" />

      </div>
    </div>
  );
};
