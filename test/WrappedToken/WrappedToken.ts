import { expect } from "chai";
import { deployWrappedTokenFixture } from "./WrappedToken.fixture";
import { CitizenshipWithRegistry } from "../../types";
import type { VoterRegistration } from "../../types/VoterRegistration";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";

describe.only("VoterRegistration", function () {
  let citizenship: CitizenshipWithRegistry, voterRegistration: VoterRegistration, admin: SignerWithAddress, otherUser: SignerWithAddress;

  beforeEach(async function () {
    const fixture = await deployWrappedTokenFixture();
    citizenship = fixture.citizenshipProxy;
    voterRegistration = fixture.voterRegistrationProxy;
    admin = fixture.admin;
    otherUser = fixture.signers[1];
  });

  describe("Allowlist", function () {
    it("allows only admin to add allowlist address", async function () {
      // Add allowlist address by admin
      await expect(citizenship.connect(admin)
        .updateAllowlist([await voterRegistration.getAddress()], [true]))
        .to.emit(citizenship, "AllowlistUpdated").withArgs(await voterRegistration.getAddress(), true);

      // check to see if the address was added
      expect(await citizenship.allowlistedDestination(await voterRegistration.getAddress())).to.be.true;
    });
  })

  describe.only("Wrapping and Unwrapping", function () {

    it("allows deposit of tokens", async function () {

      // allowlist voterRegistration
      await expect(citizenship.connect(admin)
        .updateAllowlist([await voterRegistration.getAddress()], [true]))
        .to.emit(citizenship, "AllowlistUpdated").withArgs(await voterRegistration.getAddress(), true);

      // Admin mints a token to themselves in the underlying contract
      await expect(citizenship.connect(admin).safeMint(admin.address, "tokenURI"))
        .to.emit(citizenship, "Transfer").withArgs(ethers.ZeroAddress, admin.address, 0);

      // Admin approves VoterRegistration to take the token
      await citizenship.connect(admin).approve(await voterRegistration.getAddress(), 0);

      // Admin deposits the token in VoterRegistration, which wraps it
      await expect(voterRegistration.connect(admin).depositFor(admin.address, [0]))
        .to.emit(citizenship, "Transfer").withArgs(admin.address, await voterRegistration.getAddress(), 0)
        .to.emit(voterRegistration, "Transfer").withArgs(ethers.ZeroAddress, admin.address, 0);

      // Check ownership is transferred to VoterRegistration
      expect(await citizenship.ownerOf(0)).to.equal(await voterRegistration.getAddress());
      // admin has wrapped token
      expect(await voterRegistration.ownerOf(0)).to.equal(admin.address);


    });

    xit("allows withdrawal of tokens to allowlisted addresses", async function () {

      // allowlist voterRegistration
      await expect(citizenship.connect(admin)
        .updateAllowlist([await voterRegistration.getAddress()], [true]))
        .to.emit(citizenship, "AllowlistUpdated").withArgs(await voterRegistration.getAddress(), true);

      // Admin mints a token to themselves in the underlying contract
      await expect(citizenship.connect(admin).safeMint(admin.address, "tokenURI"))
        .to.emit(citizenship, "Transfer").withArgs(ethers.ZeroAddress, admin.address, 0);

      // Admin approves VoterRegistration to take the token
      await citizenship.connect(admin).approve(await voterRegistration.getAddress(), 0);

      // Admin deposits the token in VoterRegistration, which wraps it
      await expect(voterRegistration.connect(admin).depositFor(admin.address, [0]))
        .to.emit(citizenship, "Transfer").withArgs(admin.address, await voterRegistration.getAddress(), 0);

      // Admin attempts to withdraw token, but fails
      await expect(voterRegistration.connect(admin).withdrawTo(admin.address, [0]))
        .to.be.revertedWithCustomError(citizenship, "TokenNonTransferable");

      // In order to withdraw the token, we must whitelist the wrapper address as the receipient for the wrapped token (for burning)
      // this is because the wrapped token is not transferable

      // Allowlist wrapper address
      await expect(voterRegistration.connect(admin)
        .updateAllowlist([admin.address, await citizenship.getAddress(), await voterRegistration.getAddress()], [true, true, true]))
        .to.emit(voterRegistration, "AllowlistUpdated").withArgs(admin.address, true);

      // // Allowlist admin on citizenship
      // await expect(citizenship.connect(admin)
      //   .updateAllowlist([admin.address], [true]))
      //   .to.emit(citizenship, "AllowlistUpdated").withArgs(admin.address, true);

      await expect(voterRegistration.connect(admin).withdrawTo(admin.address, [0])).to.be.revertedWithCustomError(voterRegistration, "TokenNonTransferable")
      // // Admin withdraws the token, unwrapping it
      // await expect(voterRegistration.connect(admin).withdrawTo(admin.address, [0]))
      //   .to.emit(citizenship, "Transfer").withArgs(await voterRegistration.getAddress(), admin.address, 0);

      // // Check ownership returns to admin in the underlying contract
      // expect(await citizenship.ownerOf(0)).to.equal(admin.address);
    });
  });

  describe("Role Management", function () {
    it("allows only admin to toggle transferability", async function () {
      // Toggle transferability by admin
      await voterRegistration.connect(admin).toggleTransferability(true);

      // Attempt to toggle transferability by another user should fail
      await expect(voterRegistration.connect(otherUser).toggleTransferability(false))
        .to.be.revertedWith("CallerDoesNotHaveTransferEnableRole");
    });
  });

  describe("Transferability", function () {
    it("enforces transferability rules", async function () {
      // Admin mints and wraps a token
      await citizenship.connect(admin).safeMint(admin.address, "tokenURI");
      await citizenship.connect(admin).approve(voterRegistration.address, 1);
      await voterRegistration.connect(admin).depositFor(admin.address, [1]);

      // Toggle transferability off
      await voterRegistration.connect(admin).toggleTransferability(false);

      // Attempt to transfer the wrapped token should fail
      await expect(voterRegistration.connect(admin).transferFrom(admin.address, otherUser.address, 1))
        .to.be.revertedWith("TokenNonTransferable");

      // Toggle transferability on
      await voterRegistration.connect(admin).toggleTransferability(true);

      // Now the transfer should succeed
      await voterRegistration.connect(admin).transferFrom(admin.address, otherUser.address, 1);
      expect(await voterRegistration.ownerOf(1)).to.equal(otherUser.address);
    });
  });
});
