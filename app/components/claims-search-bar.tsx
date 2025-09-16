import { useState } from "react";
import {
  SearchIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClaimsSearchBarProps {
  onSearch?: (query: string) => void;
  onSort?: (field: string, direction: "asc" | "desc") => void;
  onFilter?: (filters: any) => void;
  placeholder?: string;
}

export function ClaimsSearchBar({
  onSearch,
  onSort,
  onFilter,
  placeholder = "Search claims, adjusters, or claim numbers...",
}: ClaimsSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("dateOfLoss");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleSort = (field: string) => {
    const newDirection =
      sortField === field && sortDirection === "desc" ? "asc" : "desc";
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  };

  const handleFilter = () => {
    // This would typically open a filter modal or dropdown
    onFilter?.({});
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-11 border-gray-300 focus:border-[#92C4D5] focus:ring-[#92C4D5]"
          />
        </div>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-11 px-4 border-gray-300 hover:bg-gray-50 min-w-[120px]"
            >
              {sortDirection === "desc" ? (
                <SortDescIcon className="h-4 w-4 mr-2" />
              ) : (
                <SortAscIcon className="h-4 w-4 mr-2" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleSort("dateOfLoss")}>
              Date of Loss
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("claimNumber")}>
              Claim Number
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("insuredLastName")}>
              Insured Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("status")}>
              Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("daysOpen")}>
              Days Open
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Button */}
        <Button
          variant="outline"
          onClick={handleFilter}
          className="h-11 px-4 border-gray-300 hover:bg-gray-50 min-w-[100px]"
        >
          <FilterIcon className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>
    </div>
  );
}
