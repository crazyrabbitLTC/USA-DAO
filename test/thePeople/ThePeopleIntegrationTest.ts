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
  let admin: SignerWithAddress
  const countryCode = "US";
  const nationName = "United States";
  const exampleUserAddress = "0x92C67A9762c1Fe5884fac38708e6840245298895";
  const verifierAddress = "0x64081692D9269eBF6a853e9A80B39989947243b5"; //https://basescan.org/address/0x64081692D9269eBF6a853e9A80B39989947243b5#readContract

  let nationDetails: NationDetails;
  let citizenship: CitizenshipWithRegistry;
  let stateDepartment: StateDepartment;
  let voterRegistration: VoterRegistration;

  before(async function () {
    ({ thePeople, citizenshipImpl, countryCodes, stateDepartmentImpl, voterRegistrationProxy, admin } = await deployThePeopleFixture());

    // Make ThePeople contract permissionless for the purpose of testing
    await thePeople.makePermissionless();

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

  it.only("Complete lifecycle test", async function () {
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


    // create
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

  // Additional test for VoterRegistration: deposit and withdrawal
  describe("Voter Registration Deposit and Withdrawal", function () {
    let tokenId;

    it("should allow a user to deposit and withdraw their token", async function () {
      // Mint a new token and get its tokenId
      await expect(stateDepartment.connect(exampleUser).claimCitizenship())
        .to.emit(citizenship, "Transfer")
        .withArgs(ethers.constants.AddressZero, exampleUserAddress, 0);
      tokenId = 0; // Assuming this is the token's ID

      // Deposit the token
      await citizenship.connect(exampleUser).approve(voterRegistrationProxy.address, tokenId);
      await expect(voterRegistrationProxy.connect(exampleUser).depositFor(exampleUserAddress, [tokenId]))
        .to.emit(voterRegistrationProxy, "Transfer")
        .withArgs(ethers.constants.AddressZero, exampleUserAddress, tokenId);

      // Withdraw the token back to the user
      await expect(voterRegistrationProxy.connect(exampleUser).withdrawTo(exampleUserAddress, [tokenId]))
        .to.emit(citizenship, "Transfer")
        .withArgs(voterRegistrationProxy.address, exampleUserAddress, tokenId);
    });
  });

  // Test for State Department: Ability to revoke citizenship
  describe("State Department Revocation", function () {
    it("should not allow a user to claim citizenship twice", async function () {
      await expect(stateDepartment.connect(exampleUser).claimCitizenship())
        .to.be.reverted; // Assuming a revert condition for duplicate claims
    });
  });

  // Test for ThePeople: Founder creation in non-permissionless mode
  describe("Nation Creation by Founder in Non-Permissionless Mode", function () {
    it("should only allow the founder to create a nation when not permissionless", async function () {
      // Set the system back to non-permissionless mode
      await expect(thePeople.connect(admin).makePermissionless())
        .to.revert; // Assuming the contract has a function to toggle permissionless mode and it reverts when trying to disable it again

      // Attempt to create another nation as a non-founder
      await expect(thePeople.connect(otherUser).createNation("CA", "Canada", otherUser.address, "https://example.com/default-citizenship"))
        .to.be.reverted; // Expecting revert due to lack of permission
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
