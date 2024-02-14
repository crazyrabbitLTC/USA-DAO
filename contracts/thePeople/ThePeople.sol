// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../citizenship/CitizenshipWithRegistry.sol";
import "../awards/Awards.sol";
import "../commemorativeEdition/CommemorativeEdition.sol";
import "../stateDepartment/StateDepartment.sol";
import "../VoterRegistration/VoterRegistration.sol";
import "../coinbase/CountryCodes.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

contract ThePeople is AccessControl {
    CountryCodes public countryCodes;

    struct Implementation {
        CitizenshipWithRegistry citizenship;
        StateDepartment stateDepartment;
        VoterRegistration voterRegistration;
        CommemorativeEdition commemorativeEdition;
        Awards awards;
    }

    struct Nation {
        string nation;
        string symbol;
        address citizenship;
        address stateDepartment;
        address federalVoterRegistration;
        address founder;
    }

    bool public isPermissionless;

    mapping(string => Nation) public nations; // country code to nation

    // todo: Track Nation -> State -> Cities

    Implementation public implementation;

    event ImplementationUpdated(
        address indexed citizenship,
        address indexed stateDepartment,
        address indexed voterRegistration,
        address commemorativeEdition,
        address awards
    );

    event IsCreationPermissionless(bool isPermissionless);
    event NationCreated(address indexed citizenship, string nation, string symbol, address founder);
    event NationDetails(
        address indexed citizenship,
        address indexed StateDepartment,
        address indexed federalVoterRegistration
    );

    error ContractNotPermissionless();
    error NationAlreadyExists(string symbol);
    error CountryIsNotCurrentlyInList(string symbol);

    constructor(
        address defaultAdmin,
        address _countryCodes,
        address _citizenship,
        address _stateDepartment,
        address _voterRegistration,
        address _commemorativeEdition,
        address _awards
    ) {
        implementation.citizenship = CitizenshipWithRegistry(_citizenship);
        implementation.stateDepartment = StateDepartment(_stateDepartment);
        implementation.voterRegistration = VoterRegistration(_voterRegistration);
        implementation.commemorativeEdition = CommemorativeEdition(payable(address(_commemorativeEdition)));
        implementation.awards = Awards(_awards);

        isPermissionless = false;

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        countryCodes = CountryCodes(_countryCodes);

        emit ImplementationUpdated(_citizenship, _stateDepartment, _voterRegistration, _commemorativeEdition, _awards);
        emit IsCreationPermissionless(isPermissionless);
    }

    function updateImplementation(
        address _citizenship,
        address _stateDepartment,
        address _voterRegistration,
        address _commemorativeEdition,
        address _awards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        implementation.citizenship = CitizenshipWithRegistry(_citizenship);
        implementation.stateDepartment = StateDepartment(_stateDepartment);
        implementation.voterRegistration = VoterRegistration(_voterRegistration);
        implementation.commemorativeEdition = CommemorativeEdition(payable(address(_commemorativeEdition)));
        implementation.awards = Awards(_awards);
        emit ImplementationUpdated(_citizenship, _stateDepartment, _voterRegistration, _commemorativeEdition, _awards);
    }

    function makePermissionless() external onlyRole(DEFAULT_ADMIN_ROLE) {
        isPermissionless = true;
        emit IsCreationPermissionless(isPermissionless);
    }

    function createNation(
        string memory _symbol,
        address founder,
        address initialVerifier,
        string calldata defaultCitizenshipURI
    ) public {
        if (!isPermissionless) revert ContractNotPermissionless();

        // todo: require caller is verified for that nation
        // coinbase(msg.sner).isRegisered(country)

        // check if the country exists
        if (!countryCodes.countryExists(_symbol)) revert CountryIsNotCurrentlyInList(_symbol);

        string memory _nation = countryCodes.getCountryName(_symbol);

        _createNation(_nation, _symbol, founder, initialVerifier, defaultCitizenshipURI);
    }

    function _createNation(
        string memory _nation,
        string memory _symbol,
        address founder,
        address initialVerifier,
        string calldata defaultCitizenshipURI
    ) internal {
        // We can not create duplicate nations
        if (_doesNationExist(_symbol)) revert NationAlreadyExists(_symbol);

        CitizenshipWithRegistry citizenship = CitizenshipWithRegistry(clone(address(implementation.citizenship)));
        address stateDepartment = clone(address(implementation.stateDepartment));

        address federalVoterRegistration = clone(address(implementation.voterRegistration));

        // Initialize Citizenship
        citizenship.initialize(address(this), _nation, _symbol, new address[](0));

        // Add Founder to Citizenship
        citizenship.grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Allow citizenship to be transfered to Federal
        citizenship.addAllowListItem(federalVoterRegistration);

        // Initialize StateDepartment
        StateDepartment(stateDepartment).initialize(
            address(citizenship),
            initialVerifier,
            defaultCitizenshipURI,
            address(this)
        );

        string memory FederalVoterName = "Federal Voter Registration for ";

        // Initialize FederalVoterRegistration
        VoterRegistration(federalVoterRegistration).initialize(
            address(this),
            string.concat(FederalVoterName, _nation),
            string.concat("w", _symbol),
            citizenship
        );

        // Add Founder to FederalVoterRegistration
        VoterRegistration(federalVoterRegistration).grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Add Founder to StateDepartment
        StateDepartment(stateDepartment).grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Give StateDepartment MinterRole
        citizenship.grantRole((citizenship.MINTER_ROLE()), stateDepartment);

        // Store Nation
        nations[_symbol] = Nation(
            _nation,
            _symbol,
            address(citizenship),
            stateDepartment,
            federalVoterRegistration,
            founder
        );

        emit NationCreated(address(citizenship), _nation, _symbol, founder);
        emit NationDetails(address(citizenship), stateDepartment, federalVoterRegistration);
    }

    function _doesNationExist(string memory _symbol) internal view returns (bool) {
        return bytes(nations[_symbol].nation).length > 0;
    }

    function clone(address _implementation) internal returns (address) {
        return Clones.clone(_implementation);
    }

    function initClone(address cloneAddress, bytes calldata initData) internal returns (bool) {
        (bool success, ) = cloneAddress.call{ value: msg.value }(initData);
        return success;
    }
}
