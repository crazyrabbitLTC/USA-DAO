// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";

/// @title Simplified Factory Contract for creating clones of a single implementation
contract SimpleFactory {
    address public implementation;
    address public latestClone;

    /// @notice Sets the implementation address
    /// @param _implementation The address of the implementation contract
    constructor(address _implementation) {
        implementation = _implementation;
    }

    /// @notice Clones the implementation contract
    /// @return cloneAddress The address of the newly created clone
    function clone() public returns (address cloneAddress) {
        cloneAddress = Clones.clone(implementation);
        latestClone = cloneAddress; // Store the address of the latest clone
    }

    /// @notice Initializes a cloned contract with provided data
    /// @param cloneAddress The address of the cloned contract
    /// @param initData The initialization data to be sent to the cloned contract
    function initClone(address cloneAddress, bytes calldata initData) public payable {
        (bool success, ) = cloneAddress.call{ value: msg.value }(initData);
        require(success, "Initialization failed");
    }

    /// @notice Clones and initializes a new contract in one transaction
    /// @param initData The initialization data for the new clone
    /// @return newCloneAddress The address of the newly created and initialized clone
    function cloneAndInitialize(bytes calldata initData) public payable returns (address newCloneAddress) {
        newCloneAddress = clone();
        initClone(newCloneAddress, initData);
    }
}
