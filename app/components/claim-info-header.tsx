import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneIcon, MailIcon } from "lucide-react";

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
  participants,
}: ClaimInfoHeaderProps) {
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
      {/* Line 1: Claim Number - Insured Name - Days Open - Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-gray-900">{claimNumber}</h1>
          <span className="text-xl font-semibold text-gray-800">
            {insuredName}
          </span>
          <span className="text-lg text-gray-600">{daysOpen} days open</span>
        </div>
        <Badge className={`${getStatusColor(status)} font-medium`}>
          {status.replace("-", " ")}
        </Badge>
      </div>

      {/* Main Content Grid: Left side content + Right side client info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
        {/* Left Side: Main Information (3/4 width) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Claim Contacts with Phone/Email Icons */}
          <div>
            <span className="text-sm font-medium text-gray-500">
              Claim Contacts:
            </span>
            <div className="flex flex-wrap gap-3 mt-1">
              {claimContacts.map((contact, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded"
                >
                  <span>
                    {contact.name} ({contact.role})
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-blue-100"
                      title={`Call ${contact.name}`}
                    >
                      <PhoneIcon className="w-3 h-3 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-green-100"
                      title={`Email ${contact.name}`}
                    >
                      <MailIcon className="w-3 h-3 text-green-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates on Same Line */}
          <div>
            <span className="text-sm font-medium text-gray-500">
              Date of Loss:
            </span>
            <span className="text-sm text-gray-700 ml-2">{dateOfLoss}</span>
            <span className="text-sm font-medium text-gray-500 ml-6">
              Date Received:
            </span>
            <span className="text-sm text-gray-700 ml-2">{dateReceived}</span>
          </div>

          {/* Addresses on Same Line */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">
                Loss Address:
              </span>
              <span className="text-sm text-gray-700 ml-2">{lossAddress}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">
                Mailing Address:
              </span>
              <span className="text-sm text-gray-700 ml-2">
                {mailingAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Client Information (1/4 width) */}
        <div className="lg:col-span-1 space-y-3 lg:border-l lg:border-gray-200 lg:pl-6">
          {/* Client Company */}
          <div>
            <span className="text-sm font-medium text-gray-500 block">
              Client Company:
            </span>
            <p className="text-sm text-gray-700 mt-1">{clientCompany}</p>
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
                  className="h-6 w-6 p-0 hover:bg-blue-100"
                  title={`Call ${clientContact}`}
                >
                  <PhoneIcon className="w-3 h-3 text-blue-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-green-100"
                  title={`Email ${clientContact}`}
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
        <span className="text-sm font-medium text-gray-500 mb-2 block">
          Claim Participants:
        </span>
        <div className="flex items-center space-x-3">
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
