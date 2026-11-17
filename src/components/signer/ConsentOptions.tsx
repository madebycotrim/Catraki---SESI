import React from 'react';
import { PRIVACY_POLICY_VERSION } from '../../lib/lgpd.ts';

export interface ConsentOptionsProps {
  authHealth: boolean;
  setAuthHealth: (val: boolean) => void;
  authData: boolean;
  setAuthData: (val: boolean) => void;
  authImage: boolean;
  setAuthImage: (val: boolean) => void;
  readAndAccept: boolean;
  setReadAndAccept: (val: boolean) => void;
  privacyAccepted: boolean;
  privacyAcceptedAt: string;
  onTogglePrivacyAccepted: (val: boolean) => void;
  isMaiorDeIdade: boolean;
}

/**
 * Componente isolado para gestão e apresentação das opções granulares de consentimento.
 * Em conformidade com:
 * - LGPD Art. 11, I e Art. 18 (Dados de saúde)
 * - LGPD Art. 14 e Art. 18 (Dados de menores)
 * - Código Civil Art. 20 / ECA Art. 17 (Uso de imagem)
 * - Lei 14.063/2020 e MP 2.200-2/2001 (Assinatura eletrônica)
 */
export const ConsentOptions: React.FC<ConsentOptionsProps> = ({
  authHealth,
  setAuthHealth,
  authData,
  setAuthData,
  authImage,
  setAuthImage,
  readAndAccept,
  setReadAndAccept,
  privacyAccepted,
  privacyAcceptedAt,
  onTogglePrivacyAccepted,
  isMaiorDeIdade,
}) => {
  const CheckmarkIcon = () => (
    <svg
      className="absolute w-7 h-7 text-[#004b8d] pointer-events-none z-10 drop-shadow-sm"
      style={{ top: '-7px', left: '-3px', transform: 'rotate(-5deg)' }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 13l4 4c4-7.5 8-10 12-12" />
    </svg>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl mt-6 overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
        <h3 className="text-[13px] sm:text-sm font-bold uppercase tracking-wider text-slate-900 m-0">
          Opções de Consentimento e Declaração
        </h3>
      </div>

      <div className="flex flex-col divide-y divide-slate-100">
        {/* Campo 1: Atendimento de Saúde com Granularidade */}
        <label className="flex items-start gap-3.5 cursor-pointer select-none group p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
          <div className="relative pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={authHealth}
              onChange={(e) => setAuthHealth(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`flex h-[18px] w-[18px] border-2 rounded items-center justify-center transition-colors group-focus-within:ring-2 group-focus-within:ring-[#004b8d] group-focus-within:ring-offset-1 ${
                authHealth
                  ? 'border-[#004b8d]'
                  : 'border-slate-300 bg-white group-hover:border-[#004b8d]'
              }`}
            >
              {authHealth && <CheckmarkIcon />}
            </div>
          </div>
          <span className="text-xs sm:text-[13px] text-slate-800 font-medium leading-relaxed">
            <strong>SIM, AUTORIZO</strong> o atendimento preventivo de saúde do(a) estudante nas
            unidades móveis do projeto, incluindo as especialidades de{' '}
            <strong>
              Oftalmologia, Odontologia, Fonoaudiologia (Audiometria), Terapia Comunitária Integrativa
              e Oficinas de Alimentação Saudável (Nutrição)
            </strong>
            , durante o período escolar.{' '}
            <span className="text-red-500 font-bold">* (Obrigatório)</span>
          </span>
        </label>

        {/* Campo 2: Tratamento de Dados (Art. 11/18 vs Art. 14/18) */}
        <label className="flex items-start gap-3.5 cursor-pointer select-none group p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
          <div className="relative pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={authData}
              onChange={(e) => setAuthData(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`flex h-[18px] w-[18px] border-2 rounded items-center justify-center transition-colors group-focus-within:ring-2 group-focus-within:ring-[#004b8d] group-focus-within:ring-offset-1 ${
                authData
                  ? 'border-[#004b8d]'
                  : 'border-slate-300 bg-white group-hover:border-[#004b8d]'
              }`}
            >
              {authData && <CheckmarkIcon />}
            </div>
          </div>
          <span className="text-xs sm:text-[13px] text-slate-800 font-medium leading-relaxed">
            {isMaiorDeIdade ? (
              <>
                <strong>SIM, AUTORIZO</strong> o tratamento dos meus dados pessoais e dados de
                saúde exclusivamente para fins de identificação e validação legal da permissão de
                atendimento (Art. 11, I e Art. 18 da LGPD).{' '}
                <span className="text-red-500 font-bold">* (Obrigatório)</span>
              </>
            ) : (
              <>
                <strong>SIM, AUTORIZO</strong> o tratamento dos dados pessoais informados
                exclusivamente para registrar a autorização do menor com segurança, nos termos do
                Art. 14 e Art. 18 da LGPD.{' '}
                <span className="text-red-500 font-bold">* (Obrigatório)</span>
              </>
            )}
          </span>
        </label>

        {/* Campo 3: Uso de Imagem e Voz (Art. 20 CC vs Art. 17 ECA) */}
        <label className="flex items-start gap-3.5 cursor-pointer select-none group p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
          <div className="relative pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={authImage}
              onChange={(e) => setAuthImage(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`flex h-[18px] w-[18px] border-2 rounded items-center justify-center transition-colors group-focus-within:ring-2 group-focus-within:ring-[#004b8d] group-focus-within:ring-offset-1 ${
                authImage
                  ? 'border-[#004b8d]'
                  : 'border-slate-300 bg-white group-hover:border-[#004b8d]'
              }`}
            >
              {authImage && <CheckmarkIcon />}
            </div>
          </div>
          <span className="text-xs sm:text-[13px] text-slate-800 font-medium leading-relaxed">
            <strong>SIM, AUTORIZO</strong> o registro fotográfico e/ou audiovisual do(a) estudante
            para fins institucionais e de divulgação oficial do projeto Escola Cidadã — Saúde em
            Movimento ({isMaiorDeIdade ? 'Art. 20 do Código Civil' : 'Art. 17 do ECA'}), em
            materiais produzidos pelo SESI-DF e pela UnB.{' '}
            <span className="text-slate-500 font-normal">
              (Opcional — a recusa não impede a participação.)
            </span>
          </span>
        </label>

        {/* Campo 4: Declaração Geral de Aceite */}
        <label className="flex items-start gap-3.5 cursor-pointer select-none p-4 sm:p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
          <div className="relative pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={readAndAccept}
              onChange={(e) => setReadAndAccept(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`flex h-[18px] w-[18px] border-2 rounded items-center justify-center transition-colors group-focus-within:ring-2 group-focus-within:ring-[#004b8d] group-focus-within:ring-offset-1 ${
                readAndAccept
                  ? 'border-[#004b8d]'
                  : 'border-slate-300 bg-white group-hover:border-[#004b8d]'
              }`}
            >
              {readAndAccept && <CheckmarkIcon />}
            </div>
          </div>
          <span className="text-xs sm:text-[13px] text-slate-900 font-bold leading-relaxed">
            <strong>Declaro que li e concordo</strong> com este Termo de Consentimento e com o uso de
            assinatura eletrônica simples (Art. 4º, I da Lei Federal nº 14.063/2020, Art. 10, § 2º da MP nº 2.200-2/2001 e Art. 190 do CPC),
            confirmando a veracidade de todas as declarações prestadas, sob as penas da lei.{' '}
            <span className="text-red-500 font-bold">* (Obrigatório)</span>
          </span>
        </label>

        {/* Campo 5: Aceite da Política de Privacidade com Versão, Data e Hora */}
        <label className="flex items-start gap-3.5 cursor-pointer select-none p-4 sm:p-5 bg-blue-50/40 hover:bg-blue-50/70 transition-colors group">
          <div className="relative pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => onTogglePrivacyAccepted(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`flex h-[18px] w-[18px] border-2 rounded items-center justify-center transition-colors group-focus-within:ring-2 group-focus-within:ring-[#004b8d] group-focus-within:ring-offset-1 ${
                privacyAccepted
                  ? 'border-[#004b8d]'
                  : 'border-slate-300 bg-white group-hover:border-[#004b8d]'
              }`}
            >
              {privacyAccepted && <CheckmarkIcon />}
            </div>
          </div>
          <span className="text-xs sm:text-[13px] text-slate-900 font-medium leading-relaxed">
            <strong>Li e aceito a Política de Privacidade</strong> (Versão{' '}
            <span className="font-mono font-bold text-[#034b7f]">{PRIVACY_POLICY_VERSION}</span> —{' '}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#004b8d] font-bold underline hover:text-blue-900"
              onClick={(e) => e.stopPropagation()}
            >
              ler na íntegra
            </a>
            ), autorizando o registro da data, hora e versão deste aceite para conformidade com a LGPD.{' '}
            <span className="text-red-500 font-bold">* (Obrigatório)</span>
            {privacyAccepted && privacyAcceptedAt && (
              <span className="block mt-1 text-[11px] font-mono text-emerald-700 font-semibold">
                ✓ Aceite registrado em {new Date(privacyAcceptedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Versão {PRIVACY_POLICY_VERSION})
              </span>
            )}
          </span>
        </label>
      </div>
    </div>
  );
};
