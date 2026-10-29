/*
 * Mr. V Appliance Repair: site content.
 * Edit this file to update the site. No build step needed.
 *
 * Sources: vehicle wrap (photo) + atlantaappliancerepairbymrv.com (Oct 2026).
 * Anything marked TODO was not found publicly. Confirm with the owner before launch.
 *
 * Reviews render with a visible "Sample" tag while `sample: true`.
 * Replace them with real Google / Yelp reviews; never publish invented ones.
 */
window.SITE = {
  name: "Mr. V Appliance Repair",
  legalName: "Mr. V Appliance & Electrical, LLC",
  shortName: "Mr. V",
  tagline: "Reputation Built On Quality",
  phone: "770-757-3097",
  domain: "atlantaappliancerepairbymrv.com",
  email: "",                       // TODO not published; add to show in footer
  address: "Loganville, GA 30052",
  ownerName: "The Mr. V family",   // TODO owner's name, if they want it shown

  // Optional: a form backend (Formspree, Basin, Zapier webhook, etc.).
  // If empty, the booking form opens a pre-filled text message to `phone`.
  formEndpoint: "",

  proof: [
    { value: "87,000+", label: "customers served" },
    { value: "EPA", label: "certified technicians" },
    { value: "100%", label: "of repairs warrantied" },
  ],

  // [days (0=Sun), open hour, close hour] used for the live "open now" chip
  schedule: { days: [1, 2, 3, 4, 5], open: 7, close: 19 },
  hours: [
    ["Mon – Fri", "7:00 AM – 7:00 PM"],
    ["Saturday", "By appointment only"],
    ["Sunday", "Closed"],
  ],

  stats: [
    { to: 87000, suffix: "+", label: "satisfied customers" },
    { to: 30, suffix: "+", label: "cities served" },
    { to: 10, suffix: "%", label: "off when you book today" },
    { to: 9, suffix: "", label: "appliance categories, home & commercial" },
  ],

  services: [
    { key: "refrigerator", title: "Refrigerator", desc: "Temperature swings, strange noises and defrost problems, on freestanding and built-in units." },
    { key: "washer", title: "Washer & Dryer", desc: "Leaks, noisy spin cycles, drums that won't turn and dryers that won't heat." },
    { key: "dishwasher", title: "Dishwasher", desc: "Mystery leaks, poor cleaning performance and control panel malfunctions." },
    { key: "oven", title: "Oven", desc: "Uneven heating, temperatures that run off, and electrical faults." },
    { key: "cooktop", title: "Cooktop", desc: "Burner problems, ignition failures and heating inconsistencies." },
    { key: "microwave", title: "Microwave", desc: "Uneven heating, faulty controls and unusual noises." },
    { key: "disposal", title: "Garbage Disposal", desc: "Installation and repair, from jams and clogs to full upgrades." },
    { key: "compactor", title: "Trash Compactor", desc: "Jammed rams, faulty switches and routine maintenance." },
    { key: "commercial", title: "Commercial Kitchens", desc: "Commercial refrigeration, stoves, ice machines and ventilation for restaurants and cafés." },
  ],

  brands: ["Whirlpool", "GE", "Samsung", "LG", "KitchenAid", "Maytag", "Frigidaire",
    "Bosch", "Electrolux", "Kenmore", "Amana", "Thermador", "Sub-Zero", "Viking", "Wolf", "Miele"],

  // Service cities from the current site, with approximate lat/lon for the map.
  hq: { name: "Loganville", lat: 33.839, lon: -83.900 },
  areas: [
    ["Loganville", 33.839, -83.900], ["Lawrenceville", 33.956, -83.988], ["Grayson", 33.894, -83.955],
    ["Dacula", 33.989, -83.898], ["Suwanee", 34.051, -84.071], ["Duluth", 34.003, -84.145],
    ["Johns Creek", 34.029, -84.199], ["Norcross", 33.941, -84.213], ["Tucker", 33.855, -84.217],
    ["Doraville", 33.898, -84.283], ["Brookhaven", 33.866, -84.337], ["Decatur", 33.775, -84.296],
    ["Sandy Springs", 33.924, -84.379], ["Dunwoody", 33.946, -84.334], ["Roswell", 34.023, -84.362],
    ["Marietta", 33.953, -84.550], ["Alpharetta", 34.075, -84.294], ["Smyrna", 33.884, -84.514],
    ["Buckhead", 33.838, -84.380], ["Buford", 34.121, -84.004], ["Cumming", 34.207, -84.140],
    ["Flowery Branch", 34.185, -83.925], ["Sugar Hill", 34.106, -84.033], ["Gainesville", 34.298, -83.824],
    ["Conyers", 33.668, -84.018], ["Covington", 33.597, -83.860], ["Stone Mountain", 33.808, -84.170],
    ["Clarkston", 33.810, -84.240], ["Monroe", 33.795, -83.713], ["Atlanta", 33.749, -84.388],
  ],
  // First 3 digits of ZIP codes treated as "in area" by the ZIP checker. TODO confirm.
  zipPrefixes: ["300", "301", "302", "303", "305", "306"],

  social: [
    { label: "Google Business", url: "https://www.google.com/localservices/prolist?src=2&q=Mr.+V+Appliance+%26+Electrical,+LLC+Loganville,+GA" },
    { label: "Yelp", url: "https://www.yelp.com/biz/mr-v-appliance-repair-norcross-2" },
    { label: "HomeAdvisor", url: "https://www.homeadvisor.com/rated.MrVAppliance.43691509.html" },
    { label: "Facebook", url: "https://www.facebook.com/p/Mr-V-Appliance-Repair-Refrigeration-LLC-100053209609347/" },
  ],

  // TODO replace with real reviews (copy from Google / Yelp with permission) and set sample:false
  reviews: [
    { sample: true, name: "Homeowner", area: "Loganville", text: "Called in the morning and the fridge was cold again by dinner. He explained exactly what failed before doing any work." },
    { sample: true, name: "Homeowner", area: "Lawrenceville", text: "Washer was throwing an error code nobody else could fix. Mr. V diagnosed it fast and it's been perfect since." },
    { sample: true, name: "Homeowner", area: "Roswell", text: "On time, professional, and cleaned up after himself. Rare to find a company this careful." },
    { sample: true, name: "Restaurant owner", area: "Decatur", text: "Our walk-in went down on a Friday. They had it running before dinner service." },
    { sample: true, name: "Homeowner", area: "Grayson", text: "Dryer wasn't heating. Fixed it and showed me how to keep the vent clear." },
  ],

  faqs: [
    { q: "What areas do you serve?", a: "We're based in Loganville and serve more than 30 cities across Metro Atlanta, including Lawrenceville, Duluth, Johns Creek, Alpharetta, Roswell, Marietta, Sandy Springs, Decatur, Buford, Gainesville, Conyers and Covington. If you're nearby and don't see your city, call us." },
    { q: "What are your hours?", a: "Monday through Friday, 7 AM to 7 PM. Saturdays are by appointment only, and we're closed on Sundays." },
    { q: "Is there a discount for booking now?", a: "Yes. Schedule your repair today and save 10%." },
    { q: "Do you work on commercial equipment?", a: "Yes. We install, maintain and repair commercial refrigerators, stoves, ice machines and ventilation systems for restaurants, cafés and other businesses." },
    { q: "Are your repairs guaranteed?", a: "We offer a warranty on all of our repairs. Our technicians are EPA-certified and complete training every year." },
    { q: "Do you repair built-in appliances?", a: "Yes. We repair both freestanding and built-in refrigerators, along with built-in ovens, cooktops and microwaves." },
  ],
};
