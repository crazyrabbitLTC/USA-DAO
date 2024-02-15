// File: test/ThePeople.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployThePeopleFixture } from "./ThePeople.fixture";
import { CountryCodes, ThePeople, } from "../../types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ThePeople Contract", function () {
  let admin: SignerWithAddress, otherAddress: SignerWithAddress,
    thePeople: ThePeople, countryCodes: CountryCodes;
  const countryCode = "US";
  const nationName = "United States";
  let signers: SignerWithAddress[];

  const newCitizenshipAddress = "0x0000000000000000000000000000000000000001";
  const newStateDepartmentAddress = "0x0000000000000000000000000000000000000002";
  const newVoterRegistrationAddress = "0x0000000000000000000000000000000000000003";
  const newCommemorativeEditionAddress = "0x0000000000000000000000000000000000000004";
  const newAwardsAddress = "0x0000000000000000000000000000000000000005";
  const newTimelockAddress = "0x0000000000000000000000000000000000000006";
  const newGovernorAddress = "0x0000000000000000000000000000000000000007";


  // const exampleUserAddress = "0x92C67A9762c1Fe5884fac38708e6840245298895"
  const verifierAddress = "0x64081692D9269eBF6a853e9A80B39989947243b5"; //https://basescan.org/address/0x64081692D9269eBF6a853e9A80B39989947243b5#readContract
  const defaultURI = "https://example.com/default-citizenship";

  beforeEach(async function () {
    ({ thePeople, admin, countryCodes, signers } = await deployThePeopleFixture());

    otherAddress = signers[1];
    this.countryCodes = countryCodes;
    // add the US to the countryCodes
    await countryCodes.addCountryCode([{ name: nationName, abbreviation: countryCode }]);
  });

  it("should create a nation if the contract is permissionless", async function () {
    await expect(thePeople.togglePermissionless()).to.emit(thePeople, "IsCreationPermissionless").withArgs(true);
    // Mock country code for the test
    await expect(thePeople.createNation(countryCode, admin.address, verifierAddress, defaultURI)).to.emit(thePeople, "NationCreated").to.emit(thePeople, "NationDetails");

    const nation = await thePeople.nations(countryCode);

    expect(nation.symbol).to.equal(countryCode);
    expect(nation.nation).to.equal(nationName);
    expect(nation.founder).to.equal(admin.address);

  });

  // Test for reverting creation of a nation if the contract is not permissionless
  it("should revert creating a nation if the contract is not permissionless", async function () {

    await expect(thePeople.connect(otherAddress).createNation(countryCode, otherAddress.address, verifierAddress, defaultURI))
      .to.be.revertedWithCustomError(thePeople, "ContractNotPermissionless");
  });

  // Test for updating implementations correctly
  it("should update implementations correctly", async function () {
    // New implementation addresses (example addresses, replace with actual deployed addresses)

    await expect(thePeople.updateImplementation(newCitizenshipAddress,
      newStateDepartmentAddress, newVoterRegistrationAddress,
      newCommemorativeEditionAddress, newAwardsAddress, newTimelockAddress, newGovernorAddress))
      .to.emit(thePeople, "ImplementationUpdated")
      .withArgs(newCitizenshipAddress, newStateDepartmentAddress, newVoterRegistrationAddress, newCommemorativeEditionAddress,
        newAwardsAddress, newTimelockAddress, newGovernorAddress);

    // Verify new implementations are set correctly (example verification for one, apply similar for others)
    const implementations = await thePeople.implementation();
    expect(implementations[0]).to.equal(newCitizenshipAddress);
    expect(implementations[1]).to.equal(newStateDepartmentAddress);
    expect(implementations[2]).to.equal(newVoterRegistrationAddress);
    expect(implementations[3]).to.equal(newCommemorativeEditionAddress);
    expect(implementations[4]).to.equal(newAwardsAddress);

  });

  // Test to allow only the admin to update implementations
  it("should allow only the admin to update implementations", async function () {
    // Assuming `otherAccount` is a SignerWithAddress not having the DEFAULT_ADMIN_ROLE
    const otherAccount = ethers.Wallet.createRandom().connect(ethers.provider);

    await expect(thePeople.connect(otherAccount).updateImplementation(newCitizenshipAddress, newStateDepartmentAddress, newVoterRegistrationAddress, newCommemorativeEditionAddress, newAwardsAddress, newTimelockAddress, newGovernorAddress))
      .to.be.reverted
  });

  // Test for Nation Creation with Duplicate Symbol
  it("should revert creating a nation with a duplicate symbol", async function () {
    // First, make the contract permissionless
    await thePeople.togglePermissionless();
    // Create the first nation
    await expect(thePeople.createNation(countryCode, admin.address, verifierAddress, defaultURI))
      .to.emit(thePeople, "NationCreated");

    // Attempt to create another nation with the same symbol
    await expect(thePeople.createNation(countryCode, admin.address, verifierAddress, defaultURI))
      .to.be.revertedWithCustomError(thePeople, "NationAlreadyExists");
  });

  it("should not affect existing nations after updating implementations", async function () {
    await thePeople.togglePermissionless();
    await thePeople.createNation(countryCode, admin.address, verifierAddress, defaultURI);

    // Save old nation details
    const oldNationDetails = await thePeople.nations(countryCode);

    // Update implementations to new addresses
    await thePeople.updateImplementation(newCitizenshipAddress, newStateDepartmentAddress,
      newVoterRegistrationAddress, newCommemorativeEditionAddress, newAwardsAddress, newTimelockAddress, newGovernorAddress);

    // Assert that the old nation still exists with its original details
    const unchangedNationDetails = await thePeople.nations(countryCode);
    expect(unchangedNationDetails.citizenship).to.equal(oldNationDetails.citizenship);
    // Add additional checks as necessary
  });

  it("should create a nation within reasonable gas limits", async function () {
    await thePeople.togglePermissionless();
    const tx = await thePeople.createNation(countryCode, admin.address, verifierAddress, defaultURI);
    const receipt = await tx.wait();

    // Specify your contract's expected gas usage threshold
    const gasUsageThreshold = 6000000; // Example threshold, adjust based on your expectations
    expect(receipt?.gasUsed).to.be.lessThan(gasUsageThreshold);
  });


  // Additional tests can be added here...
});
