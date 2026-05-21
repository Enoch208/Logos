// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AgentRegistry
/// @notice bytes32 → agent identity, owned by an Arc wallet. The marketplace
///         and reputation modules look agents up here. No USDC; no signing;
///         pure record-keeping.
contract AgentRegistry {
    struct AgentInfo {
        address owner;
        string metadataURI;
        uint64 registeredAt;
        bool active;
    }

    mapping(bytes32 => AgentInfo) private _agents;

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string metadataURI);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentReactivated(bytes32 indexed agentId);

    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error NotAgentOwner();
    error EmptyAgentId();

    function register(bytes32 agentId, string calldata metadataURI) external {
        if (agentId == bytes32(0)) revert EmptyAgentId();
        AgentInfo storage existing = _agents[agentId];
        if (existing.registeredAt != 0) revert AgentAlreadyRegistered();

        _agents[agentId] = AgentInfo({
            owner: msg.sender,
            metadataURI: metadataURI,
            registeredAt: uint64(block.timestamp),
            active: true
        });
        emit AgentRegistered(agentId, msg.sender, metadataURI);
    }

    function deactivate(bytes32 agentId) external {
        AgentInfo storage info = _agents[agentId];
        if (info.registeredAt == 0) revert AgentNotRegistered();
        if (info.owner != msg.sender) revert NotAgentOwner();
        info.active = false;
        emit AgentDeactivated(agentId);
    }

    function reactivate(bytes32 agentId) external {
        AgentInfo storage info = _agents[agentId];
        if (info.registeredAt == 0) revert AgentNotRegistered();
        if (info.owner != msg.sender) revert NotAgentOwner();
        info.active = true;
        emit AgentReactivated(agentId);
    }

    function lookup(bytes32 agentId) external view returns (AgentInfo memory) {
        return _agents[agentId];
    }

    function isActive(bytes32 agentId) external view returns (bool) {
        AgentInfo storage info = _agents[agentId];
        return info.registeredAt != 0 && info.active;
    }

    function ownerOf(bytes32 agentId) external view returns (address) {
        return _agents[agentId].owner;
    }
}
