// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CountryCodes is AccessControl {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    struct Country {
        string name;
        string abbreviation;
    }

    mapping(string => string) private countryCodes;

    error InvalidCountryCodeLength();
    error CallerNotAuthorized();

    event CountryCodeAdded(string countryCode, string countryName);

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(UPDATER_ROLE, defaultAdmin);
    }

    function addCountryCode(Country[] memory country) public {
        if (!hasRole(UPDATER_ROLE, msg.sender)) revert CallerNotAuthorized();
        _addCountryCode(country);
    }

    function _addCountryCode(Country[] memory country) internal {
        for (uint256 i = 0; i < country.length; i++) {
            if (!_validateCountryCode(country[i].abbreviation)) revert InvalidCountryCodeLength();
            countryCodes[country[i].abbreviation] = country[i].name;
            emit CountryCodeAdded(country[i].abbreviation, country[i].name);
        }
    }

    function getCountryName(string memory countryCode) public view returns (string memory) {
        if (!_validateCountryCode(countryCode)) revert InvalidCountryCodeLength();
        if (bytes(countryCodes[countryCode]).length == 0) revert InvalidCountryCodeLength();
        return countryCodes[countryCode];
    }

    function _validateCountryCode(string memory countryCode) internal pure returns (bool) {
        return bytes(countryCode).length == 2;
    }
}
