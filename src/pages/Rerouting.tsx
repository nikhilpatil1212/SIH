import { useState } from "react";
import { ArrowRight, Navigation, Play, RotateCcw, Ship, Zap } from "lucide-react";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import { RouteComparison, AlertsPanel } from "../components/panels";
import { Card, RiskMeter, cx } from "../components/ui/primitives";
import { vessel } from "../data/mock";
import { useNav } from "../state";

import type { PageId } from "../components/Sidebar";

const STEPS = [
  "New accelerated iceberg telemetry received",
  "Route B corridor risk dynamically re-computed",
  "Critical proximity alert dispatched to bridge",
  "Alternative safe corridors evaluated via AI",
  "Route C recommended & authorized",
];

export function Rerouting({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  const nav = useNav();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [tab, setTab] = useState<"current" | "new-route">("current");

  const run = () => {
    if (nav.rerouted) return;
    setRunning(true);
    setStep(0);
    STEPS.forEach((_, i) => {
      setTimeout(() => {
        setStep(i);
        if (i === STEPS.length - 1) {
          nav.simulateObservation();
          setRunning(false);
          setTab("new-route");
        }
      }, (i + 1) * 650);
    });
  };

  const reset = () => {
    nav.reset();
    setStep(-1);
    setRunning(false);
    setTab("current");
  };

  const routeB = nav.routes.find((r) => r.id === "route-b")!;

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-[15px] font-bold text-[#eaf6f8] light:text-[#0d2433]">Dynamic Re-routing Simulation</h2>
              <p className="text-[11px] text-[#91aeb9] light:text-[#4a6878]">
                Real-time event pipeline demonstrating autonomous corridor re-evaluation.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={run}
                disabled={running || nav.rerouted}
                className="flex items-center gap-2 rounded-md border border-[#55d6e8]/50 bg-[#55d6e8]/10 light:border-[#0f768e]/50 light:bg-[#0f768e]/10 px-3.5 py-2 text-[12px] font-semibold text-[#55d6e8] light:text-[#0f768e] transition-colors hover:bg-[#55d6e8]/20 disabled:opacity-40"
              >
                <Play size={13} /> Simulate Drifting Hazard
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 rounded-md border border-[#1d445c] light:border-[#d8d0c2] px-3 py-2 text-[12px] text-[#91aeb9] light:text-[#4a6878] transition-colors hover:text-[#eaf6f8] light:hover:text-[#0d2433]"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>
        </Card>

        {/* View tabs */}
        <div className="flex items-center gap-1 rounded-md border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#e2d8c7] light:bg-[#f4eee3] p-1">
          <button
            onClick={() => setTab("current")}
            className={cx(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-colors",
              tab === "current"
                ? "bg-[#132f40] text-[#eaf6f8] light:bg-white light:text-[#0d2433] light:shadow-sm"
                : "text-[#91aeb9] light:text-[#5a7686] hover:text-[#eaf6f8] light:hover:text-[#0d2433]",
            )}
          >
            <Ship size={13} /> Initial Situation
          </button>
          <button
            onClick={() => nav.rerouted && setTab("new-route")}
            disabled={!nav.rerouted}
            className={cx(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-40",
              tab === "new-route"
                ? "bg-[#10b981]/20 text-[#10b981] light:bg-[#10b981] light:text-white"
                : "text-[#91aeb9] light:text-[#5a7686] hover:text-[#eaf6f8] light:hover:text-[#0d2433]",
            )}
          >
            <Navigation size={13} /> New Recommended Route
          </button>
          {tab === "new-route" && (
            <span className="ml-auto pr-1 font-mono text-[10px] uppercase tracking-wider text-[#10b981] font-semibold">
              Route C · Safe Corridor
            </span>
          )}
        </div>

        <div className="relative min-h-[440px] flex-1 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
          <AntarcticPolarMap
            icebergs={nav.icebergs}
            selectedIcebergId={nav.selectedIcebergId}
            onSelectIceberg={(id) => {
              nav.setSelectedIceberg(id);
              onNavigate?.("iceberg");
            }}
            vessel={{
              name: vessel.name,
              position: { lat: vessel.position.lat, lon: vessel.position.lon },
              headingDeg: vessel.headingDeg,
              speedKn: vessel.speedKn,
              status: vessel.status,
            }}
            routes={nav.routes}
            selectedRouteId={tab === "new-route" ? nav.recommendedRouteId : nav.selectedRouteId}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Card title="Event Pipeline">
          <ol className="flex flex-col gap-1 p-3">
            {STEPS.map((s, i) => {
              const done = step >= i;
              return (
                <li
                  key={s}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
                    done
                      ? "bg-[#0d2433] light:bg-[#f2ebe0]"
                      : "bg-transparent"
                  }`}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                    style={{
                      backgroundColor: done ? "#55d6e8" : "#132f40",
                      color: done ? "#071521" : "#5f7d89",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-[12px] ${
                      done ? "text-[#eaf6f8] light:text-[#0d2433] font-medium" : "text-[#5f7d89] light:text-[#8ea5b3]"
                    }`}
                  >
                    {s}
                  </span>
                  {i === step && running && <Zap size={13} className="ml-auto text-[#f59e0b] animate-pulse" />}
                </li>
              );
            })}
          </ol>
        </Card>

        <Card title="Route B — Before / After Assessment">
          <div className="grid grid-cols-2 gap-3 p-4">
            <div>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">Before Hazard</div>
              <RiskMeter score={nav.rerouted ? 32 : routeB.riskScore} />
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight size={18} className="text-[#55d6e8] light:text-[#0f768e]" />
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">After Telemetry Intersect</div>
            <RiskMeter score={nav.rerouted ? 67 : 32} />
          </div>
          {nav.rerouted && (
            <div className="animate-fade-rise m-3 mt-0 rounded-md border-l-2 border-[#10b981] bg-[#10b981]/10 light:bg-[#ecfdf5] p-3">
              <div className="text-[12px] font-bold text-[#10b981]">Route C recommended</div>
              <p className="mt-1 text-[11px] leading-snug text-[#91aeb9] light:text-[#065f46]">
                New tabular iceberg trajectory intersects the projected Route B corridor in ~8 hours. Route C is safely clear.
              </p>
            </div>
          )}
        </Card>

        <RouteComparison
          routes={nav.routes}
          selectedId={nav.selectedRouteId}
          recommendedId={nav.recommendedRouteId}
          onSelect={nav.setSelectedRoute}
        />
        <AlertsPanel alerts={nav.alerts} />
      </div>
    </div>
  );
}

export default Rerouting;
