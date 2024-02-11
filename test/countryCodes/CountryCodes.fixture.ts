// Import statements assuming your environment is set up to support ES6 imports for these operations
import { ethers } from "hardhat";
import fs from 'fs';
import { parse } from 'csv-parse/sync';
// import latinize from 'latinize';

// import all from "../../deploy/countryCodes/wikipedia-iso-country-codes.csv";
type Country = {
  name: string;
  abbreviation: string;
};

// Assuming this is an async function where you need to use `latinize`
async function readAndPrepareCountryData(): Promise<Country[]> {
  // Dynamically import the `latinize` module
  // const latinize = (await import('latinize')).default;

  // Your existing logic here, for example:
  const csvPath = './test/countryCodes/codes.csv';
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true
  });

  const countries = records.map(record => ({
    name: record["English short name lower case"],
    abbreviation: record["Alpha-2 code"]
  }));

  return countries;
}

// Fixture to deploy CountryCodes contract with initial country list
export async function deployCountryCodesFixture() {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const countries = await readAndPrepareCountryData();

  const CountryCodes = await ethers.getContractFactory("CountryCodes");
  const countryCodes = await CountryCodes.deploy(admin.address);

  return { countryCodes, admin, signers, countries };
}
