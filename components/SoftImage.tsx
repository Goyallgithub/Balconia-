"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<ImageProps, "onError" | "alt"> & {
  alt: string;
  filename?: string;
  tint?: string;
  wrapperClassName?: string;
};

/**
 * next/image wrapper. Missing files fall back to a tinted block with filename.
 */
export function SoftImage({
  src,
  alt,
  filename,
  tint = "var(--paper-2)",
  wrapperClassName,
  className,
  fill,
  ...rest
}: Props) {
  const [failed, setFailed] = useState(false);
  const label =
    filename || (typeof src === "string" ? src.split("/").pop() : "image");

  if (failed || !src) {
    return (
      <div
        className={cn(
          "relative flex items-end justify-start p-3",
          fill ? "absolute inset-0 h-full w-full" : "h-full w-full",
          wrapperClassName
        )}
        style={{ background: tint }}
        role="img"
        aria-label={alt}
      >
        <span className="furniture text-grey" style={{ fontSize: 9 }}>
          {label}
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <div className={cn("absolute inset-0", wrapperClassName)}>
        <Image
          src={src}
          alt={alt}
          fill
          className={className}
          onError={() => setFailed(true)}
          {...rest}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Image
        src={src}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
        {...rest}
      />
    </div>
  );
}
