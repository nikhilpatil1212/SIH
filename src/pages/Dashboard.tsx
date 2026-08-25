import { PredictionCard } from "../components/PredictionCard";
import { Workflow } from "../components/Workflow";
import { Globe } from "../components/globe/Globe";
import { AlertsPanel, EnvironmentalCard, RiskFactors, RouteComparison, VesselCard } from "../components/panels";
import { environment, riskFactorsByRoute, vessel } from "../data/mock";
import { dashboardKpis } from "../data/phase2";
import { useNav } from "../state";

export function Dashboard() {
  const nav = useNav();
  const selectedRoute = nav.routes.find((r) => r.id === nav.selectedRouteId)!;
  const selectedIceberg = nav.icebergs.find((i) => i.id === nav.selectedIcebergId) ?? nav.icebergs[0];

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {/* KPI overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {dashboardKpis.map((k) => (
          <div
            key={k.label}
            className="rounded-md border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-white px-3.5 py-2.5 shadow-sm transition-colors"
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">
                {k.label}
              </span>
              <span className="rounded-sm bg-[#f5b942]/15 px-1 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-[#f5b942] light:text-[#d97706]">
                {k.tag}
              </span>
            </div>
            <div className="font-mono text-[20px] font-semibold tnum text-[#eaf6f8] light:text-[#0d2433]" style={{ color: k.accent }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <Workflow />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
        {/* Map hero + bottom cards */}
        <div className="flex flex-col gap-3">
          <div className="h-[470px] overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
            <Globe
              routes={nav.routes}
              selectedRouteId={nav.selectedRouteId}
              showRoutes
              vessel={vessel}
              icebergs={nav.icebergs}
              showTrajectories
              selectedIcebergId={nav.selectedIcebergId}
              onSelectIceberg={nav.setSelectedIceberg}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <EnvironmentalCard env={environment} />
            <PredictionCard iceberg={selectedIceberg} />
          </div>
        </div>

        {/* Right information column */}
        <div className="flex min-w-0 flex-col gap-3">
          <VesselCard vessel={vessel} />
          <RouteComparison
            routes={nav.routes}
            selectedId={nav.selectedRouteId}
            recommendedId={nav.recommendedRouteId}
            onSelect={nav.setSelectedRoute}
          />
          <RiskFactors factors={riskFactorsByRoute[nav.selectedRouteId]} routeName={selectedRoute.name} />
          <AlertsPanel alerts={nav.alerts} />
        </div>
      </div>
    </div>
  );
}
