/* The Street Health Project: smooth scrolling.
   Lenis (assets/js/vendor/lenis.min.js, MIT license, version 1.3.27) eases the page toward where you
   scrolled, so the mouse wheel glides instead of jumping in steps. Touch screens keep their own native
   scrolling, and it's off for anyone whose device asks for reduced motion.
   The NiFi transitions (nifi.js, return.js) pause it while they play: window.SHPLenis.stop()/.start(). */
(function () {
  "use strict";
  if (!window.Lenis) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.SHPLenis = new window.Lenis({
    lerp: 0.11,                    // how quickly it catches up: lower is floatier
    autoRaf: true,
    anchors: { offset: -96 },      // in-page links (#contact) land below the sticky header
  });
})();
