// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Citizenship.sol";

contract CitizenshipWithRegistry is Citizenship {
    mapping(address => bool) public allowlistedDestination;
    address[] public currentAllowListedDestinations;

    bytes32 public constant ALLOWLIST_MANAGER_ROLE = keccak256("ALLOWLIST_MANAGER_ROLE");

    event AllowlistUpdated(address indexed destination, bool allowlisted);

    error AddressesAndStatusesLengthMismatch();

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

// todo: add test for this function
    function addAllowListItem(address item) public {
        if (!hasRole(ALLOWLIST_MANAGER_ROLE, _msgSender())) revert CallerDoesNotHavePermission();
        allowlistedDestination[item] = true;
        currentAllowListedDestinations.push(item); // todo: this could make the array messy
        emit AllowlistUpdated(item, true);
    }

    function updateAllowlist(address[] calldata addresses, bool[] calldata statuses) public {
        if (!hasRole(ALLOWLIST_MANAGER_ROLE, _msgSender())) revert CallerDoesNotHavePermission();
        if (addresses.length != statuses.length) revert AddressesAndStatusesLengthMismatch();

        // Step 1: Initialize a fixed-size memory array
        address[] memory tempAddresses = new address[](addresses.length);
        uint count = 0;

        for (uint i = 0; i < addresses.length; i++) {
            allowlistedDestination[addresses[i]] = statuses[i];
            // Step 2: Use the counter to track and add true status addresses
            if (statuses[i]) {
                tempAddresses[count] = addresses[i];
                count++;
            }
            emit AllowlistUpdated(addresses[i], statuses[i]);
        }

        // Step 3: Copy to a new memory array of correct size before assignment
        address[] memory finalAddresses = new address[](count);
        for (uint i = 0; i < count; i++) {
            finalAddresses[i] = tempAddresses[i];
        }

        currentAllowListedDestinations = finalAddresses;
    }

    // Checks if a destination is allowlisted
    function isAllowlistedDestination(address to) public view returns (bool) {
        return allowlistedDestination[to];
    }

    function _beforeTokenUpdate(address to, uint256 tokenId, address auth) internal view override(Citizenship) {
        // If it's being minted, it's allowed
        if (auth == address(0)) {
            return;
        }

        // If it's not being minted, it's only allowed if it's transferable or the destination is allowlisted
        if (!_isTransferable && !allowlistedDestination[to]) {
            revert TokenNonTransferable();
        }
    }
}
