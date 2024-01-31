// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Citizenship is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    ERC721PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable,
    EIP712Upgradeable,
    ERC721VotesUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ENABLE_TRANSFER_ROLE = keccak256("ENABLE_TRANSFER_ROLE");
    bytes32 public constant ENABLE_BURNING_ROLE = keccak256("ENABLE_BURNING_ROLE");

    uint256 private _nextTokenId;

    // Global state variables for all tokens
    bool private _isTransferable;
    bool private _isBurnable;

    // Event for toggling transferability and burnability of all tokens
    event TransferabilityToggled(bool transferable);
    event BurnabilityToggled(bool burnable);

    error TokenNonTransferable();
    error TokenNonBurnable();
    error CallerDoesNotHavePauserRole();
    error CallerDoesNotHaveTransferEnableRole();
    error CallerDoesNotHavePermission();
    error BurningTokensIsDisabled();

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialAuthority,
        string calldata tokenName,
        string calldata tokenSymbol
    ) public initializer {
        __ERC721_init(tokenName, tokenSymbol);
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __ERC721Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();
        __EIP712_init(tokenName, "1");
        __ERC721Votes_init();

        _grantRole(DEFAULT_ADMIN_ROLE, initialAuthority);
        _grantRole(PAUSER_ROLE, initialAuthority);
        _grantRole(MINTER_ROLE, initialAuthority);
        _grantRole(ENABLE_TRANSFER_ROLE, initialAuthority);
        _grantRole(ENABLE_BURNING_ROLE, initialAuthority);
    }

    function pause() public {
        if (!hasRole(PAUSER_ROLE, _msgSender())) revert CallerDoesNotHavePauserRole();
        _pause();
    }

    function unpause() public {
        if (!hasRole(PAUSER_ROLE, _msgSender())) revert CallerDoesNotHavePauserRole();
        _unpause();
    }

    function toggleTransferability(bool transferable) public {
        if (!hasRole(ENABLE_TRANSFER_ROLE, _msgSender())) revert CallerDoesNotHaveTransferEnableRole();
        _isTransferable = transferable;
        emit TransferabilityToggled(transferable);
    }

    function toggleBurnability(bool burnable) public {
        if (!hasRole(ENABLE_BURNING_ROLE, _msgSender())) revert CallerDoesNotHaveTransferEnableRole();
        _isBurnable = burnable;
        emit BurnabilityToggled(burnable);
    }

    function safeMint(address to, string memory uri) public {
        if (!hasRole(MINTER_ROLE, _msgSender())) revert CallerDoesNotHavePermission();

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // Function to burn a token
    function burnToken(uint256 tokenId) public {
        if (!_isBurnable) revert BurningTokensIsDisabled();
        if (!(getApproved(tokenId) == _msgSender())) revert CallerDoesNotHavePermission();

        _burn(tokenId);
    }

    // The following functions are overrides required by Solidity.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable, ERC721VotesUpgradeable)
        returns (address)
    {
        if (!_isTransferable && auth != address(0)) revert TokenNonTransferable();
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721VotesUpgradeable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
