// Logo oficial da American Burrs, extraído do brand book (2025).
// `withText` = logo completo (símbolo + "American Burrs"); caso contrário,
// apenas o símbolo (águia). `size` é a ALTURA renderizada em px.
export function Logo({
  size = 28,
  withText = true,
}: {
  size?: number;
  withText?: boolean;
}) {
  const src = withText ? "/brand-logo.png" : "/brand-eagle.png";
  return (
    <span className="logo">
      <img
        src={src}
        alt="American Burrs"
        height={size}
        style={{ height: size, width: "auto", display: "block" }}
      />
    </span>
  );
}
