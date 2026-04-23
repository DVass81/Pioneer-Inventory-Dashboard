import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCategory(category: string): string {
  const map: Record<string, string> = {
    segment_mica: "Segment Mica",
    molding_mica: "Molding Mica",
    pei_tape: "PEI Tape",
    cold_banding_tape: "Cold Banding Tape",
    brazing_wire: "Brazing Wire",
  };
  return map[category] || category;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
