import { Fragment } from "react";

const STEPS = ["Observe", "Analyze", "Predict", "Assess Risk", "Plan Route", "Monitor", "Re-route"];

// Compact horizontal representation of the decision-support workflow.
export function Workflow({ active = 3 }: { active?: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#e2d8c7] light:bg-[#f5efe3] px-3 py-2 transition-colors">
      {STEPS.map((s, i) => (
        <Fragment key={s}>
          <span
            className={
              "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider " +
              (i === active
                ? "font-bold text-[#55d6e8] light:text-[#0f768e]"
                : "text-[#91aeb9] light:text-[#5a7686]")
            }
          >
            {s}
          </span>
          {i < STEPS.length - 1 && <span className="text-[10px] text-[#3a5a6b] light:text-[#b4a896]">→</span>}
        </Fragment>
      ))}
    </div>
  );
}
