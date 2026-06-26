import { motion } from "motion/react";
import { DashboardInsights as InsightsType } from "../types";
import { AlertCircle, BarChart3, CheckCircle2, MapPin, ShieldAlert, TrendingUp } from "lucide-react";

interface DashboardInsightsProps {
  insights: InsightsType;
}

export default function DashboardInsights({ insights }: DashboardInsightsProps) {
  const { total, byCategory, byStatus, avgSeverity, resolvedCount, hotspots } = insights;

  // Calculate resolution rate
  const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

  // Colors mapping for category and status
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Pothole": return "bg-orange-500";
      case "Water Leakage": return "bg-cyan-500";
      case "Damaged Streetlight": return "bg-yellow-500";
      case "Waste Management": return "bg-pink-500";
      case "Public Transport/Transit Gap": return "bg-purple-500";
      default: return "bg-slate-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Reported": return "text-orange-600 bg-orange-50 border-orange-200";
      case "Verified": return "text-cyan-600 bg-cyan-50 border-cyan-200";
      case "In Progress": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "Resolved": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      default: return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  // Safe category entries
  const categoryEntries = Object.entries(byCategory || {});
  const maxCategoryCount = Math.max(...categoryEntries.map(([_, count]) => count), 1);

  return (
    <div className="space-y-6">
      {/* 1. Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Tickets", value: total, icon: AlertCircle, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "Resolved Issues", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "Avg Severity", value: `${avgSeverity}/5`, icon: ShieldAlert, color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "Resolution Rate", value: `${resolutionRate}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50 border-purple-200" }
        ].map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm"
          >
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</p>
              <h3 className="text-2xl font-bold font-display text-slate-800 mt-1">{metric.value}</h3>
            </div>
            <div className={`p-2.5 rounded-xl border ${metric.color}`}>
              <metric.icon className="w-5 h-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 2. Visual Graphs & Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category breakdown (Custom Animated SVG Bar Chart) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Incidents by Infrastructure Category
            </h4>
          </div>

          <div className="space-y-4 py-2">
            {categoryEntries.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">No categorizations recorded.</p>
            ) : (
              categoryEntries.map(([cat, count], idx) => {
                const pct = Math.round((count / maxCategoryCount) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{cat}</span>
                      <span className="font-mono text-slate-500">{count} issues</span>
                    </div>
                    <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.05 }}
                        className={`absolute left-0 top-0 h-full rounded-full ${getCategoryColor(cat)}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Status Distribution Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Workflow Completion Status
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4 h-full items-center">
            {/* SVG Donut Chart */}
            <div className="flex justify-center py-2">
              <svg width="120" height="120" viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
                
                {/* Dynamically drawing status stroke wedges */}
                {(() => {
                  let accumulatedPercent = 0;
                  return Object.entries(byStatus || {}).map(([status, count], index) => {
                    const valuePct = total > 0 ? (count / total) * 100 : 0;
                    const strokeDash = `${valuePct} ${100 - valuePct}`;
                    const strokeOffset = 100 - accumulatedPercent;
                    accumulatedPercent += valuePct;

                    // Stroke colors
                    let strokeColor = "#f97316"; // Reported - Orange
                    if (status === "Verified") strokeColor = "#06b6d4";
                    if (status === "In Progress") strokeColor = "#6366f1";
                    if (status === "Resolved") strokeColor = "#10b981";

                    return (
                      <circle
                        key={status}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="transparent"
                        stroke={strokeColor}
                        strokeWidth="3.5"
                        strokeDasharray={strokeDash}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
                      />
                    );
                  });
                })()}
                
                {/* Centered label */}
                <text x="18" y="20.5" className="font-display font-bold text-[8px]" fill="#1e293b" textAnchor="middle" transform="rotate(90 18 18)">
                  {total} Total
                </text>
              </svg>
            </div>

            {/* Status Legend Panel */}
            <div className="space-y-2.5">
              {["Reported", "Verified", "In Progress", "Resolved"].map((status) => {
                const count = byStatus[status] || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        status === "Reported" ? "bg-orange-500" :
                        status === "Verified" ? "bg-cyan-500" :
                        status === "In Progress" ? "bg-indigo-500" : "bg-emerald-500"
                      }`} />
                      <span className="text-slate-700 font-medium">{status}</span>
                    </div>
                    <span className="font-mono text-slate-500">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. High Severity Hotspots Alert Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-orange-500" />
          High Severity Hotspots (Level 4-5)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
          {hotspots.length === 0 ? (
            <p className="col-span-2 text-xs text-slate-500 text-center py-4">No active high-severity hazards reported in this zone.</p>
          ) : (
            hotspots.map((spot, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 font-display font-bold flex items-center justify-center text-sm">
                    {spot.severity}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px] md:max-w-[240px]">{spot.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">LAT: {spot.lat.toFixed(4)} / LNG: {spot.lng.toFixed(4)}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Hazard</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
