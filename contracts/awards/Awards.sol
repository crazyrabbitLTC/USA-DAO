// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @custom:security-contact dennison@dennisonbertram.com
contract MyToken is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    ERC1155PausableUpgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155SupplyUpgradeable
{
    bytes32 public constant URI_UPDATE_ROLE = keccak256("URI_UPDATE_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ENABLE_TRANSFER_ROLE = keccak256("ENABLE_TRANSFER_ROLE");
    bytes32 public constant ALLOWLIST_MANAGER_ROLE = keccak256("ALLOWLIST_MANAGER_ROLE");

    error TokenNonTransferable();
    error CallerDoesNotHavePermission();
    error AddressesAndStatusesLengthMismatch();

    event TransferabilityToggled(bool transferable);
    event AllowlistUpdated(address indexed destination, bool allowlisted);

    bool private _isTransferable;

    // Allowlisted destinations
    mapping(address => bool) public allowlistedDestination;

    // custom URIs
    mapping(uint256 => string) private _customTokenURIs;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address defaultAdmin, address pauser, address minter, string memory uri) public initializer {
        __ERC1155_init(uri);
        __AccessControl_init();
        __ERC1155Pausable_init();
        __ERC1155Burnable_init();
        __ERC1155Supply_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MINTER_ROLE, minter);
    }

    function setURI(string memory newuri) public onlyRole(URI_UPDATE_ROLE) {
        _setURI(newuri);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data) public onlyRole(MINTER_ROLE) {
        _mint(account, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        _mintBatch(to, ids, amounts, data);
    }

    function toggleTransferability(bool transferable) public {
        if (!hasRole(ENABLE_TRANSFER_ROLE, _msgSender())) revert CallerDoesNotHavePermission();
        _isTransferable = transferable;
        emit TransferabilityToggled(transferable);
    }

    // Batch updates the allowlist status of addresses
    function updateAllowlist(address[] calldata addresses, bool[] calldata statuses) public {
        if (!hasRole(ALLOWLIST_MANAGER_ROLE, _msgSender())) revert CallerDoesNotHavePermission();
        if (addresses.length != statuses.length) revert AddressesAndStatusesLengthMismatch();

        for (uint i = 0; i < addresses.length; i++) {
            allowlistedDestination[addresses[i]] = statuses[i];
            emit AllowlistUpdated(addresses[i], statuses[i]);
        }
    }

    function _beforeUpdate(address from, address to, uint256[] memory ids, uint256[] memory values) internal view {
        // if it's being minted, it's allowed
        if (from == address(0)) {
            return;
        }

        // If it's not being minted, it's only allowed if it's transferable or the destination is allowlisted
        if (!_isTransferable && !allowlistedDestination[to]) {
            revert TokenNonTransferable();
        }

        // if it's some weird other state, revert
        revert TokenNonTransferable();
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155Upgradeable, ERC1155PausableUpgradeable, ERC1155SupplyUpgradeable) {
        _beforeUpdate(from, to, ids, values);
        super._update(from, to, ids, values);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
