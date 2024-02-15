import { expect } from "chai";
import { ethers, network } from "hardhat";
import { deployThePeopleFixture } from "./ThePeople.fixture";
import type { StateDepartment } from "../../types/StateDepartment";
import type { VoterRegistration } from "../../types/VoterRegistration";
import { CountryCodes, ThePeople } from "../../types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { CitizenshipWithRegistry } from "../../types/CitizenshipWithRegistry";

type NationDetails = [string, string, string, string, string, string] & {
  nation: string;
  symbol: string;
  citizenship: string;
  stateDepartment: string;
  federalVoterRegistration: string;
  founder: string;
};
describe.only("ThePeople Integration Test", function () {
  let thePeople: ThePeople, countryCodes: CountryCodes, citizenshipImpl: CitizenshipWithRegistry, stateDepartmentImpl: StateDepartment, voterRegistrationProxy: VoterRegistration;
  let admin: SignerWithAddress, otherUser: SignerWithAddress;
  let signers: SignerWithAddress[];

  const countryCode = "US";
  const nationName = "United States";
  const exampleUserAddress = "0x92C67A9762c1Fe5884fac38708e6840245298895";
  const verifierAddress = "0x64081692D9269eBF6a853e9A80B39989947243b5"; //https://basescan.org/address/0x64081692D9269eBF6a853e9A80B39989947243b5#readContract

  let nationDetails: NationDetails;
  let citizenship: CitizenshipWithRegistry;
  let stateDepartment: StateDepartment;
  let voterRegistration: VoterRegistration;

  before(async function () {
    ({ thePeople, citizenshipImpl, countryCodes, stateDepartmentImpl, voterRegistrationProxy, admin, signers } = await deployThePeopleFixture());

    otherUser = signers[1];
    // Make ThePeople contract permissionless for the purpose of testing
    await thePeople.togglePermissionless();

    // Add the US to the countryCodes
    await countryCodes.addCountryCode([{ name: nationName, abbreviation: countryCode }]);

    // Create a new nation (United States, US)
    await thePeople.createNation(countryCode, admin, verifierAddress, "https://example.com/default-citizenship");

    // Get Nations Details
    nationDetails = await thePeople.nations(countryCode);

    // Get the citizenship contract
    citizenship = citizenshipImpl.attach(nationDetails.citizenship);

    // Get the state department contract
    stateDepartment = stateDepartmentImpl.attach(nationDetails.stateDepartment);

    // Get the voter registration contract
    voterRegistration = voterRegistrationProxy.attach(nationDetails.federalVoterRegistration);

  });

  it("Complete lifecycle test", async function () {
    //impersonate a US user
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [exampleUserAddress],
    });

    // send funds to the user.
    await admin.sendTransaction({  //   create  transaction
      to: exampleUserAddress,
      value: ethers.parseEther("1"),
    });

    const exampleUser = await ethers.getSigner(exampleUserAddress);

    // Claim citizenship
    await expect(stateDepartment.connect(exampleUser).claimCitizenship())
      .to.emit(citizenship, "Transfer") // Assuming the citizenship contract emits this event on mint
      .withArgs(ethers.ZeroAddress, exampleUserAddress, 0); // Assuming token ID starts from 0 for the first mint


    // Check the ownership of the newly minted token
    const ownerOfToken = await citizenship.ownerOf(0);
    expect(ownerOfToken).to.equal(exampleUserAddress);

    const tokenId = 0;

    // Approve the voter registration contract to handle the token on behalf of the user
    await citizenship.connect(exampleUser).approve(await voterRegistration.getAddress(), tokenId);

    // Deposit the token
    await voterRegistration.connect(exampleUser).depositFor(exampleUser.address, [tokenId]);

    // Verify the token is deposited
    expect(await voterRegistration.ownerOf(tokenId)).to.equal(exampleUser.address);
    // Ensure the citizenship token's owner is now the voter registration contract
    expect(await citizenship.ownerOf(tokenId)).to.equal(await voterRegistration.getAddress());
  });

  it("Nation creation by admin in non-permissionless mode", async function () {
    // Make ThePeople contract non-permissionless for the purpose of testing
    await expect(thePeople.connect(admin).togglePermissionless()).to.emit(thePeople, "IsCreationPermissionless").withArgs(false);
    // Add country code
    // Add the US to the countryCodes
    const country = { name: "Canada", abbreviation: "CA" };
    await countryCodes.addCountryCode([country]);

    // Attempt to create another nation as a non-admin should fail
    await expect(thePeople.connect(otherUser).createNation("CA", otherUser.address, verifierAddress, "https://example.com/default-citizenship-ca"))
      .to.be.reverted; // Expecting revert due to lack of permission

    // // Admin should still be able to create a nation
    await expect(thePeople.connect(admin).createNation("CA", admin.address, verifierAddress, "https://example.com/default-citizenship-ca"))
      .to.emit(thePeople, "NationCreated"); // Verify that the nation creation event is emitted
  });


  // Test for State Department: Ability to revoke citizenship
  describe("State Department ", function () {
    it("should not allow a user to claim citizenship twice", async function () {
      //impersonate a US user
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [exampleUserAddress],
      });

      // send funds to the user.
      await admin.sendTransaction({  //   create  transaction
        to: exampleUserAddress,
        value: ethers.parseEther("1"),
      });

      const exampleUser = await ethers.getSigner(exampleUserAddress);

      // claim once
      await expect(stateDepartment.connect(exampleUser).claimCitizenship())

      // try to claim again
      await expect(stateDepartment.connect(exampleUser).claimCitizenship())
        .to.be.reverted; // Assuming a revert condition for duplicate claims
    });
  });

  // Test for CountryCodes: Managing country codes and names
  describe("Country Codes Management", function () {
    it("should correctly add and retrieve country codes and names", async function () {
      const newCountryCode = "CA";
      const newCountryName = "Canada";

      // Add new country code and name
      await expect(countryCodes.connect(admin).addCountryCode([{ name: newCountryName, abbreviation: newCountryCode }]))
        .to.emit(countryCodes, "CountryCodeAdded")
        .withArgs(newCountryCode, newCountryName);

      // Retrieve and verify the country name using the country code
      expect(await countryCodes.getCountryName(newCountryCode)).to.equal(newCountryName);
    });
  });

  after(async function () {
    // Stop impersonating the example user
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [exampleUserAddress],
    });
  });
});
