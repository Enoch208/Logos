// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Reputation
/// @notice 18-decimal fixed-point exponential moving average over the last
///         ratings each agent received. Only the Marketplace contract can
///         write; anyone can read. The 1–5 rating is rescaled to [0, 10] so
///         the dashboard can render it directly as `reputation / 10`.
contract Reputation {
    /// EMA new = old + ALPHA * (sample - old), 18-decimal fixed point.
    uint256 public constant ALPHA_FP18 = 1e16; // 0.01 weight on each new sample
    uint256 public constant SCALE = 1e18;
    uint256 public constant MAX_REPUTATION_FP18 = 10e18; // display ceiling

    address public marketplace;
    address public immutable admin;

    mapping(bytes32 => uint256) public reputationFP18;
    mapping(bytes32 => uint256) public totalQueriesServed;
    mapping(bytes32 => uint256) public totalUSDCEarned;

    event MarketplaceSet(address indexed marketplace);
    event ReputationUpdated(bytes32 indexed agentId, uint256 newReputationFP18, uint8 rating);
    event EarningsUpdated(bytes32 indexed agentId, uint256 totalUsdc6);

    error NotMarketplace();
    error NotAdmin();
    error MarketplaceAlreadySet();
    error InvalidRating();
    error InvalidMarketplace();

    constructor() {
        admin = msg.sender;
    }

    modifier onlyMarketplace() {
        if (msg.sender != marketplace) revert NotMarketplace();
        _;
    }

    /// One-shot setter so the Marketplace contract can be deployed *after*
    /// this contract while still being its only writer.
    function setMarketplace(address marketplace_) external {
        if (msg.sender != admin) revert NotAdmin();
        if (marketplace != address(0)) revert MarketplaceAlreadySet();
        if (marketplace_ == address(0)) revert InvalidMarketplace();
        marketplace = marketplace_;
        emit MarketplaceSet(marketplace_);
    }

    /// Marketplace calls this when a query is rated. Rating in [1,5] →
    /// sample in [0, 10] (FP18). EMA pulled toward that sample.
    function updateReputation(bytes32 agentId, uint8 rating) external onlyMarketplace {
        if (rating < 1 || rating > 5) revert InvalidRating();

        // sample = (rating - 1) * 2.5e18 → 1=0, 2=2.5, 3=5, 4=7.5, 5=10
        uint256 sample = (uint256(rating) - 1) * 25 * 1e17;

        uint256 current = reputationFP18[agentId];
        uint256 next;
        if (sample >= current) {
            uint256 diff = sample - current;
            next = current + (ALPHA_FP18 * diff) / SCALE;
        } else {
            uint256 diff = current - sample;
            uint256 delta = (ALPHA_FP18 * diff) / SCALE;
            next = current >= delta ? current - delta : 0;
        }
        if (next > MAX_REPUTATION_FP18) next = MAX_REPUTATION_FP18;

        reputationFP18[agentId] = next;
        totalQueriesServed[agentId] += 1;
        emit ReputationUpdated(agentId, next, rating);
    }

    /// Marketplace reports earnings (USDC 6-decimal) after an attested+rated
    /// query. Purely informational; the actual USDC moves off-chain via x402.
    function recordEarnings(bytes32 agentId, uint256 usdc6) external onlyMarketplace {
        totalUSDCEarned[agentId] += usdc6;
        emit EarningsUpdated(agentId, totalUSDCEarned[agentId]);
    }

    function getReputation(bytes32 agentId) external view returns (uint256) {
        return reputationFP18[agentId];
    }
}
