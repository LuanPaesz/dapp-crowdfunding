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
        string media;
        bool approved;
        bool held;
        uint256 reports;
        string projectLink;
    }

    uint256 public nextId;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    address public admin;

    event CampaignCreated(
        uint256 indexed id,
        address indexed owner,
        string title,
        uint256 goal,
        uint256 deadline
    );

    event Contributed(uint256 indexed id, address indexed contributor, uint256 amount);
    event Withdrawn(uint256 indexed id, address indexed owner, uint256 amount);
    event Refunded(uint256 indexed id, address indexed contributor, uint256 amount);
    event Approved(uint256 indexed id, bool approved);
    event MediaUpdated(uint256 indexed id, string media);
    event HeldStatus(uint256 indexed id, bool held);
    event Reported(uint256 indexed id, address indexed reporter, uint256 totalReports);

    modifier onlyOwner(uint256 _id) {
        require(campaigns[_id].owner == msg.sender, "Not campaign owner");
        _;
    }

    modifier campaignExists(uint256 _id) {
        require(campaigns[_id].exists, "Campaign does not exist");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ------------------------------------------------------------
    // CREATE CAMPAIGN (6 args)
    // ------------------------------------------------------------
    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _media,
        string memory _projectLink,
        uint256 _goal,
        uint256 _durationDays
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_description).length > 0, "Description required");
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
            exists: true,
            media: _media,
            approved: false,
            held: false,
            reports: 0,
            projectLink: _projectLink
        });

        emit CampaignCreated(id, msg.sender, _title, _goal, campaigns[id].deadline);

        return id;
    }

    // ------------------------------------------------------------
    // ADMIN: APPROVE OR REJECT
    // ------------------------------------------------------------
    function approveCampaign(uint256 _id, bool _approved)
        external
        onlyAdmin
        campaignExists(_id)
    {
        campaigns[_id].approved = _approved;
        emit Approved(_id, _approved);
    }

    // ------------------------------------------------------------
    // OWNER: UPDATE MEDIA
    // ------------------------------------------------------------
    function setMedia(uint256 _id, string calldata _media)
        external
        onlyOwner(_id)
        campaignExists(_id)
    {
        campaigns[_id].media = _media;
        emit MediaUpdated(_id, _media);
    }

    // ------------------------------------------------------------
    // ADMIN: HOLD / RELEASE CAMPAIGN
    // ------------------------------------------------------------
    function setHeld(uint256 _id, bool _held)
        external
        onlyAdmin
        campaignExists(_id)
    {
        campaigns[_id].held = _held;
        emit HeldStatus(_id, _held);
    }

    // ------------------------------------------------------------
    // USERS: REPORT CAMPAIGN
    // ------------------------------------------------------------
    function reportCampaign(uint256 _id)
        external
        campaignExists(_id)
    {
        campaigns[_id].reports += 1;
        emit Reported(_id, msg.sender, campaigns[_id].reports);
    }

    // ------------------------------------------------------------
    // CONTRIBUTE
    // ------------------------------------------------------------
    function contribute(uint256 _id)
        external
        payable
        campaignExists(_id)
        nonReentrant
    {
        Campaign storage c = campaigns[_id];

        require(c.approved, "Not approved");
        require(!c.held, "Campaign held");
        require(!c.withdrawn, "Already withdrawn");
        require(block.timestamp < c.deadline, "Campaign ended");
        require(msg.value > 0, "No value");

        c.totalRaised += msg.value;
        contributions[_id][msg.sender] += msg.value;

        emit Contributed(_id, msg.sender, msg.value);
    }

    // ------------------------------------------------------------
    // OWNER WITHDRAW
    // ------------------------------------------------------------
    function withdraw(uint256 _id)
        external
        onlyOwner(_id)
        campaignExists(_id)
        nonReentrant
    {
        Campaign storage c = campaigns[_id];

        require(block.timestamp >= c.deadline || c.totalRaised >= c.goal, "Not releasable");
        require(c.totalRaised >= c.goal, "Goal not reached");
        require(!c.withdrawn, "Already withdrawn");

        c.withdrawn = true;
        uint256 amount = c.totalRaised;

        (bool ok, ) = c.owner.call{value: amount}("");
        require(ok, "Transfer failed");

        emit Withdrawn(_id, c.owner, amount);
    }

    // ------------------------------------------------------------
    // REFUND
    // ------------------------------------------------------------
    function refund(uint256 _id)
        external
        campaignExists(_id)
        nonReentrant
    {
        Campaign storage c = campaigns[_id];

        require(block.timestamp > c.deadline, "Not ended");
        require(c.totalRaised < c.goal, "Goal reached");

        uint256 amount = contributions[_id][msg.sender];
        require(amount > 0, "Nothing to refund");

        contributions[_id][msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Refund failed");

        emit Refunded(_id, msg.sender, amount);
    }

    // ------------------------------------------------------------
    // VIEW FUNCTIONS
    // ------------------------------------------------------------
    function getCampaign(uint256 _id)
        external
        view
        campaignExists(_id)
        returns (Campaign memory)
    {
        return campaigns[_id];
    }

    function getTimeLeft(uint256 _id)
        external
        view
        campaignExists(_id)
        returns (uint256)
    {
        if (block.timestamp >= campaigns[_id].deadline) return 0;
        return campaigns[_id].deadline - block.timestamp;
    }
}
