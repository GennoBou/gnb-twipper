[日本語版 (Japanese)](./PRIVACY_POLICY_ja.md)

# Privacy Policy for GNB Twipper

**Last Updated**: August 9, 2026

**GNB Twipper** ("the Extension") values your privacy. This Privacy Policy explains how your information is handled when you use the Extension.

---

## 1. Data Collection and Usage

- **No Personally Identifiable Information (PII) Collection**: The Extension does **not** collect, store, or transmit any personally identifiable information, such as your name, email address, IP address, or payment details.
- **Local Data Storage**: All user settings, custom CSS/JS scripts, rotation interval preferences, and channel exclusion lists are stored **strictly locally** on your browser using standard browser extension storage (`chrome.storage.local`).
- **No Third-Party Analytics**: We do not use any third-party tracking scripts, analytics tools, or advertising networks.

---

## 2. Network Communications

- The Extension connects directly to official Twitch APIs (`twitch.tv`, `gql.twitch.tv`) solely to fetch your follow lists, live stream status, and manage player state as requested by your actions.
- No network requests are sent to any external server owned or operated by the Extension developers.

---

## 3. Permissions Used

The Extension requests permissions only to provide core functionality:
- `storage`: To save user preferences locally.
- `alarms`: To handle timing for stream rotation.
- `scripting`: To apply user-configured custom CSS/JS onto Twitch pages.
- `activeTab` & `tabs`: To enable seamless switching between streams.
- `cookies`: To maintain your active Twitch session.

---

## 4. Changes to This Policy

We may update this Privacy Policy from time to time. Any updates will be published in this repository and documented in release notes.

---

## 5. Contact Us

If you have any questions or concerns regarding this Privacy Policy, please open an issue on our GitHub repository:
[https://github.com/GennoBou/gnb-twipper/issues](https://github.com/GennoBou/gnb-twipper/issues)
