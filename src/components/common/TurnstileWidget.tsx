import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          action?: string;
          cData?: string;
          callback?: (token: string) => void;
          'error-callback'?: (error: any) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey?: string;
  action?: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

export const TURNSTILE_SITE_KEY = '0x4AAAAAAEXS51wjeYSoRWAc';

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey = TURNSTILE_SITE_KEY,
  action = 'otp_request',
  onVerify,
  onError,
  onExpire,
  theme = 'light',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Mantém referências estáveis para os callbacks sem disparar o useEffect
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    let isMounted = true;
    let pollTimer: any = null;

    const renderTurnstile = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return; // Já renderizado

      try {
        // Limpa qualquer resquício anterior antes de renderizar
        containerRef.current.innerHTML = '';

        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token: string) => {
            if (isMounted && onVerifyRef.current) {
              onVerifyRef.current(token);
            }
          },
          'error-callback': () => {
            if (isMounted && onErrorRef.current) {
              onErrorRef.current();
            }
          },
          'expired-callback': () => {
            if (isMounted && onExpireRef.current) {
              onExpireRef.current();
            }
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn('Turnstile render warning:', err);
      }
    };

    if (window.turnstile) {
      renderTurnstile();
    } else {
      pollTimer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollTimer);
          renderTurnstile();
        }
      }, 150);
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, action, theme]); // Apenas reexecuta se a chave, ação ou tema mudarem

  return (
    <div className={`flex justify-center items-center my-2 min-h-[65px] ${className}`}>
      <div ref={containerRef} className="cf-turnstile-container" />
    </div>
  );
};
