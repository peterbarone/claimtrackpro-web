import { useState } from "react";
// Update the import path below if the file is in the same folder or adjust as needed
import { TaskItem } from "./task-item";
import { currentTasks } from "@/data/claim-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SortAscIcon,
  SortDescIcon,
  FilterIcon,
  CheckSquareIcon,
} from "lucide-react";

type SortOption = "dueDate" | "priority" | "status";
type FilterOption = "all" | "high" | "overdue";

export function TasksContainer() {
  const [tasks, setTasks] = useState(currentTasks);
  const [sortBy, setSortBy] = useState<SortOption>("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState<FilterOption>("all");

  const handleMarkComplete = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, status: "completed" as const } : task
      )
    );
  };

  const handleViewDetails = (id: string) => {
    // In a real app, this would navigate to task details
    console.log(`Viewing details for task ${id}`);
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 0;
    }
  };

  const filteredAndSortedTasks = tasks
    .filter((task) => {
      switch (filter) {
        case "high":
          return task.priority === filter;
        case "overdue":
          return isOverdue(task.dueDate) && task.status !== "completed";
        default:
          return true;
      }
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "dueDate":
          comparison =
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "priority":
          comparison =
            getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortOrder("asc");
    }
  };

  const getTaskCounts = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter(
      (t) => isOverdue(t.dueDate) && t.status !== "completed"
    ).length;
    const high = tasks.filter(
      (t) => t.priority === "high" && t.status !== "completed"
    ).length;

    return { total, completed, overdue, high };
  };

  const counts = getTaskCounts();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CheckSquareIcon className="h-6 w-6 text-[#92C4D5]" />

            <h2 className="text-xl font-semibold text-gray-900">
              Current Tasks
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log("View all tasks")}
            className="text-xs px-3 py-1.5 hover:bg-gray-50"
          >
            View All Tasks
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <span>{counts.completed} completed</span>
          {counts.overdue > 0 && (
            <span className="text-red-600 font-medium">
              {counts.overdue} overdue
            </span>
          )}
          {counts.high > 0 && (
            <span className="text-orange-600 font-medium">
              {counts.high} high priority
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Filter buttons */}
          <div className="flex items-center space-x-1">
            <FilterIcon className="h-4 w-4 text-gray-500 mr-2" />

            {(["all", "high", "overdue"] as FilterOption[]).map(
              (filterOption) => (
                <Button
                  key={filterOption}
                  variant={filter === filterOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(filterOption)}
                  className={`text-xs px-3 py-1.5 ${
                    filter === filterOption
                      ? "bg-[#92C4D5] hover:bg-[#7AB5C7] text-white"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {filterOption === "all"
                    ? "All"
                    : filterOption.charAt(0).toUpperCase() +
                      filterOption.slice(1)}
                </Button>
              )
            )}
          </div>

          {/* Sort buttons */}
          <div className="flex items-center space-x-1">
            {(["dueDate"] as SortOption[]).map((sortOption) => (
              <Button
                key={sortOption}
                variant="outline"
                size="sm"
                onClick={() => toggleSort(sortOption)}
                className="text-xs px-3 py-1.5 hover:bg-gray-50"
              >
                {sortOption === "dueDate"
                  ? "Due Date"
                  : sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
                {sortBy === sortOption &&
                  (sortOrder === "asc" ? (
                    <SortAscIcon className="h-3 w-3 ml-1" />
                  ) : (
                    <SortDescIcon className="h-3 w-3 ml-1" />
                  ))}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAndSortedTasks.length > 0 ? (
          <div className="space-y-4">
            {filteredAndSortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                priority={task.priority}
                dueDate={task.dueDate}
                claimReference={task.claimReference}
                status={task.status}
                onMarkComplete={handleMarkComplete}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckSquareIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />

            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No tasks found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters to see more tasks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
