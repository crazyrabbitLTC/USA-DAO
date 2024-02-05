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
    bytes32 public constant URI_UPDATE_ROLE = keccak256("URI_UPDATE_ROLE");
    bytes32 public constant ENABLE_TRANSFER_ROLE = keccak256("ENABLE_TRANSFER_ROLE");
    bytes32 public constant ENABLE_BURNING_ROLE = keccak256("ENABLE_BURNING_ROLE");

    uint256 private _nextTokenId;

    // Global state variables for all tokens
    bool public _isTransferable;
    bool public _isBurnable;

    // custom URIs
    mapping(uint256 => string) private _customTokenURIs;

    // Event for toggling transferability and burnability of all tokens
    event TransferabilityToggled(bool transferable);
    event BurnabilityToggled(bool burnable);
    event TokenURIUpdated(uint256 indexed tokenId, string tokenURI, address owner);

    error TokenNonTransferable();
    error TokenNonBurnable();
    error CallerDoesNotHavePauserRole();
    error CallerDoesNotHaveTransferEnableRole();
    error CallerDoesNotHavePermission();
    error BurningTokensIsDisabled();
    error InvalidTokenId();

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialAuthority,
        string calldata tokenName,
        string calldata tokenSymbol
    ) public virtual initializer {
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
        _grantRole(URI_UPDATE_ROLE, initialAuthority);
    }

    function __initialize(
        address initialAuthority,
        string calldata tokenName,
        string calldata tokenSymbol
    ) public virtual onlyInitializing {
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
        _grantRole(URI_UPDATE_ROLE, initialAuthority);
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

    function setTokenURI(uint256 tokenId, string memory uri) public {
        if (!hasRole(URI_UPDATE_ROLE, _msgSender())) revert CallerDoesNotHavePermission();
        if (ownerOf(tokenId) == address(0)) revert InvalidTokenId();

        _customTokenURIs[tokenId] = uri;

        emit TokenURIUpdated(tokenId, uri, ownerOf(tokenId));
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        //if a custom uri has been set, return that URI
        if (bytes(_customTokenURIs[tokenId]).length > 0) return _customTokenURIs[tokenId];

        return super.tokenURI(tokenId);
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

    function _beforeTokenUpdate(address to, uint256 tokenId, address auth) internal virtual {
        // Block execution if the token is non-transferable and the token is not being minted (auth == address(0)) or going to an allowlisted address
        if (!_isTransferable && auth != address(0)) revert TokenNonTransferable();
    }

    // The following functions are overrides required by Solidity.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        virtual
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable, ERC721VotesUpgradeable)
        returns (address)
    {
        _beforeTokenUpdate(to, tokenId, auth); // allow for extending the update behavior

        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721VotesUpgradeable) {
        super._increaseBalance(account, value);
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
