import { CheckIcon, EyeIcon, CalendarIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskItemProps {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  claimReference: string;
  status: "pending" | "in-progress" | "completed";
  onMarkComplete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function TaskItem({
  id,
  title,
  priority,
  dueDate,
  claimReference,
  status,
  onMarkComplete,
  onViewDetails,
}: TaskItemProps) {
  const getPriorityColor = () => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = () => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today && status !== "completed";
  };

  return (
    <div
      className={`
      bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow duration-200
      ${isOverdue() ? "border-red-200 bg-red-50/30" : "border-gray-200"}
    `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
            {title}
          </h3>

          <div className="flex items-center space-x-3 text-xs text-gray-600 mb-2">
            <div className="flex items-center space-x-1">
              <FileTextIcon className="h-3 w-3" />

              <span>{claimReference}</span>
            </div>

            <div className="flex items-center space-x-1">
              <CalendarIcon className="h-3 w-3" />

              <span className={isOverdue() ? "text-red-600 font-medium" : ""}>
                {formatDate(dueDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${getPriorityColor()}`}
            >
              {priority} priority
            </Badge>

            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${getStatusColor()}`}
            >
              {status}
            </Badge>

            {isOverdue() && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5 bg-red-100 text-red-800 border-red-200"
              >
                Overdue
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails?.(id)}
          className="text-xs px-3 py-1.5 min-h-[32px] hover:bg-gray-50"
        >
          <EyeIcon className="h-3 w-3 mr-1" />
          View Details
        </Button>

        {status !== "completed" && (
          <Button
            size="sm"
            onClick={() => onMarkComplete?.(id)}
            className="text-xs px-3 py-1.5 min-h-[32px] bg-[#92C4D5] hover:bg-[#7AB5C7] text-white"
          >
            <CheckIcon className="h-3 w-3 mr-1" />
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );
}
