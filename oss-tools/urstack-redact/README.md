# urstack-redact

Strip secrets and PII from text before it goes into an AI tool. Same rules the Guard
extension runs, in a single file you can read.

## Install

```bash
npx urstack-redact --help
cd oss-tools/urstack-redact && npm link
```

## Usage

```bash
urstack-redact notes.md
cat draft.txt | urstack-redact
urstack-redact ticket.md --map
```

Keys, tokens, private-key blocks, JWTs, emails, phone numbers and Luhn-valid card numbers
become stable placeholders (`<EMAIL_1>`, `<AWS_KEY_1>`) so the text still reads and still
answers the question. Placeholders are numbered per run and never contain the original.

Card numbers are checked with Luhn before they are touched, which keeps order IDs and
timestamps out of the report.

`--map` prints the count per category to **stderr**, so `stdout` stays clean for piping.

## License

MIT (c) 2026 Apoorv Chowdhary (UrStack)
