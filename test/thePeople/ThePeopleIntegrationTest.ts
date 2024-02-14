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


    // create
    // Claim citizenship
    await expect(stateDepartment.connect(exampleUser).claimCitizenship())
      .to.emit(citizenship, "Transfer") // Assuming the citizenship contract emits this event on mint
      .withArgs(ethers.ZeroAddress, exampleUserAddress, 0); // Assuming token ID starts from 0 for the first mint


    // // Check the ownership of the newly minted token
    // const ownerOfToken = await citizenshipImpl.ownerOf(0);
    // expect(ownerOfToken).to.equal(exampleUserAddress);

    // const tokenId = 0;

    // // Deposit the claimed token in the federal voter registration contract
    // // Approve the voter registration contract to handle the token on behalf of the user
    // await citizenshipImpl.connect(exampleUser).approve(voterRegistrationProxy.address, tokenId);

    // // Deposit the token
    // await voterRegistrationProxy.connect(exampleUser).depositFor(exampleUserAddress, [tokenId]);

    // // Verify the token is deposited
    // expect(await voterRegistrationProxy.ownerOf(tokenId)).to.equal(exampleUserAddress);
    // // Ensure the citizenship token's owner is now the voter registration contract
    // expect(await citizenshipImpl.ownerOf(tokenId)).to.equal(voterRegistrationProxy.address);
  });

  after(async function () {
    // Stop impersonating the example user
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [exampleUserAddress],
    });
  });
});
