

# Citizenship and Commemorative Edition Smart Contracts with State Department Integration

This project harnesses Hardhat for the development of a comprehensive blockchain-based citizenship system. It encompasses smart contracts for issuing, managing citizenship as NFTs (Non-Fungible Tokens), a verifier for attestation-based eligibility checks, a commemorative edition contract for special citizenship tokens editions, and a State Department contract for managing citizenship claims based on eligibility criteria.

## Project Overview

The project comprises four primary smart contracts:

1. **Citizenship Contract**: An ERC721 token representing digital citizenship, featuring pausing, minting, burning, and token URI updates, governed by specific roles.
2. **Verifier Contract**: Interacts with external attestation systems to verify user eligibility for citizenship based on predefined criteria. Specifically, it checks on-chain attestations made by Coinbase on the Base network, enabling a secure and decentralized mechanism for verifying user information against trusted attestations.
3. **Commemorative Edition Contract**: Allows updating of token URIs for special editions, leveraging EIP-712 signed messages for secure, off-chain communication between parties, ensuring authenticity and integrity of the requests.
4. **State Department Contract**: Manages the eligibility and claims for citizenship tokens based on the verification process handled by the Verifier Contract. It integrates directly with the Citizenship Contract to mint tokens for eligible users.

## Roles and Permissions

The system utilizes Access Control roles for managing permissions across different functionalities:

- **Admin Role**: Full access to the system, capable of setting other roles, updating fees, and pausing the system.
- **Minter Role**: Granted to the State Department Contract to mint new citizenship tokens upon successful verification.
- **URI Updater Role**: Specific to the Commemorative Edition Contract for updating token URIs securely.

## Testing and Deployment

The project includes a comprehensive suite of tests, demonstrating the functionality of each contract and the interactions between them. Testing leverages Hardhat's network forking feature to simulate real-world interactions on a local test network, ensuring thorough coverage and reliability.

### Setup for Testing

- Set up the roles properly by granting the necessary permissions using the `grantRole` function.
- Use Hardhat's network forking to test against the Base Mainnet, allowing you to interact with deployed contracts such as the Coinbase attestation verifier without deploying to the main network.
- Ensure environment variables are correctly configured for network access and contract interactions.

### Running Tests

Tests can be run using Hardhat commands, focusing on each contract's functionality and integration points:

```shell
npx hardhat test
```

This command runs all tests, verifying contract interactions, role-based access control, and integration logic.

## How It Works

- The **Verifier Contract** checks user eligibility for citizenship by verifying on-chain attestations from Coinbase on the Base network.
- Eligible users claim their citizenship through the **State Department Contract**, which mints a new citizenship token.
- Special editions of citizenship tokens can be issued through the **Commemorative Edition Contract**, with URI updates signed securely off-chain.
- The system is designed with extensibility and security in mind, ensuring that only eligible users can claim citizenship and that token metadata can be securely updated as needed.

## Getting Started

To start working with these contracts, clone the repository, install dependencies, and follow the setup instructions to configure your environment. Ensure you have access to Alchemy or Infura for network access and have set up your `.env` file with the necessary API keys and secrets.

---

Made with love by Dennison Bertram and ChatGPT.

# Hardhat Template [![Open in Gitpod][gitpod-badge]][gitpod] [![Github Actions][gha-badge]][gha] [![Hardhat][hardhat-badge]][hardhat] [![License: MIT][license-badge]][license]

[gitpod]: https://gitpod.io/#https://github.com/paulrberg/hardhat-template
[gitpod-badge]: https://img.shields.io/badge/Gitpod-Open%20in%20Gitpod-FFB45B?logo=gitpod
[gha]: https://github.com/paulrberg/hardhat-template/actions
[gha-badge]: https://github.com/paulrberg/hardhat-template/actions/workflows/ci.yml/badge.svg
[hardhat]: https://hardhat.org/
[hardhat-badge]: https://img.shields.io/badge/Built%20with-Hardhat-FFDB1C.svg
[license]: https://opensource.org/licenses/MIT
[license-badge]: https://img.shields.io/badge/License-MIT-blue.svg

A Hardhat-based template for developing Solidity smart contracts, with sensible defaults.

- [Hardhat](https://github.com/nomiclabs/hardhat): compile, run and test smart contracts
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript bindings for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Solhint](https://github.com/protofire/solhint): code linter
- [Solcover](https://github.com/sc-forks/solidity-coverage): code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter

## Getting Started

Click the [`Use this template`](https://github.com/paulrberg/hardhat-template/generate) button at the top of the page to
create a new repository with this repo as the initial state.

## Features

This template builds upon the frameworks and libraries mentioned above, so for details about their specific features,
please consult their respective documentations.

For example, for Hardhat, you can refer to the [Hardhat Tutorial](https://hardhat.org/tutorial) and the
[Hardhat Docs](https://hardhat.org/docs). You might be in particular interested in reading the
[Testing Contracts](https://hardhat.org/tutorial/testing-contracts) section.

### Sensible Defaults

This template comes with sensible default configurations in the following files:

```text
├── .editorconfig
├── .eslintignore
├── .eslintrc.yml
├── .gitignore
├── .prettierignore
├── .prettierrc.yml
├── .solcover.js
├── .solhint.json
└── hardhat.config.ts
```

### VSCode Integration

This template is IDE agnostic, but for the best user experience, you may want to use it in VSCode alongside Nomic
Foundation's [Solidity extension](https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity).

### GitHub Actions

This template comes with GitHub Actions pre-configured. Your contracts will be linted and tested on every push and pull
request made to the `main` branch.

Note though that to make this work, you must use your `INFURA_API_KEY` and your `MNEMONIC` as GitHub secrets.

For more information on how to set up GitHub secrets, check out the
[docs](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

You can edit the CI script in [.github/workflows/ci.yml](./.github/workflows/ci.yml).

## Usage

### Pre Requisites

First, you need to install the dependencies:

```sh
bun install
```

Then, you need to set up all the required
[Hardhat Configuration Variables](https://hardhat.org/hardhat-runner/docs/guides/configuration-variables). You might
also want to install some that are optional.

To assist with the setup process, run `bunx hardhat vars setup`. To set a particular value, such as a BIP-39 mnemonic
variable, execute this:

```sh
bunx hardhat vars set MNEMONIC
? Enter value: ‣ here is where your twelve words mnemonic should be put my friend
```

If you do not already have a mnemonic, you can generate one using this [website](https://iancoleman.io/bip39/).

### Compile

Compile the smart contracts with Hardhat:

```sh
bun run compile
```

### TypeChain

Compile the smart contracts and generate TypeChain bindings:

```sh
bun run typechain
```

### Test

Run the tests with Hardhat:

```sh
bun run test
```

### Lint Solidity

Lint the Solidity code:

```sh
bun run lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
bun run lint:ts
```

### Coverage

Generate the code coverage report:

```sh
bun run coverage
```

### Report Gas

See the gas usage per unit test and average gas per method call:

```sh
REPORT_GAS=true bun run test
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
bun run clean
```

### Deploy

Deploy the contracts to Hardhat Network:

```sh
bun run deploy:contracts
```

### Tasks

#### Deploy Lock

Deploy a new instance of the Lock contract via a task:

```sh
bun run task:deployLock --unlock 100 --value 0.1
```

### Syntax Highlighting

If you use VSCode, you can get Solidity syntax highlighting with the
[hardhat-solidity](https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity) extension.

## Using GitPod

[GitPod](https://www.gitpod.io/) is an open-source developer platform for remote development.

To view the coverage report generated by `bun run coverage`, just click `Go Live` from the status bar to turn the server
on/off.

## Local development with Ganache

### Install Ganache

```sh
npm i -g ganache
```

### Run a Development Blockchain

```sh
ganache -s test
```

> The `-s test` passes a seed to the local chain and makes it deterministic

Make sure to set the mnemonic in your `.env` file to that of the instance running with Ganache.

## License

This project is licensed under MIT.
