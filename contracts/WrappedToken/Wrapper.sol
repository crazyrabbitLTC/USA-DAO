// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721WrapperUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

// Voter Registration contract tracks if a user is registered to vote in an election DAO (Federal, State, Local or Otherwise)
// This works by wrapping a USA DAO token with the ERC721WrapperUpgradeable contract for a token that represents the juristiction they want to take part in

contract VoterRegistration is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    ERC721PausableUpgradeable,
    ERC721WrapperUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable,
    ERC721VotesUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant URI_UPDATE_ROLE = keccak256("URI_UPDATE_ROLE");
    bytes32 public constant ENABLE_TRANSFER_ROLE = keccak256("ENABLE_TRANSFER_ROLE");
    bytes32 public constant ALLOWLIST_MANAGER_ROLE = keccak256("ALLOWLIST_MANAGER_ROLE");

    uint256 private _nextTokenId;

    // Global state variables for all tokens
    bool private _isTransferable;
    bool private _isBurnable;

    // Allowlisted destinations
    mapping(address => bool) public allowlistedDestination;

    // custom URIs
    mapping(uint256 => string) private _customTokenURIs;

    // Event for toggling transferability and burnability of all tokens
    event TransferabilityToggled(bool transferable);
    event BurnabilityToggled(bool burnable);
    event TokenURIUpdated(uint256 indexed tokenId, string tokenURI, address owner);
    event AllowlistUpdated(address indexed destination, bool allowlisted);

    error TokenNonTransferable();
    error TokenNonBurnable();
    error CallerDoesNotHavePauserRole();
    error CallerDoesNotHaveTransferEnableRole();
    error CallerDoesNotHavePermission();
    error BurningTokensIsDisabled();
    error InvalidTokenId();
    error AddressesAndStatusesLengthMismatch();


    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialAuthority,
        string calldata tokenName,
        string calldata tokenSymbol,
        IERC721 underlyingToken
    ) public initializer {
        __ERC721_init(tokenName, tokenSymbol);
        __ERC721Enumerable_init();
        __ERC721Wrapper_init(underlyingToken);
        __ERC721URIStorage_init();
        __ERC721Pausable_init();
        __AccessControl_init();
        __EIP712_init(tokenName, "1");
        __ERC721Votes_init();

        _grantRole(DEFAULT_ADMIN_ROLE, initialAuthority);
        _grantRole(PAUSER_ROLE, initialAuthority);
        _grantRole(ENABLE_TRANSFER_ROLE, initialAuthority);
        _grantRole(URI_UPDATE_ROLE, initialAuthority);
        _grantRole(ALLOWLIST_MANAGER_ROLE, initialAuthority);
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

    // Batch updates the allowlist status of addresses
    function updateAllowlist(address[] calldata addresses, bool[] calldata statuses) public {
        if (!hasRole(ALLOWLIST_MANAGER_ROLE, _msgSender())) revert CallerDoesNotHavePermission();
        if (addresses.length != statuses.length) revert AddressesAndStatusesLengthMismatch();

        for (uint i = 0; i < addresses.length; i++) {
            allowlistedDestination[addresses[i]] = statuses[i];
            emit AllowlistUpdated(addresses[i], statuses[i]);
        }
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
      if (!_isTransferable && !allowlistedDestination[to] && auth != address(0)) {
            revert TokenNonTransferable();
        }
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
