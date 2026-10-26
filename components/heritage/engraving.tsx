import { useId } from "react";
/** Original code-drawn catalogue plates; no third-party icon or image library. */
export function ObjectEngraving({ category }: { category: string }) {
  const id = useId().replace(/:/g, "");
  const kind = /camera|photo/i.test(category)
    ? "camera"
    : /outdoor|camp/i.test(category)
      ? "tent"
      : /electro|computer|tech/i.test(category)
        ? "laptop"
        : "tool";
  return (
    <svg
      viewBox="0 0 220 140"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className="heritage-engraving"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={id}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <path
            d="M0 0V5"
            stroke="currentColor"
            strokeWidth=".55"
            opacity=".6"
          />
        </pattern>
      </defs>
      <ellipse
        cx="110"
        cy="126"
        rx="78"
        ry="5"
        strokeDasharray="2 3"
        opacity=".4"
      />
      {kind === "camera" ? (
        <>
          <path d="M29 48h39l9-18h55l13 18h45v65H29z" fill={`url(#${id})`} />
          <path d="M34 52h150v56H34zM42 42h21v7H42zM82 35h42v12H82z" />
          <circle cx="111" cy="81" r="34" />
          <circle cx="111" cy="81" r="27" />
          <circle cx="111" cy="81" r="21" />
          <path d="M98 66q18-12 29 6M43 63h22v14H43zM153 61h22v8h-22zM41 97h27" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M${39 + i * 4} 84v18`} />
          ))}
        </>
      ) : kind === "tent" ? (
        <>
          <path d="M26 113L105 19l91 94z" fill={`url(#${id})`} />
          <path d="M105 19l-5 94M105 19l36 94M100 113l15-56 26 56M26 113h170M42 113l63-94M105 19L18 122M105 19l103 101" />
          <path d="M111 39L56 99M118 53l40 48M20 120h20M188 120h22" />
          {Array.from({ length: 5 }, (_, i) => (
            <path key={i} d={`M${46 + i * 9} ${108 - i * 12}l13 4`} />
          ))}
        </>
      ) : kind === "laptop" ? (
        <>
          <path d="M52 23h117v78H52z" fill={`url(#${id})`} />
          <path d="M58 29h105v65H58zM52 101l-26 20h165l-22-20M34 117h148M91 111h39M53 105h114M45 109h131" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${55 + i * 9} 102l-4 10`} />
          ))}
        </>
      ) : (
        <>
          <path
            d="M40 39h93l13 13h32v20h-59l-10 15H59V59H40zM64 87l-7 34h29l17-34"
            fill={`url(#${id})`}
          />
          <path d="M133 43v24M146 52v20M176 56h22v12h-22M69 91l-6 24h19l11-24M44 34h37v5M81 44h38v11H81z" />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${60 + i * 7} 62v18`} />
          ))}
        </>
      )}
    </svg>
  );
}
