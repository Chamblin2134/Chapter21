// Design ground truth: dark editorial institutional experience with warm brass accents, Cormorant Garamond display type, Manrope utility type, and the supplied Avery Institute source as the canonical page.

/**
 * Avery Institute design note: the iframe is the source of truth for the dark
 * editorial presentation, including its original hero portrait and wordmark.
 * Do not inject replacement imagery or marks from the React shell.
 */
export default function Home() {
  const outerParams = new URLSearchParams(window.location.search);
  const sourceParams = new URLSearchParams({ v: "20260906-store-orders-loader-v2" });
  ["payment", "session_id"].forEach((key) => {
    const value = outerParams.get(key);
    if (value) sourceParams.set(key, value);
  });
  const sourceHash = window.location.hash || "";
  return (
    <main className="avery-source-shell" aria-label="Avery Institute for Integrative Recovery">
      <iframe
        title="Avery Institute for Integrative Recovery"
        src={`/avery-source.html?${sourceParams.toString()}${sourceHash}`}
        className="avery-source-frame"
      />
    </main>
  );
}
