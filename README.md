# PLASMA-BOT — WispByte version

Render-specific URL/code has been removed.

## WispByte Environment Variables

Required:
- `DISCORD_TOKEN` = your Discord bot token
- `API_KEY` = a private key used by the local API

Optional:
- `API_URL` = the public URL of this WispByte server/API, ending with `/`
- `PORT` = normally supplied by WispByte

## Startup

Use:

```text
npm start
```

The bot also starts its Express API on the WispByte-assigned PORT.

## Important

If Minecraft/server-side software needs to call `/api/pending`, `/api/buy`,
`/api/done`, etc., set `API_URL` to the public WispByte URL for this server.

Do not put your Discord token in GitHub.
