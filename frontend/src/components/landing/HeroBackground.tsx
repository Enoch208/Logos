"use client";

import Script from "next/script";

const PROJECT_ID = "HzcaAbRLaALMhHJp8gLY";
const RUNTIME_SRC =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";

const BOOTSTRAP = `!function(){if(window.UnicornStudio)return;window.UnicornStudio={isInitialized:!1};var s=document.createElement("script");s.src=${JSON.stringify(RUNTIME_SRC)};s.onload=function(){if(!window.UnicornStudio.isInitialized){window.UnicornStudio.init();window.UnicornStudio.isInitialized=!0}};(document.head||document.body).appendChild(s)}();`;

export function HeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden"
      style={{
        filter: "hue-rotate(125deg) saturate(0.85) brightness(1.08)",
        maskImage:
          "linear-gradient(180deg, transparent 0%, black 0%, black 80%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, transparent 0%, black 0%, black 80%, transparent 100%)",
        // Keep the filtered canvas on its own GPU layer so its repaints don't
        // invalidate the hero content above it (the flicker / disappearing).
        transform: "translateZ(0)",
        contain: "paint",
      }}
    >
      <div
        data-us-project={PROJECT_ID}
        data-alpha-mask="80"
        // Render at half resolution / 1x DPI / 30fps and only while in view —
        // imperceptible under the blur + mask, but cuts the per-frame composite
        // cost several-fold so scrolling stays smooth. Pure render-fidelity
        // knobs; the design is unchanged.
        data-us-scale="0.5"
        data-us-dpi="1"
        data-us-fps="30"
        data-us-lazyload="true"
        className="absolute inset-0"
      />
      <Script id="hero-bg-loader" strategy="afterInteractive">
        {BOOTSTRAP}
      </Script>
    </div>
  );
}
