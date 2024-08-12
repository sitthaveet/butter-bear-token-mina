import {
  AccountUpdate,
  Bool,
  Mina,
  PrivateKey,
  PublicKey,
  UInt8,
} from 'o1js';
import { FungibleToken, FungibleTokenAdmin } from './index.js';
import * as dotenv from 'dotenv';

dotenv.config();

class MyToken extends FungibleToken {}

const { privateKey: tokenKey, publicKey: tokenAddress } =
  PrivateKey.randomKeypair();

// Devnet network
const Network = Mina.Network('https://api.minascan.io/node/devnet/v1/graphql');
Mina.setActiveInstance(Network);

// Compile the contract
await FungibleTokenAdmin.compile();
await FungibleToken.compile();
await MyToken.compile();

// paste the private key of the deployer and admin account here
const deployerKey = PrivateKey.fromBase58(
  process.env.DEPLOYER_PRIVATE_KEY || ''
);
const adminKey = PrivateKey.fromBase58(
  process.env.ADMIN_PRIVATE_KEY || ''
);
const deployerAddress = PublicKey.fromPrivateKey(deployerKey);
const adminAddress = PublicKey.fromPrivateKey(adminKey);

// Create a new instance of the contract
const token = new MyToken(tokenAddress);
const fungibleTokenAdmin = new FungibleTokenAdmin(adminAddress);

console.log('Deployer address:', deployerAddress.toString());
console.log('Admin address:', adminAddress.toString());

// token details
const symbol = 'BTB';
const src =
  'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts';

const fee = 1e8;
// const supply = UInt64.from(21_000_000);


// deploy token
try {
  const tx = await Mina.transaction(
    { sender: deployerAddress, fee },
    async () => {
      AccountUpdate.fundNewAccount(deployerAddress, 3);

      await fungibleTokenAdmin.deploy({ adminPublicKey: adminAddress });
      await token.deploy({
        symbol,
        src,
      });
      await token.initialize(adminAddress, UInt8.from(6), Bool(false));
    }
  );
  await tx.prove();
  console.log('tx:', tx.toPretty());

  tx.sign([deployerKey, tokenKey, adminKey]);
  const txResult = await tx.send();
  console.log(
    `See transaction at https://minascan.io/devnet/tx/${txResult.hash}`
  );
  console.log('Token successfully deployed to:', tokenAddress.toString());
} catch (error) {
  console.error('Error deploying token:', error);
}
