import { useMemo, useState, type ChangeEvent } from "react";
import { AlertOctagon, Headphones, LifeBuoy, Mail, MessageSquare, Search } from "lucide-react";
import { Card, cx } from "../components/ui/primitives";
import { StateBlock } from "../components/ui/phase2";
import { FAQItem, Modal, SupportStatusCard } from "../components/support";
import { IssueReportForm, SupportForm } from "../components/forms";
import { faqEntries, helpCategories } from "../data/phase2";
import type { PageId } from "../components/Sidebar";

const SUPPORT_CARDS = [
  { id: "email", icon: Mail, title: "Mission Support Dispatch", desc: "Transmit technical requests directly to the polar engineering team." },
  { id: "contact", icon: MessageSquare, title: "Operations Contact", desc: "Liaison for NCPOR research vessels and icebreaker escorts." },
  { id: "issue", icon: AlertOctagon, title: "Flag Telemetry Anomaly", desc: "Report sensor anomalies or trajectory prediction discrepancies." },
  { id: "tech", icon: Headphones, title: "Sensor Telemetry Support", desc: "Assistance with SAR downlink, satellite feeds & bridge integration." },
] as const;

export function Help({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [modal, setModal] = useState<null | "email" | "issue">(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqEntries.filter(
      (f) =>
        (category === "All" || f.category === category) &&
        (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)),
    );
  }, [query, category]);

  const openCard = (id: string) => {
    if (id === "email" || id === "tech") setModal("email");
    else if (id === "issue") setModal("issue");
    else if (id === "contact") onNavigate("contact");
  };

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <Card>
          <div className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <LifeBuoy size={16} className="text-[#55d6e8] light:text-[#0f768e]" />
              <h2 className="text-[15px] font-bold text-[#eaf6f8] light:text-[#0d2433]">ध्रुव सारथी · Help &amp; Support Hub</h2>
            </div>
            <p className="mb-3 text-[12px] text-[#91aeb9] light:text-[#4a6878]">
              Operational guidance, physics-informed neural network specifications, and voyage dispatch assistance.
            </p>
            <div className="flex items-center gap-2 rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f8f5ee] px-3 py-2.5 focus-within:border-[#55d6e8]/60 light:focus-within:border-[#0f768e]">
              <Search size={15} className="text-[#91aeb9] light:text-[#5a7686]" />
              <input
                value={query}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search polar navigation documentation, ice class rules, or drift algorithms…"
                className="w-full bg-transparent text-[13px] text-[#eaf6f8] light:text-[#0d2433] outline-none placeholder:text-[#5f7d89] light:placeholder:text-[#8ea5b3]"
              />
            </div>
          </div>
        </Card>

        {/* Support contact options */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SUPPORT_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => openCard(c.id)}
                className="group flex items-start gap-3 rounded-md border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-white p-4 text-left transition-all hover:border-[#55d6e8]/50 light:hover:border-[#0f768e]/50 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#55d6e8]/40 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10">
                  <Icon size={16} className="text-[#55d6e8] light:text-[#0f768e]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{c.title}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[#91aeb9] light:text-[#4a6878]">{c.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* FAQ */}
        <Card
          title="Operational FAQs & Mathematical Formulations"
          action={<span className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">{filtered.length} entries</span>}
        >
          <div className="flex flex-wrap gap-1.5 border-b border-[#1d445c]/40 light:border-[#e8e0d2] p-3">
            {["All", ...helpCategories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cx(
                  "rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors",
                  category === c
                    ? "bg-[#55d6e8]/20 text-[#55d6e8] light:bg-[#0f768e] light:text-white"
                    : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:text-[#0d2433]",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <StateBlock kind="empty" message="No documentation matches your search term." />
          ) : (
            <div className="flex flex-col">
              {filtered.map((f, i) => (
                <FAQItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0 && query !== ""} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <SupportStatusCard />
        <Card title="Documentation Categories">
          <div className="flex flex-col p-2">
            {helpCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="rounded-md px-3 py-2 text-left text-[12px] text-[#c8dde3] light:text-[#3a5563] transition-colors hover:bg-[#0d2433]/60 light:hover:bg-[#f5efe3] hover:text-[#eaf6f8] light:hover:text-[#0d2433]"
              >
                {c}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {modal === "email" && (
        <Modal title="Mission Support Dispatch" onClose={() => setModal(null)}>
          <SupportForm />
        </Modal>
      )}
      {modal === "issue" && (
        <Modal title="Report Telemetry / Prediction Anomaly" onClose={() => setModal(null)}>
          <IssueReportForm />
        </Modal>
      )}
    </div>
  );
}
