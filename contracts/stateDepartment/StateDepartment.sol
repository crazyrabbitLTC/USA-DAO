// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVerifier {
    /// @notice Checks if the attestation data for a given address matches a specific country symbol
    /// @param _address Address to check the attestation data for
    /// @param _twoLetterCountrySymbol Two-letter country symbol to compare against
    /// @return Boolean indicating whether the attestation data matches the country symbol
    function isCountry(address _address, string memory _twoLetterCountrySymbol) external view returns (bool);
}

interface ICitizenshipToken {
    /// @notice Mints a new token to the specified address with the provided URI,
    ///         requires the caller to have the MINTER_ROLE.
    /// @param to The address to mint the token to.
    /// @param uri The URI for the token metadata.
    function safeMint(address to, string calldata uri) external;

    function symbol() external view returns (string memory);
}

contract StateDepartment is Initializable, AccessControlUpgradeable, ReentrancyGuard {
    ICitizenshipToken public citizenshipToken;
    IVerifier public verifier;

    string public defaultURI;

    bool public isPaused;

    bytes32 public constant VERIFIER_UPDATE_ROLE = keccak256("VERIFIER_UPDATE_ROLE");

    error NotEligibleForCitizenship();
    error AlreadyClaimedCitizenship();
    error CallerNotAdmin();
    error ContractPaused();

    event CitizenshipClaimed(address indexed user);
    event Paused(bool isPaused);
    event VerifierUpdated(address indexed newVerifier);

    mapping(address => bool) public citizenshipClaimed;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _citizenshipTokenAddress,
        address _verifierAddress,
        string calldata _defaultURI,
        address _defaultAdmin
    ) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(VERIFIER_UPDATE_ROLE, _defaultAdmin);

        citizenshipToken = ICitizenshipToken(_citizenshipTokenAddress);
        verifier = IVerifier(_verifierAddress);
        defaultURI = _defaultURI;
        emit VerifierUpdated(_verifierAddress);
    }

    function togglePause() public {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert CallerNotAdmin();
        isPaused = !isPaused;
        emit Paused(isPaused);
    }

    function claimCitizenship() public nonReentrant {
        if (isPaused) revert ContractPaused();
        if (!canClaimCitizenship(msg.sender)) revert NotEligibleForCitizenship();
        if (citizenshipClaimed[msg.sender]) revert AlreadyClaimedCitizenship();

        citizenshipClaimed[msg.sender] = true; // prevent reentrancy

        citizenshipToken.safeMint(msg.sender, defaultURI);
        emit CitizenshipClaimed(msg.sender);
    }

    function canClaimCitizenship(address _user) public view returns (bool) {
        string memory tokenSymbol = citizenshipToken.symbol();
        return verifier.isCountry(_user, tokenSymbol);
    }

    function updateVerifier(address _verifierAddress) public {
        if (!hasRole(VERIFIER_UPDATE_ROLE, msg.sender)) revert CallerNotAdmin();
        verifier = IVerifier(_verifierAddress);
        emit VerifierUpdated(_verifierAddress);
    }
}
