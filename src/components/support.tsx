import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CheckCircle2, ChevronDown, X } from "lucide-react";
import { Card, StatusDot, cx } from "./ui/primitives";
import { DemoTag } from "./ui/phase2";
import { supportStatus } from "../data/phase2";

// ---- Form field primitives ----
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] text-[#91aeb9] light:text-[#4a6878] font-semibold">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#dfd8cc] light:bg-white px-3 py-2 text-[12px] text-[#eaf6f8] light:text-[#0d2433] outline-none transition-colors placeholder:text-[#5f7d89] light:placeholder:text-[#9db6c1] focus:border-[#55d6e8]/60 light:focus:border-[#0f768e]";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-[96px] resize-y")} />;
}
export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputCls, "appearance-none")}>
      {children}
    </select>
  );
}

export function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex items-center justify-center gap-2 rounded-md border border-[#55d6e8]/50 bg-[#55d6e8]/15 light:border-[#0f768e]/50 light:bg-[#0f768e] light:text-white px-4 py-2.5 text-[12px] font-semibold text-[#55d6e8] transition-colors hover:bg-[#55d6e8]/25 light:hover:bg-[#16394f] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// ---- Success state ----
export function SubmissionSuccess({
  title,
  message,
  reference,
  referenceLabel = "Reference",
  onReset,
}: {
  title: string;
  message: string;
  reference?: string;
  referenceLabel?: string;
  onReset?: () => void;
}) {
  return (
    <div className="animate-fade-rise flex flex-col items-center gap-3 px-6 py-10 text-center">
      <CheckCircle2 size={34} className="text-[#10b981]" strokeWidth={1.6} />
      <h4 className="text-[15px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{title}</h4>
      <p className="max-w-sm text-[12px] leading-relaxed text-[#91aeb9] light:text-[#4a6878]">{message}</p>
      {reference && (
        <div className="rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f6f0e4] px-4 py-2">
          <span className="text-[10px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">{referenceLabel}</span>
          <div className="font-mono text-[14px] font-bold text-[#55d6e8] light:text-[#0f768e]">{reference}</div>
        </div>
      )}
      <div className="mt-1 flex items-center gap-2 text-[10px] text-[#f59e0b]">
        <DemoTag label="POLAR MISSION DEMO" /> Telemetry pipeline recorded in session.
      </div>
      {onReset && (
        <button onClick={onReset} className="mt-1 text-[11px] text-[#8ccfe0] light:text-[#0f768e] underline-offset-2 hover:underline">
          Submit another request
        </button>
      )}
    </div>
  );
}

// ---- FAQ Item ----
export function FAQItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean; key?: any }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-[#1d445c]/40 light:border-[#e8e0d2] last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#0d2433]/40 light:hover:bg-[#f8f5ee]"
      >
        <span className="text-[13px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{q}</span>
        <ChevronDown
          size={15}
          className={cx("shrink-0 text-[#55d6e8] light:text-[#0f768e] transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <p className="animate-fade-rise px-4 pb-3.5 text-[13px] leading-relaxed text-[#91aeb9] light:text-[#4a6878]">{a}</p>
      )}
    </div>
  );
}

// ---- Support Status ----
export function SupportStatusCard() {
  return (
    <Card title="Telemetry Uplink Status">
      <div className="grid grid-cols-3 gap-px overflow-hidden bg-[#1d445c]/40 light:bg-[#e2d8c7]">
        <div className="bg-[#132f40] light:bg-[#faf6ee] px-3.5 py-3">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-[#91aeb9] light:text-[#5a7686]">Status</div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#10b981]">
            <StatusDot color="#10b981" pulse /> {supportStatus.state}
          </div>
        </div>
        <div className="bg-[#132f40] light:bg-[#faf6ee] px-3.5 py-3">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-[#91aeb9] light:text-[#5a7686]">Avg Response</div>
          <div className="font-mono text-[13px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{supportStatus.avgResponse}</div>
        </div>
        <div className="bg-[#132f40] light:bg-[#faf6ee] px-3.5 py-3">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-[#91aeb9] light:text-[#5a7686]">Open Tickets</div>
          <div className="font-mono text-[13px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{supportStatus.openTickets}</div>
        </div>
      </div>
    </Card>
  );
}

// ---- Modal Shell ----
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04101a]/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="animate-fade-rise w-full max-w-lg overflow-hidden rounded-xl border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#faf8f5] shadow-2xl"
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#1d445c]/60 light:border-[#e2d8c7] px-5 py-3.5">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#eaf6f8] light:text-[#0d2433]">{title}</h3>
          <button onClick={onClose} className="text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
