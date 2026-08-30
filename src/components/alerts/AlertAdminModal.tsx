import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, X, Send } from "lucide-react";
import apiClient from "../../api/client";
import { useTheme } from "../../theme";
import type { User } from "../../data/auth";

export function AlertAdminModal({
  user,
  defaultLat = -68.20,
  defaultLon = -29.50,
  onClose,
  onSuccess,
}: {
  user?: User | null;
  defaultLat?: number;
  defaultLon?: number;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [message, setMessage] = useState("");
  const [lat, setLat] = useState<number>(defaultLat);
  const [lon, setLon] = useState<number>(defaultLon);
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe the situation or operational requirement.");
      return;
    }

    try {
      setSending(true);
      setError(null);
      await apiClient.alerts.createAlert({
        message: message.trim(),
        latitude: lat,
        longitude: lon,
        severity,
        user_name: user?.name || "Bridge Watch Officer",
      });
      setSentSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch alert to Mission Operations.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
          isDark
            ? "border-[#ef4444]/40 bg-[#071521] text-[#eaf6f8]"
            : "border-[#ef4444]/50 bg-white text-[#0d2433]"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-4 border-[#ef4444]/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold tracking-tight text-[#ef4444]">
                EMERGENCY ALERT TO MISSION ADMIN
              </h3>
              <p className={`text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                Broadcast priority navigational hazard or distress to Fleet Operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${
              isDark ? "text-[#91aeb9] hover:bg-[#132f40]" : "text-[#5a7686] hover:bg-[#f2ede4]"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981]/20 text-[#10b981]">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-[18px] font-bold text-[#10b981]">Alert Dispatched to Admin</h4>
            <p className={`mt-1 text-[13px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
              Fleet Operations Control has received your priority distress transmission.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Severity Picker */}
            <div>
              <label className="block text-[12px] font-semibold mb-1.5 text-[#91aeb9]">
                Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((lvl) => {
                  const isSelected = severity === lvl;
                  const colors = {
                    LOW: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40",
                    MEDIUM: "bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40",
                    HIGH: "bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40",
                    CRITICAL: "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40 animate-pulse",
                  };
                  return (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setSeverity(lvl)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-bold transition-all ${
                        isSelected
                          ? `${colors[lvl]} ring-2 ring-offset-1 ring-[#ef4444]/40`
                          : isDark
                            ? "border-[#1d445c] bg-[#0d2433] text-[#5f7d89] hover:bg-[#132f40]"
                            : "border-[#dfd8cc] bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold mb-1 text-[#91aeb9]">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLat(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border px-3 py-2 text-[13px] font-mono outline-none ${
                    isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1 text-[#91aeb9]">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLon(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border px-3 py-2 text-[13px] font-mono outline-none ${
                    isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                  }`}
                  required
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-[12px] font-semibold mb-1 text-[#91aeb9]">
                Situation / Distress Details
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder="Describe current sea-ice obstruction, iceberg proximity, machinery status or required corridor recalculation..."
                className={`w-full rounded-lg border p-3 text-[13px] outline-none transition-colors ${
                  isDark
                    ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8] placeholder:text-[#5f7d89] focus:border-[#ef4444]"
                    : "border-[#dfd8cc] bg-white text-[#0d2433] placeholder:text-[#9db6c1] focus:border-[#ef4444]"
                }`}
                required
              />
            </div>

            {error && <p className="text-[12px] font-medium text-[#ef4444]">{error}</p>}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors ${
                  isDark ? "border-[#1d445c] text-[#91aeb9] hover:bg-[#132f40]" : "border-[#dfd8cc] text-[#5a7686] hover:bg-[#f2ede4]"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 rounded-lg bg-[#ef4444] px-5 py-2 text-[13px] font-bold text-white shadow-lg shadow-[#ef4444]/20 hover:bg-[#dc2626] disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? "Transmitting..." : "Send Alert to Admin"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
