import { ethers } from "hardhat";

import type { Citizenship } from "../../types/Citizenship";
import type { Citizenship__factory } from "../../types/factories/Citizenship__factory";
import type { SimpleFactory } from "../../types/SimpleFactory";
import type { SimpleFactory__factory } from "../../types/factories/SimpleFactory__factory";

export async function deployCitizenshipFixture() {

  const signers = await ethers.getSigners();
  const admin = signers[0];

  const Citizenship = (await ethers.getContractFactory("Citizenship")) as Citizenship__factory;
  const citizenship = (await Citizenship.deploy()) as Citizenship;

  const tokenName = "Citizenship";
  const tokenSymbol = "CTZ";

  const SimpleFactory = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory = (await SimpleFactory.deploy(await citizenship.getAddress())) as SimpleFactory;

  // // init data
  const initData = citizenship.interface.encodeFunctionData("initialize", [admin.address, tokenName, tokenSymbol]);

  // // deploy proxy
  await simpleFactory.cloneAndInitialize(initData);

  const clonedImplementation = await simpleFactory.latestClone();

  const citizenshipProxy = citizenship.attach(clonedImplementation);

  return { citizenship, citizenshipProxy, signers, admin, tokenName, tokenSymbol };
}
