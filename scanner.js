const BarcodeScanner = (() => {
  let controls = null;
  let reader = null;
  let active = false;

  const $ = id => document.getElementById(id);

  function message(text) {
    const el = $("scannerMessage");
    if (el) el.textContent = text;
  }

  async function stop() {
    active = false;
    try {
      controls?.stop();
    } catch (error) {
      console.warn("Scanner stop warning:", error);
    }
    controls = null;

    const video = $("barcodeVideo");
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }

    $("barcodeScanner")?.classList.add("hidden");
  }

  async function start(onDetected) {
    if (!window.ZXingBrowser) {
      throw new Error("The barcode-scanning library did not load.");
    }

    await stop();
    $("barcodeScanner").classList.remove("hidden");
    message("Starting the camera…");

    reader = new ZXingBrowser.BrowserMultiFormatReader();
    active = true;

    try {
      controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        $("barcodeVideo"),
        async (result, error, scanControls) => {
          if (!active) return;

          if (result) {
            const barcode = result.getText().trim();
            message(`Barcode found: ${barcode}`);
            scanControls.stop();
            await stop();
            await onDetected(barcode);
            return;
          }

          // NotFoundException is expected while the camera is searching.
          if (error && error.name &&
              !["NotFoundException", "ChecksumException", "FormatException"].includes(error.name)) {
            console.warn("Barcode scan warning:", error);
          }
        }
      );

      message("Hold the barcode steady inside the camera view.");
    } catch (error) {
      await stop();
      if (error?.name === "NotAllowedError") {
        throw new Error("Camera access was declined. Allow camera access in Safari settings and try again.");
      }
      if (error?.name === "NotFoundError") {
        throw new Error("No suitable camera was found.");
      }
      throw error;
    }
  }

  return { start, stop };
})();
