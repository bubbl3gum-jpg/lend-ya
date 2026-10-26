// Original seeded procedural artwork. Offline build utility; no network/database access.
import sharp from "sharp";
async function main() {
  let seed = 11317;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const size = 320,
    data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const tone =
        118 + Math.floor(random() * 90) + Math.sin(x * 0.05 + y * 0.015) * 12;
      data[index] = tone;
      data[index + 1] = tone - 5;
      data[index + 2] = tone - 15;
      data[index + 3] = 255;
    }
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .webp({ quality: 78 })
    .toFile("public/heritage/organic-grain.webp");
  let paths = "";
  for (let i = 0; i < 240; i++) {
    const x = random() * size,
      y = random() * size;
    paths += `<path d="M${x.toFixed(2)} ${y.toFixed(2)}q${(random() * 2).toFixed(2)} ${(random() * 1.5).toFixed(2)} ${(random() * 4 + 0.5).toFixed(2)} ${(random() * 2).toFixed(2)}"/>`;
  }
  await sharp(
    Buffer.from(
      `<svg width="320" height="320" xmlns="http://www.w3.org/2000/svg"><g stroke="#735637" stroke-width=".5" opacity=".14" fill="none">${paths}</g></svg>`,
    ),
  )
    .png()
    .toFile("public/heritage/paper-fibers.png");
}
main().catch(() => {
  console.error("Heritage texture generation failed.");
  process.exitCode = 1;
});
