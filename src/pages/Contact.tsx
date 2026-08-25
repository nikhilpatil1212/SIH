import { Building2, Clock, Mail, Phone } from "lucide-react";
import { Card } from "../components/ui/primitives";
import { DemoTag } from "../components/ui/phase2";
import { ContactForm } from "../components/forms";

const SECTIONS = [
  { title: "General Inquiries", email: "info@dhruvasarathi.gov.in", phone: "+91 (832) 2525-600" },
  { title: "Mission Support", email: "operations@dhruvasarathi.gov.in", phone: "+91 (832) 2525-601" },
  { title: "Data & Satellite Ingestion", email: "telemetry@dhruvasarathi.gov.in", phone: "+91 (832) 2525-602" },
  { title: "Research & Vessel Integration", email: "polar-fleet@dhruvasarathi.gov.in", phone: "+91 (832) 2525-603" },
];

export function Contact() {
  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-3">
        <Card>
          <div className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[#eaf6f8] light:text-[#0d2433]">Contact ध्रुव सारथी Mission Ops</h2>
              <DemoTag label="POLAR TELEMETRY" />
            </div>
            <p className="text-[12px] leading-relaxed text-[#91aeb9] light:text-[#4a6878]">
              Direct communication channels for polar research vessel operators, NCPOR scientific mission leads,
              and Ministry of Earth Sciences polar maritime coordinators.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-md border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-white p-4 shadow-sm transition-colors"
            >
              <div className="mb-2.5 text-[13px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{s.title}</div>
              <div className="flex flex-col gap-2 text-[12px]">
                <span className="flex items-center gap-2 text-[#8ccfe0] light:text-[#0f768e] font-mono text-[11px]">
                  <Mail size={13} className="text-[#55d6e8] light:text-[#0f768e]" /> {s.email}
                </span>
                <span className="flex items-center gap-2 text-[#c8dde3] light:text-[#3a5563] font-mono text-[11px]">
                  <Phone size={13} className="text-[#91aeb9] light:text-[#7a94a2]" /> {s.phone}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Card title="Operational Headquarters">
          <div className="grid grid-cols-1 gap-px overflow-hidden bg-[#1d445c]/40 light:bg-[#e2d8c7] sm:grid-cols-2">
            <div className="flex items-center gap-2.5 bg-[#132f40] light:bg-[#faf6ee] px-4 py-3.5 text-[12px] text-[#c8dde3] light:text-[#3a5563]">
              <Building2 size={15} className="text-[#55d6e8] light:text-[#0f768e]" /> ध्रुव सारथी · NCPOR / MoES, Goa, India
            </div>
            <div className="flex items-center gap-2.5 bg-[#132f40] light:bg-[#faf6ee] px-4 py-3.5 text-[12px] text-[#c8dde3] light:text-[#3a5563]">
              <Clock size={15} className="text-[#55d6e8] light:text-[#0f768e]" /> Operational Bridge Watch: 24/7/365 UTC
            </div>
          </div>
        </Card>
      </div>

      <Card title="Dispatch Bridge Message">
        <ContactForm />
      </Card>
    </div>
  );
}
