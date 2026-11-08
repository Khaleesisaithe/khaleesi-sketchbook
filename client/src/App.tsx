import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ARTIST_ROUTE } from "./lib/privateRoute";
import Home from "./pages/Home";
import { ScrollScrubBackground } from "./components/ScrollScrubBackground";

const Portfolio = lazy(() => import("@/pages/Portfolio"));
const Catalog = lazy(() => import("@/pages/Catalog"));
const Inspirations = lazy(() => import("@/pages/Inspirations"));
const Care = lazy(() => import("@/pages/Care"));
const Booking = lazy(() => import("@/pages/Booking"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Admin = lazy(() => import("@/pages/Admin"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Router() {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();
  const motionDuration = reduceMotion ? 0 : 0.34;
  const normalizedLocation = location.replace(/\/+$/, "") || "/";
  const showScrollBackground = normalizedLocation !== ARTIST_ROUTE;

  return (
    <>
      {showScrollBackground && <ScrollScrubBackground />}
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        className="route-page-turn"
        key={location}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 12, rotateY: -2 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -8, rotateY: 1.5 }}
        transition={{ duration: motionDuration, ease: "easeInOut" }}
      >
        <Suspense fallback={<p className="loading-mark" role="status">Abrindo o caderno…</p>}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/portfolio" component={Portfolio} />
            <Route path="/flashes">{() => <Catalog kind="flash" />}</Route>
            <Route path="/artes">{() => <Catalog kind="art" />}</Route>
            <Route path="/inspiracoes" component={Inspirations} />
            <Route path="/cuidados" component={Care} />
            <Route path="/agendar" component={Booking} />
            <Route path="/privacidade" component={Privacy} />
            <Route path={ARTIST_ROUTE} component={Admin} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
