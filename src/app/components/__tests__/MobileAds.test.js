import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { SideAdComponent } from "../AdComponent";
import MobileAdComponent from "@/app/_ads/MobileAdComponent";
import MobileFooterAd from "../MobileFooterAd";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));

describe("mobile ad placement", () => {
  beforeEach(() => {
    usePathname.mockReset();
  });

  it.each([
    ["/zh/tools", false],
    ["/zh/games", false],
    ["/zh/tools/imagecompress", false],
    ["/zh/tools/awards", false],
    ["/zh/tools/chartrace/dynamic/demo", false],
    ["/zh/blog", true],
  ])("shows a footer ad on %s: %s", (pathname, expected) => {
    usePathname.mockReturnValue(pathname);
    const { container } = render(<MobileFooterAd />);
    expect(Boolean(container.querySelector("[data-mobile-ad]"))).toBe(expected);
  });
});

describe("ad script loading", () => {
  it("keeps the desktop rectangle ad markup", () => {
    jest.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 320 });
    const { container } = render(<SideAdComponent format="rectangle" />);
    const ad = container.querySelector("ins.adsbygoogle");

    expect(ad).toHaveAttribute("data-ad-format", "rectangle");
    expect(ad).toHaveAttribute("data-full-width-responsive", "false");
    expect(ad.parentElement).toHaveClass("overflow-hidden", "min-h-[250px]");
    jest.restoreAllMocks();
    delete window.adsbygoogle;
  });

  it("removes a hidden desktop slot before mobile ads load", () => {
    jest.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 0 });
    const { container } = render(<SideAdComponent format="rectangle" />);

    expect(container.querySelector("ins.adsbygoogle")).toBeNull();
    jest.restoreAllMocks();
  });

  it("does not initialize a mobile slot while its desktop layout is hidden", () => {
    let notifyIntersection;
    global.IntersectionObserver = class {
      constructor(callback) { notifyIntersection = callback; }
      observe() {}
      disconnect() {}
    };
    jest.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 0 });
    const { container } = render(<MobileAdComponent className="md:hidden" />);

    act(() => notifyIntersection([{ isIntersecting: true }]));
    expect(container.querySelector("ins.adsbygoogle")).toBeNull();
    expect(document.querySelectorAll('script[src*="adsbygoogle.js"]')).toHaveLength(0);

    jest.restoreAllMocks();
    delete global.IntersectionObserver;
  });

  it("waits until an ad approaches the viewport and loads the script once", async () => {
    const observers = [];
    global.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe() {}
      disconnect() {}
    };
    jest.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 320 });
    window.adsbygoogle = [];

    render(
      <>
        <MobileAdComponent />
        <MobileAdComponent />
      </>
    );

    expect(document.querySelectorAll('script[src*="adsbygoogle.js"]')).toHaveLength(0);
    expect(document.querySelectorAll("[data-mobile-ad] ins")).toHaveLength(0);

    act(() => {
      observers.forEach((observer) => observer.callback([{ isIntersecting: true }]));
    });

    const scripts = document.querySelectorAll('script[src*="adsbygoogle.js"]');
    expect(scripts).toHaveLength(1);
    expect(document.querySelectorAll("[data-mobile-ad] ins")).toHaveLength(2);

    act(() => {
      scripts[0].dispatchEvent(new Event("load"));
    });
    await waitFor(() => expect(window.adsbygoogle).toHaveLength(2));

    act(() => {
      document.querySelector("[data-mobile-ad] ins").setAttribute("data-ad-status", "unfilled");
    });
    await waitFor(() => expect(document.querySelectorAll("[data-mobile-ad]")).toHaveLength(1));

    delete window.adsbygoogle;
    scripts[0].remove();
    jest.restoreAllMocks();
    delete global.IntersectionObserver;
  });
});
