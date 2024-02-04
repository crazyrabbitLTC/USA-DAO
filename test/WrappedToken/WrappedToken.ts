import { expect } from "chai";
import { deployWrappedTokenFixture } from "./WrappedToken.fixture";
import { Citizenship } from "../../types";
import type { VoterRegistration } from "../../types/VoterRegistration";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe.only("VoterRegistration", function () {
  let citizenship: Citizenship, voterRegistration: VoterRegistration, admin: SignerWithAddress, otherUser: SignerWithAddress;

  beforeEach(async function () {
    const fixture = await deployWrappedTokenFixture();
    citizenship = fixture.citizenshipProxy;
    voterRegistration = fixture.voterRegistrationProxy;
    admin = fixture.admin;
    otherUser = fixture.signers[1];
  });

  describe("Wrapping and Unwrapping", function () {
    it.only("allows deposit and withdrawal of tokens", async function () {
      // Admin mints a token to themselves in the underlying contract
      await citizenship.connect(admin).safeMint(admin.address, "tokenURI");

      // Admin approves VoterRegistration to take the token
      await citizenship.connect(admin).approve(await voterRegistration.getAddress(), 0);

      // Admin deposits the token in VoterRegistration, which wraps it
      await voterRegistration.connect(admin).depositFor(admin.address, [1]);

      // Admin withdraws the token, unwrapping it
      await voterRegistration.connect(admin).withdrawTo(admin.address, [1]);

      // Check ownership returns to admin in the underlying contract
      expect(await citizenship.ownerOf(1)).to.equal(admin.address);
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
