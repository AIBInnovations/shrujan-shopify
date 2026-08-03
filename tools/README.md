# Tools

`sync-live.mjs` compares this theme against the live one and, with `--fix`,
pushes whatever differs — the check that proves the store is running what the
repo says, since the GitHub integration is eventually consistent and can reject
a file quietly.

Both scripts read the store credentials from the `shopify-claudify` MCP server's
`stores.json` (`/Users/moon/Documents/mcp shopify/shopify-mcp/`). That folder
has to be present; without it the theme still deploys perfectly well through the
GitHub connection, this just cannot verify it.

    node tools/sync-live.mjs          # report only
    node tools/sync-live.mjs --fix    # push the differences
