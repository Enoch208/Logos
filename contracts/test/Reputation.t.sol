// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Reputation} from "../src/Reputation.sol";

contract ReputationTest is Test {
    Reputation internal reputation;
    address internal admin = address(this);
    address internal marketplace = address(0xBEEF);
    address internal stranger = address(0xDEAD);
    bytes32 internal constant AGENT = bytes32(uint256(0xA1));

    function setUp() public {
        reputation = new Reputation();
        reputation.setMarketplace(marketplace);
    }

    function test_setMarketplace_onlyAdmin() public {
        Reputation rep = new Reputation();
        vm.expectRevert(Reputation.NotAdmin.selector);
        vm.prank(stranger);
        rep.setMarketplace(marketplace);
    }

    function test_setMarketplace_oneShot() public {
        vm.expectRevert(Reputation.MarketplaceAlreadySet.selector);
        reputation.setMarketplace(address(0x1234));
    }

    function test_updateReputation_rejectsNonMarketplace() public {
        vm.expectRevert(Reputation.NotMarketplace.selector);
        vm.prank(stranger);
        reputation.updateReputation(AGENT, 5);
    }

    function test_updateReputation_rejectsInvalidRating() public {
        vm.prank(marketplace);
        vm.expectRevert(Reputation.InvalidRating.selector);
        reputation.updateReputation(AGENT, 0);

        vm.prank(marketplace);
        vm.expectRevert(Reputation.InvalidRating.selector);
        reputation.updateReputation(AGENT, 6);
    }

    function test_updateReputation_firstSamplePullsToward10() public {
        vm.prank(marketplace);
        reputation.updateReputation(AGENT, 5);
        // sample = 10e18, alpha = 0.01, current = 0
        // new = 0 + 0.01 * (10e18 - 0) = 0.1e18
        assertEq(reputation.reputationFP18(AGENT), 0.1e18);
        assertEq(reputation.totalQueriesServed(AGENT), 1);
    }

    function test_updateReputation_convergesUpward() public {
        // 100 perfect ratings should pull EMA close to 10e18 (~63%).
        for (uint256 i = 0; i < 100; i++) {
            vm.prank(marketplace);
            reputation.updateReputation(AGENT, 5);
        }
        uint256 rep = reputation.reputationFP18(AGENT);
        assertGt(rep, 6e18);
        assertLe(rep, 10e18);
        assertEq(reputation.totalQueriesServed(AGENT), 100);
    }

    function test_updateReputation_capsAtMax() public {
        // Saturate well past the boundary.
        for (uint256 i = 0; i < 5000; i++) {
            vm.prank(marketplace);
            reputation.updateReputation(AGENT, 5);
        }
        assertLe(reputation.reputationFP18(AGENT), 10e18);
    }

    function test_updateReputation_downSampleDecreases() public {
        for (uint256 i = 0; i < 50; i++) {
            vm.prank(marketplace);
            reputation.updateReputation(AGENT, 5);
        }
        uint256 before = reputation.reputationFP18(AGENT);
        // rating 1 → sample 0 → EMA shrinks
        vm.prank(marketplace);
        reputation.updateReputation(AGENT, 1);
        assertLt(reputation.reputationFP18(AGENT), before);
    }

    function test_recordEarnings_accumulates() public {
        vm.prank(marketplace);
        reputation.recordEarnings(AGENT, 100);
        vm.prank(marketplace);
        reputation.recordEarnings(AGENT, 50);
        assertEq(reputation.totalUSDCEarned(AGENT), 150);
    }
}
