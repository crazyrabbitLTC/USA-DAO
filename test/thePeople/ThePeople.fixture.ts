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
import { deployCitizenshipWithRegistryFixture } from "../citizenship/CitizenshipWithRegistry.fixture";
import { CitizenshipWithRegistry__factory, CommemorativeEdition, CommemorativeEdition__factory, CountryCodes__factory, StateDepartment, StateDepartment__factory } from "../../types";
import { CitizenshipWithRegistry } from "../../types/CitizenshipWithRegistry";
import { CountryCodes } from "../../types/CountryCodes";

export async function deployThePeopleFixture() {
  const signers = await ethers.getSigners();
  const admin = signers[0];

// Deploy implementations
const countryCodeFactory = await ethers.getContractFactory("CountryCodes") as CountryCodes__factory;
const countryCodes = await countryCodeFactory.deploy(admin.address) as CountryCodes;

const citizenshipFactory = await ethers.getContractFactory("CitizenshipWithRegistry") as CitizenshipWithRegistry__factory;
const citizenshipImpl = await citizenshipFactory.deploy() as CitizenshipWithRegistry;

const stateDepartmentFactory = await ethers.getContractFactory("StateDepartment") as StateDepartment__factory;
const stateDepartmentImpl = await stateDepartmentFactory.deploy() as StateDepartment;

const commemorativeEditionFactory = await ethers.getContractFactory("CommemorativeEdition") as CommemorativeEdition__factory;
const commemorativeEditionImpl = await commemorativeEditionFactory.deploy() as CommemorativeEdition;

  // Deploy the wrapper contract (VoterRegistration)
  const VoterRegistration = (await ethers.getContractFactory("VoterRegistration")) as VoterRegistration__factory;
  const voterRegistrationBase = (await VoterRegistration.deploy()) as VoterRegistration;
  const SimpleFactory = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory = (await SimpleFactory.deploy(await voterRegistrationBase.getAddress())) as SimpleFactory;
  const initData = voterRegistrationBase.interface.encodeFunctionData("initialize", [admin.address, "wrappedToken", "wt", await citizenshipImpl.getAddress()]);
  await simpleFactory.cloneAndInitialize(initData);
  const clonedImplementation = await simpleFactory.latestClone();
  const voterRegistrationProxy = voterRegistrationBase.attach(clonedImplementation);

  // Deploy ThePeople contract
  const ThePeople = await ethers.getContractFactory("ThePeople");
  const thePeople = await ThePeople.deploy(
    admin.address,
    await countryCodes.getAddress(),
    await citizenshipImpl.getAddress(),
    await stateDepartmentImpl.getAddress(),
    await voterRegistrationProxy.getAddress(),
    await commemorativeEditionImpl.getAddress(),
    admin.address // todo: replace with actual award token address
  );

  // voter registration is a proxy because anyone theoretically can deploy it, it's a destination for the token. 
  return {
    thePeople,
    admin,
    signers,
    countryCodes,
    citizenshipImpl,
    stateDepartmentImpl,
    voterRegistrationProxy,
    commemorativeEditionImpl,
  };
}
