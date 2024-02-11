// File: test/ThePeople.fixture.ts
import { ethers } from "hardhat";


import { deployCitizenshipFixture } from "../citizenship/Citizenship.fixture";
import { deployCountryCodesFixture } from "../countryCodes/CountryCodes.fixture";
import { deployStateDepartmentFixture } from "../stateDepartment/StateDepartment.fixture";

import { deployVoterRegistrationFixture } from "../voterRegistration/VoterRegistration.fixture";
import { deployCommemorativeEditionFixture } from "../commemerativeEdition/CommemerativeEdition.fixture";

import type { SimpleFactory } from "../../types/SimpleFactory";
import type { SimpleFactory__factory } from "../../types/factories/SimpleFactory__factory";
import type { VoterRegistration__factory } from "../../types/factories/VoterRegistration__factory";
import type { VoterRegistration } from "../../types/VoterRegistration";


import { deployAwardTokenFixture } from "../awardToken/AwardToken.fixture";

export async function deployThePeopleFixture() {
  const signers = await ethers.getSigners();
  const admin = signers[0];

  // Mock contracts. These should be replaced with actual implementations or mocks.

  const { countryCodes } = await deployCountryCodesFixture();
  const { citizenshipProxy, stateDepartmentProxy, commemorativeEditionProxy } = await deployCommemorativeEditionFixture();

  // Deploy the wrapper contract (VoterRegistration)
  const VoterRegistration = (await ethers.getContractFactory("VoterRegistration")) as VoterRegistration__factory;
  const voterRegistrationBase = (await VoterRegistration.deploy()) as VoterRegistration;
  const SimpleFactory = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory = (await SimpleFactory.deploy(await voterRegistrationBase.getAddress())) as SimpleFactory;
  const initData = voterRegistrationBase.interface.encodeFunctionData("initialize", [admin.address, "wrappedToken", "wt", await citizenshipProxy.getAddress()]);
  await simpleFactory.cloneAndInitialize(initData);
  const clonedImplementation = await simpleFactory.latestClone();
  const voterRegistrationProxy = voterRegistrationBase.attach(clonedImplementation);

  // Deploy ThePeople contract
  const ThePeople = await ethers.getContractFactory("ThePeople");
  const thePeople = await ThePeople.deploy(
    admin.address,
    await countryCodes.getAddress(),
    await citizenshipProxy.getAddress(),
    await stateDepartmentProxy.getAddress(),
    await voterRegistrationProxy.getAddress(),
    await commemorativeEditionProxy.getAddress(),
    admin.address // todo: replace with actual award token address
  );

  return {
    thePeople,
    admin,
    signers,
    countryCodesMock: countryCodes,
    citizenshipMock: citizenshipProxy,
    stateDepartmentMock: stateDepartmentProxy,
    voterRegistrationMock: voterRegistrationProxy,
    commemorativeEditionMock: commemorativeEditionProxy,
  };
}
