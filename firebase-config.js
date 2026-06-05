/* ════════════════════════════════════════════════════════════════════════
   firebase-config.js   ·   ✏️  EDIT THIS ONE FILE TO GO LIVE

   While the values below still say "PASTE_…", the app runs LOCAL-ONLY
   (data is saved in each browser, not shared). The moment you paste your
   real Firebase keys here, every visitor shares one live lottery.

   ── How to get these values ───────────────────────────────────────────
   1.  Go to  https://console.firebase.google.com  →  Add project
       (any name, e.g. "vinlotteri"). You can skip Google Analytics.
   2.  In the left menu open  Build → Realtime Database → Create Database.
       Pick a location, then start in **test mode** (open read/write).
   3.  Back on the project Overview, click the  </>  (Web) icon to
       "Add app". Give it a nickname. Firebase shows you a `firebaseConfig`
       object — copy its values into the matching fields below.
   4.  Make sure `databaseURL` is filled in. If the snippet didn't include
       it, find it at the top of the Realtime Database page — it looks like
       https://YOUR-PROJECT-default-rtdb.firebaseio.com
   5.  Save this file and re-deploy. Done — you're live.

   See  GO-LIVE.md  for the full walkthrough incl. hosting + locking down.
   ════════════════════════════════════════════════════════════════════════ */

window.FIREBASE_CONFIG = {
  apiKey:      "AIzaSyAgG1QymP4xKYiP3Ng2zeQhLIIPQ8cxytA",
  authDomain:  "vinlotteri-drammen.firebaseapp.com",
  databaseURL: "https://vinlotteri-drammen-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:   "vinlotteri-drammen",
  appId:       "1:275665304394:web:d9ff460c238f8701165fb3",
};

/* All visitors who share this room code share one lottery. Change it if you
   ever want a fresh, separate lottery (e.g. "main-2026"). */
window.LOTTERY_ROOM = "main";

/* ── Shared password (login) ───────────────────────────────────────────────
   The whole group signs in with ONE shared account, so the site asks for a
   single password and nothing else. You create this account once in the
   Firebase console (Authentication → Users → Add user) using the email
   below and whatever password you want the group to share.

   Users never see or type this email — it's filled in automatically; they
   only type the shared password. To rotate the password, change it on that
   user in the Firebase console (everyone then needs the new one).

   Leave this as-is and follow GO-LIVE.md step "Lock it down" to enable it.
   While Firebase keys above are still "PASTE_…", login is skipped and the
   app runs locally so this preview keeps working. */
window.MEMBER_EMAIL = "members@vinlotteri.app";
