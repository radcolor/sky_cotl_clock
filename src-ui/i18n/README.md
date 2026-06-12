# Isekai translations

Isekai uses BCP 47 locale codes and English source strings in
`src-ui/i18n/messages/en.ts`.

To improve a translation:

1. Open the locale file, such as `messages/es.ts` or `messages/hi.ts`.
2. Replace English fallback strings with translated values for the same keys.
3. Keep placeholders such as `{count}` unchanged.
4. Leave Sky game content names in English unless the app adds localized game
   data later.
5. Run `bun run test` and `bun run build`.

New languages need an entry in `SUPPORTED_LOCALES`, a message file, and locale
resolution coverage if the language has common variants.
