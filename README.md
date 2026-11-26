# sPrint 🏃‍♂️

Printing PDF's from Autodesk Cloud (BIM360/ACC) used to be a time consuming task. Going through all drawings and requesting .PDF's took a while and BIM managers need to quality assurance large drawing sets. sPrint is a Chrome extension that allows batch-print PDFs and download things (derivatives) from Autodesk Cloud Platforms.

![ezgif-4-8877da9391](https://github.com/PerkinsAndWill-IO/sPrint/assets/62248969/776ef003-92f6-4031-923c-be8ed1508264)

<br/><br/>

## Get Started 🚀

### Deploy Lambda Function

1. Create AWS account
2. Create AWS IAM
3. In AWS security credentials params, add access key, It will provide you with aws_key_id, aws_secret, aws_region
4. donwload AWS CLI from https://awscli.amazonaws.com/AWSCLIV2.msi
5. Configure AWS credentials with the `aws configure` command
6. Enter credentials from #3
7. Install SAM CLI from https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi
8. cd in lambda folder then run `sam build` (you may have to install esbuild)
9. then `sam package`
10. finally `sam deploy`
11. Change the name of the FunctionName variable in \src\services\aws.ts to your own lambda function

### To run locally 🧑‍💻:

1. Navigate to ./extension folder
2. Create .env file
3. Setup environmental variables:

   [AWS access keys guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
   [APS app creation guide](https://aps.autodesk.com/en/docs/oauth/v1/tutorials/create-app/)

   ```
   VITE_AWS_REGION=*******
   VITE_AWS_ACCESS_KEY_ID=*******
   VITE_AWS_SECRET_ACCESS_KEY=*******

   VITE_APS_CLIENT_ID=*******
   VITE_APS_CLIENT_SECRET=*******
   ```

4. Run `npm run build`
5. Run Chrome and go to `chrome://extensions/`
6. Toggle the **Developer mode** and Load unpacked
   <img width="635" alt="Screenshot 2023-10-31 212944" src="https://github.com/PerkinsAndWill-IO/sPrint/assets/62248969/05d24552-91a3-463f-bbb5-f426ee82ae6c">

7. Load `./extension/dist` folder
8. Check the extension console (right click on the extension in the chrome toolbar) and copy the callback URL, then set it in the APS app that you created.

<br/><br/>

## App (Nuxt) — Local Setup

Important: run `postinstall` (Nuxt prepare) after install. This generates `.nuxt` types and avoids dev server issues.

1. `cd ./app`
2. `pnpm install`
3. `pnpm run postinstall` (runs `nuxt prepare`)
4. `pnpm run dev --port 3000`

### Logging & analytics (PostHog)

All logging and analytics go through one small port, `Telemetry`
(`app/shared/telemetry/telemetry.ts`): `debug/info/warn/error`, `captureException`,
`track`, `identify`. Use `useTelemetry()` in the app and `useRequestTelemetry(event)`
in server routes. Never import `posthog-js` or `posthog-node` outside the adapters
(`app/app/telemetry/posthog-adapter.ts`, `app/server/telemetry/posthog-adapter.ts`).

- Log lines go to **PostHog Logs**, exceptions to **Error Tracking**, product events
  (`hubs_loaded`, `file_selected`, `export_started`/`export_completed`/`export_failed`, …)
  to Product Analytics.
- Every failed APS call is logged server side as `aps.request_failed` with the route,
  APS path, HTTP status, APS error code/message, hub/project ids, region and duration.
- The server also writes every line to stdout (Vercel runtime logs).
- Users are identified by their Autodesk user id only. Tokens, auth codes, cookies,
  signed URLs and emails are scrubbed before anything is sent (`app/shared/telemetry/scrub.ts`).

| Variable | Notes |
|---|---|
| `POSTHOG_KEY` | PostHog project API key (public, write-only), read at build time. Unset = console only. |
| `POSTHOG_HOST` | Defaults to `https://us.i.posthog.com`. |
| `NUXT_PUBLIC_POSTHOG_KEY` / `NUXT_PUBLIC_POSTHOG_HOST` | Same values, read at runtime (no rebuild needed). |

<br/><br/>

## Plugin Architecture 🏛️

The plugin consist of 2 parts:

- Chrome Extension:
  - Popup
  - Background Script - listen to Tab and status changes.
  - Content Script - extends a UI of ACC/BIM360
- Backend:
  - Lambda Function - holds export logic.

![sPrint](https://github.com/PerkinsAndWill-IO/sPrint/assets/62248969/50e0195f-62bb-4108-a5e9-0088fffd77b9)

<br/><br/>

## FAQ ❓
