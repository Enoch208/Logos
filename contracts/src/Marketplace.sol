// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AgentRegistry} from "./AgentRegistry.sol";
import {Reputation} from "./Reputation.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Marketplace
/// @notice Records offers, queries, attestations, and ratings for the Logos
///         marketplace. Settlement is OFF-CHAIN via Circle Nanopayments /
///         x402 — this contract never transfers USDC. It is a verifiable
///         ledger of who bought what cognition from whom, and at what
///         quality, so reputation can be tallied trustlessly.
contract Marketplace {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    enum QueryStatus {
        None,
        Open,
        Attested,
        Rated,
        Expired
    }

    struct Offer {
        bytes32 agentId;
        bytes32 serviceTypeHash;
        bytes32 schemaHash;
        uint256 pricePerQuery; // USDC, 6 decimals
        string endpointURL;
        bool active;
    }

    struct Query {
        address trader;
        bytes32 offerId;
        bytes32 paymentAuthHash;
        bytes32 queryPayloadHash;
        bytes32 responseHash;
        bytes32 traceCID;
        uint8 rating;
        uint64 createdAt;
        QueryStatus status;
    }

    uint64 public constant ATTEST_TIMEOUT = 5 minutes;

    AgentRegistry public immutable registry;
    Reputation public immutable reputation;

    mapping(bytes32 => Offer) public offers;
    mapping(bytes32 => Query) public queries;
    uint256 public offerNonce;
    uint256 public queryNonce;

    event OfferPublished(
        bytes32 indexed offerId,
        bytes32 indexed agentId,
        bytes32 indexed serviceTypeHash,
        uint256 pricePerQuery,
        string endpointURL
    );
    event OfferDeactivated(bytes32 indexed offerId);
    event QueryRecorded(
        bytes32 indexed queryId,
        bytes32 indexed offerId,
        address indexed trader,
        bytes32 paymentAuthHash
    );
    event ResponseAttested(bytes32 indexed queryId, bytes32 responseHash, bytes32 traceCID);
    event ResponseRated(bytes32 indexed queryId, uint8 rating);
    event QueryExpired(bytes32 indexed queryId);

    error AgentInactive();
    error NotAgentOwner();
    error OfferInactive();
    error OfferNotFound();
    error QueryNotFound();
    error QueryNotOpen();
    error QueryNotAttested();
    error InvalidRating();
    error InvalidSignature();
    error NotTrader();
    error NotExpired();

    constructor(AgentRegistry registry_, Reputation reputation_) {
        registry = registry_;
        reputation = reputation_;
    }

    // ─── Offers ──────────────────────────────────────────────────────────

    function publishOffer(
        bytes32 agentId,
        bytes32 serviceTypeHash,
        bytes32 schemaHash,
        uint256 pricePerQuery,
        string calldata endpointURL
    ) external returns (bytes32 offerId) {
        if (!registry.isActive(agentId)) revert AgentInactive();
        if (registry.ownerOf(agentId) != msg.sender) revert NotAgentOwner();

        offerNonce += 1;
        offerId = keccak256(
            abi.encode("LOGOS_OFFER", agentId, serviceTypeHash, schemaHash, offerNonce)
        );
        offers[offerId] = Offer({
            agentId: agentId,
            serviceTypeHash: serviceTypeHash,
            schemaHash: schemaHash,
            pricePerQuery: pricePerQuery,
            endpointURL: endpointURL,
            active: true
        });
        emit OfferPublished(offerId, agentId, serviceTypeHash, pricePerQuery, endpointURL);
    }

    function deactivateOffer(bytes32 offerId) external {
        Offer storage offer = offers[offerId];
        if (offer.agentId == bytes32(0)) revert OfferNotFound();
        if (registry.ownerOf(offer.agentId) != msg.sender) revert NotAgentOwner();
        offer.active = false;
        emit OfferDeactivated(offerId);
    }

    // ─── Queries ─────────────────────────────────────────────────────────

    function recordQuery(
        bytes32 offerId,
        bytes32 queryPayloadHash,
        bytes32 paymentAuthHash
    ) external returns (bytes32 queryId) {
        Offer storage offer = offers[offerId];
        if (offer.agentId == bytes32(0)) revert OfferNotFound();
        if (!offer.active) revert OfferInactive();

        queryNonce += 1;
        queryId = keccak256(
            abi.encode("LOGOS_QUERY", offerId, msg.sender, paymentAuthHash, queryNonce)
        );
        queries[queryId] = Query({
            trader: msg.sender,
            offerId: offerId,
            paymentAuthHash: paymentAuthHash,
            queryPayloadHash: queryPayloadHash,
            responseHash: bytes32(0),
            traceCID: bytes32(0),
            rating: 0,
            createdAt: uint64(block.timestamp),
            status: QueryStatus.Open
        });
        emit QueryRecorded(queryId, offerId, msg.sender, paymentAuthHash);
    }

    function attestResponse(
        bytes32 queryId,
        bytes32 responseHash,
        bytes32 traceCID,
        bytes calldata sig
    ) external {
        Query storage q = queries[queryId];
        if (q.status == QueryStatus.None) revert QueryNotFound();
        if (q.status != QueryStatus.Open) revert QueryNotOpen();

        Offer storage offer = offers[q.offerId];
        bytes32 digest = _attestDigest(queryId, responseHash, traceCID);
        address signer = digest.recover(sig);
        if (signer != registry.ownerOf(offer.agentId)) revert InvalidSignature();

        q.responseHash = responseHash;
        q.traceCID = traceCID;
        q.status = QueryStatus.Attested;
        emit ResponseAttested(queryId, responseHash, traceCID);
    }

    function rate(bytes32 queryId, uint8 score) external {
        Query storage q = queries[queryId];
        if (q.status == QueryStatus.None) revert QueryNotFound();
        if (q.status != QueryStatus.Attested) revert QueryNotAttested();
        if (q.trader != msg.sender) revert NotTrader();
        if (score < 1 || score > 5) revert InvalidRating();

        q.rating = score;
        q.status = QueryStatus.Rated;

        Offer storage offer = offers[q.offerId];
        reputation.updateReputation(offer.agentId, score);
        reputation.recordEarnings(offer.agentId, offer.pricePerQuery);
        emit ResponseRated(queryId, score);
    }

    function markExpired(bytes32 queryId) external {
        Query storage q = queries[queryId];
        if (q.status == QueryStatus.None) revert QueryNotFound();
        if (q.status != QueryStatus.Open) revert QueryNotOpen();
        if (block.timestamp < uint256(q.createdAt) + ATTEST_TIMEOUT) revert NotExpired();
        q.status = QueryStatus.Expired;
        emit QueryExpired(queryId);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getOffer(bytes32 offerId) external view returns (Offer memory) {
        return offers[offerId];
    }

    function getQuery(bytes32 queryId) external view returns (Query memory) {
        return queries[queryId];
    }

    /// Domain-separated attestation digest. Including `chainid` and
    /// `address(this)` blocks signature replay across forks and across any
    /// other Marketplace deployment that might exist on the same chain.
    function attestDigest(bytes32 queryId, bytes32 responseHash, bytes32 traceCID)
        external
        view
        returns (bytes32)
    {
        return _attestDigest(queryId, responseHash, traceCID);
    }

    function _attestDigest(bytes32 queryId, bytes32 responseHash, bytes32 traceCID)
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                "LOGOS_ATTEST_V1",
                block.chainid,
                address(this),
                queryId,
                responseHash,
                traceCID
            )
        ).toEthSignedMessageHash();
    }
}
