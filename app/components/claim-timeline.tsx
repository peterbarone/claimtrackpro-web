import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  FileTextIcon,
  UserIcon,
  MessageSquareIcon,
} from "lucide-react";

export interface TimelineItem {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  user: string;
  status?: string;
  type?: "status" | "document" | "comment" | "assignment" | "default";
}

export interface ClaimTimelineProps {
  items: TimelineItem[];
  className?: string;
}

const getTimelineIcon = (
  type: TimelineItem["type"] = "default",
  status?: string
) => {
  switch (type) {
    case "status":
      if (status === "approved") {
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      } else if (status === "rejected") {
        return <AlertCircleIcon className="h-5 w-5 text-red-600" />;
      } else if (status === "in-review" || status === "pending-info") {
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      }
      return <ClockIcon className="h-5 w-5 text-blue-600" />;

    case "document":
      return <FileTextIcon className="h-5 w-5 text-purple-600" />;

    case "comment":
      return <MessageSquareIcon className="h-5 w-5 text-gray-600" />;

    case "assignment":
      return <UserIcon className="h-5 w-5 text-indigo-600" />;

    default:
      return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
  }
};

const getTimelineBg = (
  type: TimelineItem["type"] = "default",
  status?: string
) => {
  switch (type) {
    case "status":
      if (status === "approved") return "bg-green-100";
      if (status === "rejected") return "bg-red-100";
      if (status === "in-review" || status === "pending-info")
        return "bg-yellow-100";
      return "bg-blue-100";
    case "document":
      return "bg-purple-100";
    case "comment":
      return "bg-gray-100";
    case "assignment":
      return "bg-indigo-100";
    default:
      return "bg-gray-100";
  }
};

export function ClaimTimeline({ items, className }: ClaimTimelineProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="relative">
        {items.map((item, index) => {
          const { date, time } = formatTimestamp(item.timestamp);
          const isLast = index === items.length - 1;

          return (
            <div
              key={item.id}
              className="relative flex items-start space-x-4 pb-6"
            >
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200" />
              )}

              {/* Timeline icon */}
              <div
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm",
                  getTimelineBg(item.type, item.status)
                )}
              >
                {getTimelineIcon(item.type, item.status)}
              </div>

              {/* Timeline content */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {item.action}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500 ml-4">
                      <div>{date}</div>
                      <div>{time}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <UserIcon className="h-3 w-3 mr-1" />

                      {item.user}
                    </div>

                    {item.status && (
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === "approved" &&
                            "bg-green-100 text-green-800",
                          item.status === "rejected" &&
                            "bg-red-100 text-red-800",
                          (item.status === "in-review" ||
                            item.status === "pending-info") &&
                            "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        {item.status.replace("-", " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
