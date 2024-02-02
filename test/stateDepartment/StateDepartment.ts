import { expect } from "chai";
import { ethers, network } from "hardhat";
import { deployStateDepartmentFixture } from "./StateDepartment.fixture";

describe.only("StateDepartment Contract", function () {
  before(async function () {
    const signers = await ethers.getSigners();
    this.admin = signers[0];
    this.otherUser = signers[1];

    this.exampleUserAddress = "0x92C67A9762c1Fe5884fac38708e6840245298895"
  });

  beforeEach(async function () {
    const { stateDepartmentProxy, citizenshipProxy, verifierAddress } = await deployStateDepartmentFixture();
    this.stateDepartment = stateDepartmentProxy;
    this.citizenship = citizenshipProxy;
    this.verifierAddress = verifierAddress; // Assuming this is the mock verifier for testing
  });

  describe("Deployment", function () {
    it("Should have set the correct admin", async function () {
      const adminRole = await this.stateDepartment.DEFAULT_ADMIN_ROLE();
      expect(await this.stateDepartment.hasRole(adminRole, this.admin.address)).to.be.true;
    });

    it("Should have set the correct default URI", async function () {
      const defaultURI = await this.stateDepartment.defaultURI();
      expect(defaultURI).to.not.be.empty;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant roles to other accounts", async function () {
      const defaultAdminRole = await this.stateDepartment.DEFAULT_ADMIN_ROLE();
      await expect(this.stateDepartment.grantRole(defaultAdminRole, this.otherUser.address))
        .to.be.emit(this.stateDepartment, "RoleGranted")
        .withArgs(defaultAdminRole, this.otherUser.address, this.admin.address);
    });

    it("Should prevent non-admins from granting roles", async function () {
      const defaultAdminRole = await this.stateDepartment.DEFAULT_ADMIN_ROLE();
      await expect(this.stateDepartment.connect(this.otherUser).grantRole(defaultAdminRole, this.admin.address))
        .to.be.revertedWithCustomError(this.stateDepartment, "AccessControlUnauthorizedAccount");
    });

  });

  describe("Claiming Citizenship", function () {
    it("Should allow eligible users to claim citizenship", async function () {
      // Mock the verifier to return true for eligibility
      // NOTE: This requires the verifier mock setup or a suitable alternative for testing

      //impersonate a US user
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [this.exampleUserAddress],
      });

      // send funds to the user.
      await this.admin.sendTransaction({  //   create  transaction
        to: this.exampleUserAddress,
        value: ethers.parseEther("1"),
      });

      const exampleUser = await ethers.getSigner(this.exampleUserAddress);

      // Claim citizenship
      await expect(this.stateDepartment.connect(exampleUser).claimCitizenship())
        .to.emit(this.citizenship, "Transfer") // Assuming the citizenship contract emits this event on mint
        .withArgs(ethers.ZeroAddress, this.exampleUserAddress, 0); // Assuming token ID starts from 0 for the first mint

      const ownerOfToken = await this.citizenship.ownerOf(0);
      expect(ownerOfToken).to.equal(this.exampleUserAddress);
    });

    it("Should prevent ineligible users from claiming citizenship", async function () {
      // Mock the verifier to return false for eligibility
      // NOTE: Adjust the mock setup accordingly for this scenario

      // // Attempt to claim citizenship
      // await expect(this.stateDepartment.connect(this.otherUser).claimCitizenship())
      //   .to.be.revertedWithCustomError(this.stateDepartment, "NotEligibleForCitizenship"); // Adjust based on the actual error thrown

      await expect(this.stateDepartment.connect(this.otherUser).claimCitizenship()).to.be.reverted;
    });

    it("Should prevent users from claiming citizenship more than once", async function () {
      //impersonate a US user
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [this.exampleUserAddress],
      });

      // send funds to the user.
      await this.admin.sendTransaction({  //   create  transaction
        to: this.exampleUserAddress,
        value: ethers.parseEther("1"),
      });

      const exampleUser = await ethers.getSigner(this.exampleUserAddress);

      // Claim citizenship
      await expect(this.stateDepartment.connect(exampleUser).claimCitizenship())
        .to.emit(this.citizenship, "Transfer") // Assuming the citizenship contract emits this event on mint
        .withArgs(ethers.ZeroAddress, this.exampleUserAddress, 0); // Assuming token ID starts from 0 for the first mint


      // Second claim attempt
      await expect(this.stateDepartment.connect(exampleUser).claimCitizenship())
        .to.be.revertedWithCustomError(this.stateDepartment, "AlreadyClaimedCitizenship"); // Custom error for already claimed
    });

  });

  describe("Pause Functionality", function () {
    it("Should allow the admin to pause and unpause the contract", async function () {
      // Pause the contract
      await this.stateDepartment.connect(this.admin).togglePause();
      expect(await this.stateDepartment.isPaused()).to.be.true;

      // Unpause the contract
      await this.stateDepartment.connect(this.admin).togglePause();
      expect(await this.stateDepartment.isPaused()).to.be.false;
    });

    it("Should prevent non-admins from pausing the contract", async function () {
      // Attempt to pause the contract by a non-admin
      await expect(this.stateDepartment.connect(this.otherUser).togglePause())
        .to.be.revertedWithCustomError(this.stateDepartment, "CallerNotAdmin"); // This should be replaced with the actual error message used in the contract
    });

    it("Should prevent claiming citizenship when the contract is paused", async function () {
      // Pause the contract
      await this.stateDepartment.connect(this.admin).togglePause();

      //impersonate a US user
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [this.exampleUserAddress],
      });

      // send funds to the user.
      await this.admin.sendTransaction({  //   create  transaction
        to: this.exampleUserAddress,
        value: ethers.parseEther("1"),
      });

      const exampleUser = await ethers.getSigner(this.exampleUserAddress);

      // Attempt to claim citizenship
      await expect(this.stateDepartment.connect(exampleUser).claimCitizenship())
        .to.be.revertedWithCustomError(this.stateDepartment, "ContractPaused"); // Custom error for paused contract operations
    });

  });
});
