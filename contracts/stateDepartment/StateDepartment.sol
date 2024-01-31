// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

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

contract StateDepartment is Initializable, AccessControlUpgradeable {
    ICitizenshipToken public citizenshipToken;
    IVerifier public verifier;

    string public defaultURI;

    bool public isPaused;

    error NotEligibleForCitizenship();
    error CallerNotAdmin();

    event CitizenshipClaimed(address indexed user);
    event Paused(bool isPaused);

    function initialize(
        address _citizenshipTokenAddress,
        address _verifierAddress,
        string calldata _defaultURI,
        address _defaultAdmin
    ) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);

        citizenshipToken = ICitizenshipToken(_citizenshipTokenAddress);
        verifier = IVerifier(_verifierAddress);
        defaultURI = _defaultURI;
    }

    function togglePause() public {
        if(!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert CallerNotAdmin();
        isPaused = !isPaused;
        emit Paused(isPaused);
    }

    function claimCitizenship() public {
        if (!canClaimCitizenship(msg.sender)) revert NotEligibleForCitizenship();
        citizenshipToken.safeMint(msg.sender, defaultURI);
        emit CitizenshipClaimed(msg.sender);
    }

    function canClaimCitizenship(address _user) public view returns (bool) {
        string memory tokenSymbol = citizenshipToken.symbol();
        return verifier.isCountry(_user, tokenSymbol);
    }

}
