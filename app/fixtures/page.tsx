import type { Metadata } from "next";
import FixturesClient from "./FixturesClient";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Fixtures & Interactive Bracket",
  description:
    "View full match schedules, live scores, results, and the interactive tournament tree for the FIFA World Cup 2026. Converted to Bangladesh Standard Time (BST).",
  keywords: [
    "FIFA World Cup 2026",
    "fixtures",
    "bracket",
    "world cup schedule",
    "Bangladesh Standard Time",
    "BST",
    "live scores",
  ],
};

// Revalidate cache every 5 minutes (300 seconds)
export const revalidate = 300;

async function getMatchesData() {
  const url = "https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json";
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      throw new Error(`Failed to fetch fixtures: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching World Cup fixtures:", error);
    return null;
  }
}

export default async function FixturesPage() {
  const initialData = await getMatchesData();

  return <FixturesClient initialData={initialData} />;
}
