import {
  LayoutDashboard,
  Building2,
  Layers,
  CheckCircle,
  Image,
  Activity,
  Settings,
  Users,
  ClipboardList,
  CalendarCheck,
  Handshake,
  BarChart3,
  DollarSign,
  Receipt,
  UserCog,
  type LucideIcon,
} from "lucide-react";

// --- Navigation ---

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  adminOnly?: boolean;
}

export const V1_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Buildings", href: "/buildings", icon: Building2 },
  { label: "Floors", href: "/floors", icon: Layers },
  { label: "Units", href: "/units", icon: Layers },
  { label: "Approvals", href: "/approvals", icon: CheckCircle, adminOnly: true },
  { label: "Media", href: "/media", icon: Image },
  { label: "Activity", href: "/activity", icon: Activity, adminOnly: true },
  { label: "Users", href: "/settings/users", icon: UserCog, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const RIDER_NAV_ITEMS: NavItem[] = [
  { label: "Add Property", href: "/properties/new", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const V2_NAV_ITEMS: NavItem[] = [
  ...V1_NAV_ITEMS.slice(0, 5),
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Approvals", href: "/approvals", icon: CheckCircle, adminOnly: true },
  { label: "Tasks", href: "/tasks", icon: ClipboardList },
  { label: "Site Visits", href: "/site-visits", icon: CalendarCheck },
  { label: "Deals", href: "/deals", icon: Handshake },
  { label: "Commissions", href: "/commissions", icon: DollarSign },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Media", href: "/media", icon: Image },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/settings/users", icon: UserCog, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

// --- Status Maps ---

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  commercial_office: "Commercial Office",
  commercial_retail: "Commercial Retail",
  it_park: "IT Park",
  co_working: "Co-Working",
  warehouse: "Warehouse",
  industrial: "Industrial",
  mixed_use: "Mixed Use",
};

export const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  bare_shell: "Bare Shell",
  semi_furnished: "Semi Furnished",
  fully_furnished: "Fully Furnished",
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  under_negotiation: "Under Negotiation",
  on_hold: "On Hold",
  under_construction: "Under Construction",
  planned: "Planned",
};

export const VERIFICATION_LABELS: Record<string, string> = {
  verified: "Verified",
  pending_verification: "Pending Verification",
  needs_review: "Needs Review",
  rejected: "Rejected",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  deferred: "Deferred",
  conflict: "Conflict",
};

export const DEAL_STAGE_LABELS: Record<string, string> = {
  requirement_received: "Requirement Received",
  shortlisted: "Shortlisted",
  site_visit_scheduled: "Site Visit Scheduled",
  site_visit_completed: "Site Visit Completed",
  negotiation: "Negotiation",
  agreement_shared: "Agreement Shared",
  closed: "Closed",
  lost: "Lost",
};

export const DEAL_STAGES_ORDER = [
  "requirement_received",
  "shortlisted",
  "site_visit_scheduled",
  "site_visit_completed",
  "negotiation",
  "agreement_shared",
  "closed",
  "lost",
] as const;

// --- Status Colors (Tailwind classes) ---

export const AVAILABILITY_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  occupied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  under_negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  on_hold: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  under_construction: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  planned: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

export const VERIFICATION_COLORS: Record<string, string> = {
  verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pending_verification: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  needs_review: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const APPROVAL_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  deferred: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
  conflict: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

// --- Indian States & Cities ---

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
] as const;

export const STATE_ABBREVIATIONS: Record<string, string> = {
  "Maharashtra": "MH",
  "Karnataka": "KA",
  "Tamil Nadu": "TN",
  "Telangana": "TS",
  "Gujarat": "GJ",
  "Delhi": "DL",
  "Haryana": "HR",
  "Uttar Pradesh": "UP",
  "Rajasthan": "RJ",
  "West Bengal": "WB",
  "Kerala": "KL",
  "Andhra Pradesh": "AP",
  "Madhya Pradesh": "MP",
  "Punjab": "PB",
  "Odisha": "OD",
};

export const MAJOR_CITIES: Record<string, string[]> = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Navi Mumbai"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli-Dharwad", "Mangaluru"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Delhi": ["New Delhi", "Noida", "Gurgaon", "Faridabad"],
  "Haryana": ["Gurugram", "Faridabad", "Panchkula", "Panipat"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Ghaziabad", "Agra", "Varanasi"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior"],
  "Punjab": ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
};
