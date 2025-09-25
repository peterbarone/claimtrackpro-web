import { CheckIcon } from "lucide-react";

interface Milestone {
  id: string;
  label: string;
  date?: string;
  completed: boolean;
}

interface ProgressBarProps {
  milestones: Milestone[];
}

export function ProgressBar({ milestones }: ProgressBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Claim Progress
      </h3>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{
              width: `${(milestones.filter((m) => m.completed).length / milestones.length) * 100}%`,
            }}
          />
        </div>

        {/* Milestones */}
        <div className="relative flex justify-between">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="flex flex-col items-center">
              {/* Milestone Circle */}
              <div
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 ${
                  milestone.completed
                    ? "bg-green-500 border-green-500 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {milestone.completed ? (
                  <CheckIcon className="w-6 h-6" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Milestone Label */}
              <div className="mt-3 text-center max-w-24">
                <p className="text-xs font-medium text-gray-900 leading-tight">
                  {milestone.label}
                </p>
                {milestone.date && (
                  <p className="text-xs text-gray-500 mt-1">{milestone.date}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
