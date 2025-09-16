import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, UserIcon } from "lucide-react";

interface ClaimCardProps {
  claimNumber: string;
  insuredFirstName: string;
  insuredLastName: string;
  type:
    | "Fire"
    | "Wind"
    | "Water Damage"
    | "Vehicle"
    | "Weight of Ice and Snow"
    | "Theft"
    | "Vandalism";
  status: "open" | "in-review" | "closed" | "pending";
  dateOfLoss: string;
  lossLocation: string;
  assignedAdjuster: string;
}

export function ClaimCard({
  claimNumber,
  insuredFirstName,
  insuredLastName,
  type,
  status,
  dateOfLoss,
  lossLocation,
  assignedAdjuster,
}: ClaimCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in-review":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "closed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case "Fire":
        return "bg-red-100 text-red-800";
      case "Water Damage":
        return "bg-blue-100 text-blue-800";
      case "Wind":
        return "bg-cyan-100 text-cyan-800";
      case "Vehicle":
        return "bg-purple-100 text-purple-800";
      case "Weight of Ice and Snow":
        return "bg-indigo-100 text-indigo-800";
      case "Theft":
        return "bg-orange-100 text-orange-800";
      case "Vandalism":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const truncateLocation = (location: string, maxLength: number = 30) => {
    return location.length > maxLength
      ? `${location.substring(0, maxLength)}...`
      : location;
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
      style={{
        marginTop: "12px",
        marginRight: "0px",
        marginBottom: "12px",
        marginLeft: "0px",
        paddingTop: "12px",
        paddingRight: "12px",
        paddingBottom: "12px",
        paddingLeft: "12px",
      }}
    >
      {/* First Line: Claim Number, Insured Name, Type, Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {claimNumber}
          </h3>
          <p className="text-sm font-bold text-gray-900 truncate">
            {insuredLastName}, {insuredFirstName}
          </p>
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 ${getTypeColor()}`}
          >
            {type}
          </Badge>
        </div>
        <Badge
          variant="outline"
          className={`text-xs px-2 py-0.5 ${getStatusColor()}`}
        >
          {status}
        </Badge>
      </div>

      {/* Second Line: Loss Date, Loss Address, Adjuster */}
      <div className="text-xs text-gray-600 truncate">
        <span>Loss: {formatDate(dateOfLoss)}</span>
        <span className="mx-2">•</span>
        <span className="truncate" title={lossLocation}>
          {truncateLocation(lossLocation, 25)}
        </span>
        <span className="mx-2">•</span>
        <span className="truncate">{assignedAdjuster}</span>
      </div>
    </div>
  );
}
