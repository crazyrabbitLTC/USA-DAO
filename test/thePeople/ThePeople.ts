// File: test/ThePeople.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployThePeopleFixture } from "./ThePeople.fixture";
import { CountryCodes, ThePeople } from "../../types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe.only("ThePeople Contract", function () {
  let admin: SignerWithAddress, thePeople: ThePeople, countryCodes: CountryCodes;
  const countryCode = "US";
  const nationName = "United States";

  const exampleUserAddress = "0x92C67A9762c1Fe5884fac38708e6840245298895"
  const verifierAddress = "0x64081692D9269eBF6a853e9A80B39989947243b5"; //https://basescan.org/address/0x64081692D9269eBF6a853e9A80B39989947243b5#readContract
  const defaultURI = "https://example.com/default-citizenship";

  beforeEach(async function () {
    ({ thePeople, admin, countryCodes } = await deployThePeopleFixture());

    this.countryCodes = countryCodes;
    // add the US to the countryCodes
    await countryCodes.addCountryCode([{ name: nationName, abbreviation: countryCode }]);
  });

  it("should create a nation if the contract is permissionless", async function () {
    await expect(thePeople.makePermissionless()).to.emit(thePeople, "IsCreationPermissionless").withArgs(true);
    // Mock country code for the test
    await expect(thePeople.createNation(countryCode, admin.address, verifierAddress, defaultURI)).to.emit(thePeople, "NationCreated").to.emit(thePeople, "NationDetails");

    const nation = await thePeople.nations(countryCode);
    console.log("🚀 ~ nation:", nation)

    expect(nation.symbol).to.equal(countryCode);
    expect(nation.nation).to.equal(nationName);
    expect(nation.founder).to.equal(admin.address);

  });

  it("should revert creating a nation if the contract is not permissionless", async function () {
    // Attempt to create a nation without the contract being permissionless and expect revert
    // ... (Implement the test logic)
  });

  it("should update implementations correctly", async function () {
    // Update the implementations and verify the new addresses are set correctly
    // ... (Implement the test logic)
  });

  it("should allow only the admin to update implementations", async function () {
    // Try updating implementations from a non-admin account and expect revert
    // ... (Implement the test logic)
  });

  // Additional tests can be added here...
});
