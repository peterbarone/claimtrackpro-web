"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  Plus,
  Phone,
  Folder,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Participant {
  id: string;
  name?: string;
  role?: string;
  avatar?: string;
}

interface ClaimListCardProps {
  claimNumber: string;
  primary_insured: string;
  insuredLastName: string;
  daysOpen: number;
  status: string; // accept any status label
  type: string;
  dateOfLoss: string;
  lossAddress: string;
  description: string;
  participants?: Participant[];
  href?: string; // serializable; card navigates internally
}

function statusPillClasses(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("close")) return "bg-green-100 text-green-800";
  if (s.includes("review") || s.includes("hold") || s.includes("pending"))
    return "bg-yellow-100 text-yellow-800";
  if (s.includes("open") || s.includes("new") || s.includes("assign") || s.includes("progress"))
    return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

export function ClaimListCard({
  claimNumber,
  primary_insured,
  insuredLastName,
  daysOpen,
  status,
  type,
  dateOfLoss,
  lossAddress,
  description,
  participants,
  href,
}: ClaimListCardProps) {
  const router = useRouter();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [areParticipantsExpanded, setAreParticipantsExpanded] = useState(false);

  const truncatedDescription =
    description.length > 100
      ? description.substring(0, 100) + "..."
      : description;

  const ppl = participants ?? [];
  const visibleParticipants = ppl.slice(0, 3);
  const hiddenParticipantsCount = Math.max(0, ppl.length - 3);

  const getInitials = (name?: string) => {
    const source = (name ?? "").trim();
    if (!source) return "?";
    return source
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleAction = (action: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    console.log(`${action} action for claim ${claimNumber}`);
  };

  const handleCardClick = () => {
    // Navigate to the provided href; caller controls the path (now /claims/{id})
    if (href) router.push(href);
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-[#92C4D5] transition-all duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Line 1: Claim number - Name, Days Open, Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-gray-900 text-lg">
            {claimNumber}
          </span>
          {(primary_insured || insuredLastName) && (
            <>
              <span className="text-gray-600">-</span>
              <span className="font-semibold text-gray-900 text-lg">
                {insuredLastName}
                {insuredLastName && primary_insured ? ", " : ""}
                {primary_insured}
              </span>
            </>
          )}
          <span className="text-sm text-gray-500">{daysOpen} days open</span>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusPillClasses(status)}`}>
          {(status || "").replace("-", " ") || "—"}
        </span>
      </div>

      {/* Line 2: Claim Type, Date of Loss, Loss Address */}
      <div className="flex items-center mb-2 text-sm text-gray-600">
        {([type, dateOfLoss, lossAddress].filter(Boolean) as string[]).map(
          (part, idx, arr) => (
            <span key={idx} className="flex items-center">
              <span className={idx === 0 ? "font-medium" : ""}>{part}</span>
              {idx < arr.length - 1 && <span className="mx-3">•</span>}
            </span>
          )
        )}
      </div>

      {/* Line 3: Description */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          {isDescriptionExpanded ? description : truncatedDescription}
          {description.length > 100 && (
            <button
              className="ml-2 text-[#92C4D5] hover:text-[#6BA3B8] font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setIsDescriptionExpanded(!isDescriptionExpanded);
              }}
            >
              {isDescriptionExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </p>
      </div>

      {/* Line 4: Participants */}
      <div className="mb-4">
        <div className="flex items-center space-x-3">
          {(areParticipantsExpanded ? ppl : visibleParticipants).map(
            (participant) => (
              <div key={participant.id} className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#92C4D5] rounded-full flex items-center justify-center text-white text-xs font-medium overflow-hidden">
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.name || "Participant"}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    getInitials(participant.name)
                  )}
                </div>
                <span className="text-sm text-gray-700">
                  {(participant.name ?? "Unknown")} ({participant.role ?? "Participant"})
                </span>
              </div>
            )
          )}

          {hiddenParticipantsCount > 0 && !areParticipantsExpanded && (
            <button
              className="text-sm text-[#92C4D5] hover:text-[#6BA3B8] font-medium flex items-center space-x-1"
              onClick={(e) => {
                e.stopPropagation();
                setAreParticipantsExpanded(true);
              }}
            >
              <span>+ {hiddenParticipantsCount} more</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {areParticipantsExpanded && hiddenParticipantsCount > 0 && (
            <button
              className="text-sm text-[#92C4D5] hover:text-[#6BA3B8] font-medium flex items-center space-x-1"
              onClick={(e) => {
                e.stopPropagation();
                setAreParticipantsExpanded(false);
              }}
            >
              <span>Show less</span>
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs hover:bg-[#92C4D5] hover:text-white hover:border-[#92C4D5] transition-colors flex-1 mx-1"
          onClick={(e) => handleAction("Add Note", e)}
        >
          <FileText className="h-3 w-3 mr-1" />
          Add Note
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs hover:bg-[#92C4D5] hover:text-white hover:border-[#92C4D5] transition-colors flex-1 mx-1"
          onClick={(e) => handleAction("Upload", e)}
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs hover:bg-[#92C4D5] hover:text-white hover:border-[#92C4D5] transition-colors flex-1 mx-1"
          onClick={(e) => handleAction("Create Task", e)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Create Task
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs hover:bg-[#92C4D5] hover:text-white hover:border-[#92C4D5] transition-colors flex-1 mx-1"
          onClick={(e) => handleAction("Contact Insured", e)}
        >
          <Phone className="h-3 w-3 mr-1" />
          Contact Insured
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs hover:bg-[#92C4D5] hover:text-white hover:border-[#92C4D5] transition-colors flex-1 mx-1"
          onClick={(e) => handleAction("View Documents", e)}
        >
          <Folder className="h-3 w-3 mr-1" />
          View Documents
        </Button>
      </div>
    </div>
  );
}