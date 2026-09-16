import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, hint, required, children }: FieldWrapperProps) {
  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent ${
        props.className ?? ""
      }`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded border border-line-2 bg-surface px-3.5 py-3 text-sm text-ink outline-none transition-colors focus:border-accent ${
        props.className ?? ""
      }`}
    />
  );
}
