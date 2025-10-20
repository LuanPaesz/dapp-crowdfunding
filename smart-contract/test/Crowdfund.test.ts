import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";

const ethers = (hre as any).ethers; // <- ignora a tipagem e usa o objeto real em runtime


describe("Crowdfunding (ethers)", () => {
  let crowdfund: any;
  let owner: any, user1: any, user2: any;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const F = await ethers.getContractFactory("Crowdfunding");
    crowdfund = await F.deploy();
    await crowdfund.waitForDeployment();
  });

  it("cria campanha corretamente", async () => {
    await (await crowdfund.createCampaign(
      "Titulo",
      "Descricao",
      ethers.parseEther("1"),
      7
    )).wait();

    const nextId = await crowdfund.nextId();
    assert.equal(nextId, 1n);

    const c = await crowdfund.getCampaign(0n);
    assert.equal(c.owner, owner.address);
    assert.equal(c.title, "Titulo");
    assert.equal(c.exists, true);
  });

  it("aceita contribuicoes e atualiza totais", async () => {
    await (await crowdfund.createCampaign("t", "d", ethers.parseEther("1"), 7)).wait();
    await (await crowdfund.connect(user1).contribute(0n, { value: ethers.parseEther("0.4") })).wait();
    await (await crowdfund.connect(user2).contribute(0n, { value: ethers.parseEther("0.6") })).wait();

    const c = await crowdfund.getCampaign(0n);
    assert.equal(c.totalRaised, ethers.parseEther("1"));

    const contribUser1 = await crowdfund.contributions(0n, user1.address);
    assert.equal(contribUser1, ethers.parseEther("0.4"));
  });

  it("permite saque quando meta for atingida", async () => {
    await (await crowdfund.createCampaign("t", "d", ethers.parseEther("1"), 7)).wait();
    await (await crowdfund.connect(user1).contribute(0n, { value: ethers.parseEther("1.0") })).wait();

    await (await crowdfund.withdraw(0n)).wait();
    const c2 = await crowdfund.getCampaign(0n);
    assert.equal(c2.withdrawn, true);
  });

  it("permite reembolso apos o prazo se meta nao foi atingida", async () => {
    await (await crowdfund.createCampaign("t", "d", ethers.parseEther("2"), 1)).wait();
    await (await crowdfund.connect(user1).contribute(0n, { value: ethers.parseEther("0.5") })).wait();

    await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await (await crowdfund.connect(user1).refund(0n)).wait();

    const after = await crowdfund.contributions(0n, user1.address);
    assert.equal(after, 0n);
  });
});
