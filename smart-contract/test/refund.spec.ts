import { expect } from "chai";
import { ethers } from "hardhat";

describe("Crowdfunding - refund", function () {
  it("refunds contributors when campaign fails after deadline", async () => {
    const [owner, backer] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const c = (await Crowdfunding.deploy()) as any;
    await c.waitForDeployment();

    // create 1-day campaign goal 10 ETH
    const tx = await c.connect(owner).createCampaign("A", "B", ethers.parseEther("10"), 1);
    await tx.wait();
    // admin approves
    await (await c.approveCampaign(0, true)).wait();

    // contribute 1 ETH (won't reach goal)
    await (await c.connect(backer).contribute(0, { value: ethers.parseEther("1") })).wait();

    // fast-forward > 1 day
    await ethers.provider.send("evm_increaseTime", [60 * 60 * 24 + 1]);
    await ethers.provider.send("evm_mine", []);

    // refund
    const before = await ethers.provider.getBalance(backer.address);
    const r = await (await c.connect(backer).refund(0)).wait();
    const gas = BigInt(r!.gasUsed) * BigInt(r!.effectiveGasPrice);

    const after = await ethers.provider.getBalance(backer.address);
    // ~1 ETH back (minus gas)
    expect(after + gas - before).to.equal(ethers.parseEther("1"));
  });
});
