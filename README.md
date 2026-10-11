# CareConnect

CareConnect is a multi-role care-service platform with a Vite + React + Ant Design frontend, a Next.js API, TypeScript, Prisma, and MongoDB. Sign-in uses phone-number OTP verification. Customers can register themselves; agency staff and administrators must be provisioned by the agency.

## Local setup

Requirements: Node.js 20.19+ or 22.12+, npm, and a MongoDB Atlas cluster (or a MongoDB replica set).

1. In Atlas, add your development IP under Network Access and create a Database Access user with read/write access. These credentials are separate from your Atlas account login.
2. Copy .env.example to .env. Set DATABASE_URL to your Atlas URI with the database name careconnect in the path, for example:

    mongodb+srv://<database-user>:<url-encoded-password>@cluster0.example.mongodb.net/careconnect?retryWrites=true&w=majority

   Use a URL-encoded database password if it contains reserved URI characters. Set AUTH_SECRET to a random secret with at least 32 characters. Do not commit .env.
3. Install packages with npm install.
4. Generate Prisma Client with npm run db:generate.
5. Sync the schema with MongoDB using npm run db:push. This creates/synchronizes the CareConnect collections and indexes.
6. Start both local servers with npm run start and open http://localhost:5173. Vite Fast Refresh updates the page as you edit, and Next.js reloads API changes on port 3001. You do not need a production build for ordinary local code changes.

For local OTP sign-in, keep OTP_MODE=development in .env. The app displays the development code after requesting it; its default is 424242. No SMS is sent in this mode. You can set OTP_DEV_CODE to a different six-digit local code.

## Login and account roles

- Customers create an account with their name, email, Indian mobile number, address, and industry, then verify the phone using a one-time code. The +91 prefix is added automatically to a 10-digit mobile number.
- Caregivers, managers, and admins do not have public registration. An agency administrator provisions them and links their phone number.
- All roles use the same phone OTP sign-in page. The API chooses the dashboard using the account role stored in MongoDB; a client cannot select or elevate its role.
- The address form requires a street/locality, city, Indian state or union territory, and six-digit PIN code. It validates the address fields and PIN format locally; it does not confirm that a street address is physically deliverable.
- Accounts created before address and industry became required are prompted to complete those details when they next sign in.
- Forgot-password screens return to phone sign-in because OTP replaces password sign-in.

### Create the first administrator

Use a trusted local terminal with the app stopped and the intended DATABASE_URL configured in .env. Set these PowerShell values, then run the bootstrap command:

    $env:ADMIN_NAME = "CareConnect Administrator"
    $env:ADMIN_EMAIL = Read-Host "Administrator email"
    $env:ADMIN_PHONE = Read-Host "Administrator's 10-digit Indian mobile number"
    $env:ADMIN_ADDRESS_LINE = Read-Host "House/building, street, and locality"
    $env:ADMIN_CITY = Read-Host "City or town"
    $env:ADMIN_STATE = Read-Host "State or union territory"
    $env:ADMIN_PINCODE = Read-Host "Six-digit Indian PIN code"
    $env:ADMIN_INDUSTRY = Read-Host "Industry or field of work"
    npm run db:bootstrap-admin
    Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PHONE, Env:ADMIN_ADDRESS_LINE, Env:ADMIN_CITY, Env:ADMIN_STATE, Env:ADMIN_PINCODE, Env:ADMIN_INDUSTRY

The command creates only the first admin and refuses if one already exists. Sign in using the phone number and OTP.

### Link an existing agency account

For an account created before phone OTP was added, run this in PowerShell with the same MongoDB database:

    $env:LINK_USER_EMAIL = Read-Host "Existing account email"
    $env:LINK_USER_PHONE = Read-Host "10-digit Indian mobile number (or the existing full international number)"
    npm run db:link-phone
    Remove-Item Env:LINK_USER_EMAIL, Env:LINK_USER_PHONE

This does not change the account's role. It refuses to take a phone number already linked to another account. The account holder must be able to receive SMS at that number for Twilio verification.

### Optional local demo accounts

Run npm run db:seed after db:push. It creates demo admin, manager, customer, and caregiver accounts with fake +1 phone numbers ending in 0101, 0102, 0103, and 0104. In local development, use the displayed OTP (default 424242). These fixture accounts and numbers are for development only.

## Configure SMS for production

Create a Twilio Verify service, then set these server-side environment variables in the deployment platform:

- OTP_MODE=twilio
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_VERIFY_SERVICE_SID

Set OTP_MODE=twilio locally when you want to exercise actual SMS delivery. Never expose the Twilio credentials in frontend variables or commit them. Production does not use the development OTP.

## Build and run

For local development, use npm run start (npm run dev is an equivalent alias). The Vite frontend listens on port 5173 and the Next.js API on port 3001, with automatic updates and no production build. If you change prisma/schema.prisma, stop the app and run npm run db:generate, then npm run db:push, before starting again. For Render or another cloud deployment, run npm run build and use npm run start:prod; the frontend preview listens on the assigned PORT and the API on port 5001. The Dockerfile already builds the production assets and starts with start:prod.

This repository includes a Dockerfile for deploying the Vite frontend and Next.js API together. In Render, create a Docker Web Service, configure DATABASE_URL, AUTH_SECRET, APP_URL, and the Twilio Verify variables, then deploy. Add the Render service's outbound IP access in MongoDB Atlas, or configure the Atlas network policy appropriate to your hosting setup. Before first production use, run npm run db:push from a trusted terminal pointed at the production database.

## Environment variables

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | MongoDB Atlas URI with careconnect as its database path |
| AUTH_SECRET | Secret used to sign sessions; at least 32 characters |
| APP_URL | Public app origin |
| OTP_MODE | development for local displayed codes; twilio for SMS verification |
| OTP_DEV_CODE | Optional six-digit local OTP; defaults to 424242 |
| TWILIO_ACCOUNT_SID | Twilio account SID, needed when OTP_MODE is twilio |
| TWILIO_AUTH_TOKEN | Twilio secret, needed when OTP_MODE is twilio |
| TWILIO_VERIFY_SERVICE_SID | Twilio Verify service SID, needed when OTP_MODE is twilio |
| STORAGE_URL, STORAGE_KEY | Reserved for private document storage integration |
| EMAIL_API_KEY, EMAIL_FROM | Reserved for email delivery features |

## Care workflow

Managers assign verified caregivers to customer requests. Caregivers accept assignments, check in/out, and update tasks. Customers can review completed assignments. Admins have the agency-wide manager queue. Protected APIs enforce roles on each operation.

The MVP still needs production-grade distributed rate limiting, protected document storage and upload scanning, monitoring, and automated integration coverage before handling sensitive care records at scale.
