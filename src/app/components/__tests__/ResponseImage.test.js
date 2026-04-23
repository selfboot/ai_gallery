import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ResponsiveWebPImage from "../ResponseImage";

describe("ResponsiveWebPImage", () => {
  test("keeps local cover assets unchanged", () => {
    render(<ResponsiveWebPImage src="/images/kmp-cover.svg" alt="KMP cover" />);

    const image = screen.getByRole("img", { name: "KMP cover" });

    expect(image).toHaveAttribute("src", "/images/kmp-cover.svg");
    expect(image).not.toHaveAttribute("srcset");
  });

  test("keeps gif assets unchanged", () => {
    render(<ResponsiveWebPImage src="https://example.com/heap.gif" alt="Heap cover" isGif />);

    const image = screen.getByRole("img", { name: "Heap cover" });

    expect(image).toHaveAttribute("src", "https://example.com/heap.gif");
    expect(image).not.toHaveAttribute("srcset");
  });

  test("rewrites remote CDN bitmap covers into responsive webp urls", () => {
    render(
      <ResponsiveWebPImage
        src="https://slefboot-1251736664.file.myqcloud.com/20241031_ai_gallery_sliding_small.png"
        alt="Sliding cover"
      />,
    );

    const image = screen.getByRole("img", { name: "Sliding cover" });

    expect(image).toHaveAttribute(
      "src",
      "https://slefboot-1251736664.file.myqcloud.com/20241031_ai_gallery_sliding_small.png/webp1600",
    );
    expect(image.getAttribute("srcset")).toContain(
      "https://slefboot-1251736664.file.myqcloud.com/20241031_ai_gallery_sliding_small.png/webp400 400w",
    );
    expect(image.getAttribute("srcset")).toContain(
      "https://slefboot-1251736664.file.myqcloud.com/20241031_ai_gallery_sliding_small.png/webp800 800w",
    );
  });

  test("uses eager loading hints for priority images", () => {
    render(
      <ResponsiveWebPImage
        src="https://slefboot-1251736664.file.myqcloud.com/20241031_ai_gallery_sliding_small.png"
        alt="Priority cover"
        priority
      />,
    );

    const image = screen.getByRole("img", { name: "Priority cover" });

    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("width", "1600");
    expect(image).toHaveAttribute("height", "900");
  });
});
