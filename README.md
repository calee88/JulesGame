# Pistol Game - Android & Web

This is a Phaser 3 game wrapped in a standard Android Studio project structure.

## How to Run

### Option 1: Web Browser (Testing)
1.  Navigate to the `android/app/src/main/assets/www/` directory.
2.  Open `index.html` in your browser.
    *   *Note:* Some browsers block local file loading for security. You may need to run a local server (e.g., `python3 -m http.server` inside that folder) and visit `localhost:8000`.

### Option 2: Android (Device)
1.  Open the `android/` folder in **Android Studio**.
2.  Allow Gradle to sync and download dependencies.
3.  Connect your Android device or start an Emulator.
4.  Click **Run** (Green Play Button).

## Controls
*   **Swipe Up/Down (Top Half):** Switch Modes (Pistol / Shield / Sword).
*   **Tap Upper Bottom (Invisible Button):** Attack (Fire Bullet).
*   **Tap Lower Bottom (Invisible Button):** Dodge (Invincibility).

## Project Structure
*   `android/`: The Android Studio project root.
*   `android/app/src/main/assets/www/`: The web source code (HTML/JS/Phaser).
    *   `game.js`: Main game logic.
    *   `index.html`: Entry point.
*   `docs/`: Static web build for GitHub Pages (copy of the www assets).

## How to Deploy to GitHub Pages
1.  Push this repository to GitHub.
2.  Go to **Settings** > **Pages**.
3.  Under **Source**, select **Deploy from a branch**.
4.  Under **Branch**, select `main` (or your current branch) and the `/docs` folder.
5.  Click **Save**.
6.  Your game will be available at `https://<your-username>.github.io/<repo-name>/`.
