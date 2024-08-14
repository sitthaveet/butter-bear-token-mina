import * as dotenv from "dotenv";
import {Mina, PrivateKey, PublicKey, UInt64, AccountUpdate} from "o1js";
import {FungibleToken, FungibleTokenAdmin} from "./index.js";
import { equal } from "node:assert";

dotenv.config();

const Network = Mina.Network("https://api.minascan.io/node/devnet/v1/graphql");
Mina.setActiveInstance(Network);

class MyToken extends FungibleToken {}

// comiple
await FungibleTokenAdmin.compile();
await FungibleToken.compile();
await MyToken.compile();

// setup token address
const tokenKey = PrivateKey.fromBase58(
    process.env.TOKEN_PRIVATE_KEY || ''
  );
const tokenAddress = PublicKey.fromBase58(process.env.TOKEN_PUBLIC_KEY || '');
const token = new MyToken(tokenAddress);
console.log("token: ", token);
console.log("token ID: ", token.deriveTokenId());

// setup admin key
const adminKey = PrivateKey.fromBase58(
    process.env.ADMIN_PRIVATE_KEY || ''
  );


// minter
const mintToAddress = PublicKey.fromBase58(process.env.MINT_TO_ADDRESS || '');
const mintAmount = UInt64.from(100);

const deployerKey = PrivateKey.fromBase58(
    process.env.DEPLOYER_PRIVATE_KEY || ''
  );
  const deployerAddress = PublicKey.fromPrivateKey(deployerKey);

const fee = 100_000_000;


// get owner balance before mint
const ownerBalanceBeforeMint = (await token.getBalanceOf(mintToAddress)).toBigInt();
console.log("owner balance before mint:", ownerBalanceBeforeMint);
equal(ownerBalanceBeforeMint, 0n);

// Mint token transaction
console.log("Minting token starts...");
try {
  const mintTx = await Mina.transaction(
    {
      sender: deployerAddress,
      fee,
    },
    async () => {
      AccountUpdate.fundNewAccount(deployerAddress, 2);
      await token.mint(mintToAddress, mintAmount);
    }
  );
  await mintTx.prove();
  console.log("Mint tx signing...");
  mintTx.sign([deployerKey, adminKey]);
  console.log("Mint tx signing done");
  const mintTxResult = await mintTx.send().then((v) => v.wait());
  console.log("Mint tx result:", mintTxResult.toPretty());
  equal(mintTxResult.status, "included");

  console.log(
    `See transaction at https://minascan.io/devnet/tx/${mintTxResult.hash}`
  );

  console.log("Mint token done");

  // get owner balance after mint
  const ownerBalanceAfterMint = (await token.getBalanceOf(mintToAddress)).toBigInt();
  console.log("owner balance after mint:", ownerBalanceAfterMint);
  equal(ownerBalanceAfterMint, mintAmount.toBigInt());
} catch (error) {
  console.error("Error minting token:", error);
}