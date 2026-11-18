// Evaluation time of the About route's client modules (reg-about-toggle-timing; evidence docs/evidence/verify/bundler/).
//
// The original is a webpack build of Next 16.2.1. The client entry of app/about/[uid]/page (module 93366) requires every
// client module of the route as soon as the page chunk runs (`Promise.resolve().then(r.bind(r, id))`: TeamSection 60105,
// AwardsImageSequence 85510, …), so the Estúdio-only module graph — three's WebGLRenderer,
// @react-three/fiber and its reconciler, the face particles — is evaluated when either About page boots, or when the About
// chunk loads during a navigation, never inside a later render.
// Turbopack (this build) evaluates a module on its first require: on a page hard-loaded on /about/approach, that happens
// inside the render that mounts the Agency slices 500 ms after the first toggle, which then commits about 60 ms later than
// the original (MEASURED 2026-11-09: only the first Approach → Agency of a document; repeat toggles and sessions started on
// Agency are equal; a webpack build of the same commit equals the original).
//
// Importing the route's slice modules here makes their evaluation part of the first evaluation of the About layout's
// client module (AboutLayoutToggle), as in the original. Nothing is rendered; only the modules' own top-level code runs.
import './AboutColumns';
import './AwardsImageSequence';
import './HeroVideo';
import './ImageGallery';
import './ProcessSteps';
import './ScrollingCarousel';
import './Separator';
import './team/TeamSection';
