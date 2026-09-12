import React, { useState, useEffect, useRef } from 'react';

export interface SignaturePadProps {
  onSave: (base64Png: string) => void;
  onClear: () => void;
  className?: string;
}

/**
 * Componente isolado para captura de assinatura manual via Canvas HTML5.
 * Suporta toque em dispositivos móveis, mouse em desktop e modo tela cheia.
 * Princípio SOLID: Responsabilidade Única (SRP) para captura e geração de imagem da assinatura.
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ajusta a resolução e o tamanho real do canvas com base no container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }, [isFullscreen]);

  // Trava o scroll da página no modo tela cheia para evitar rolagem indesejada durante o desenho
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#034b7f';
    ctx.lineWidth = isFullscreen ? 3.5 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);

    const base64 = canvas.toDataURL('image/png');
    onSave(base64);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    handleClear(); // Limpa ao redimensionar para evitar distorções de escala
  };

  const padContent = (
    <div
      ref={containerRef}
      className={`border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50 relative group select-none ${
        isFullscreen ? 'w-full h-full border-0 rounded-none' : 'h-[120px] w-full border-2'
      }`}
    >
      {/* Marca d'água probatória */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-25 text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-widest text-slate-400 rotate-[-6deg] space-y-1">
        <span>ASSINATURA ELETRÔNICA</span>
        <span>USO EXCLUSIVO NESTE TERMO • NÃO COPIAR</span>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block cursor-crosshair touch-none relative z-10 select-none"
      />
      {!hasDrawn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-[11px] font-semibold font-sans z-20 bg-slate-50/40">
          Desenhe sua assinatura aqui
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
        {/* Header da Tela Cheia */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shadow-sm z-50">
          <span className="font-bold text-sm text-[#004b8d] uppercase tracking-wider">
            Assinatura Manual
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-bold text-red-500 uppercase px-3 py-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="text-[11px] font-bold text-white uppercase px-4 py-2 bg-[#004b8d] rounded-lg hover:bg-blue-800 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>

        {/* Área de Desenho Expandida */}
        <div className="flex-1 relative bg-slate-100">{padContent}</div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 text-left ${className}`}>
      <div className="flex items-center justify-between min-h-[16px]">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="text-[10px] text-[#004b8d] hover:text-blue-800 font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer"
          title="Abrir em tela cheia"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Tela Cheia
        </button>
        {hasDrawn && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase transition-colors cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>
      {padContent}
    </div>
  );
};
