import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { App } from "./app";
import { AppErrorBoundary } from "./components/app-error-boundary";
import { ScrollToTop } from "./components/scroll-to-top";
import "./app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("앱 루트 요소를 찾을 수 없습니다.");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <AppErrorBoundary><App /></AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
