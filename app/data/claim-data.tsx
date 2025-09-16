export interface Metric {
  id: string;
  title: string;
  value: string;
  trend: "up" | "down" | "neutral";
  percentage: string;
  icon: string;
}

export interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  claimReference: string;
  status: "pending" | "in-progress" | "completed";
}

export interface Claim {
  id: string;
  claimNumber: string;
  insuredFirstName: string;
  insuredLastName: string;
  type:
    | "Fire"
    | "Wind"
    | "Water Damage"
    | "Vehicle"
    | "Weight of Ice and Snow"
    | "Theft"
    | "Vandalism";
  status: "open" | "in-review" | "closed" | "pending";
  dateOfLoss: string;
  lossLocation: string;
  assignedAdjuster: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface ClaimListItem {
  id: string;
  claimNumber: string;
  insuredFirstName: string;
  insuredLastName: string;
  daysOpen: number;
  status: "open" | "in-review" | "closed" | "pending";
  type: string;
  dateOfLoss: string;
  lossAddress: string;
  description: string;
  participants: Participant[];
}

export const dashboardMetrics: Metric[] = [
  {
    id: "1",
    title: "Total Claims",
    value: "1,247",
    trend: "up",
    percentage: "+12%",
    icon: "FileText",
  },
  {
    id: "2",
    title: "New Claims",
    value: "89",
    trend: "up",
    percentage: "+8%",
    icon: "Plus",
  },
  {
    id: "3",
    title: "Claims in Review",
    value: "156",
    trend: "down",
    percentage: "-5%",
    icon: "Eye",
  },
  {
    id: "4",
    title: "Revisions Requested",
    value: "23",
    trend: "down",
    percentage: "-15%",
    icon: "Edit",
  },
  {
    id: "5",
    title: "Average Open Time",
    value: "14.2 days",
    trend: "up",
    percentage: "+2%",
    icon: "Clock",
  },
  {
    id: "6",
    title: "Total Invoicing Per Month",
    value: "$2.4M",
    trend: "up",
    percentage: "+18%",
    icon: "DollarSign",
  },
];

// Generate additional claims for infinite scroll demonstration
export const generateMoreClaims = (
  startIndex: number,
  count: number
): ClaimListItem[] => {
  const claimTypes = [
    "Fire Damage",
    "Water Damage",
    "Wind Damage",
    "Vehicle Collision",
    "Theft",
    "Vandalism",
  ];

  const statuses: ("open" | "in-review" | "closed" | "pending")[] = [
    "open",
    "in-review",
    "closed",
    "pending",
  ];

  const firstNames = [
    "John",
    "Sarah",
    "Michael",
    "Emily",
    "David",
    "Lisa",
    "Robert",
    "Jennifer",
    "James",
    "Maria",
  ];

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
  ];

  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i;
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];

    return {
      id: `generated-${index}`,
      claimNumber: `CLM-2024-${String(index + 100).padStart(3, "0")}`,
      insuredFirstName: firstName,
      insuredLastName: lastName,
      daysOpen: Math.floor(Math.random() * 60) + 1,
      status: statuses[index % statuses.length],
      type: claimTypes[index % claimTypes.length],
      dateOfLoss: `Jan ${Math.floor(Math.random() * 28) + 1}, 2024`,
      lossAddress: `${100 + index} Sample Street, City, IL 60${String(index).padStart(3, "0")}`,
      description: `Sample claim description for claim ${index + 100}. This is a generated claim for demonstration purposes with sufficient length to test the truncation functionality.`,
      participants: [
        { id: `p${index}-1`, name: "Sample Adjuster", role: "Adjuster" },
        { id: `p${index}-2`, name: "Sample Inspector", role: "Inspector" },
      ],
    };
  });
};

export const currentTasks: Task[] = [
  {
    id: "1",
    title: "Review property damage assessment",
    priority: "high",
    dueDate: "2024-01-15",
    claimReference: "CLM-2024-001",
    status: "pending",
  },
  {
    id: "2",
    title: "Schedule site inspection",
    priority: "medium",
    dueDate: "2024-01-16",
    claimReference: "CLM-2024-002",
    status: "in-progress",
  },
  {
    id: "3",
    title: "Update claim documentation",
    priority: "low",
    dueDate: "2024-01-18",
    claimReference: "CLM-2024-003",
    status: "pending",
  },
  {
    id: "4",
    title: "Contact insured for additional information",
    priority: "high",
    dueDate: "2024-01-15",
    claimReference: "CLM-2024-004",
    status: "pending",
  },
  {
    id: "5",
    title: "Review contractor estimates",
    priority: "medium",
    dueDate: "2024-01-17",
    claimReference: "CLM-2024-005",
    status: "in-progress",
  },
];

// Extended claims data for the claims list page
export const claimsListData: ClaimListItem[] = [
  {
    id: "1",
    claimNumber: "CLM-2024-001",
    insuredFirstName: "John",
    insuredLastName: "Smith",
    daysOpen: 25,
    status: "open",
    type: "Fire Damage",
    dateOfLoss: "Jan 10, 2024",
    lossAddress: "123 Main Street, Springfield, IL 62701",
    description:
      "Kitchen fire caused by electrical malfunction in the oven. Significant smoke damage throughout the first floor, with heat damage to adjacent rooms. Initial estimate suggests extensive cleanup and restoration work will be required.",
    participants: [
      { id: "1", name: "Sarah Johnson", role: "Adjuster" },
      { id: "2", name: "Mike Wilson", role: "Inspector" },
      { id: "3", name: "Lisa Chen", role: "Contractor" },
    ],
  },
  {
    id: "2",
    claimNumber: "CLM-2024-002",
    insuredFirstName: "Emily",
    insuredLastName: "Davis",
    daysOpen: 18,
    status: "in-review",
    type: "Water Damage",
    dateOfLoss: "Jan 17, 2024",
    lossAddress: "456 Oak Avenue, Chicago, IL 60601",
    description:
      "Burst pipe in basement caused flooding. Water damage to finished basement, including carpet, drywall, and personal property. Mold remediation may be required.",
    participants: [
      { id: "4", name: "David Brown", role: "Adjuster" },
      { id: "5", name: "Jennifer Martinez", role: "Water Specialist" },
      { id: "6", name: "Robert Taylor", role: "Restoration" },
      { id: "7", name: "Amanda Wilson", role: "Public Adjuster" },
    ],
  },
  {
    id: "3",
    claimNumber: "CLM-2024-003",
    insuredFirstName: "Robert",
    insuredLastName: "Johnson",
    daysOpen: 12,
    status: "pending",
    type: "Wind Damage",
    dateOfLoss: "Jan 23, 2024",
    lossAddress: "789 Pine Road, Rockford, IL 61101",
    description:
      "High winds damaged roof shingles and siding. Several windows were broken by flying debris. Temporary repairs completed, awaiting contractor estimates.",
    participants: [
      { id: "8", name: "Lisa Chen", role: "Adjuster" },
      { id: "9", name: "Christopher Lee", role: "Roofer" },
    ],
  },
  {
    id: "4",
    claimNumber: "CLM-2024-004",
    insuredFirstName: "Maria",
    insuredLastName: "Garcia",
    daysOpen: 45,
    status: "closed",
    type: "Vehicle Collision",
    dateOfLoss: "Dec 20, 2023",
    lossAddress: "321 Elm Street, Peoria, IL 61602",
    description:
      "Multi-vehicle accident at intersection. Significant front-end damage to insured vehicle. Total loss determination made after inspection.",
    participants: [
      { id: "10", name: "David Brown", role: "Adjuster" },
      { id: "11", name: "Michael Torres", role: "Appraiser" },
      { id: "12", name: "Sandra Kim", role: "Salvage" },
    ],
  },
  {
    id: "5",
    claimNumber: "CLM-2024-005",
    insuredFirstName: "James",
    insuredLastName: "Wilson",
    daysOpen: 8,
    status: "open",
    type: "Ice and Snow Damage",
    dateOfLoss: "Jan 27, 2024",
    lossAddress: "654 Maple Drive, Aurora, IL 60502",
    description:
      "Heavy snow load caused roof collapse in garage. Vehicle damaged by falling debris. Structural engineer assessment pending.",
    participants: [
      { id: "13", name: "Sarah Johnson", role: "Adjuster" },
      { id: "14", name: "Paul Anderson", role: "Engineer" },
      { id: "15", name: "Maria Rodriguez", role: "Contractor" },
      { id: "16", name: "Kevin Chang", role: "Auto Appraiser" },
      { id: "17", name: "Nancy White", role: "Public Adjuster" },
    ],
  },
  {
    id: "6",
    claimNumber: "CLM-2024-006",
    insuredFirstName: "Jennifer",
    insuredLastName: "Brown",
    daysOpen: 22,
    status: "in-review",
    type: "Theft",
    dateOfLoss: "Jan 13, 2024",
    lossAddress: "987 Cedar Lane, Joliet, IL 60431",
    description:
      "Break-in occurred while family was on vacation. Electronics, jewelry, and personal items stolen. Police report filed, inventory being compiled.",
    participants: [
      { id: "18", name: "Mike Wilson", role: "Adjuster" },
      { id: "19", name: "Detective Ray Parker", role: "Police" },
    ],
  },
  {
    id: "7",
    claimNumber: "CLM-2024-007",
    insuredFirstName: "Michael",
    insuredLastName: "Taylor",
    daysOpen: 35,
    status: "open",
    type: "Fire Damage",
    dateOfLoss: "Dec 31, 2023",
    lossAddress: "147 Birch Street, Naperville, IL 60540",
    description:
      "Electrical fire in attic spread to second floor. Extensive smoke and water damage from firefighting efforts. Contents inventory in progress.",
    participants: [
      { id: "20", name: "Lisa Chen", role: "Adjuster" },
      { id: "21", name: "Fire Chief Johnson", role: "Fire Dept" },
      { id: "22", name: "Elena Vasquez", role: "Contents" },
    ],
  },
  {
    id: "8",
    claimNumber: "CLM-2024-008",
    insuredFirstName: "Sarah",
    insuredLastName: "Anderson",
    daysOpen: 5,
    status: "pending",
    type: "Vandalism",
    dateOfLoss: "Jan 30, 2024",
    lossAddress: "258 Spruce Avenue, Evanston, IL 60201",
    description:
      "Graffiti and broken windows on commercial property. Security camera footage being reviewed. Repair estimates being obtained.",
    participants: [{ id: "23", name: "David Brown", role: "Adjuster" }],
  },
];

export const recentClaims: Claim[] = [
  {
    id: "1",
    claimNumber: "CLM-2024-001",
    insuredFirstName: "John",
    insuredLastName: "Smith",
    type: "Fire",
    status: "open",
    dateOfLoss: "2024-01-10",
    lossLocation: "123 Main St, Springfield, IL",
    assignedAdjuster: "Sarah Johnson",
  },
  {
    id: "2",
    claimNumber: "CLM-2024-002",
    insuredFirstName: "Emily",
    insuredLastName: "Davis",
    type: "Water Damage",
    status: "in-review",
    dateOfLoss: "2024-01-09",
    lossLocation: "456 Oak Ave, Chicago, IL",
    assignedAdjuster: "Mike Wilson",
  },
  {
    id: "3",
    claimNumber: "CLM-2024-003",
    insuredFirstName: "Robert",
    insuredLastName: "Johnson",
    type: "Wind",
    status: "pending",
    dateOfLoss: "2024-01-08",
    lossLocation: "789 Pine Rd, Rockford, IL",
    assignedAdjuster: "Lisa Chen",
  },
  {
    id: "4",
    claimNumber: "CLM-2024-004",
    insuredFirstName: "Maria",
    insuredLastName: "Garcia",
    type: "Vehicle",
    status: "closed",
    dateOfLoss: "2024-01-07",
    lossLocation: "321 Elm St, Peoria, IL",
    assignedAdjuster: "David Brown",
  },
  {
    id: "5",
    claimNumber: "CLM-2024-005",
    insuredFirstName: "James",
    insuredLastName: "Wilson",
    type: "Weight of Ice and Snow",
    status: "open",
    dateOfLoss: "2024-01-06",
    lossLocation: "654 Maple Dr, Aurora, IL",
    assignedAdjuster: "Sarah Johnson",
  },
  {
    id: "6",
    claimNumber: "CLM-2024-006",
    insuredFirstName: "Jennifer",
    insuredLastName: "Brown",
    type: "Theft",
    status: "in-review",
    dateOfLoss: "2024-01-05",
    lossLocation: "987 Cedar Ln, Joliet, IL",
    assignedAdjuster: "Mike Wilson",
  },
  {
    id: "7",
    claimNumber: "CLM-2024-007",
    insuredFirstName: "Michael",
    insuredLastName: "Taylor",
    type: "Fire",
    status: "open",
    dateOfLoss: "2024-01-04",
    lossLocation: "147 Birch St, Naperville, IL",
    assignedAdjuster: "Lisa Chen",
  },
  {
    id: "8",
    claimNumber: "CLM-2024-008",
    insuredFirstName: "Sarah",
    insuredLastName: "Anderson",
    type: "Vandalism",
    status: "pending",
    dateOfLoss: "2024-01-03",
    lossLocation: "258 Spruce Ave, Evanston, IL",
    assignedAdjuster: "David Brown",
  },
  {
    id: "9",
    claimNumber: "CLM-2024-009",
    insuredFirstName: "Christopher",
    insuredLastName: "Martinez",
    type: "Water Damage",
    status: "closed",
    dateOfLoss: "2024-01-02",
    lossLocation: "369 Willow Rd, Schaumburg, IL",
    assignedAdjuster: "Sarah Johnson",
  },
  {
    id: "10",
    claimNumber: "CLM-2024-010",
    insuredFirstName: "Amanda",
    insuredLastName: "Thompson",
    type: "Wind",
    status: "in-review",
    dateOfLoss: "2024-01-01",
    lossLocation: "741 Poplar St, Waukegan, IL",
    assignedAdjuster: "Mike Wilson",
  },
];
