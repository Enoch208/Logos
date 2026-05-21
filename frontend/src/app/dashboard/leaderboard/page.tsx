import { ReputationLeaderboard } from "@/components/dashboard/ReputationLeaderboard";

export const metadata = {
  title: "Leaderboard · Logos",
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <ReputationLeaderboard />
    </div>
  );
}
