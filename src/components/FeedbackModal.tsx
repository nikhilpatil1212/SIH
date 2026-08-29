import { useState, type FormEvent, type ChangeEvent, type MouseEvent } from "react";
import { X, Star, Send, MessageSquare } from "lucide-react";
import { useTheme } from "../theme";
import { apiClient } from "../api/client";
import type { User } from "../data/auth";


export function FeedbackModal({ open, onClose, user }: { open: boolean; onClose: () => void; user?: User | null }) {
  const { theme } = useTheme();
  const d = theme === "dark";
  const [rating, setRating] = useState(4);
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setRating(4); setCategory("General"); setMessage(""); setSent(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiClient.createFeedback({
        user_email: user?.email || "anonymous@unknown.org",
        user_name: user?.name || "Anonymous",
        category,
        rating,
        message,
      });
      setSent(true);
    } catch {}
    setSending(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { onClose(); reset(); }}>
      <div
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl ${d ? "border-[#1d445c]/70 bg-[#0d2433]/95 backdrop-blur" : "border-[#e2d8c7] bg-white shadow-xl"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${d ? "bg-[#55d6e8]/15 text-[#55d6e8]" : "bg-[#0d2433]/10 text-[#0d2433]"}`}>
              <MessageSquare size={16} />
            </div>
            <h3 className="text-[16px] font-bold">Send Feedback</h3>
          </div>
          <button onClick={() => { onClose(); reset(); }} className="rounded-md p-1 hover:bg-[#1d445c]/30"><X size={16} /></button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${d ? "bg-[#10b981]/15 text-[#10b981]" : "bg-[#ecfdf5] text-[#059669]"}`}>
              <Send size={20} />
            </div>
            <h4 className="text-[18px] font-bold mb-1">Feedback Submitted!</h4>
            <p className={`text-[13px] ${d ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
              Thank you for helping improve Dhruv Sarthi. Your feedback has been recorded.
            </p>
            <button onClick={() => { onClose(); reset(); }} className={`mt-5 rounded-lg px-6 py-2 text-[13px] font-bold transition-colors ${d ? "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2]" : "bg-[#0d2433] text-[#faf8f5] hover:bg-[#16394f]"}`}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Rating */}
            <div>
              <span className={`block mb-1.5 text-[11px] font-semibold uppercase tracking-wider ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Rating</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star size={22} className={s <= rating ? "fill-[#f59e0b] text-[#f59e0b]" : d ? "text-[#5f7d89]/40" : "text-[#d8d0c2]"} />
                  </button>
                ))}
                <span className={`ml-2 text-[12px] font-semibold ${d ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>{rating}/5</span>
              </div>
            </div>

            {/* Category */}
            <label className="block">
              <span className={`block mb-1.5 text-[11px] font-semibold uppercase tracking-wider ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Category</span>
              <select
                value={category}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-[13px] outline-none ${d ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8]" : "border-[#dfd8cc] bg-[#faf8f5] text-[#0d2433]"}`}
              >
                <option>General</option>
                <option>Bug Report</option>
                <option>Feature Request</option>
                <option>Navigation Issue</option>
                <option>Iceberg Data</option>
                <option>Performance</option>
                <option>Safety Concern</option>
              </select>
            </label>

            {/* Message */}
            <label className="block">
              <span className={`block mb-1.5 text-[11px] font-semibold uppercase tracking-wider ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Message</span>
              <textarea
                value={message}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                rows={4}
                required
                placeholder="Describe your feedback, issue, or suggestion..."
                className={`w-full rounded-lg border px-3 py-2 text-[13px] outline-none resize-none ${d ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8] placeholder:text-[#5f7d89]" : "border-[#dfd8cc] bg-[#faf8f5] text-[#0d2433] placeholder:text-[#9db6c1]"}`}
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { onClose(); reset(); }} className={`rounded-lg px-4 py-2 text-[13px] font-semibold border transition-colors ${d ? "border-[#1d445c] text-[#91aeb9] hover:bg-[#132f40]" : "border-[#dfd8cc] text-[#4a6878] hover:bg-[#f2ece0]"}`}>
                Cancel
              </button>
              <button type="submit" disabled={sending} className={`rounded-lg px-5 py-2 text-[13px] font-bold transition-colors disabled:opacity-50 ${d ? "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2]" : "bg-[#0d2433] text-[#faf8f5] hover:bg-[#16394f]"}`}>
                {sending ? "Sending..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
