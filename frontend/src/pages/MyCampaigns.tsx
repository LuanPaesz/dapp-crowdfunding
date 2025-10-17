import { useAccount } from "wagmi";
import { useCampaigns } from "../lib/useCampaigns";
import CampaignCard from "../components/CampaignCard";

export default function MyCampaigns() {
  const { address } = useAccount();
  const { campaigns, isLoading } = useCampaigns();

  if (!address) return <p>Connect your wallet.</p>;
  if (isLoading) return <p>Loading…</p>;

  const mine = campaigns.filter(
    (c) => c.owner.toLowerCase() === address.toLowerCase()
  );

  if (mine.length === 0) return <p>You have no campaigns yet.</p>;

  return (
    <div className="space-y-3">
      {mine.map((c) => (
        <CampaignCard key={String(c.id)} id={c.id} />
      ))}
    </div>
  );
}
