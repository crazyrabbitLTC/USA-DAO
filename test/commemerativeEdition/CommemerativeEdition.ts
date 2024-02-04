import { expect } from "chai";
import { ethers, network } from "hardhat";
import "@nomiclabs/hardhat-ethers"
import type { StateDepartment } from "../../types/StateDepartment";
import { deployCommemorativeEditionFixture } from "./CommemerativeEdition.fixture";
import { CommemorativeEdition } from "../../types/CommemorativeEdition"; // Update the import path as necessary
import { Signer } from "ethers";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { StateDepartment } from "../../types";
import { Citizenship } from "../../types/contracts/citizenship/Citizenship.sol";

describe("CommemorativeEdition Contract", function () {
  let admin: Signer;
  let otherUser: Signer;
  let commemorativeEdition: CommemorativeEdition;
  let feeAmount: bigint;
  let stateDepartment: StateDepartment;
  let citizenship: Citizenship
  const exampleUserAddress = "0x92C67A9762c1Fe5884fac38708e6840245298895"

  const tokenId: number = 0; // Assuming this token ID exists for testing

  before(async function () {
    [admin, otherUser] = await ethers.getSigners();
  });

  beforeEach(async function () {
    const fixture = await deployCommemorativeEditionFixture();
    commemorativeEdition = fixture.commemorativeEditionProxy;
    feeAmount = fixture.feeAmount;
    stateDepartment = fixture.stateDepartmentProxy;
    citizenship = fixture.citizenshipProxy;

  });

  describe("URI Update", function () {
    it("should allow a user to update their token URI after paying a fee", async function () {
      // Mint a token
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
      await expect(stateDepartment.connect(exampleUser)
        .claimCitizenship()).to.emit(stateDepartment, "CitizenshipClaimed")
        .to.emit(citizenship, "Transfer").withArgs(ethers.ZeroAddress, exampleUser.address, 0);

      const newURI = "https://example.com/new-uri";
      // EIP-712 signing
      const domain = {
        name: "CommemorativeEdition",
        version: "1",
        chainId: parseInt(await network.provider.request({ method: "eth_chainId" }) as string, 16),
        verifyingContract: await commemorativeEdition.getAddress(),
      };

      const types = {
        URI: [
          { name: "uri", type: "string" },
          { name: "tokenId", type: "uint256" }
        ],
      };

      const value = {
        uri: newURI,
        tokenId: tokenId,
      };

      const signature = await admin.signTypedData(domain, types, value);

      await expect(commemorativeEdition.connect(exampleUser).updateURI(tokenId, newURI, signature, { value: feeAmount }))
        .to.emit(commemorativeEdition, "URIUpdated")
        .withArgs(tokenId, newURI, exampleUser.address);
    });

    it("should fail if the fee is not paid", async function () {
      // Mint a token
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
      await expect(stateDepartment.connect(exampleUser)
        .claimCitizenship()).to.emit(stateDepartment, "CitizenshipClaimed")
        .to.emit(citizenship, "Transfer").withArgs(ethers.ZeroAddress, exampleUser.address, 0);

      const newURI = "https://example.com/new-uri";
      // EIP-712 signing
      const domain = {
        name: "CommemorativeEdition",
        version: "1",
        chainId: parseInt(await network.provider.request({ method: "eth_chainId" }) as string, 16),
        verifyingContract: await commemorativeEdition.getAddress(),
      };

      const types = {
        URI: [
          { name: "uri", type: "string" },
          { name: "tokenId", type: "uint256" }
        ],
      };

      const value = {
        uri: newURI,
        tokenId: tokenId,
      };

      const signature = await admin.signTypedData(domain, types, value);

      await expect(commemorativeEdition.connect(exampleUser).updateURI(tokenId, newURI, signature, { value: 0 }))
        .to.be.revertedWithCustomError(commemorativeEdition, "InsufficientFee");
    });


  });

  describe("Fee Management", function () {
    it("should allow the admin to set a new fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await expect(commemorativeEdition.connect(admin).setFee(newFee))
        .to.emit(commemorativeEdition, "FeeUpdated")
        .withArgs(newFee);
    });

    it("should prevent non-admins from setting a new fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await expect(commemorativeEdition.connect(otherUser).setFee(newFee))
        .to.be.revertedWithCustomError(commemorativeEdition, "Unauthorized");
    });
  });

  describe("Withdrawal", function () {
    it("should allow the admin to withdraw contract balance", async function () {

      // send funds to the contract
      await admin.sendTransaction({  //   create  transaction
        to: await commemorativeEdition.getAddress(),
        value: ethers.parseEther("1"),
      });
      const balanceBefore = await ethers.provider.getBalance(await admin.getAddress());
      const withdrawAmount = ethers.parseEther("0.01");



      // try to withdraw
      await expect(commemorativeEdition.connect(admin).withdraw(await admin.getAddress(), withdrawAmount))
        .to.emit(commemorativeEdition, "Withdrawal")
        .withArgs(await admin.getAddress(), withdrawAmount);

      const balanceAfter = await ethers.provider.getBalance(await admin.getAddress());
      expect(balanceAfter).to.be.above(balanceBefore);
    });

    it("should prevent non-admins from withdrawing contract balance", async function () {
      const withdrawAmount = ethers.parseEther("0.01");
      await expect(commemorativeEdition.connect(otherUser).withdraw(await otherUser.getAddress(), withdrawAmount))
        .to.be.revertedWithCustomError(commemorativeEdition, "Unauthorized");
    });
  });
});
