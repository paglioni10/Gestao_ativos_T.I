import { InputHTMLAttributes, useState } from "react";

// Campo de senha com botão para alternar entre oculto/visível.
export function PasswordInput({
  id,
  value,
  onChange,
  required,
  autoComplete,
  ...rest
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        style={{ width: "100%", paddingRight: 40 }}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        title={visible ? "Ocultar senha" : "Mostrar senha"}
        style={{
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          fontSize: 16,
          lineHeight: 1,
          color: "var(--muted)",
        }}
      >
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}
