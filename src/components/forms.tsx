import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Paperclip, Send } from "lucide-react";
import {
  Field,
  PrimaryButton,
  Select,
  SubmissionSuccess,
  TextArea,
  TextInput,
} from "./support";

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2">{children}</div>;
}

const ISSUE_CATEGORIES = [
  "Technical Issue",
  "Prediction & Trajectory Issue",
  "Polar Map & Chart Issue",
  "Telemetry & Sensor Data",
  "Route Risk Scoring",
  "Account & Access",
  "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function randomTicket(prefix: string) {
  return `${prefix}-2026-${String(120 + Math.floor(Math.random() * 80)).padStart(5, "0")}`;
}

export function SupportForm() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  if (submitted) {
    return (
      <SubmissionSuccess
        title="Support request transmitted successfully."
        message="Our polar navigation operations team will follow up at your registered email address."
        reference={submitted}
        referenceLabel="Ticket ID"
        onReset={() => setSubmitted(null)}
      />
    );
  }
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setSubmitted(randomTicket("SUP"));
      }}
    >
      <FormGrid>
        <Field label="Name"><TextInput required placeholder="Dr. Ana Køhler" /></Field>
        <Field label="Email"><TextInput required type="email" placeholder="researcher@example.org" /></Field>
        <Field label="Organization"><TextInput placeholder="NCPOR / MoES" /></Field>
        <Field label="Subject"><TextInput required placeholder="Brief summary of request" /></Field>
        <Field label="Issue Category">
          <Select defaultValue="Technical Issue">
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select defaultValue="Medium">
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Message"><TextArea required placeholder="Describe your operational or data request in detail…" /></Field>
        </div>
        <div className="sm:col-span-2">
          <AttachmentInput />
        </div>
      </FormGrid>
      <div className="flex justify-end border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-4">
        <PrimaryButton type="submit">
          <Send size={13} /> Send Support Request
        </PrimaryButton>
      </div>
    </form>
  );
}

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) {
    return (
      <SubmissionSuccess
        title="Message dispatched to bridge control."
        message="Thank you — the Dhruv Sarthi operational team has received your communication."
        onReset={() => setSubmitted(false)}
      />
    );
  }
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <FormGrid>
        <Field label="Full Name"><TextInput required placeholder="Dr. Ana Køhler" /></Field>
        <Field label="Email"><TextInput required type="email" placeholder="researcher@example.org" /></Field>
        <Field label="Organization"><TextInput placeholder="NCPOR / MoES" /></Field>
        <Field label="Subject"><TextInput required placeholder="Polar mission or data inquiry" /></Field>
        <div className="sm:col-span-2">
          <Field label="Message"><TextArea required placeholder="Transmit your message to the team…" /></Field>
        </div>
      </FormGrid>
      <div className="flex justify-end border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-4">
        <PrimaryButton type="submit">
          <Send size={13} /> Dispatch Message
        </PrimaryButton>
      </div>
    </form>
  );
}

const REPORT_TYPES = ["Neural Trajectory", "Polar Map Display", "Route Calculation", "Sea-Ice Concentration", "Iceberg Detection", "Weather Sensor", "Other"];

export function IssueReportForm() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  if (submitted) {
    return (
      <SubmissionSuccess
        title="Telemetry Anomaly Logged"
        message="Thank you — our mission engineering team has logged this report."
        reference={submitted}
        referenceLabel="Report ID"
        onReset={() => setSubmitted(null)}
      />
    );
  }
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setSubmitted(`ISSUE-${1000 + Math.floor(Math.random() * 9000)}`);
      }}
    >
      <FormGrid>
        <Field label="Issue Type">
          <Select defaultValue="Neural Trajectory">
            {REPORT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Severity">
          <Select defaultValue="Medium">
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description"><TextArea required placeholder="Detail the anomaly, coordinates, and observed vs expected trajectory…" /></Field>
        </div>
        <div className="sm:col-span-2">
          <AttachmentInput label="Attach Telemetry Log / Screenshot" />
        </div>
      </FormGrid>
      <div className="flex justify-end border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-4">
        <PrimaryButton type="submit">
          <Send size={13} /> Log Anomaly Report
        </PrimaryButton>
      </div>
    </form>
  );
}

function AttachmentInput({ label = "Attachment" }: { label?: string }) {
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-[#91aeb9] light:text-[#4a6878] font-semibold">{label}</span>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[#1d445c] bg-[#0d2433]/50 light:border-[#dfd8cc] light:bg-[#f6f0e4] px-3 py-2.5 text-[12px] text-[#8ccfe0] light:text-[#0f768e] transition-colors hover:border-[#55d6e8]/50">
        <Paperclip size={13} />
        {name ?? "Choose a file to attach…"}
        <input type="file" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.files?.[0]?.name ?? null)} />
      </label>
    </div>
  );
}
