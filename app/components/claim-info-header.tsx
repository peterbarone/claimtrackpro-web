import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneIcon, MailIcon, ChevronDown, ChevronUp } from "lucide-react";

interface ClaimInfoHeaderProps {
  claimNumber: string;
  insuredName: string;
  daysOpen: number;
  status: "open" | "in-review" | "closed" | "pending";
  claimContacts: Array<{ name: string; role: string }>;
  lossAddress: string;
  mailingAddress: string;
  dateOfLoss: string;
  dateReceived: string;
  clientCompany: string;
  clientContact: string;
  description?: string;
  claimType?: string; // human readable claim type name
  participants: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
}

export function ClaimInfoHeader({
  claimNumber,
  insuredName,
  daysOpen,
  status,
  claimContacts,
  lossAddress,
  mailingAddress,
  dateOfLoss,
  dateReceived,
  clientCompany,
  clientContact,
  description,
  claimType,
  participants,
}: ClaimInfoHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const MAX_CHARS = 260; // truncation threshold
  const needsTruncate = !!description && description.length > MAX_CHARS;
  const displayDescription = useMemo(() => {
    if (!description) return "";
    if (!needsTruncate || expanded) return description;
    return description.slice(0, MAX_CHARS).trimEnd() + "…";
  }, [description, needsTruncate, expanded]);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in-review":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
              {claimNumber}
            </h1>
            <span
              className="text-xl font-semibold text-gray-800 truncate max-w-[300px]"
              title={insuredName}
            >
              {insuredName}
            </span>
            {claimType && (
              <Badge
                className="bg-indigo-50 text-indigo-700 font-medium border border-indigo-200"
                title={claimType}
              >
                {claimType}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="text-sm px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium whitespace-nowrap"
            title={`Open since ${dateReceived || dateOfLoss}`}
          >
            {daysOpen} days open
          </span>
          <Badge
            className={`${getStatusColor(
              status
            )} font-medium capitalize whitespace-nowrap`}
            title={`Status: ${status}`}
          >
            {status.replace("-", " ")}
          </Badge>
        </div>
      </div>

      {/* Main Content Grid: Left side content + Right side client info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Left Side: Main Information (3/4 width) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Claim Contacts with Phone/Email Icons */}
          <div>
            <span className="text-sm font-medium text-gray-500">
              Claim Contacts:
            </span>
            <div className="flex flex-wrap gap-3 mt-1">
              {claimContacts.map((contact, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs md:text-sm text-gray-700 bg-gray-50/80 hover:bg-gray-100 px-3 py-1 rounded-md border border-gray-200/60 shadow-sm"
                >
                  <span>
                    {contact.name} ({contact.role})
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Call ${contact.name}`}
                      className="h-6 w-6 p-0 hover:bg-blue-100 focus:ring-1 focus:ring-blue-300"
                      title={`Call ${contact.name}`}
                    >
                      <PhoneIcon className="w-3 h-3 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Email ${contact.name}`}
                      className="h-6 w-6 p-0 hover:bg-green-100 focus:ring-1 focus:ring-green-300"
                      title={`Email ${contact.name}`}
                    >
                      <MailIcon className="w-3 h-3 text-green-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Meta Data (Dates & Addresses) */}
          <div className="grid gap-y-2 gap-x-8 sm:grid-cols-2 text-sm">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 font-medium">Date of Loss:</span>
                <span className="text-gray-700" title={dateOfLoss}>
                  {dateOfLoss || "—"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 font-medium">
                  Date Received:
                </span>
                <span className="text-gray-700" title={dateReceived}>
                  {dateReceived || "—"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 font-medium">Loss Address:</span>
                <span className="text-gray-700 truncate" title={lossAddress}>
                  {lossAddress || "—"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-gray-500 font-medium">
                  Mailing Address:
                </span>
                <span className="text-gray-700 truncate" title={mailingAddress}>
                  {mailingAddress || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Client Information (1/4 width) */}
        <div className="lg:col-span-1 space-y-4 lg:border-l lg:border-gray-200 lg:pl-6">
          <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
            Client
          </span>
          {/* Client Company */}
          <div>
            <span className="text-sm font-medium text-gray-500 block">
              Client Company:
            </span>
            <p
              className="text-sm text-gray-700 mt-1 truncate"
              title={clientCompany}
            >
              {clientCompany}
            </p>
          </div>

          {/* Client Contact with Phone/Email Icons */}
          <div>
            <span className="text-sm font-medium text-gray-500 block">
              Client Contact:
            </span>
            <div className="flex items-start gap-2 mt-1">
              <p className="text-sm text-gray-700 flex-1">{clientContact}</p>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-blue-100 focus:ring-1 focus:ring-blue-300"
                  title={`Call ${clientContact}`}
                  aria-label={`Call ${clientContact}`}
                >
                  <PhoneIcon className="w-3 h-3 text-blue-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-green-100 focus:ring-1 focus:ring-green-300"
                  title={`Email ${clientContact}`}
                  aria-label={`Email ${clientContact}`}
                >
                  <MailIcon className="w-3 h-3 text-green-600" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line 4: Claim Participants */}
      <div>
        {description && (
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-500 block mb-1">
              Description:
            </span>
            <div className={"relative group " + (needsTruncate ? "" : "")}>
              <div
                className={
                  "text-sm text-gray-700 whitespace-pre-line bg-gray-50 border border-gray-200 rounded p-3 pr-16 transition-all " +
                  (needsTruncate && !expanded ? "max-h-40 overflow-hidden" : "")
                }
              >
                {displayDescription}
              </div>
              {needsTruncate && !expanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b bg-gradient-to-t from-gray-50 to-gray-50/0" />
              )}
              {needsTruncate && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="absolute bottom-2 right-2 text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm text-indigo-600 hover:text-indigo-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-expanded={expanded}
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500 block">
            Claim Participants:
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-4">
          {participants.slice(0, 3).map((participant) => (
            <div key={participant.id} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#92C4D5] rounded-full flex items-center justify-center text-white text-xs font-medium">
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  getInitials(participant.name)
                )}
              </div>
              <div className="text-sm">
                <p className="text-gray-700 font-medium">{participant.name}</p>
                <p className="text-gray-500 text-xs">{participant.role}</p>
              </div>
            </div>
          ))}
          {participants.length > 3 && (
            <button className="text-sm text-[#92C4D5] hover:text-[#7BB3C7] font-medium">
              +{participants.length - 3} more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
