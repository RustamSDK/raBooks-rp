# Claude Code Guidelines: raBooks by Rustam
- All financial calculations must use signed integer paise without floating-point math.
- Ensure totalAmountPaise - sum(splits.amountPaise) === 0 before committing any transaction.
- Verify responsive layout across tablet viewports (768px to 1024px) for action bar auto-wrapping.
- Use strictly formal corporate English across all UI labels and documentation.
- Maintain dual-ID separation: internal 'RB-TXN-XXXXXX' vs external UTR rail references.
- Spooler Sovereignty: Window print negotiation without forced PDF download.
