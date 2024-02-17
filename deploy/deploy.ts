import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  console.log("🚀 ~ deployer:", deployer)

  // Deploy CountryCodes contract
  const countryCodes = await deploy("CountryCodes", {
    from: deployer,
    args: ["0x426f67006127C38b26139AEB44FEa605E9540F62"], // Assuming the constructor requires an admin address
    log: true,
  });



  // Deploy CitizenshipWithRegistry contract
  const citizenshipWithRegistry = await deploy("CitizenshipWithRegistry", {
    from: deployer,
    log: true,
  });



  // Deploy StateDepartment contract
  const stateDepartment = await deploy("StateDepartment", {
    from: deployer,
    log: true,
  });

  // Deploy CommemorativeEdition contract
  const commemorativeEdition = await deploy("CommemorativeEdition", {
    from: deployer,
    log: true,
  });




  // Deploy JuristictionTimelock contract
  const juristictionTimelock = await deploy("JuristictionTimelock", {
    from: deployer,
    log: true,
  });



  // Deploy Governor contract
  const governor = await deploy("Governor", {
    from: deployer,
    log: true,
  });



  // Deploy Awards contract
  const awards = await deploy("Awards", {
    from: deployer,
    log: true,
  });




  // Deploy VoterRegistration base contract
  const voterRegistrationBase = await deploy("VoterRegistration", {
    from: deployer,
    log: true,
  });


  // Deploy SimpleFactory contract with the address of VoterRegistration base
  const simpleFactory = await deploy("SimpleFactory", {
    from: deployer,
    args: [voterRegistrationBase.address],
    log: true,
  });



  // Assuming an initialization function needs to be called for VoterRegistration
  // Encode the initialization data
  const voterRegistration = await hre.ethers.getContractFactory("VoterRegistration");
  const initData = voterRegistration.interface.encodeFunctionData("initialize", [
    deployer, // admin address
    "wrappedToken", // example argument
    "WT", // example symbol
    citizenshipWithRegistry.address, // CitizenshipWithRegistry address
  ]);

  // Call cloneAndInitialize on the SimpleFactory with the encoded initData
  await hre.ethers.getContractAt("SimpleFactory", simpleFactory.address)
    .then((factory) => factory.cloneAndInitialize(initData));

  // Retrieve the address of the cloned VoterRegistration contract
  const clonedVoterRegistrationAddress = await hre.ethers.getContractAt("SimpleFactory", simpleFactory.address)
    .then((factory) => factory.latestClone());

  // Deploy ThePeople contract with all dependencies
  const thePeople = await deploy("ThePeople", {
    from: deployer,
    args: [
      "0x426f67006127C38b26139AEB44FEa605E9540F62",
      countryCodes.address,
      citizenshipWithRegistry.address,
      stateDepartment.address,
      clonedVoterRegistrationAddress,
      commemorativeEdition.address,
      awards.address,
      juristictionTimelock.address,
      governor.address,
    ],
    log: true,
  });

  // Verify the deployed contracts
  await hre.run("verify:verify", {
    address: thePeople.address,
    constructorArguments: [
      "0x426f67006127C38b26139AEB44FEa605E9540F62",
      countryCodes.address,
      citizenshipWithRegistry.address,
      stateDepartment.address,
      clonedVoterRegistrationAddress,
      commemorativeEdition.address,
      awards.address,
      juristictionTimelock.address,
      governor.address,
    ],
  });

  // Verify the deployed contracts
  await hre.run("verify:verify", {
    address: countryCodes.address,
    constructorArguments: [
      "0x426f67006127C38b26139AEB44FEa605E9540F62",
    ],
  });

  await hre.run("verify:verify", {
    address: citizenshipWithRegistry.address,
  });

  await hre.run("verify:verify", {
    address: stateDepartment.address,
  });

  await hre.run("verify:verify", {
    address: commemorativeEdition.address,
  });

  await hre.run("verify:verify", {
    address: commemorativeEdition.address,
  });

  await hre.run("verify:verify", {
    address: juristictionTimelock.address,
  });

  await hre.run("verify:verify", {
    address: awards.address,
  });

  await hre.run("verify:verify", {
    address: governor.address,
  });


  await hre.run("verify:verify", {
    address: voterRegistrationBase.address,
  });

  await hre.run("verify:verify", {
    address: simpleFactory.address,
    constructorArguments: [
      voterRegistrationBase.address,
    ],
  });


};

export default func;
func.tags = ["ThePeople"];


// import { DeployFunction } from "hardhat-deploy/types";
// import { HardhatRuntimeEnvironment } from "hardhat/types";

// const DAY_IN_SECONDS = 60 * 60 * 24;
// const NOW_IN_SECONDS = Math.round(Date.now() / 1000);
// const UNLOCK_IN_X_DAYS = NOW_IN_SECONDS + DAY_IN_SECONDS * 1; // 1 DAY

// const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
//   const { deployer } = await hre.getNamedAccounts();
//   const { deploy } = hre.deployments;
//   const lockedAmount = hre.ethers.parseEther("0.01").toString();

//   const lock = await deploy("Lock", {
//     from: deployer,
//     args: [UNLOCK_IN_X_DAYS],
//     log: true,
//     value: lockedAmount,
//   });

//   console.log(`Lock contract: `, lock.address);
// };
// export default func;
// func.id = "deploy_lock"; // id required to prevent reexecution
// func.tags = ["Lock"];
