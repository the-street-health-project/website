/*
  ============================================================
  SITE DATA: edit numbers and links here, in one place.
  ============================================================
  Any element with data-site="key" shows the value below, and any
  link with data-link="key" points at the URL below. The pages also
  contain the same values as plain text so they read correctly
  before this script runs (and for search engines). When you change
  a number here, the live site updates everywhere automatically.

  Keep these honest: they are early numbers for a young org.
*/
window.SITE = {
  // Cost to put together one kit ("$8 helps make 1 medical kit", from our flyer)
  kitCost: 8,
  itemsPerKit: 18,

  // Where we stand today
  countriesReached: 2,
  donationDrives: "4+",
  communityPartners: "3+",
  studentVolunteers: "8+",
  businessesReached: "150+",
  iowaNeed: "17,000+",

  // Not shown right now: this figure is lower than the 264 supplies we
  // donated in Kanchipuram alone, so it needs updating before it goes back up.
  itemsDistributed: "120+",

  links: {
    gofundme: "https://gofund.me/cd868358f",
    wishlist: "https://www.amazon.com/hz/wishlist/ls/1JW2XLKFQAS5N?ref_=wl_share",
    instagram: "https://www.instagram.com/street.health.project/",
    lionsClub: "https://lionsclubofkanchipuram.org/index.html"
  },

  // Sponsorship levels (the perks for each level are written out on sponsor.html)
  tiers: [
    { id: "neighbor",    name: "Neighbor",    min: 100 },
    { id: "supporter",   name: "Supporter",   min: 250 },
    { id: "guardian",    name: "Guardian",    min: 500 },
    { id: "patron",      name: "Patron",      min: 1000 },
    { id: "champion",    name: "Champion",    min: 2500 },
    { id: "cornerstone", name: "Cornerstone", min: 5000 }
  ],

  // Contact form: paste your free Web3Forms access key here (see README).
  // Until then the form tells people to message us on Instagram instead.
  web3formsKey: "YOUR_WEB3FORMS_ACCESS_KEY"
};
