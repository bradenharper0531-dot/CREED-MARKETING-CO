import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="Creed Marketing home">
      <b>CREED</b>
      <span>MARKETING</span>
    </Link>
  );
}
