import { PointerEvent, useRef } from "react";

interface Props {
  // Chamado quando a assinatura muda: recebe o data URL (PNG) ou null se limpa.
  onChange: (dataUrl: string | null) => void;
}

// Área de desenho para capturar a assinatura do colaborador.
export function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  // Converte a posição do ponteiro para coordenadas dentro do canvas.
  function getPos(e: PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div>
      <label style={{ display: "block" }}>Assinatura do colaborador</label>
      <canvas
        ref={canvasRef}
        width={300}
        height={120}
        style={{
          border: "1px solid #ccc",
          borderRadius: 4,
          background: "#fff",
          touchAction: "none", // evita scroll ao desenhar no touch
        }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div style={{ marginTop: 6 }}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={clear}>
          Limpar assinatura
        </button>
      </div>
    </div>
  );
}
