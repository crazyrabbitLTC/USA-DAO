// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Citizenship.sol";

contract CitizenshipWithRegistry is Citizenship {
    mapping(address => bool) public allowlistedDestination;

    bytes32 public constant ALLOWLIST_MANAGER_ROLE = keccak256("ALLOWLIST_MANAGER_ROLE");

    event AllowlistUpdated(address indexed destination, bool allowlisted);

    // Initializes the contract, sets up initial allowlisted destinations, and configures roles
    function initialize(
        address initialAuthority,
        string calldata tokenName,
        string calldata tokenSymbol,
        address[] calldata initialAllowlistedAddresses
    ) public initializer {
        Citizenship.__initialize(initialAuthority, tokenName, tokenSymbol);
        // Setup initial allowlisted addresses
        for (uint i = 0; i < initialAllowlistedAddresses.length; i++) {
            allowlistedDestination[initialAllowlistedAddresses[i]] = true;
            emit AllowlistUpdated(initialAllowlistedAddresses[i], true);
        }
        // Setup roles
        _grantRole(ALLOWLIST_MANAGER_ROLE, initialAuthority);
    }

    // Batch updates the allowlist status of addresses
    function updateAllowlist(address[] calldata addresses, bool[] calldata statuses) public {
        require(hasRole(ALLOWLIST_MANAGER_ROLE, msg.sender), "Caller is not authorized");
        require(addresses.length == statuses.length, "Addresses and statuses length mismatch");

        for (uint i = 0; i < addresses.length; i++) {
            allowlistedDestination[addresses[i]] = statuses[i];
            emit AllowlistUpdated(addresses[i], statuses[i]);
        }
    }

    // Checks if a destination is allowlisted
    function isAllowlistedDestination(address to) public view returns (bool) {
        return allowlistedDestination[to];
    }

    function _beforeTokenUpdate(address to, uint256 tokenId, address auth) view internal override(Citizenship) {
        // Check if the token is non-transferable. In such case, it should either be minting (auth == address(0))
        // or going to an allowlisted address. If not, revert.
        if (!Citizenship._isTransferable && !allowlistedDestination[to] && auth != address(0)) {
            revert TokenNonTransferable();
        }
    }
}
