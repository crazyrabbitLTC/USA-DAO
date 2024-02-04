import { ethers } from "hardhat";
import { deployCitizenshipFixture } from "../citizenship/Citizenship.fixture"; // Assuming this is the correct import path
import { deployStateDepartmentFixture } from "../stateDepartment/StateDepartment.fixture"; // Assuming this is the correct import path
import type { CommemorativeEdition } from "../../types/CommemorativeEdition"; // Update the import path as necessary
import type { CommemorativeEdition__factory } from "../../types/factories/CommemorativeEdition__factory";
import type { SimpleFactory } from "../../types/SimpleFactory";
import type { SimpleFactory__factory } from "../../types/factories/SimpleFactory__factory";


export async function deployCommemorativeEditionFixture() {
  // Reuse the existing fixtures to set up the Citizenship and StateDepartment contracts
  const { stateDepartmentProxy, citizenshipProxy, admin, tokenName, tokenSymbol } = await deployStateDepartmentFixture();

  // Assume the signer address and fee amount
  const offChainSignerAddress = admin.address; // For testing purposes, using the admin as the offChainSigner
  const feeAmount = ethers.parseEther("0.01"); // Fee for updating the URI

  // Deploy the CommemorativeEdition contract
  const CommemorativeEditionFactory = (await ethers.getContractFactory("CommemorativeEdition")) as CommemorativeEdition__factory;
  const commemorativeEdition = await CommemorativeEditionFactory.deploy() as CommemorativeEdition;


  const SimpleFactory = (await ethers.getContractFactory("SimpleFactory")) as SimpleFactory__factory;
  const simpleFactory = (await SimpleFactory.deploy(await commemorativeEdition.getAddress())) as SimpleFactory;

  const initData = commemorativeEdition.interface.encodeFunctionData("initialize", [await citizenshipProxy.getAddress(), offChainSignerAddress, feeAmount, admin.address]);
  await simpleFactory.cloneAndInitialize(initData);
  const clonedImplementation = await simpleFactory.latestClone();
  const commemorativeEditionProxy = commemorativeEdition.attach(clonedImplementation);


  const updateURIRole = await citizenshipProxy.URI_UPDATE_ROLE();

  // give permission to update UI to commemoritve Edition Proxy
  await citizenshipProxy.grantRole(updateURIRole, await commemorativeEditionProxy.getAddress());
  
  return {
    citizenshipProxy,
    stateDepartmentProxy,
    commemorativeEditionProxy,
    admin,
    tokenName,
    tokenSymbol,
    offChainSignerAddress,
    feeAmount
  };
}
