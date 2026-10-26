/** Decorative original artwork lookup, never listing metadata or policy. */
export function cataloguePlate(category: string): string | null {
  const kind = /camera|photo/i.test(category)
    ? "camera"
    : /outdoor|camp/i.test(category)
      ? "tent"
      : /electro|computer|tech/i.test(category)
        ? "laptop"
        : /tool|diy/i.test(category)
          ? "tool"
          : null;
  return kind ? `/heritage/plate-${kind}.webp` : null;
}
