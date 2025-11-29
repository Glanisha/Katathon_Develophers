

# SafeWalk – Route Safety Companion

Katathon project developed with TomTom APIs and supporting ecosystem services.

---

## Overview

SafeWalk is a pedestrian-first navigation platform that prioritizes user safety over shortest path routing. It evaluates street lighting, incident history, congestion, weather conditions, and user reports to generate the safest possible walking route. The system integrates mobile application functionality with backend intelligence to provide real-time safety scoring and emergency response capabilities.

---

## Technology Stack

Mobile Application

* React Native + Expo

Backend

* Node.js + Express
* MongoDB (Primary Datastore with incident + lighting DB internally stored)

External Services

* TomTom Routing & Traffic APIs
* Open Weather API
* Gemini for incident AI classification
* ElevenLabs voice safety agent
* Cloudinary for image upload and storage
* Twilio for SMS-based SOS alerts

Deployment

* Backend currently deployed on Render

---

## Backend Setup

1. Clone repository

```
git clone <repo-link>
cd backend
```

2. Create a `.env` file and add the following keys (replace placeholders with actual values)

```
MONGODB_URI="<your_mongo_string>"
JWT_SECRET="<secret>"

TOMTOM_API_KEY="<key>"
GEMINI_API_KEY="<key>"

CLOUDINARY_CLOUD_NAME="<name>"
CLOUDINARY_API_KEY="<key>"
CLOUDINARY_API_SECRET="<secret>"

TWILIO_ACCOUNT_SID="<sid>"
TWILIO_AUTH_TOKEN="<token>"
TWILIO_FROM_NUMBER="<number>"

EMAIL_USER="<email>"
EMAIL_PASS="<app_password>"
DEFAULT_COUNTRY_CODE=91
```

3. Install dependencies

```
npm install
```

4. Run backend locally

```
npm run dev
```

5. Live backend endpoint (optional)

```
https://safewalk-3sv0.onrender.com/
```

---

## Expo App Setup

1. Navigate to app directory

```
cd native
```

2. Create `.env` with the following

```
EXPO_PUBLIC_TOMTOM_API_KEY=<tomtom_key>
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=<agent_id>
```

3. Install dependencies and run

```
npm install
expo start
```

---

## Backend Selection Inside App

Location: `native/src/api/api.js`

For local development

```js
const YOUR_LOCAL_IP = "YOUR_LOCAL_IPV4_ADDRESS"
const BACKEND_PORT = 5000
const BASE_URL = `http://${YOUR_LOCAL_IP}:${BACKEND_PORT}/api`
```

To use deployed backend

```js
const BASE_URL = "https://safewalk-3sv0.onrender.com/api"
```

---

## Project Attribution

SafeWalk was built as part of Katathon in association with TomTom API integration and supporting datasets.


