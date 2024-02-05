import { ethers } from "hardhat";

import type { CitizenshipWithRegistry } from "../../types/CitizenshipWithRegistry";
import type { CitizenshipWithRegistry__factory } from "../../types/factories/CitizenshipWithRegistry__factory";
import type { SimpleFactory } from "../../types/SimpleFactory";
import type { SimpleFactory__factory } from "../../types/factories/SimpleFactory__factory";

export async function deployCitizenshipWithRegistryFixture() {

  const signers = await ethers.getSigners();
  const admin = signers[0];

  const Citizenship = (await ethers.getContractFactory("CitizenshipWithRegistry")) as CitizenshipWithRegistry__factory;
  const citizenship = (await Citizenship.deploy()) as CitizenshipWithRegistry;

  const tokenName = "Citizenship";
  const tokenSymbol = "CTZ";

  const SimpleFactory = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory = (await SimpleFactory.deploy(await citizenship.getAddress())) as SimpleFactory;

  // // init data
  const initData = citizenship.interface.encodeFunctionData("initialize(address,string,string,address[])", [admin.address, tokenName, tokenSymbol, []]);
  // const initData = citizenship.interface.encodeFunctionData("initialize", [admin.address, tokenName, tokenSymbol, []]);

  // // deploy proxy
  await simpleFactory.cloneAndInitialize(initData);

  const clonedImplementation = await simpleFactory.latestClone();

  const citizenshipProxy = citizenship.attach(clonedImplementation);

  return { citizenship, citizenshipProxy, signers, admin, tokenName, tokenSymbol };
}
