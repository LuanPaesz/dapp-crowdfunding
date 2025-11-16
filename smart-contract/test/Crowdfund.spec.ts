import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Crowdfunding", function () {
  let cf: any;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async () => {
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    [owner, addr1, addr2] = await ethers.getSigners();
    cf = await Crowdfunding.deploy();
    await cf.waitForDeployment();
  });

  it("should create and read campaigns", async () => {
    const tx = await cf.createCampaign("Title", "Desc", ethers.parseEther("1.0"), 3);
    await tx.wait();
    const campaign = await cf.getCampaign(0);
    expect(campaign.title).to.equal("Title");
    expect(campaign.goal).to.equal(ethers.parseEther("1.0"));
  });

  it("should allow contributions and withdraw when goal met", async () => {
    await cf.createCampaign("Title", "Desc", ethers.parseEther("1.0"), 1);
    await cf.connect(addr1).contribute(0, { value: ethers.parseEther("1.0") });
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    await cf.withdraw(0);
    const campaign = await cf.getCampaign(0);
    expect(campaign.withdrawn).to.be.true;
  });

  it("should allow refund if goal not met", async () => {
    await cf.createCampaign("Title", "Desc", ethers.parseEther("2.0"), 1);
    await cf.connect(addr1).contribute(0, { value: ethers.parseEther("1.0") });
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    await expect(cf.connect(addr1).refund(0)).to.not.be.reverted;
  });

  it("should not refund if not contributed", async () => {
    await cf.createCampaign("Title", "Desc", ethers.parseEther("2.0"), 1);
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    await expect(cf.connect(addr2).refund(0)).to.be.revertedWith("Nothing to refund");
  });
});
