// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry internal registry;
    address internal sophia = address(0xA11CE);
    address internal theo = address(0xB0B);
    bytes32 internal constant AGENT_ID = bytes32(uint256(0xC0DE));

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_register_storesAgentInfo() public {
        vm.prank(sophia);
        registry.register(AGENT_ID, "ipfs://meta");

        AgentRegistry.AgentInfo memory info = registry.lookup(AGENT_ID);
        assertEq(info.owner, sophia);
        assertEq(info.metadataURI, "ipfs://meta");
        assertTrue(info.active);
        assertEq(uint256(info.registeredAt), block.timestamp);
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit AgentRegistry.AgentRegistered(AGENT_ID, sophia, "ipfs://meta");
        vm.prank(sophia);
        registry.register(AGENT_ID, "ipfs://meta");
    }

    function test_register_rejectsDuplicateAgent() public {
        vm.prank(sophia);
        registry.register(AGENT_ID, "ipfs://meta");

        vm.expectRevert(AgentRegistry.AgentAlreadyRegistered.selector);
        vm.prank(theo);
        registry.register(AGENT_ID, "ipfs://other");
    }

    function test_register_rejectsZeroId() public {
        vm.expectRevert(AgentRegistry.EmptyAgentId.selector);
        vm.prank(sophia);
        registry.register(bytes32(0), "ipfs://meta");
    }

    function test_deactivate_onlyOwner() public {
        vm.prank(sophia);
        registry.register(AGENT_ID, "ipfs://meta");

        vm.expectRevert(AgentRegistry.NotAgentOwner.selector);
        vm.prank(theo);
        registry.deactivate(AGENT_ID);

        vm.prank(sophia);
        registry.deactivate(AGENT_ID);
        assertFalse(registry.isActive(AGENT_ID));
    }

    function test_reactivate_flipsBack() public {
        vm.startPrank(sophia);
        registry.register(AGENT_ID, "ipfs://meta");
        registry.deactivate(AGENT_ID);
        assertFalse(registry.isActive(AGENT_ID));
        registry.reactivate(AGENT_ID);
        assertTrue(registry.isActive(AGENT_ID));
        vm.stopPrank();
    }

    function test_isActive_falseForUnregistered() public view {
        assertFalse(registry.isActive(AGENT_ID));
    }

    function test_ownerOf_zeroForUnregistered() public view {
        assertEq(registry.ownerOf(AGENT_ID), address(0));
    }

    function testFuzz_register_anyId(bytes32 id, address owner) public {
        vm.assume(id != bytes32(0));
        vm.assume(owner != address(0));
        vm.prank(owner);
        registry.register(id, "ipfs://meta");
        assertEq(registry.ownerOf(id), owner);
        assertTrue(registry.isActive(id));
    }
}
