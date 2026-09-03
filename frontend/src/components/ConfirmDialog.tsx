import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Tone = "danger" | "primary";

type BaseOptions = {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: Tone;
};

type ReasonOptions = BaseOptions & {
  reasonLabel?: string;
  placeholder?: string;
  minLength?: number;
};

type Dialog =
  | { kind: "confirm"; opts: BaseOptions; resolve: (v: boolean) => void }
  | { kind: "reason"; opts: ReasonOptions; resolve: (v: string | null) => void };

type ConfirmApi = {
  /** Modal de sim/não. Resolve `true` se confirmar, `false` se cancelar. */
  confirm: (opts: BaseOptions) => Promise<boolean>;
  /** Modal com campo de texto obrigatório. Resolve o texto, ou `null` se cancelar. */
  promptReason: (opts: ReasonOptions) => Promise<string | null>;
};

const Ctx = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm precisa do ConfirmProvider");
  return ctx;
}

const DangerIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const confirm = useCallback(
    (opts: BaseOptions) =>
      new Promise<boolean>((resolve) =>
        setDialog({ kind: "confirm", opts, resolve })
      ),
    []
  );

  const promptReason = useCallback(
    (opts: ReasonOptions) =>
      new Promise<string | null>((resolve) => {
        setReason("");
        setTouched(false);
        setDialog({ kind: "reason", opts, resolve });
      }),
    []
  );

  const settle = useCallback(
    (result: boolean | string | null) => {
      setDialog((d) => {
        if (d) {
          if (d.kind === "confirm") d.resolve(result as boolean);
          else d.resolve(result as string | null);
        }
        return null;
      });
      setReason("");
      setTouched(false);
    },
    []
  );

  const cancel = useCallback(
    () => settle(dialog?.kind === "reason" ? null : false),
    [dialog, settle]
  );

  const minLength =
    dialog?.kind === "reason" ? dialog.opts.minLength ?? 3 : 0;
  const reasonInvalid =
    dialog?.kind === "reason" && reason.trim().length < minLength;

  const confirmAction = useCallback(() => {
    if (!dialog) return;
    if (dialog.kind === "reason") {
      if (reason.trim().length < minLength) {
        setTouched(true);
        return;
      }
      settle(reason.trim());
    } else {
      settle(true);
    }
  }, [dialog, reason, minLength, settle]);

  // Fecha no Esc; confirma no Enter (exceto quando o foco está no textarea).
  useEffect(() => {
    if (!dialog) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (
        e.key === "Enter" &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        confirmAction();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, cancel, confirmAction]);

  const api = useMemo<ConfirmApi>(
    () => ({ confirm, promptReason }),
    [confirm, promptReason]
  );

  const tone: Tone = dialog?.opts.tone ?? "danger";

  return (
    <Ctx.Provider value={api}>
      {children}
      {dialog && (
        <div
          className="confirm-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label={dialog.opts.title ?? "Confirmação"}
          >
            <div className="confirm-body">
              <span className={`confirm-icon confirm-icon-${tone}`}>
                <DangerIcon />
              </span>
              <div className="confirm-texts">
                {dialog.opts.title && (
                  <h2 className="confirm-title">{dialog.opts.title}</h2>
                )}
                <div className="confirm-message">{dialog.opts.message}</div>
                {dialog.kind === "reason" && (
                  <div className="confirm-field">
                    {dialog.opts.reasonLabel && (
                      <label className="confirm-label">
                        {dialog.opts.reasonLabel}
                      </label>
                    )}
                    <textarea
                      className="confirm-textarea"
                      autoFocus
                      rows={3}
                      value={reason}
                      placeholder={dialog.opts.placeholder}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    {touched && reasonInvalid && (
                      <span className="confirm-error">
                        Mínimo de {minLength} caracteres.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={cancel}>
                {dialog.opts.cancelText ?? "Cancelar"}
              </button>
              <button
                type="button"
                className={tone === "danger" ? "btn btn-danger" : "btn btn-primary"}
                onClick={confirmAction}
                autoFocus={dialog.kind === "confirm"}
              >
                {dialog.opts.confirmText ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
