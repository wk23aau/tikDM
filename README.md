# tikDM - TikTok Video Downloader Chrome Extension

tikDM is a Chrome extension that allows you to download TikTok videos without a watermark.

## Features

*   Download TikTok videos in HD.
*   No watermarks.
*   Easy to use, with a download button integrated directly into the TikTok UI.
*   Tracks the number of videos you've downloaded.

## How It Works

This extension utilizes a combination of scripts to download TikTok videos:

*   **Content Script (`content.js`)**: Injects a download button onto TikTok video pages. When the button is clicked, it sends the video URL to the background service worker.
*   **Background Service Worker (`background.js`)**: Orchestrates the download process. It opens a hidden tab to `tikwm.com`, a service that provides watermark-free TikTok videos. A script is then executed to fetch the video, and the `chrome.downloads` API is used to save the video file.
*   **Popup (`popup.html` & `popup.js`)**: Displays the total number of videos downloaded.
*   **Manifest V3**: The extension is built using the latest Chrome extension platform.

## Installation

1.  Clone this repository to your local machine.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the directory where you cloned the repository.

## Contributing

We welcome contributions from the community. If you would like to contribute, please fork the repository and submit a pull request.

## About the Developer

This extension was developed by [xvanced.co.uk](https://xvanced.co.uk) for public benefit and learning purposes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
