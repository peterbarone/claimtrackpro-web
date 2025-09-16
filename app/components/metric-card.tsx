import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  FileTextIcon,
  PlusIcon,
  EyeIcon,
  EditIcon,
  ClockIcon,
  DollarSignIcon,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  percentage: string;
  icon: string;
}

const iconMap = {
  FileText: FileTextIcon,
  Plus: PlusIcon,
  Eye: EyeIcon,
  Edit: EditIcon,
  Clock: ClockIcon,
  DollarSign: DollarSignIcon,
};

export function MetricCard({
  title,
  value,
  trend,
  percentage,
  icon,
}: MetricCardProps) {
  const IconComponent = iconMap[icon as keyof typeof iconMap] || FileTextIcon;

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUpIcon className="h-3 w-3 text-green-600" />;

      case "down":
        return <TrendingDownIcon className="h-3 w-3 text-red-600" />;

      default:
        return <MinusIcon className="h-3 w-3 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-[#92C4D5]/10 rounded-lg">
            <IconComponent className="h-4 w-4 text-[#92C4D5]" />
          </div>
          <h3 className="text-xs font-medium text-gray-600">{title}</h3>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold text-gray-900 mb-0.5">{value}</p>
        </div>

        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={`text-xs font-medium ${getTrendColor()}`}>
            {percentage}
          </span>
        </div>
      </div>
    </div>
  );
}
