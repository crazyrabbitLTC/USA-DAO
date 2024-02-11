// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../citizenship/CitizenshipWithRegistry.sol";
import "../awards/Awards.sol";
import "../commemorativeEdition/CommemorativeEdition.sol";
import "../stateDepartment/StateDepartment.sol";
import "../VoterRegistration/VoterRegistration.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

contract ThePeople is AccessControl {
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
    event NationCreated(string nation, string symbol, address citizenship);

    error ContractNotPermissionless();
    error NationAlreadyExists(string symbol);

    constructor(
        address defaultAdmin,
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
        string calldata _nation,
        string calldata _symbol,
        address founder,
        address initialVerifier,
        string calldata defaultCitizenshipURI
    ) public {
        if (!isPermissionless) revert ContractNotPermissionless();

        // require caller is verified for that nation

        _createNation(_nation, _symbol, founder, initialVerifier, defaultCitizenshipURI);
    }

    function _createNation(
        string calldata _nation,
        string calldata _symbol,
        address founder,
        address initialVerifier,
        string calldata defaultCitizenshipURI
    ) internal {
        // We can not create duplicate nations
        if (_doesNationExist(_symbol)) revert NationAlreadyExists(_symbol);

        address citizenship = clone(address(implementation.citizenship));
        address stateDepartment = clone(address(implementation.stateDepartment));

        address federalVoterRegistration = clone(address(implementation.voterRegistration));

        // Initialize Citizenship
        CitizenshipWithRegistry(citizenship).initialize(address(this), _nation, _symbol, new address[](0));

        // Add Founder to Citizenship
        CitizenshipWithRegistry(citizenship).grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Allow citizenship to be transfered to Federal
        CitizenshipWithRegistry(citizenship).addAllowListItem(federalVoterRegistration);

        // Initialize StateDepartment
        StateDepartment(stateDepartment).initialize(citizenship, initialVerifier, defaultCitizenshipURI, address(this));

        // Add Founder to StateDepartment
        StateDepartment(stateDepartment).grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Store Nation
        nations[_symbol] = Nation(_nation, _symbol, citizenship);

        emit NationCreated(_nation, _symbol, citizenship);
    }

    function _doesNationExist(string calldata _symbol) internal view returns (bool) {
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