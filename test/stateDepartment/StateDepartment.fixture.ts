import { ethers } from "hardhat";
import type { Citizenship } from "../../types/Citizenship";
import type { Citizenship__factory } from "../../types/factories/Citizenship__factory";
import type { StateDepartment } from "../../types/StateDepartment";
import type { StateDepartment__factory } from "../../types/factories/StateDepartment__factory";
import type { IVerifier } from "../../types/IVerifier";
import type { SimpleFactory } from "../../types/SimpleFactory";
import type { SimpleFactory__factory } from "../../types/factories/SimpleFactory__factory";


export async function deployStateDepartmentFixture() {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const verifierAddress = "0x64081692D9269eBF6a853e9A80B39989947243b5"; //https://basescan.org/address/0x64081692D9269eBF6a853e9A80B39989947243b5#readContract
  const defaultURI = "https://example.com/default-citizenship";
  const tokenName = "United States";
  const tokenSymbol = "US";

  // Setup Citizenship

  const Citizenship = (await ethers.getContractFactory("Citizenship")) as Citizenship__factory;
  const citizenship = (await Citizenship.deploy()) as Citizenship;


  const SimpleFactory = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory = (await SimpleFactory.deploy(await citizenship.getAddress())) as SimpleFactory;

  const initData = citizenship.interface.encodeFunctionData("initialize", [admin.address, tokenName, tokenSymbol]);
  await simpleFactory.cloneAndInitialize(initData);
  const clonedImplementation = await simpleFactory.latestClone();
  const citizenshipProxy = citizenship.attach(clonedImplementation);


  // Deploy the StateDepartment contract
  const StateDepartment = (await ethers.getContractFactory("StateDepartment")) as StateDepartment__factory;
  const stateDepartment = (await StateDepartment.deploy()) as StateDepartment;


  const SimpleFactory2 = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory2 = (await SimpleFactory2.deploy(await stateDepartment.getAddress())) as SimpleFactory;

  const initData2 = stateDepartment.interface.encodeFunctionData("initialize", [await citizenshipProxy.getAddress(), verifierAddress, defaultURI, admin.address]);
  await simpleFactory2.cloneAndInitialize(initData2);
  const clonedImplementation2 = await simpleFactory2.latestClone();
  const stateDepartmentProxy = stateDepartment.attach(clonedImplementation2);


  // Grant MINTER_ROLE to StateDepartment contract on the Citizenship contract
  const MINTER_ROLE = await citizenshipProxy.MINTER_ROLE();
  await citizenshipProxy.grantRole(MINTER_ROLE, await stateDepartmentProxy.getAddress());


  return { citizenshipProxy, stateDepartmentProxy, signers, admin, tokenName, tokenSymbol, verifierAddress, defaultURI };
}
