/* AudioDrop starter.
   Conversion uses FFmpeg.wasm loaded from a CDN. First conversion needs internet access.
   Only process files you own or are allowed to use.
*/
const fileInput = document.querySelector("#fileInput");
const chooseBtn = document.querySelector("#chooseBtn");
const dropzone = document.querySelector("#dropzone");
const fileDetails = document.querySelector("#fileDetails");
const fileName = document.querySelector("#fileName");
const fileMeta = document.querySelector("#fileMeta");
const quality = document.querySelector("#quality");
const sourceUrl = document.querySelector("#sourceUrl");
const convertBtn = document.querySelector("#convertBtn");
const downloadSourceBtn = document.querySelector("#downloadSourceBtn");
const removeFile = document.querySelector("#removeFile");
const statusEl = document.querySelector("#status");
const progressWrap = document.querySelector("#progressWrap");
const progressBar = document.querySelector("#progressBar");
const progressText = document.querySelector("#progressText");

let selectedFile = null;
let ffmpeg = null;
let ffmpegLoadPromise = null;

function status(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function useFile(file) {
  if (!file) return;
  selectedFile = file;
  fileName.textContent = file.name;
  fileMeta.textContent = `${formatBytes(file.size)} · ${file.type || "Unknown media type"}`;
  fileDetails.hidden = false;
  status("File ready. Choose a quality, then convert to MP3.");
}
function clearFile() {
  selectedFile = null;
  fileInput.value = "";
  fileDetails.hidden = true;
  status("Choose a file to get started.");
}
chooseBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  fileInput.click();
});
dropzone.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  fileInput.click();
});
dropzone.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => useFile(fileInput.files[0]));
removeFile.addEventListener("click", clearFile);
["dragenter", "dragover"].forEach(name => dropzone.addEventListener(name, event => {
  event.preventDefault();
  dropzone.classList.add("dragover");
}));
["dragleave", "drop"].forEach(name => dropzone.addEventListener(name, event => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
}));
dropzone.addEventListener("drop", event => useFile(event.dataTransfer.files[0]));

function safeOutputName(name) {
  const base = name.replace(/\.[^/.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 90) || "audio";
  return `${base}.mp3`;
}
async function loadEngine() {
  if (ffmpeg) return ffmpeg;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;
  ffmpegLoadPromise = (async () => {
    if (!window.FFmpegWASM) throw new Error("The conversion engine could not load. Check your internet connection and reload this page.");
    const { FFmpeg } = window.FFmpegWASM;
    const engine = new FFmpeg();
    engine.on("progress", ({ progress }) => {
      const percent = Math.max(0, Math.min(99, Math.round(progress * 100)));
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `Converting ${percent}%`;
    });
    // UMD core assets are fetched from jsDelivr. This is a third-party CDN dependency.
    await engine.load({
      coreURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
      wasmURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm"
    });
    ffmpeg = engine;
    return engine;
  })();
  try { return await ffmpegLoadPromise; }
  catch (error) { ffmpegLoadPromise = null; throw error; }
}

convertBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    status("Choose a local audio or video file first. Direct URL conversion is not supported in this starter.", "error");
    fileInput.click();
    return;
  }
  if (selectedFile.size > 250 * 1024 * 1024) {
    status("This starter limits files to 250 MB to reduce memory issues on phones.", "error");
    return;
  }
  const originalText = convertBtn.innerHTML;
  convertBtn.disabled = true;
  downloadSourceBtn.disabled = true;
  progressWrap.hidden = false;
  progressBar.style.width = "3%";
  progressText.textContent = "Loading engine…";
  status("Loading the browser conversion engine. The first run may take a little while.");
  let inputName = "input_media";
  let outputName = "output.mp3";
  try {
    const engine = await loadEngine();
    const extMatch = selectedFile.name.match(/\.([a-z0-9]{1,8})$/i);
    const ext = (extMatch ? extMatch[1] : "bin").toLowerCase();
    inputName = `input.${ext.replace(/[^a-z0-9]/g, "") || "bin"}`;
    outputName = safeOutputName(selectedFile.name);
    progressBar.style.width = "8%";
    progressText.textContent = "Reading file…";
    await engine.writeFile(inputName, new Uint8Array(await selectedFile.arrayBuffer()));
    status("Converting your file to MP3…");
    await engine.exec(["-i", inputName, "-vn", "-codec:a", "libmp3lame", "-b:a", `${quality.value}k`, "-y", outputName]);
    const output = await engine.readFile(outputName);
    if (!output || !output.length) throw new Error("No MP3 output was created. This file format may not be supported.");
    const blob = new Blob([output], {type: "audio/mpeg"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outputName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    progressBar.style.width = "100%";
    progressText.textContent = "Complete";
    status("Done! Your MP3 download should begin automatically.", "success");
    try { await engine.deleteFile(inputName); await engine.deleteFile(outputName); } catch (_) {}
  } catch (error) {
    console.error(error);
    status(error.message || "Conversion failed. Try a smaller or different file.", "error");
    progressText.textContent = "Could not convert";
  } finally {
    convertBtn.disabled = false;
    downloadSourceBtn.disabled = false;
    convertBtn.innerHTML = originalText;
  }
});

downloadSourceBtn.addEventListener("click", async () => {
  const raw = sourceUrl.value.trim();
  if (!raw) {
    status("Paste a direct downloadable media-file URL first.", "error");
    sourceUrl.focus();
    return;
  }
  let parsed;
  try { parsed = new URL(raw); } catch (_) {
    status("Enter a valid URL beginning with https://", "error");
    return;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    status("Only http or https links are supported.", "error");
    return;
  }
  status("Trying to fetch the direct file. This only works when the host allows browser access and downloads.");
  downloadSourceBtn.disabled = true;
  try {
    const response = await fetch(parsed.href);
    if (!response.ok) throw new Error(`The source server returned ${response.status}.`);
    const blob = await response.blob();
    if (!blob.size) throw new Error("The server returned an empty file.");
    const fileNameFromHeader = response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1];
    const pathName = decodeURIComponent(parsed.pathname.split("/").pop() || "download");
    const name = (fileNameFromHeader || pathName).replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120) || "download";
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    status("Download started. Note: this downloads the original file; it does not convert the URL to MP3.", "success");
  } catch (error) {
    status("Could not fetch this URL. The host may block browser access (CORS), require sign-in, or provide a web page instead of a direct media file. Download the file through an authorized method, then upload it above.", "error");
  } finally {
    downloadSourceBtn.disabled = false;
  }
});
