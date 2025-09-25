import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckIcon,
  EditIcon,
  XIcon,
  CalendarIcon,
  UserIcon,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  assignedPerson: string;
  description?: string;
}

interface ActiveTasksPanelProps {
  tasks: Task[];
  onMarkComplete?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
}

export function ActiveTasksPanel({
  tasks,
  onMarkComplete,
  onEditTask,
  onCancelTask,
}: ActiveTasksPanelProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Active Tasks</h3>
        <p className="text-sm text-gray-500 mt-1">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} • Sorted by due
          date
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No active tasks</p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <div
              key={task.id}
              className={`border rounded-lg p-3 transition-all ${
                isOverdue(task.dueDate)
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge
                      className={`${getPriorityColor(task.priority)} text-xs`}
                    >
                      {task.priority}
                    </Badge>
                    {isOverdue(task.dueDate) && (
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </h4>
                </div>
              </div>

              {/* Task Details */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center text-xs text-gray-500">
                  <CalendarIcon className="w-3 h-3 mr-1" />

                  <span>Due: {task.dueDate}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <UserIcon className="w-3 h-3 mr-1" />

                  <span>{task.assignedPerson}</span>
                </div>
              </div>

              {/* Task Description (if expanded) */}
              {expandedTask === task.id && task.description && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  {task.description}
                </div>
              )}

              {/* Task Actions */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMarkComplete?.(task.id)}
                    className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckIcon className="w-3 h-3 mr-1" />

                    <span className="text-xs">Complete</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditTask?.(task.id)}
                    className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <EditIcon className="w-3 h-3 mr-1" />

                    <span className="text-xs">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancelTask?.(task.id)}
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XIcon className="w-3 h-3 mr-1" />

                    <span className="text-xs">Cancel</span>
                  </Button>
                </div>

                {task.description && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setExpandedTask(expandedTask === task.id ? null : task.id)
                    }
                    className="h-8 px-2 text-gray-500 hover:text-gray-700"
                  >
                    <span className="text-xs">
                      {expandedTask === task.id ? "Less" : "More"}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
