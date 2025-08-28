import React, { useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";

interface SignaturePadProps {
  value?: string;
  onChange?: (dataUrl: string) => void;
  penColor?: string;
  backgroundColor?: string;
  height?: number;
}

export function SignaturePad({ value, onChange, penColor = "#000000", backgroundColor = "#ffffff", height = 160 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigPadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ratio = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const heightPx = height;
    canvas.width = width * ratio;
    canvas.height = heightPx * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${heightPx}px`;
    // Recreate SignaturePad to respect new canvas size
    if (sigPadRef.current) {
      sigPadRef.current.off();
      sigPadRef.current = null;
    }
    const sp = new SignaturePadLib(canvasRef.current!, {
      penColor,
      backgroundColor,
      throttle: 16,
    });
    sigPadRef.current = sp;
    sp.addEventListener("endStroke", () => {
      setIsEmpty(sp.isEmpty());
      onChange?.(sp.isEmpty() ? "" : sp.toDataURL("image/png"));
    });
    // If an existing signature is provided, draw it
    if (value && value.startsWith("data:")) {
      try {
        sp.fromDataURL(value, { ratio });
        setIsEmpty(false);
      } catch {}
    }
  };

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);

    // Observe container size changes to handle late layout measurements
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeObserverRef.current && containerRef.current) {
        try {
          resizeObserverRef.current.unobserve(containerRef.current);
        } catch {}
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recreate pad when pen/background colors change
  useEffect(() => {
    resizeCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penColor, backgroundColor]);

  const clear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    } else if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      }
    }
    setIsEmpty(true);
    onChange?.("");
  };

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="border rounded-md relative"
        style={{ background: backgroundColor }}
      >
        <canvas ref={canvasRef} className="w-full touch-none cursor-crosshair" aria-label="Signature pad" />
        <div className="flex justify-between p-2 text-xs text-gray-500">
          <span>{isEmpty ? "Sign above" : "Signed"}</span>
          <button type="button" onClick={clear} className="underline">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}



