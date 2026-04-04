
  # Salon Management SaaS App

  This is a code bundle for Salon Management SaaS App. The original project is available at https://www.figma.com/design/RSP3K6tCyxMRxTaEvCH5fn/Salon-Management-SaaS-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Mobile packaging (Capacitor)

  This project is configured with Capacitor.

  1. Install dependencies:
     `npm i`
  2. Build web app and sync native projects:
     `npm run mobile:sync`
  3. Open Android project in Android Studio:
     `npm run cap:open:android`
  4. Open iOS project in Xcode (macOS required):
     `npm run cap:open:ios`

  Quick launch shortcuts:

  - Android: `npm run mobile:android`
  - iOS: `npm run mobile:ios`

  If native folders do not exist yet, create them once:

  - Android: `npm run cap:add:android`
  - iOS: `npm run cap:add:ios`
  
