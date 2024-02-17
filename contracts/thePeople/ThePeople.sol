// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "../citizenship/CitizenshipWithRegistry.sol";
import "../awards/Awards.sol";
import "../commemorativeEdition/CommemorativeEdition.sol";
import "../stateDepartment/StateDepartment.sol";
import "../VoterRegistration/VoterRegistration.sol";
import "../coinbase/CountryCodes.sol";
import { JuristictionTimelock } from "../governor/Timelock.sol";
import { Governor } from "../governor/Governor.sol";

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
        JuristictionTimelock timelock;
        Governor governor;
    }

    struct Nation {
        string nation;
        string symbol;
        address citizenship;
        address stateDepartment;
        address federalVoterRegistration;
        address founder;
        address awards;
        address federalTimelock;
        address federalGovernor;
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
        address awards,
        address timelock,
        address governor
    );

    event IsCreationPermissionless(bool isPermissionless);
    event NationCreated(address indexed citizenship, string nation, string symbol, address founder);
    event NationDetails(
        address indexed citizenship,
        address indexed StateDepartment,
        address indexed federalVoterRegistration,
        address awards
    );
    event JuristictionCreated(
        address indexed timelock,
        address indexed governor,
        string countryCode,
        address voterRegistration,
        address citizenship
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
        address _awards,
        address _timelock,
        address _governor
    ) {
        implementation.citizenship = CitizenshipWithRegistry(_citizenship);
        implementation.stateDepartment = StateDepartment(_stateDepartment);
        implementation.voterRegistration = VoterRegistration(_voterRegistration);
        implementation.commemorativeEdition = CommemorativeEdition(payable(address(_commemorativeEdition)));
        implementation.awards = Awards(_awards);
        implementation.timelock = JuristictionTimelock(payable(_timelock));
        implementation.governor = Governor(payable(_governor));

        isPermissionless = false;

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        countryCodes = CountryCodes(_countryCodes);

        emit ImplementationUpdated(
            _citizenship,
            _stateDepartment,
            _voterRegistration,
            _commemorativeEdition,
            _awards,
            _timelock,
            _governor
        );
        emit IsCreationPermissionless(isPermissionless);
    }

    function updateImplementation(
        address _citizenship,
        address _stateDepartment,
        address _voterRegistration,
        address _commemorativeEdition,
        address _awards,
        address _timelock,
        address _governor
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        implementation.citizenship = CitizenshipWithRegistry(_citizenship);
        implementation.stateDepartment = StateDepartment(_stateDepartment);
        implementation.voterRegistration = VoterRegistration(_voterRegistration);
        implementation.commemorativeEdition = CommemorativeEdition(payable(address(_commemorativeEdition)));
        implementation.awards = Awards(_awards);
        implementation.timelock = JuristictionTimelock(payable(_timelock));
        emit ImplementationUpdated(
            _citizenship,
            _stateDepartment,
            _voterRegistration,
            _commemorativeEdition,
            _awards,
            _timelock,
            _governor
        );
    }

    function togglePermissionless() external onlyRole(DEFAULT_ADMIN_ROLE) {
        isPermissionless = !isPermissionless;
        emit IsCreationPermissionless(isPermissionless);
    }

    function createNation(
        string memory _symbol,
        address founder,
        address initialVerifier,
        string calldata defaultCitizenshipURI
    ) public {
        if (!isPermissionless && !hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) revert ContractNotPermissionless();

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

        address federalTimelock = clone(address(implementation.timelock));
        address federalGovernor = clone(address(implementation.governor));

        // Initialize Governor
        Governor(payable(federalGovernor)).initialize(
            VoterRegistration(federalVoterRegistration),
            JuristictionTimelock(payable(federalTimelock)),
            string.concat(_nation, " Federal Governor"),
            5 minutes,
            1 hours
        );

        address[] memory proposers = new address[](1);
        proposers[0] = address(federalGovernor);

        // Initialize Timelock
        JuristictionTimelock(payable(federalTimelock)).initialize(0, proposers, new address[](0), founder);

        // Initialize Citizenship
        citizenship.initialize(address(this), _nation, _symbol, new address[](0));

        // Add Founder to Citizenship
        citizenship.grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Allow citizenship to be transfered to Federal
        citizenship.addAllowListItem(federalVoterRegistration);

        // Minimize Local variables
        {
            // Initialize StateDepartment
            StateDepartment(stateDepartment).initialize(
                address(citizenship),
                initialVerifier,
                defaultCitizenshipURI,
                address(this)
            );
        }

        // Minimize Local variables
        {
            // Initialize FederalVoterRegistration
            VoterRegistration(federalVoterRegistration).initialize(
                address(this),
                string.concat("Federal Voter Registration for ", _nation),
                string.concat("w", _symbol),
                citizenship
            );
        }

        // Add Founder to FederalVoterRegistration
        VoterRegistration(federalVoterRegistration).grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Add Founder to StateDepartment
        StateDepartment(stateDepartment).grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Give StateDepartment MinterRole
        citizenship.grantRole((citizenship.MINTER_ROLE()), stateDepartment);

        // Deploy Awards
        Awards awards = Awards(clone(address(implementation.awards)));
        awards.initialize(address(this), string.concat("Awards for ", _nation));

        // Give founder Admin rights
        awards.grantRole(DEFAULT_ADMIN_ROLE, founder);

        // Give founder URI Update Role rights
        awards.grantRole(keccak256("URI_UPDATE_ROLE"), founder);

        // Mint the founder an award
        awards.mint(founder, 0, 1, "Founder of the Nation");

        // Store Nation
        nations[_symbol] = Nation(
            _nation,
            _symbol,
            address(citizenship),
            stateDepartment,
            federalVoterRegistration,
            founder,
            address(awards),
            federalTimelock,
            federalGovernor
        );

        // Renounce this contracts admin rights
        awards.renounceRole(DEFAULT_ADMIN_ROLE, address(this));
        citizenship.renounceRole(DEFAULT_ADMIN_ROLE, address(this));
        VoterRegistration(federalVoterRegistration).renounceRole(DEFAULT_ADMIN_ROLE, address(this));
        StateDepartment(stateDepartment).renounceRole(DEFAULT_ADMIN_ROLE, address(this));

        emit NationCreated(address(citizenship), _nation, _symbol, founder);
        emit NationDetails(address(citizenship), stateDepartment, federalVoterRegistration, address(this));
        emit JuristictionCreated(
            federalTimelock,
            federalGovernor,
            _symbol,
            federalVoterRegistration,
            address(citizenship)
        );
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
