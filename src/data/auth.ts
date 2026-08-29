// Mock user directory + auth types for Dhruv Sarthi.
// FRONTEND MOCK ONLY — no real password storage.

export type UserRole = "Researcher" | "Vessel Operator" | "Admin";

export interface User {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: UserRole;
}

export const mockUsers: User[] = [
  { id: "usr-001", name: "Dr. Ana Køhler", email: "researcher@example.org", organization: "NCPOR / Dhruv Sarthi", role: "Researcher" },
  { id: "usr-002", name: "Capt. Ravi Menon", email: "operator@example.org", organization: "RV Polar Star", role: "Vessel Operator" },
  { id: "adm-001", name: "System Administrator", email: "admin@example.org", organization: "Dhruv Sarthi Mission Ops", role: "Admin" },
];

/** Simulated sign-in. Any email/password is accepted in the prototype. */
export function mockSignIn(email: string): User | null {
  const trimmed = email.trim().toLowerCase();
  const existing = mockUsers.find((u) => u.email.toLowerCase() === trimmed);
  if (existing) return existing;
  
  if (trimmed) {
    const namePart = trimmed.split("@")[0] || "Navigator";
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    return {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: formattedName,
      email: trimmed,
      organization: "Polar Research Fleet (India)",
      role: trimmed.includes("admin") ? "Admin" : "Researcher",
    };
  }
  return null;
}

