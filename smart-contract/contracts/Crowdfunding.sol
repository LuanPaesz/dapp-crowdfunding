// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Crowdfunding is ReentrancyGuard {
    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 totalRaised;
        bool withdrawn;
        bool exists;
    }

    uint256 public nextId;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(uint256 indexed id, address indexed owner, string title, uint256 goal, uint256 deadline);
    event Contributed(uint256 indexed id, address indexed contributor, uint256 amount);
    event Withdrawn(uint256 indexed id, address indexed owner, uint256 amount);
    event Refunded(uint256 indexed id, address indexed contributor, uint256 amount);

    modifier onlyOwner(uint256 _id) {
        require(campaigns[_id].owner == msg.sender, "Not campaign owner");
        _;
    }

    modifier campaignExists(uint256 _id) {
        require(campaigns[_id].exists, "Campaign does not exist");
        _;
    }

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _durationDays
    ) external returns (uint256) {
        require(_goal > 0, "Goal must be > 0");
        require(_durationDays > 0, "Duration must be > 0");

        uint256 id = nextId++;
        campaigns[id] = Campaign({
            owner: msg.sender,
            title: _title,
            description: _description,
            goal: _goal,
            deadline: block.timestamp + (_durationDays * 1 days),
            totalRaised: 0,
            withdrawn: false,
            exists: true
        });

        emit CampaignCreated(id, msg.sender, _title, _goal, campaigns[id].deadline);
        return id;
    }

    function contribute(uint256 _id) external payable campaignExists(_id) nonReentrant {
        Campaign storage c = campaigns[_id];
        require(!c.withdrawn, "Already withdrawn");
        require(block.timestamp < c.deadline, "Campaign ended");
        require(msg.value > 0, "No value");

        c.totalRaised += msg.value;
        contributions[_id][msg.sender] += msg.value;

        emit Contributed(_id, msg.sender, msg.value);
    }

    function withdraw(uint256 _id) external campaignExists(_id) onlyOwner(_id) nonReentrant {
        Campaign storage c = campaigns[_id];
        require(block.timestamp >= c.deadline || c.totalRaised >= c.goal, "Not releasable yet");
        require(c.totalRaised >= c.goal, "Goal not reached");
        require(!c.withdrawn, "Already withdrawn");

        c.withdrawn = true;
        uint256 amount = c.totalRaised;

        (bool ok, ) = c.owner.call{value: amount}("");
        require(ok, "Transfer failed");

        emit Withdrawn(_id, c.owner, amount);
    }

    function refund(uint256 _id) external campaignExists(_id) nonReentrant {
        Campaign storage c = campaigns[_id];
        require(block.timestamp >= c.deadline, "Not ended");
        require(c.totalRaised < c.goal, "Goal reached");

        uint256 contributed = contributions[_id][msg.sender];
        require(contributed > 0, "Nothing to refund");

        contributions[_id][msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: contributed}("");
        require(ok, "Refund failed");

        emit Refunded(_id, msg.sender, contributed);
    }

    function getCampaign(uint256 _id) external view campaignExists(_id) returns (Campaign memory) {
        return campaigns[_id];
    }

    function getTimeLeft(uint256 _id) external view campaignExists(_id) returns (uint256) {
        Campaign storage c = campaigns[_id];
        if (block.timestamp >= c.deadline) return 0;
        return c.deadline - block.timestamp;
    }
}
