import { expect } from "chai";
import { deployCountryCodesFixture } from "./CountryCodes.fixture"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { CountryCodes } from "../../types";

type Country = {
  name: string;
  abbreviation: string;
};

describe.only("CountryCodes Contract", function () {
  let admin: SignerWithAddress, otherUser: SignerWithAddress, countryCodes: CountryCodes;

  let fullCountryList: Country[];

  // Load the fixture before each test
  beforeEach(async function () {
    const { countryCodes: countryCodesContract, admin: adminSigner, signers, countries } = await deployCountryCodesFixture();
    countryCodes = countryCodesContract;
    admin = adminSigner;
    otherUser = signers[1];
    fullCountryList = countries;
  });

  it("Should correctly add and retrieve country codes and names", async function () {
    // Example test for adding and retrieving country codes
    const countriesToAdd = [{
      name: "Testland",
      abbreviation: "TL"
    }];
    await countryCodes.connect(admin).addCountryCode(countriesToAdd);
    expect(await countryCodes.getCountryName("TL")).to.equal("Testland");
  });

  it("Should only allow UPDATER_ROLE to add country codes", async function () {
    const countriesToAdd = [{
      name: "Testlandia",
      abbreviation: "TA"
    }];
    // Attempt to add country codes by an unauthorized user should fail
    await expect(countryCodes.connect(otherUser).addCountryCode(countriesToAdd))
      .to.be.revertedWithCustomError(countryCodes, "CallerNotAuthorized");
  });

  it("Should revert when adding a country code with an invalid length", async function () {
    const invalidCountry = [{
      name: "InvalidCountry",
      abbreviation: "INV" // 3 letters, invalid length
    }];
    await expect(countryCodes.connect(admin).addCountryCode(invalidCountry))
      .to.be.revertedWithCustomError(countryCodes, "InvalidCountryCodeLength");
  });

  it("Should revert when trying to get the name of a non-existent country code", async function () {
    await expect(countryCodes.getCountryName("XX"))
      .to.be.revertedWithCustomError(countryCodes, "InvalidCountryCodeLength");
  });

  it("Should correctly add multiple country codes and names", async function () {
    const multipleCountriesToAdd = [
      { name: "Testland", abbreviation: "TL" },
      { name: "Examplestan", abbreviation: "EX" }
    ];
    await countryCodes.connect(admin).addCountryCode(multipleCountriesToAdd);

    expect(await countryCodes.getCountryName("TL")).to.equal("Testland");
    expect(await countryCodes.getCountryName("EX")).to.equal("Examplestan");
  });

  it("Should correctly add all country codes and names", async function () {

    await expect(countryCodes.connect(admin).addCountryCode(fullCountryList)).to.not.be.reverted;

    for (const country of fullCountryList) {
      expect(await countryCodes.getCountryName(country.abbreviation)).to.equal(country.name);
    }


  });

  it("Should not prevent adding a duplicate country code (no harm)", async function () {
    const country = { name: "Testland", abbreviation: "TL" };
    await countryCodes.connect(admin).addCountryCode([country]);

    // Attempt to add the same country again
    await expect(countryCodes.connect(admin).addCountryCode([country]))
      .to.be.not.reverted;
  });

  it("Should emit CountryCodeAdded event when a new country code is added", async function () {
    const countryToAdd = { name: "Testland", abbreviation: "TL" };
    await expect(countryCodes.connect(admin).addCountryCode([countryToAdd]))
      .to.emit(countryCodes, "CountryCodeAdded")
      .withArgs(countryToAdd.abbreviation, countryToAdd.name);
  });

});
