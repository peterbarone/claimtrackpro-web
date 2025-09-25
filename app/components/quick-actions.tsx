import { Button } from "@/components/ui/button";
import {
  FileTextIcon,
  UploadIcon,
  PlusIcon,
  PhoneIcon,
  MailIcon,
} from "lucide-react";

interface QuickActionsProps {
  onAddNote?: () => void;
  onUploadDocument?: () => void;
  onCreateTask?: () => void;
  onPhoneCall?: () => void;
  onEmail?: () => void;
}

export function QuickActions({
  onAddNote,
  onUploadDocument,
  onCreateTask,
  onPhoneCall,
  onEmail,
}: QuickActionsProps) {
  const actions = [
    {
      id: "add-note",
      label: "Add Note",
      icon: FileTextIcon,
      onClick: onAddNote,
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    },
    {
      id: "upload-document",
      label: "Upload Document",
      icon: UploadIcon,
      onClick: onUploadDocument,
      color: "bg-green-50 text-green-700 hover:bg-green-100",
    },
    {
      id: "create-task",
      label: "Create Task",
      icon: PlusIcon,
      onClick: onCreateTask,
      color: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
    },
    {
      id: "phone-call",
      label: "Phone Call",
      icon: PhoneIcon,
      onClick: onPhoneCall,
      color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
    },
    {
      id: "email",
      label: "Email",
      icon: MailIcon,
      onClick: onEmail,
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Quick Actions
      </h3>

      <div className="space-y-3">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.id}
              variant="ghost"
              onClick={action.onClick}
              className={`w-full justify-start h-12 ${action.color} border border-transparent hover:border-current`}
            >
              <IconComponent className="w-5 h-5 mr-3" />

              <span className="font-medium">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
