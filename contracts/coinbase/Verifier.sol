// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Helper Tool for getting country information from Coinbase Attestations on Base

interface IAttestation {
    struct Attestation {
        bytes32 uid;
        bytes32 schema;
        uint64 time;
        uint64 expirationTime;
        uint64 revocationTime;
        bytes32 refUID;
        address recipient;
        address attester;
        bool revocable;
        bytes data;
    }

    /// @notice Retrieves the attestation for the given UID
    /// @param uid Unique identifier of the attestation
    /// @return Attestation struct containing attestation details
    function getAttestation(bytes32 uid) external view returns (Attestation memory);
}

interface IAttestationUid {
    /// @notice Retrieves the UID of an attestation for a given recipient and schema
    /// @param recipient Address of the recipient of the attestation
    /// @param schemaUid UID of the schema
    /// @return UID of the attestation
    function getAttestationUid(address recipient, bytes32 schemaUid) external view returns (bytes32);
}

contract Verifier {

    bytes32 constant private coinbaseSchema = 0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065;
    address constant private EAS = 0x4200000000000000000000000000000000000021;
    address constant private coinbaseAttestationIndexer = 0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C;

    /// @notice Retrieves the raw attestation data for a given address
    /// @param _address Address to query attestation data for
    /// @return Raw attestation data as bytes
    function getAttestationData(address _address) public view returns (bytes memory) {
        bytes32 uid = IAttestationUid(coinbaseAttestationIndexer).getAttestationUid(_address, coinbaseSchema);
        return IAttestation(EAS).getAttestation(uid).data;
    }

    /// @notice Retrieves the attestation struct for a given address
    /// @param _address Address to query the attestation for
    /// @return Attestation struct containing attestation details
    function getAttestation(address _address) public view returns (IAttestation.Attestation memory) {
        bytes32 uid = IAttestationUid(coinbaseAttestationIndexer).getAttestationUid(_address, coinbaseSchema);
        return IAttestation(EAS).getAttestation(uid);
    }

    /// @notice Retrieves the country information from attestation data for a given address
    /// @param _address Address to query the country information for
    /// @return Country information as a string
    function getCountry(address _address) public view returns (string memory) {
        bytes memory rawData = getAttestationData(_address);
        string memory str = string(rawData);
        return str;
    }

    /// @notice Checks if the attestation data for a given address matches a specific country symbol
    /// @param _address Address to check the attestation data for
    /// @param _twoLetterCountrySymbol Two-letter country symbol to compare against
    /// @return Boolean indicating whether the attestation data matches the country symbol
    function isCountry(address _address, string memory _twoLetterCountrySymbol) public view returns (bool) {
        bytes memory rawData = getAttestationData(_address);
        string memory country = extractCountryFromData(rawData);
        return compareStrings(country, _twoLetterCountrySymbol);
    }

    /// @notice Extracts the country string from the attestation data
    /// @param data Attestation data in bytes
    /// @return Extracted country string
    function extractCountryFromData(bytes memory data) internal pure returns (string memory) {
        require(data.length >= 66, "Data too short");

        // Extracting the string (assuming it starts at the 66th byte and is 2 bytes long)
        bytes memory countryBytes = new bytes(2);
        for(uint i = 64; i < 66; i++) {
            countryBytes[i - 64] = data[i];
        }

        return string(countryBytes);
    }

    /// @notice Compares two strings
    /// @param a First string
    /// @param b Second string
    /// @return Boolean indicating if the strings are equal
    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

}
