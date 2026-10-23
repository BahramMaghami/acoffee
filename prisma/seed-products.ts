// Compatibility entrypoint. Import receipts protect administrator edits/deletions.
process.argv.push('--apply')
await import('../scripts/migrate-catalog')
export {}
