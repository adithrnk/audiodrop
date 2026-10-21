# AudioDrop

A clean, ad-free browser audio converter prototype. It converts a local audio/video file to MP3 using FFmpeg.wasm and offers an optional downloader for direct media-file URLs when the server allows browser access.

## Features
- Responsive, mobile-friendly interface
- No ads or account requirement in this static project
- Local audio/video file selection and drag-and-drop
- MP3 bitrate options: 128, 192, 256, 320 kbps
- Direct-file URL download attempt with clear CORS limitations
- Browser-side conversion; the selected local file is not uploaded to an application server by this code

## Run and deploy
1. Upload `index.html`, `styles.css`, `script.js`, and `README.md` to the root of a GitHub repository.
2. Open repository **Settings → Pages**.
3. Set source to **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. Open the generated GitHub Pages URL over HTTPS.

## Important limitations
- This project does **not** extract audio from YouTube or Instagram page URLs, bypass access controls, or download restricted/copyrighted content. Use official download options or files/links you are authorized to use.
- Conversion uses FFmpeg.wasm and its core files from jsDelivr, so the first conversion needs internet access. CDN availability, browser memory limits, and mobile-device performance can affect conversion.
- Direct URL downloading depends on the remote server's CORS policy and may fail even when the link opens in a browser.
- MP3 encoding at a higher bitrate does not restore quality missing from the source.
- This starter is not an audited production service. Review CDN dependencies, test on target devices, and provide clear privacy information before a public launch.

## License
Choose a license appropriate for your project and dependencies before distributing.
