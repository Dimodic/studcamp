import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { DevMobileFrame, DevViewportToggle } from "./components/common";
import { getViewportMode, subscribeViewportMode } from "./lib/viewport";

export default function App() {
  const [mode, setMode] = useState(() => getViewportMode());

  useEffect(() => subscribeViewportMode(() => setMode(getViewportMode())), []);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  const showDevToggle = import.meta.env.DEV && !inIframe;

  if (mode === "mobile" && !inIframe) {
    const url = new URL(window.location.href);
    url.searchParams.set("__viewport", "mobile");
    return (
      <DevMobileFrame
        src={url.toString()}
        toggle={showDevToggle ? <DevViewportToggle /> : undefined}
      />
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      {showDevToggle && <DevViewportToggle />}
    </>
  );
}
