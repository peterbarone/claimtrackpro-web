import { useState } from "react";
import { SearchIcon, FilterIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
}

export function SearchBar({
  placeholder = "Search claims, adjusters, or claim numbers...",
  onSearch,
  onFilter,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Real-time search as user types
    onSearch?.(value);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex items-center space-x-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleInputChange}
            className="pl-10 pr-4 py-3 w-full text-sm border-gray-300 focus:border-[#92C4D5] focus:ring-[#92C4D5] rounded-lg"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onFilter}
          className="px-4 py-3 border-gray-300 hover:bg-gray-50 rounded-lg min-w-[44px] min-h-[44px]"
        >
          <FilterIcon className="h-4 w-4" />

          <span className="ml-2 hidden sm:inline">Filter</span>
        </Button>

        <Button
          type="submit"
          className="px-6 py-3 bg-[#92C4D5] hover:bg-[#7AB5C7] text-white rounded-lg min-w-[44px] min-h-[44px]"
        >
          <SearchIcon className="h-4 w-4 sm:hidden" />

          <span className="hidden sm:inline">Search</span>
        </Button>
      </form>
    </div>
  );
}
