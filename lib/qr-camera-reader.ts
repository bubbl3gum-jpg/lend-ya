import { BrowserQRCodeReader } from "@zxing/browser";
import { cameraDiagnostic } from "./camera-diagnostics";

/** QR detection can miss a valid axis-aligned pattern at one sampling geometry.
 * Keep the normal detector first, then at most two real-pixel transforms. No
 * PURE_BARCODE assumption, decoded value synthesis or verification fallback. */
export class CameraQrReader extends BrowserQRCodeReader {
  private alternate: HTMLCanvasElement | null = null;
  override decodeFromCanvas(
    canvas: HTMLCanvasElement,
  ): ReturnType<BrowserQRCodeReader["decodeFromCanvas"]> {
    cameraDiagnostic("frame");
    try {
      const result = super.decodeFromCanvas(canvas);
      cameraDiagnostic("native-decoded");
      return result;
    } catch (error) {
      const kind =
        error &&
        typeof error === "object" &&
        "getKind" in error &&
        typeof error.getKind === "function"
          ? error.getKind()
          : undefined;
      if (
        !["NotFoundException", "ChecksumException", "FormatException"].includes(
          kind,
        )
      )
        throw error;
      const alternate = (this.alternate ??= document.createElement("canvas"));
      // A smaller view changes detector sampling; rotation changes finder search.
      // Both still decode the actual camera pixels through the same QR reader.
      for (const transform of ["half", "rotate"] as const) {
        if (transform === "half" && Math.min(canvas.width, canvas.height) < 240)
          continue;
        const scale = Math.min(canvas.width, canvas.height) >= 240 ? 0.5 : 1;
        alternate.width = Math.floor(
          (transform === "half" ? canvas.width : canvas.height) * scale,
        );
        alternate.height = Math.floor(
          (transform === "half" ? canvas.height : canvas.width) * scale,
        );
        const context = alternate.getContext("2d", {
          willReadFrequently: true,
        });
        if (!context) throw new Error("Camera frame processing unavailable.");
        context.imageSmoothingEnabled = false;
        if (transform === "rotate") {
          context.translate(0, alternate.height);
          context.rotate(-Math.PI / 2);
          context.drawImage(
            canvas,
            0,
            0,
            Math.floor(canvas.width * scale),
            Math.floor(canvas.height * scale),
          );
        } else
          context.drawImage(canvas, 0, 0, alternate.width, alternate.height);
        cameraDiagnostic(transform + "-attempt");
        try {
          const result = super.decodeFromCanvas(alternate);
          cameraDiagnostic(transform + "-decoded");
          return result;
        } catch (next) {
          const category =
            next &&
            typeof next === "object" &&
            "getKind" in next &&
            typeof next.getKind === "function"
              ? next.getKind()
              : undefined;
          if (
            ![
              "NotFoundException",
              "ChecksumException",
              "FormatException",
            ].includes(category)
          )
            throw next;
        }
      }
      throw error;
    }
  }
}
