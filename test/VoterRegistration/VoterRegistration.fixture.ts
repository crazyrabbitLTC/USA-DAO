import { ethers } from "hardhat";
import type { SimpleFactory } from "../../types/SimpleFactory";
import type { SimpleFactory__factory } from "../../types/factories/SimpleFactory__factory";
import type { VoterRegistration__factory } from "../../types/factories/VoterRegistration__factory";
import type { VoterRegistration } from "../../types/VoterRegistration";

import { deployCitizenshipWithRegistryFixture } from "../citizenship/CitizenshipWithRegistry.fixture";

export async function deployVoterRegistrationFixture() {
  const signers = await ethers.getSigners();
  const admin = signers[0];

  const { citizenshipProxy } = await deployCitizenshipWithRegistryFixture();


  // Deploy the wrapper contract (VoterRegistration)
  const VoterRegistration = (await ethers.getContractFactory("VoterRegistration")) as VoterRegistration__factory;
  const voterRegistrationBase = (await VoterRegistration.deploy()) as VoterRegistration;

  const SimpleFactory = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory = (await SimpleFactory.deploy(await voterRegistrationBase.getAddress())) as SimpleFactory;


  // // init data
  const initData = voterRegistrationBase.interface.encodeFunctionData("initialize", [admin.address, "wrappedToken", "wt", await citizenshipProxy.getAddress()]);

  // // deploy proxy
  await simpleFactory.cloneAndInitialize(initData);

  const clonedImplementation = await simpleFactory.latestClone();
  const voterRegistrationProxy = voterRegistrationBase.attach(clonedImplementation);

  // Update citizenshipProxy to allowlist the voterRegistrationProxy




  return { citizenshipProxy, voterRegistrationProxy, admin, signers };
}
