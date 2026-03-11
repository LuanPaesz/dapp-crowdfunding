const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding", function () {
  async function deployCrowdfundingFixture() {
    const [admin, owner, contributor1, contributor2, otherUser] =
      await ethers.getSigners();

    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();
    await crowdfunding.waitForDeployment();

    return {
      crowdfunding,
      admin,
      owner,
      contributor1,
      contributor2,
      otherUser,
    };
  }

  async function createDefaultCampaign(crowdfunding, owner) {
    const goal = ethers.parseEther("1");
    const durationDays = 7;

    const tx = await crowdfunding.connect(owner).createCampaign(
      "Test Campaign",
      "This is a test campaign",
      "https://example.com/image.jpg",
      "https://example.com/project",
      goal,
      durationDays
    );

    await tx.wait();

    return {
      campaignId: 0n,
      goal,
      durationDays,
    };
  }

  describe("Deployment", function () {
    it("should set the deployer as admin", async function () {
      const { crowdfunding, admin } = await deployCrowdfundingFixture();

      expect(await crowdfunding.admin()).to.equal(admin.address);
    });

    it("should start with nextId = 0", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();

      expect(await crowdfunding.nextId()).to.equal(0n);
    });
  });

  describe("createCampaign", function () {
    it("should create a campaign successfully", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();
      const goal = ethers.parseEther("1");
      const durationDays = 7;

      await expect(
        crowdfunding.connect(owner).createCampaign(
          "Test Campaign",
          "This is a test campaign",
          "https://example.com/image.jpg",
          "https://example.com/project",
          goal,
          durationDays
        )
      ).to.emit(crowdfunding, "CampaignCreated");

      const campaign = await crowdfunding.getCampaign(0n);

      expect(campaign.owner).to.equal(owner.address);
      expect(campaign.title).to.equal("Test Campaign");
      expect(campaign.description).to.equal("This is a test campaign");
      expect(campaign.goal).to.equal(goal);
      expect(campaign.totalRaised).to.equal(0n);
      expect(campaign.withdrawn).to.equal(false);
      expect(campaign.exists).to.equal(true);
      expect(campaign.approved).to.equal(false);
      expect(campaign.held).to.equal(false);
      expect(campaign.reports).to.equal(0n);

      expect(await crowdfunding.nextId()).to.equal(1n);
    });

    it("should revert if title is empty", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.connect(owner).createCampaign(
          "",
          "Description",
          "",
          "",
          ethers.parseEther("1"),
          7
        )
      ).to.be.revertedWith("Title required");
    });

    it("should revert if description is empty", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.connect(owner).createCampaign(
          "Title",
          "",
          "",
          "",
          ethers.parseEther("1"),
          7
        )
      ).to.be.revertedWith("Description required");
    });

    it("should revert if goal is zero", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.connect(owner).createCampaign(
          "Title",
          "Description",
          "",
          "",
          0,
          7
        )
      ).to.be.revertedWith("Goal must be > 0");
    });

    it("should revert if duration is zero", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await expect(
        crowdfunding.connect(owner).createCampaign(
          "Title",
          "Description",
          "",
          "",
          ethers.parseEther("1"),
          0
        )
      ).to.be.revertedWith("Duration must be > 0");
    });
  });

  describe("approveCampaign", function () {
    it("should allow admin to approve a campaign", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();
      await createDefaultCampaign(crowdfunding, owner);

      await expect(crowdfunding.approveCampaign(0n, true))
        .to.emit(crowdfunding, "Approved")
        .withArgs(0n, true);

      const campaign = await crowdfunding.getCampaign(0n);
      expect(campaign.approved).to.equal(true);
    });

    it("should revert if non-admin tries to approve", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);

      await expect(
        crowdfunding.connect(contributor1).approveCampaign(0n, true)
      ).to.be.revertedWith("Not admin");
    });
  });

  describe("contribute", function () {
    it("should allow contribution to approved campaign", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);
      await crowdfunding.approveCampaign(0n, true);

      const contribution = ethers.parseEther("0.5");

      await expect(
        crowdfunding.connect(contributor1).contribute(0n, {
          value: contribution,
        })
      )
        .to.emit(crowdfunding, "Contributed")
        .withArgs(0n, contributor1.address, contribution);

      const campaign = await crowdfunding.getCampaign(0n);
      expect(campaign.totalRaised).to.equal(contribution);

      const storedContribution = await crowdfunding.contributions(
        0n,
        contributor1.address
      );
      expect(storedContribution).to.equal(contribution);
    });

    it("should revert if campaign is not approved", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);

      await expect(
        crowdfunding.connect(contributor1).contribute(0n, {
          value: ethers.parseEther("0.5"),
        })
      ).to.be.revertedWith("Not approved");
    });

    it("should revert if value is zero", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);
      await crowdfunding.approveCampaign(0n, true);

      await expect(
        crowdfunding.connect(contributor1).contribute(0n, {
          value: 0,
        })
      ).to.be.revertedWith("No value");
    });
  });

  describe("withdraw", function () {
    it("should allow owner to withdraw when goal is reached", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);
      await crowdfunding.approveCampaign(0n, true);

      const contribution = ethers.parseEther("1");

      await crowdfunding.connect(contributor1).contribute(0n, {
        value: contribution,
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await crowdfunding.connect(owner).withdraw(0n);
      const receipt = await tx.wait();

      const gasPrice = receipt.gasPrice ?? 0n;
      const gasUsed = receipt.gasUsed * gasPrice;
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      const campaign = await crowdfunding.getCampaign(0n);
      expect(campaign.withdrawn).to.equal(true);

      expect(ownerBalanceAfter).to.equal(
        ownerBalanceBefore + contribution - gasUsed
      );
    });

    it("should revert if non-owner tries to withdraw", async function () {
      const { crowdfunding, owner, contributor1, contributor2 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);
      await crowdfunding.approveCampaign(0n, true);

      await crowdfunding.connect(contributor1).contribute(0n, {
        value: ethers.parseEther("1"),
      });

      await expect(
        crowdfunding.connect(contributor2).withdraw(0n)
      ).to.be.revertedWith("Not campaign owner");
    });

    it("should revert if goal is not reached", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);
      await crowdfunding.approveCampaign(0n, true);

      await crowdfunding.connect(contributor1).contribute(0n, {
        value: ethers.parseEther("0.2"),
      });

      await expect(crowdfunding.connect(owner).withdraw(0n)).to.be.revertedWith(
        "Not releasable"
      );
    });
  });

  describe("refund", function () {
    it("should allow contributor to refund after deadline if goal not reached", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      const goal = ethers.parseEther("2");

      await crowdfunding.connect(owner).createCampaign(
        "Refund Campaign",
        "Refund description",
        "",
        "",
        goal,
        1
      );

      await crowdfunding.approveCampaign(0n, true);

      const contribution = ethers.parseEther("0.5");

      await crowdfunding.connect(contributor1).contribute(0n, {
        value: contribution,
      });

      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(crowdfunding.connect(contributor1).refund(0n))
        .to.emit(crowdfunding, "Refunded")
        .withArgs(0n, contributor1.address, contribution);

      const storedContribution = await crowdfunding.contributions(
        0n,
        contributor1.address
      );
      expect(storedContribution).to.equal(0n);
    });

    it("should revert refund before deadline", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);
      await crowdfunding.approveCampaign(0n, true);

      await crowdfunding.connect(contributor1).contribute(0n, {
        value: ethers.parseEther("0.5"),
      });

      await expect(
        crowdfunding.connect(contributor1).refund(0n)
      ).to.be.revertedWith("Not ended");
    });

    it("should revert if there is nothing to refund", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      const goal = ethers.parseEther("2");

      await crowdfunding.connect(owner).createCampaign(
        "Refund Campaign",
        "Refund description",
        "",
        "",
        goal,
        1
      );

      await crowdfunding.approveCampaign(0n, true);

      await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        crowdfunding.connect(contributor1).refund(0n)
      ).to.be.revertedWith("Nothing to refund");
    });
  });

  describe("reportCampaign", function () {
    it("should allow users to report a campaign", async function () {
      const { crowdfunding, owner, contributor1 } =
        await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);

      await expect(crowdfunding.connect(contributor1).reportCampaign(0n))
        .to.emit(crowdfunding, "Reported")
        .withArgs(0n, contributor1.address, 1n);

      const campaign = await crowdfunding.getCampaign(0n);
      expect(campaign.reports).to.equal(1n);
    });
  });

  describe("setMedia", function () {
    it("should allow campaign owner to update media", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);

      await expect(
        crowdfunding.connect(owner).setMedia(0n, "https://new-image.com/test.png")
      )
        .to.emit(crowdfunding, "MediaUpdated")
        .withArgs(0n, "https://new-image.com/test.png");

      const campaign = await crowdfunding.getCampaign(0n);
      expect(campaign.media).to.equal("https://new-image.com/test.png");
    });
  });

  describe("setHeld", function () {
    it("should allow admin to hold a campaign", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);

      await expect(crowdfunding.setHeld(0n, true))
        .to.emit(crowdfunding, "HeldStatus")
        .withArgs(0n, true);

      const campaign = await crowdfunding.getCampaign(0n);
      expect(campaign.held).to.equal(true);
    });
  });

  describe("getTimeLeft", function () {
    it("should return time left for active campaign", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();

      await createDefaultCampaign(crowdfunding, owner);

      const timeLeft = await crowdfunding.getTimeLeft(0n);
      expect(timeLeft).to.be.greaterThan(0n);
    });
  });
});