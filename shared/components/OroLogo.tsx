import type { FC } from "react";

interface OroLogoProps {
  size?: number;
  /**
   * Rendered height, e.g. `"1.15em"` to track surrounding text.
   *
   * The mark is 2159×734, so inside the square box `size` gives it, its actual
   * height lands at about a third of that number — which makes matching it to
   * a font size guesswork. Set this instead and the width follows the aspect
   * ratio.
   */
  height?: string | number;
  className?: string;
}

export const OroLogo: FC<OroLogoProps> = ({ size = 54, className, height }) => {
  if (height !== undefined) {
    return (
      <img
        src="/logo.svg"
        alt="Oro Logo"
        className={className}
        style={{ display: "block", height, width: "auto" }}
      />
    );
  }

  return (
    <img
      src="/logo.svg"
      alt="Oro Logo"
      width={size}
      height={size}
      className={className}
      style={{
        display: "block",
        objectFit: "contain",
      }}
    />
  );
};
