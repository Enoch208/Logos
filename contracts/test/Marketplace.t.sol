// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {Reputation} from "../src/Reputation.sol";

contract MarketplaceTest is Test {
    AgentRegistry internal registry;
    Reputation internal reputation;
    Marketplace internal market;

    uint256 internal specialistPk = 0xA11CE;
    address internal specialist;
    address internal trader = address(0xB0B);
    address internal stranger = address(0xC0DE);

    bytes32 internal constant AGENT_ID = bytes32(uint256(0xCAFE));
    bytes32 internal constant SERVICE = keccak256("translation");
    bytes32 internal constant SCHEMA = keccak256("schema-v1");

    function setUp() public {
        specialist = vm.addr(specialistPk);
        registry = new AgentRegistry();
        reputation = new Reputation();
        market = new Marketplace(registry, reputation);
        reputation.setMarketplace(address(market));

        vm.prank(specialist);
        registry.register(AGENT_ID, "ipfs://specialist");
    }

    function _publishOffer() internal returns (bytes32) {
        vm.prank(specialist);
        return market.publishOffer(AGENT_ID, SERVICE, SCHEMA, 150, "https://specialist.example/run");
    }

    function _recordQuery(bytes32 offerId) internal returns (bytes32) {
        vm.prank(trader);
        return market.recordQuery(offerId, keccak256("payload"), keccak256("payment-auth"));
    }

    function _attest(bytes32 queryId, bytes32 responseHash, bytes32 traceCid) internal {
        bytes32 digest = market.attestDigest(queryId, responseHash, traceCid);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(specialistPk, digest);
        market.attestResponse(queryId, responseHash, traceCid, abi.encodePacked(r, s, v));
    }

    // ─── Offers ──────────────────────────────────────────────────────────

    function test_publishOffer_storesAndEmits() public {
        bytes32 offerId = _publishOffer();
        Marketplace.Offer memory o = market.getOffer(offerId);
        assertEq(o.agentId, AGENT_ID);
        assertEq(o.serviceTypeHash, SERVICE);
        assertEq(o.pricePerQuery, 150);
        assertTrue(o.active);
    }

    function test_publishOffer_rejectsInactiveAgent() public {
        vm.prank(specialist);
        registry.deactivate(AGENT_ID);
        vm.expectRevert(Marketplace.AgentInactive.selector);
        vm.prank(specialist);
        market.publishOffer(AGENT_ID, SERVICE, SCHEMA, 150, "");
    }

    function test_publishOffer_rejectsNonOwner() public {
        vm.expectRevert(Marketplace.NotAgentOwner.selector);
        vm.prank(stranger);
        market.publishOffer(AGENT_ID, SERVICE, SCHEMA, 150, "");
    }

    function test_publishOffer_uniqueIdsPerNonce() public {
        bytes32 a = _publishOffer();
        bytes32 b = _publishOffer();
        assertTrue(a != b);
    }

    function test_deactivateOffer_flipsInactive() public {
        bytes32 offerId = _publishOffer();
        vm.prank(specialist);
        market.deactivateOffer(offerId);
        assertFalse(market.getOffer(offerId).active);
    }

    // ─── Queries ─────────────────────────────────────────────────────────

    function test_recordQuery_storesOpen() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        Marketplace.Query memory q = market.getQuery(queryId);
        assertEq(uint8(q.status), uint8(Marketplace.QueryStatus.Open));
        assertEq(q.trader, trader);
        assertEq(q.offerId, offerId);
    }

    function test_recordQuery_rejectsInactiveOffer() public {
        bytes32 offerId = _publishOffer();
        vm.prank(specialist);
        market.deactivateOffer(offerId);
        vm.expectRevert(Marketplace.OfferInactive.selector);
        vm.prank(trader);
        market.recordQuery(offerId, keccak256("p"), keccak256("a"));
    }

    function test_recordQuery_rejectsMissingOffer() public {
        vm.expectRevert(Marketplace.OfferNotFound.selector);
        vm.prank(trader);
        market.recordQuery(bytes32(uint256(0xBAD)), keccak256("p"), keccak256("a"));
    }

    // ─── Attestation ─────────────────────────────────────────────────────

    function test_attestResponse_validSigAdvancesStatus() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        bytes32 responseHash = keccak256("response");
        bytes32 traceCid = keccak256("trace");

        _attest(queryId, responseHash, traceCid);

        Marketplace.Query memory q = market.getQuery(queryId);
        assertEq(uint8(q.status), uint8(Marketplace.QueryStatus.Attested));
        assertEq(q.responseHash, responseHash);
        assertEq(q.traceCID, traceCid);
    }

    function test_attestResponse_rejectsBadSigner() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);

        uint256 wrongPk = 0xBADC0DE;
        bytes32 digest = market.attestDigest(queryId, keccak256("r"), keccak256("t"));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPk, digest);
        vm.expectRevert(Marketplace.InvalidSignature.selector);
        market.attestResponse(queryId, keccak256("r"), keccak256("t"), abi.encodePacked(r, s, v));
    }

    function test_attestResponse_rejectsCrossChainReplay() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        bytes32 responseHash = keccak256("response");
        bytes32 traceCid = keccak256("trace");

        // Build a digest as if we were signing for chainid 9999 — i.e. what
        // an attacker could have captured from a parallel deployment.
        bytes32 inner = keccak256(
            abi.encode(
                "LOGOS_ATTEST_V1",
                uint256(9999),
                address(market),
                queryId,
                responseHash,
                traceCid
            )
        );
        bytes32 wrongDigest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", inner)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(specialistPk, wrongDigest);
        vm.expectRevert(Marketplace.InvalidSignature.selector);
        market.attestResponse(queryId, responseHash, traceCid, abi.encodePacked(r, s, v));
    }

    function test_attestResponse_rejectsDoubleAttest() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        _attest(queryId, keccak256("r"), keccak256("t"));

        // Pre-compute digest so vm.expectRevert lines up with attestResponse,
        // not the view call inside the _attest helper.
        bytes32 digest = market.attestDigest(queryId, keccak256("r"), keccak256("t"));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(specialistPk, digest);
        vm.expectRevert(Marketplace.QueryNotOpen.selector);
        market.attestResponse(queryId, keccak256("r"), keccak256("t"), abi.encodePacked(r, s, v));
    }

    // ─── Rating ──────────────────────────────────────────────────────────

    function test_rate_advancesStatusAndUpdatesReputation() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        _attest(queryId, keccak256("r"), keccak256("t"));

        vm.prank(trader);
        market.rate(queryId, 5);

        Marketplace.Query memory q = market.getQuery(queryId);
        assertEq(uint8(q.status), uint8(Marketplace.QueryStatus.Rated));
        assertEq(q.rating, 5);
        assertGt(reputation.reputationFP18(AGENT_ID), 0);
        assertEq(reputation.totalUSDCEarned(AGENT_ID), 150);
    }

    function test_rate_rejectsNonTrader() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        _attest(queryId, keccak256("r"), keccak256("t"));

        vm.expectRevert(Marketplace.NotTrader.selector);
        vm.prank(stranger);
        market.rate(queryId, 5);
    }

    function test_rate_rejectsBeforeAttestation() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        vm.expectRevert(Marketplace.QueryNotAttested.selector);
        vm.prank(trader);
        market.rate(queryId, 5);
    }

    function test_rate_rejectsOutOfRange() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        _attest(queryId, keccak256("r"), keccak256("t"));

        vm.expectRevert(Marketplace.InvalidRating.selector);
        vm.prank(trader);
        market.rate(queryId, 0);

        vm.expectRevert(Marketplace.InvalidRating.selector);
        vm.prank(trader);
        market.rate(queryId, 6);
    }

    // ─── Expiry ──────────────────────────────────────────────────────────

    function test_markExpired_afterTimeoutFlipsStatus() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);

        vm.warp(block.timestamp + 6 minutes);
        market.markExpired(queryId);
        assertEq(uint8(market.getQuery(queryId).status), uint8(Marketplace.QueryStatus.Expired));
    }

    function test_markExpired_rejectsBeforeTimeout() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        vm.expectRevert(Marketplace.NotExpired.selector);
        market.markExpired(queryId);
    }

    function test_markExpired_rejectsAttested() public {
        bytes32 offerId = _publishOffer();
        bytes32 queryId = _recordQuery(offerId);
        _attest(queryId, keccak256("r"), keccak256("t"));
        vm.warp(block.timestamp + 6 minutes);
        vm.expectRevert(Marketplace.QueryNotOpen.selector);
        market.markExpired(queryId);
    }
}
