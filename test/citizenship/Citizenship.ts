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

})
