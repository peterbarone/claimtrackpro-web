import { ClaimCard } from "@/components/claim-card";
// Update the path below to the correct relative path if needed
import { recentClaims } from "../data/claim-data";
import { Button } from "@/components/ui/button";
import { FileTextIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

export function RecentClaims() {
  const getClaimId = (claimNumber: string) => {
    // Extract the claim ID from the claim number (e.g., "CLM-2024-001" -> "1")
    const claim = recentClaims.find((c) => c.claimNumber === claimNumber);
    return claim?.id || "1";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FileTextIcon className="h-5 w-5 text-[#92C4D5]" />

            <h2 className="text-lg font-semibold text-gray-900">
              Recent Claims
            </h2>
          </div>

          <Link href="/claims">
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1.5 hover:bg-gray-50"
            >
              View All Claims
              <ExternalLinkIcon className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-600">
          Latest {recentClaims.length} claims requiring attention
        </p>
      </div>

      {/* Claims List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {recentClaims.map((claim) => (
            <Link
              key={claim.id}
              href={`/claims/${getClaimId(claim.claimNumber)}`}
            >
              <ClaimCard
                claimNumber={claim.claimNumber}
                insuredFirstName={claim.insuredFirstName}
                insuredLastName={claim.insuredLastName}
                type={claim.type}
                status={claim.status}
                dateOfLoss={claim.dateOfLoss}
                lossLocation={claim.lossLocation}
                assignedAdjuster={claim.assignedAdjuster}
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {recentClaims.length} recent claims</span>
          <Link href="/claims">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-2 py-1 text-[#92C4D5] hover:text-[#7AB5C7] hover:bg-[#92C4D5]/10"
            >
              View All
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
