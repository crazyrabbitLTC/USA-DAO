import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import type { Signers } from "../types";
import { deployCitizenshipFixture } from "./Citizenship.fixture";

describe("Citizenship Token", function () {

  before(async function () {
    this.signers = {} as Signers;
    this.admin = {} as Signers;
    this.otherUser = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.admin = signers[0];

    this.loadFixture = loadFixture;
  });

  describe("Deployment", function () {
    beforeEach(async function () {
      const { citizenshipProxy, admin, signers } = await this.loadFixture(deployCitizenshipFixture);
      this.citizenship = citizenshipProxy;
      this.admin = admin;
      this.otherUser = signers[1];
    });

    it("Should set the right name", async function () {
      console.log("This.citizenship.name(): ", await this.citizenship.name())
      expect(await this.citizenship.name()).to.equal("Citizenship");
    });

    it("Should set the right symbol", async function () {
      expect(await this.citizenship.symbol()).to.equal("CTZ");
    });

    it("Should set the right total supply", async function () {
      expect(await this.citizenship.totalSupply()).to.equal(0);
    });
  })

  describe("Transferability", function () {
    beforeEach(async function () {
      const { citizenshipProxy, admin, signers } = await this.loadFixture(deployCitizenshipFixture);
      this.citizenship = citizenshipProxy;
      this.admin = admin;
      this.otherUser = signers[1];
    });


    it("Only admin can toggle transferability", async function () {
      // Initially set by admin
      await expect(this.citizenship.connect(this.admin).toggleTransferability(true))
        .to.emit(this.citizenship, 'TransferabilityToggled')
        .withArgs(true);

      // Attempt to set by non-admin
      await expect(this.citizenship.connect(this.otherUser).toggleTransferability(false))
        .to.be.revertedWithCustomError(this.citizenship, "CallerDoesNotHaveTransferEnableRole");
    });

    it("Can mint a token even when non transferable", async function () {
      // Disable transferability
      await this.citizenship.connect(this.admin).toggleTransferability(false);

      // Mint token
      await expect(this.citizenship.connect(this.admin).safeMint(this.otherUser.address, "URI"))
        .to.emit(this.citizenship, 'Transfer')
        .withArgs("0x0000000000000000000000000000000000000000", this.otherUser.address, 0); // the first token


      // // Verify token was minted
      expect(await this.citizenship.ownerOf(0)).to.equal(this.otherUser.address);
      expect(await this.citizenship.balanceOf(this.otherUser.address)).to.equal(1);
    })

    it("Can mint a token even when non-transferable, but user still can't transfer a token", async function () {
      // Disable transferability
      await this.citizenship.connect(this.admin).toggleTransferability(false);

      // Mint token
      await expect(this.citizenship.connect(this.admin).safeMint(this.otherUser.address, "URI"))
        .to.emit(this.citizenship, 'Transfer')
        .withArgs("0x0000000000000000000000000000000000000000", this.otherUser.address, 0); // the first token


      // // Verify token was minted
      expect(await this.citizenship.ownerOf(0)).to.equal(this.otherUser.address);
      expect(await this.citizenship.balanceOf(this.otherUser.address)).to.equal(1);

      // Attempt to transfer token
      await expect(this.citizenship.connect(this.otherUser)
        .transferFrom(this.otherUser.address, this.admin.address, 0))
        .to.be.revertedWithCustomError(this.citizenship, "TokenNonTransferable")
    })

    it("Enforce transferability rules", async function () {
      // Disable transferability
      await this.citizenship.connect(this.admin).toggleTransferability(false);

      // Mint token
      await expect(this.citizenship.connect(this.admin).safeMint(this.admin.address, "URI"))
        .to.emit(this.citizenship, 'Transfer')
        .withArgs("0x0000000000000000000000000000000000000000", this.admin.address, 0); // the first token

      // Attempt to transfer token (assuming one exists and is owned by admin)
      const tokenId = 0;
      await expect(this.citizenship.connect(this.admin).transferFrom(this.admin.address, this.otherUser.address, tokenId))
        .to.be.revertedWithCustomError(this.citizenship, "TokenNonTransferable");

      // Enable transferability
      await this.citizenship.connect(this.admin).toggleTransferability(true);

      // Now transfer should succeed
      await expect(this.citizenship.connect(this.admin).transferFrom(this.admin.address, this.otherUser.address, tokenId))
        .to.emit(this.citizenship, 'Transfer');

    });

    it("Unauthorized users cannot toggle transferability", async function () {
      // Attempt to toggle transferability by unauthorized user
      await expect(this.citizenship.connect(this.otherUser).toggleTransferability(true))
        .to.be.revertedWithCustomError(this.citizenship, "CallerDoesNotHaveTransferEnableRole");
    });

    it("Should emit TransferabilityToggled event", async function () {
      await expect(this.citizenship.connect(this.admin).toggleTransferability(true))
        .to.emit(this.citizenship, "TransferabilityToggled")
        .withArgs(true);
    });

  });

  describe("Edge Cases", function () {
    beforeEach(async function () {
      const { citizenshipProxy, admin, signers } = await this.loadFixture(deployCitizenshipFixture);
      this.citizenship = citizenshipProxy;
      this.admin = admin;
      this.otherUser = signers[1];
    });

    it("Should not allow transferring to zero address, even if transferable", async function () {
      // Enable transferability
      await this.citizenship.connect(this.admin).toggleTransferability(true);

      // Mint token to admin
      await this.citizenship.connect(this.admin).safeMint(this.admin.address, "URI");

      // Attempt to transfer token to zero address
      await expect(
        this.citizenship.connect(this.admin).transferFrom(this.admin.address, ethers.ZeroAddress, 0)
      ).to.be.reverted
    });

    it("Minting to zero address should fail", async function () {
      // Attempt to mint token to zero address
      await expect(
        this.citizenship.connect(this.admin).safeMint(ethers.ZeroAddress, "URI")
      ).to.be.reverted
    });

    it("Toggling transferability does not affect existing tokens", async function () {
      // Disable transferability
      await this.citizenship.connect(this.admin).toggleTransferability(false);

      // Mint token to otherUser
      await this.citizenship.connect(this.admin).safeMint(this.otherUser.address, "URI");

      // Enable transferability
      await this.citizenship.connect(this.admin).toggleTransferability(true);

      // Verify otherUser can still transfer the token
      await expect(
        this.citizenship.connect(this.otherUser).transferFrom(this.otherUser.address, this.admin.address, 0)
      ).to.emit(this.citizenship, 'Transfer').withArgs(this.otherUser.address, this.admin.address, 0);
    });

    it("Roles cannot be arbitrarily assigned", async function () {
      // Attempt to grant MINTER_ROLE to otherUser without having DEFAULT_ADMIN_ROLE privileges
      await expect(
        this.citizenship.connect(this.otherUser).grantRole(ethers.id("MINTER_ROLE"), this.otherUser.address)
      ).to.be.revertedWithCustomError(this.citizenship, "AccessControlUnauthorizedAccount");
    });

    it("Burning a token respects burnability flag", async function () {
      // Mint token first
      await this.citizenship.connect(this.admin).safeMint(this.otherUser.address, "URI");

      // Disable burning
      await this.citizenship.connect(this.admin).toggleBurnability(false);

      // Attempt to burn token
      await expect(
        this.citizenship.connect(this.otherUser).burnToken(0)
      ).to.be.revertedWithCustomError(this.citizenship, "BurningTokensIsDisabled");
    });
  });

  describe.only("Custom Token URI Management", function () {
    beforeEach(async function () {
      const { citizenshipProxy, admin, signers } = await this.loadFixture(deployCitizenshipFixture);
      this.citizenship = citizenshipProxy;
      this.admin = admin;
      this.otherUser = signers[1];
      // Mint a token to test with
      await this.citizenship.connect(this.admin).safeMint(this.otherUser.address, "initialURI");
      this.tokenId = 0; // Assuming this is the first token minted in the tests
    });

    it("Allows URI update by authorized role", async function () {
      const newURI = "https://example.com/new-uri";
      // Grant URI_UPDATE_ROLE to admin if not already done
      await expect(this.citizenship.connect(this.admin).setTokenURI(this.tokenId, newURI))
        .to.emit(this.citizenship, "TokenURIUpdated")
        .withArgs(this.tokenId, newURI, this.otherUser.address);

      expect(await this.citizenship.tokenURI(this.tokenId)).to.equal(newURI);
    });

    it("Prevents URI update by unauthorized users", async function () {
      const newURI = "https://example.com/unauthorized-update";
      await expect(this.citizenship.connect(this.otherUser).setTokenURI(this.tokenId, newURI))
        .to.be.revertedWithCustomError(this.citizenship, "CallerDoesNotHavePermission");

      // Verify the URI has not been updated
      expect(await this.citizenship.tokenURI(this.tokenId)).not.to.equal(newURI);
    });

    it("Preserves default URI behavior for tokens without a custom URI", async function () {
      // Assuming the default URI includes the token ID
      const expectedDefaultURI = "https://example.com/initialURI";
      // Mint a new token without setting a custom URI
      const newTokenId = 1;
      await this.citizenship.connect(this.admin).safeMint(this.otherUser.address, expectedDefaultURI);
      expect(await this.citizenship.tokenURI(newTokenId)).to.equal(expectedDefaultURI);
    });

    it("Overrides only the specified token's URI without affecting others", async function () {
      const customURIForToken0 = "https://example.com/custom-uri-0";
      const initialURIForToken1 = "https://example.com/initial-uri-1";
      // Set custom URI for tokenId 0
      await this.citizenship.connect(this.admin).setTokenURI(this.tokenId, customURIForToken0);
      // Mint another token
      const newTokenId = 1;
      await this.citizenship.connect(this.admin).safeMint(this.otherUser.address, initialURIForToken1);

      // Verify that token 0 has a custom URI and token 1 has its initial URI
      expect(await this.citizenship.tokenURI(this.tokenId)).to.equal(customURIForToken0);
      expect(await this.citizenship.tokenURI(newTokenId)).to.equal(initialURIForToken1);
    });

    it("Correctly emits TokenURIUpdated event", async function () {
      const newURI = "https://example.com/emitted-uri";
      await expect(this.citizenship.connect(this.admin).setTokenURI(this.tokenId, newURI))
        .to.emit(this.citizenship, "TokenURIUpdated")
        .withArgs(this.tokenId, newURI, this.otherUser.address);
    });

    it("Ensures custom URI persists through transfers", async function () {
      const customURI = "https://example.com/persistent-uri";
      await this.citizenship.connect(this.admin).setTokenURI(this.tokenId, customURI);
      // Transfer token
      await this.citizenship.connect(this.admin).toggleTransferability(true); // Ensure transferability is enabled
      await this.citizenship.connect(this.otherUser).transferFrom(this.otherUser.address, this.admin.address, this.tokenId);
      // Verify URI persists
      expect(await this.citizenship.tokenURI(this.tokenId)).to.equal(customURI);
    });
  })


})
