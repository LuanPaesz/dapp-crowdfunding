import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import adminDashboard from "../assets/diagrams/admin-dashboard.png";
import blockFundUseCaseDiagram from "../assets/diagrams/blockfund-use-case-diagram.png";
import campaignDetailPage from "../assets/diagrams/campaign-detail-page.png";
import campaignPage from "../assets/diagrams/campaign-page.png";
import createCampaignPage from "../assets/diagrams/create-campaign-page.png";
import flowchartWithdrawalRefund from "../assets/diagrams/flowchart-withdrawal-refund.png";
import homePage from "../assets/diagrams/homepage.png";
import onChainData from "../assets/diagrams/on-chain-data.png";
import reactApplicationStructure from "../assets/diagrams/react-application-structure.png";
import scrumWorkflow from "../assets/diagrams/scrum-workflow.png";
import sequenceCampaignContribution from "../assets/diagrams/sequence-campaign-contribution.png";
import sequenceCampaignCreation from "../assets/diagrams/sequence-campaign-creation.png";
import tutorialPage from "../assets/diagrams/tutorial-page.png";
import userFlowPlatform from "../assets/diagrams/user-flow-platform.png";
import blockFundUi from "../assets/diagrams/blockfund-ui.png";

type DiagramItem = {
  title: string;
  description: string;
  image: string;
  category: string;
};

export default function Diagrams() {
  const diagrams: DiagramItem[] = [
    {
      title: "BlockFund UI Preview",
      description:
        "Preview of the implemented BlockFund interface showing the campaigns page layout and visual style.",
      image: blockFundUi,
      category: "Interface",
    },
    {
      title: "Use Case Diagram",
      description:
        "Shows the main actors in the platform and their interactions, including creator, backer, admin, and auditor.",
      image: blockFundUseCaseDiagram,
      category: "Analysis",
    },
    {
      title: "User Flow Diagram",
      description:
        "Illustrates the overall navigation flow between home, campaign browsing, detail page, wallet connection, admin, creator, and backer actions.",
      image: userFlowPlatform,
      category: "Flow",
    },
    {
      title: "Homepage Wireframe",
      description:
        "Wireframe of the homepage with header, hero section, call-to-action, featured campaigns, and footer.",
      image: homePage,
      category: "Wireframe",
    },
    {
      title: "Campaigns Page Wireframe",
      description:
        "Shows the campaigns listing page with header, campaign card grid/list, and footer.",
      image: campaignPage,
      category: "Wireframe",
    },
    {
      title: "Campaign Detail Page Wireframe",
      description:
        "Displays the campaign detail structure, including title, description, funding progress, updates, contributors, and contribution actions.",
      image: campaignDetailPage,
      category: "Wireframe",
    },
    {
      title: "Create Campaign Page Wireframe",
      description:
        "Represents the form structure used by creators to submit a new campaign.",
      image: createCampaignPage,
      category: "Wireframe",
    },
    {
      title: "Tutorial Page Wireframe",
      description:
        "Shows the tutorial page used to guide users through MetaMask setup and how to create or contribute to a campaign.",
      image: tutorialPage,
      category: "Wireframe",
    },
    {
      title: "Admin Dashboard Wireframe",
      description:
        "Displays the admin dashboard layout for campaign approval, moderation, reports overview, and hold/release controls.",
      image: adminDashboard,
      category: "Wireframe",
    },
    {
      title: "Campaign Creation Sequence Diagram",
      description:
        "Sequence diagram showing how a creator fills the form, confirms with wallet, and submits the campaign to the blockchain.",
      image: sequenceCampaignCreation,
      category: "Sequence",
    },
    {
      title: "Campaign Contribution Sequence Diagram",
      description:
        "Sequence diagram showing how a backer contributes to a campaign using the frontend, wallet, smart contract, and blockchain.",
      image: sequenceCampaignContribution,
      category: "Sequence",
    },
    {
      title: "Fund Release / Refund Flowchart",
      description:
        "Flowchart describing the logic used to validate withdrawals and refunds based on deadline, funding goal, authorization, and contribution state.",
      image: flowchartWithdrawalRefund,
      category: "Flowchart",
    },
    {
      title: "On-chain Data Model",
      description:
        "Compact data model of the smart contract storage, including campaigns, updates, and contributions mappings.",
      image: onChainData,
      category: "Data Model",
    },
    {
      title: "React Application Structure",
      description:
        "Component hierarchy and frontend structure of the React + Vite BlockFund application.",
      image: reactApplicationStructure,
      category: "Architecture",
    },
    {
      title: "Scrum Workflow",
      description:
        "Solo Scrum lifecycle used during the project, from backlog and sprint planning to development, testing, review, and increment.",
      image: scrumWorkflow,
      category: "Project Management",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/12 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">System diagrams</h1>
            <p className="text-white/60 mt-1 max-w-3xl">
              This section presents the main diagrams, flowcharts, sequence diagrams,
              wireframes, and architecture views used to analyse, design, and document
              the BlockFund platform.
            </p>
          </div>

          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {diagrams.map((diagram) => (
          <article
            key={diagram.title}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-300">
                {diagram.category}
              </span>

              <a
                href={diagram.image}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-white/60 transition hover:text-white"
              >
                Open
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <img
                src={diagram.image}
                alt={diagram.title}
                className="h-64 w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
              />
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-semibold">{diagram.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {diagram.description}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}