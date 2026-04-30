## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Deploy to Etherium
forge create src/DocumentRegistry.sol:DocumentRegistry \
  --rpc-url https://mainnet.infura.io/v3/b664e89be59243f387fa848c6473cfb6 \
  --private-key 8c00de1a865d6a713efec8941bd2a5b0b75bab488181ef5190ee4b06d2443ab6 \
  --broadcast \
  --verify

forge create src/DocumentRegistry.sol:DocumentRegistry \
  --rpc-url https://mainnet.infura.io/v3/b664e89be59243f387fa848c6473cfb6 \
  --private-key 8c00de1a865d6a713efec8941bd2a5b0b75bab488181ef5190ee4b06d2443ab6 \
  --broadcast \
  --verify \
  --etherscan-api-key 9T8K5AF24S44T4GR8KW2PSMCXBJXS9GDYV

# Copy the deployed address above ↑
Deployed to: 0x16AA9B509D1568BE832af8424b026B4B94183DeA
Transaction hash: 0x391a03a59bd264b2ca229c60ff4e3c2736e8ef7d61192117f42c60a466cf21f3

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
