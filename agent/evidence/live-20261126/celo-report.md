# Celo docs describe an OP Stack L2 with EigenDA and stablecoin gas; the L2 label is a publisher claim, not independently verified here

AI-generated report. Prepared by Joan.

## Summary
Celo's own documentation asserts that its chain runs as an Ethereum Layer 2 built on the OP Stack, with an EVM-compatible execution layer, EigenDA for data availability, and Ethereum for settlement [1]. It also asserts that gas can be paid in several ERC-20 tokens on Celo-optimized wallets, while non-optimized wallets need CELO [2]. These are project assertions from a single publisher; the excerpts contain no independent audit, adoption metrics, uptime data, or third-party verification, so the L2 characterization and fee-currency benefits remain claims rather than demonstrated facts [1][2].

Celo's architecture page states that the Celo blockchain 'operates as a Layer 2 (L2) solution using the OP Stack,' split into an EVM-compatible execution layer, a data availability layer using EigenDA, and a settlement layer that 'leverages Ethereum to finalize transactions' [1]. The same page describes a sequencer that gathers transactions, forms blocks, and submits them to Ethereum L1 for final settlement, operating on a 1-second block time [1].

For developers, the documentation frames these choices as offering easy deployment of Ethereum smart contracts via EVM compatibility, cost-efficient data availability through EigenDA, and Ethereum-backed settlement security [1]. It also lists core contracts — Attestations, Governance, StableToken (e.g., USDm, EURm), Exchange, SortedOracles, and Validators — as building blocks available to applications [1].

On fees, the gas-fees page asserts that with a 'Celo-optimized wallet,' gas can be paid in various ERC-20 tokens including USDC, USD₮, USA₮, USDm and CELO, while non-optimized wallets require CELO [2]. It also states CELO is listed on '20+ exchanges' and points to Squid Router V2, SmolRefuel (labeled gas-free), and other bridges for moving assets to Celo [2].

All of the above are publisher assertions from Celo's documentation, not independent corroboration [1][2]. The excerpts do not include third-party verification of the L2 designation, no audit results, no on-chain adoption or usage figures, no uptime or reliability data, and no evidence that the listed wallets or bridges actually support the described fee behavior [1][2]. The '20+ exchanges' figure and the gas-free bridging label are likewise unverified claims [2].

What these sources cannot establish: whether Celo's L2 deployment matches the described architecture in practice, whether EigenDA and Ethereum settlement perform as claimed, whether stablecoin gas payment works across the named wallets, or how reliable and widely adopted the network is [1][2]. Confirming any of this would require independent sources such as block explorers, L2Beat-style tracking, audits, or third-party reporting, none of which are in the supplied excerpts [1][2].

## What we know
- Celo's docs assert the chain runs as an Ethereum L2 on the OP Stack with EVM-compatible execution, EigenDA data availability, and Ethereum settlement [1].
- The docs describe a sequencer submitting blocks to Ethereum L1 with a 1-second block time [1].
- The docs list core contracts including Attestations, Governance, StableToken (USDm, EURm), Exchange, SortedOracles, and Validators [1].
- The gas-fees page asserts Celo-optimized wallets can pay gas in USDC, USD₮, USA₮, USDm and CELO, while non-optimized wallets need CELO [2].
- The gas-fees page asserts CELO is listed on 20+ exchanges and names Squid Router V2, SmolRefuel, and other bridges [2].

## What remains unclear
- Whether the L2 architecture described is independently verified; only Celo's own documentation is supplied [1].
- Whether stablecoin gas payment actually works across the named wallets and tokens in practice [2].
- Whether the '20+ exchanges' listing and 'gas-free' bridging labels are accurate [2].
- No adoption, usage, uptime, audit, or reliability data appears in the excerpts [1][2].

## Sources
[1] L2 Architecture - Celo Docs: https://docs.celo.org/learn/network/architecture
Fetched publisher text; publisher claims are not independent corroboration. Excerpt may be truncated. Cite by 1-based source index.

[2] Getting CELO for Gas Fees - Celo Docs: https://docs.celo.org/learn/gas-fees
Fetched publisher text; publisher claims are not independent corroboration. Excerpt may be truncated. Cite by 1-based source index.

## Confidence
low: Both sources are Celo's own documentation, so they establish what the project claims but not independent verification of the L2 designation, fee-currency behavior, or reliability. No third-party or on-chain evidence is included, and the excerpts are truncated.

## Research spending
0 USDC. Public source retrieval is free. LLM provider usage is not included in this purchase ledger.
