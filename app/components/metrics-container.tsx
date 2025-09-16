import { MetricCard } from "@/components/metric-card";
import { dashboardMetrics } from "@/data/claim-data";

export function MetricsContainer() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {dashboardMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
            percentage={metric.percentage}
            icon={metric.icon}
          />
        ))}
      </div>
    </div>
  );
}
