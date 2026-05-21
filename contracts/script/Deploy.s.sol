// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {Reputation} from "../src/Reputation.sol";

/// @notice Deploys AgentRegistry → Reputation → Marketplace, then wires the
///         Marketplace as Reputation's sole writer. Writes the addresses to
///         deployments/<chainId>.json so the indexer can load them.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        AgentRegistry registry = new AgentRegistry();
        Reputation reputation = new Reputation();
        Marketplace marketplace = new Marketplace(registry, reputation);
        reputation.setMarketplace(address(marketplace));

        vm.stopBroadcast();

        console2.log("AgentRegistry:", address(registry));
        console2.log("Reputation:   ", address(reputation));
        console2.log("Marketplace:  ", address(marketplace));

        _writeDeployment(address(registry), address(reputation), address(marketplace));
    }

    function _writeDeployment(address registry, address reputation, address marketplace)
        internal
    {
        string memory dir = "deployments";
        if (!vm.exists(dir)) vm.createDir(dir, true);
        string memory path = string.concat(
            dir, "/", vm.toString(block.chainid), ".json"
        );
        string memory body = string.concat(
            "{\n",
            '  "chainId": ', vm.toString(block.chainid), ",\n",
            '  "AgentRegistry": "', vm.toString(registry), '",\n',
            '  "Reputation": "', vm.toString(reputation), '",\n',
            '  "Marketplace": "', vm.toString(marketplace), '"\n',
            "}\n"
        );
        vm.writeFile(path, body);
        console2.log("wrote", path);
    }
}
