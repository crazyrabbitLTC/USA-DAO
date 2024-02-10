// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CountryCodes.sol";

contract CountryCodeManager is CountryCodes {

    constructor(address defaultAdmin) CountryCodes(defaultAdmin) {
    }



}
