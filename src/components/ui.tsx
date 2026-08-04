"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type ButtonVariant = "primary" | "subtle" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accentfg hover:opacity-90",
  subtle: "bg-surface2 text-fg hover:bg-line",
  ghost: "text-muted hover:bg-surface2 hover:text-fg",
  danger: "text-danger hover:bg-danger/10",
};

export function Button({
  variant = "subtle",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
    />
  );
}

export function IconButton({
  label,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`text-muted hover:bg-surface2 hover:text-fg inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-muted mb-1 block text-xs font-medium">{label}</span>
      {children}
      {hint && <span className="text-muted mt-1 block text-xs">{hint}</span>}
    </label>
  );
}

const INPUT_CLASS =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-accent";

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLASS} ${className}`} />;
}

export function TextArea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${INPUT_CLASS} resize-y leading-relaxed ${className}`}
    />
  );
}

/**
 * 入力中はローカル state で持ち、少し止まったら / フォーカスが外れたら保存する。
 * 1 文字ごとにストアを更新するとボード全体が再描画されるため。
 */
export function InlineText({
  value,
  onCommit,
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // アンマウント時に最新値で保存するための控え。値が変わるのは編集中のこの input だけなので、
  // 外から value が変わるケース (インポート等) は key ごと作り直される前提。
  const latest = useRef({ draft, value, onCommit });
  useEffect(() => {
    latest.current = { draft, value, onCommit };
  });

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onCommit(draft), 500);
    return () => clearTimeout(timer);
  }, [draft, value, onCommit]);

  // パネルを閉じた等でアンマウントされたときの取りこぼしを防ぐ
  useEffect(
    () => () => {
      const { draft: d, value: v, onCommit: c } = latest.current;
      if (d !== v) c(d);
    },
    [],
  );

  return (
    <input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-surface border-line w-full ${width} rounded-xl border shadow-xl`}
      >
        <div className="border-line flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <IconButton label="閉じる" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/** 右から出るサイドパネル。シーン編集とキャラ管理で使う */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="flex-1 bg-black/30"
        onMouseDown={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="bg-surface border-line flex h-full w-full max-w-md flex-col border-l shadow-2xl"
      >
        <div className="border-line flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0 text-sm font-semibold">{title}</div>
          <IconButton label="閉じる" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {children}
        </div>
        {footer && (
          <div className="border-line flex items-center justify-between gap-2 border-t px-4 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-line text-center rounded-xl border border-dashed px-6 py-14">
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-muted mx-auto mt-1 max-w-md text-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
