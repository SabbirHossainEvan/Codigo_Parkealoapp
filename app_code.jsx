import { useState, useEffect, useRef } from "react";

const T = {

  blue: "#1A56C4",

  blueDk: "#0F3A8C",

  blueNav: "#0D2D6B",

  blueLt: "#EEF3FC",

  blueMid: "#C8D9F5",

  blueSky: "#3B7EE8",

  green: "#0B8A4C",

  greenDk: "#076336",

  greenLt: "#E8F8F0",

  greenMid: "#A8DDBF",

  greenAcct: "#10B46A",

  bg: "#FFFFFF",

  surface: "#F6F8FB",

  surface2: "#ECEFF5",

  border: "#E0E8F0",

  borderMd: "#C2D0E4",

  text: "#0D1B3E",

  textMid: "#2D4070",

  textSub: "#5E78A8",

  textFaint: "#9BAFD0",

  warn: "#8A6200",

  warnBg: "#FFF8E6",

  warnBd: "#F0D080",

  danger: "#B8172A",

  dangerBg: "#FEF0F2",

  dangerBd: "#F5C0C7",

  shadowSm: "0 1px 8px rgba(26,86,196,0.08)",

  shadow: "0 2px 14px rgba(26,86,196,0.11)",

  shadowMd: "0 4px 24px rgba(26,86,196,0.15)",

  shadowLg: "0 8px 40px rgba(26,86,196,0.18)",

};

const font = "'Nunito', 'Plus Jakarta Sans', system-ui, sans-serif";

// ─── SECURITY UTILITIES ───────────────────────────────────────────────────────

// 1. Input sanitization — strip HTML/script tags and dangerous characters

const sanitize = (str) => {

  if (typeof str !== "string") return "";

  return str

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#x27;")

    .split(String.fromCharCode(0))

    .join("")

    .trim()

    .slice(0, 500);

};

// 2. Plate validation — Dominican Republic format (A123456 or AB123456)

const validatePlate = (plate) =>

  /^[A-Z]{1,3}[0-9]{4,7}$/.test(plate.replace(/[\s-]/g, ""));

// 3. Email validation

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// 4. Phone validation — loose (10–15 digits)

const validatePhone = (phone) => /^[\d\s\+\-\(\)]{8,15}$/.test(phone);

// 5. Rate limiter — prevents brute-force on login form

const RateLimiter = (() => {

  const attempts = {};

  return {

    check: (key) => {

      const now = Date.now();

      const data = attempts[key] || {

        count: 0,

        firstAttempt: now,

        blocked: false,

      };

      if (data.blocked && now - data.firstAttempt < 5 * 60 * 1000) return false; // 5 min block

      if (now - data.firstAttempt > 60 * 1000) {

        attempts[key] = { count: 1, firstAttempt: now, blocked: false };

        return true;

      }

      data.count++;

      if (data.count >= 5) {

        data.blocked = true;

        attempts[key] = data;

        return false;

      } // 5 attempts/min

      attempts[key] = data;

      return true;

    },

    getRemainingTime: (key) => {

      const data = attempts[key];

      if (!data?.blocked) return 0;

      const remaining = Math.ceil(

        (5 * 60 * 1000 - (Date.now() - data.firstAttempt)) / 1000

      );

      return Math.max(0, remaining);

    },

  };

})();

// 6. Secure session — tokens expire after 8 hours

const SecureSession = {

  save: (user) => {

    try {

      const session = { user, expires: Date.now() + 8 * 60 * 60 * 1000, v: 1 };

      localStorage.setItem("parkealo_session", btoa(JSON.stringify(session)));

    } catch (e) {}

  },

  load: () => {

    try {

      const raw = localStorage.getItem("parkealo_session");

      if (!raw) return null;

      const session = JSON.parse(atob(raw));

      if (Date.now() > session.expires) {

        SecureSession.clear();

        return null;

      }

      return session.user;

    } catch (e) {

      SecureSession.clear();

      return null;

    }

  },

  clear: () => {

    try {

      localStorage.removeItem("parkealo_session");

      localStorage.removeItem("parkealo_user"); // legacy

    } catch (e) {}

  },

};

// 7. Content Security helper — detect suspicious inputs

const isSuspicious = (input) => {

  if (typeof input !== "string") return false;

  const lower = input.toLowerCase();

  return (

    lower.includes("<script") ||

    lower.includes("javascript:") ||

    lower.includes("union select") ||

    lower.includes("drop table") ||

    lower.includes("insert into") ||

    lower.includes("eval(") ||

    lower.includes("document.cookie") ||

    /on[a-z]+\s*=/.test(lower) ||

    input.includes("../")

  );

};

// 8. Secure input wrapper — use instead of raw onChange

const useSecureInput = (initial = "", maxLen = 200) => {

  const [value, setValue] = useState(initial);

  const [warning, setWarning] = useState(false);

  const onChange = (v) => {

    if (isSuspicious(v)) {

      setWarning(true);

      return;

    }

    setWarning(false);

    setValue(sanitize(v).slice(0, maxLen));

  };

  return [value, onChange, warning, setValue];

};

// App icon — faithful recreation of the uploaded Parkealo logo

// Blue gradient location pin · large white "P" · white car silhouette emerging from bottom

function ParkealoPinLogo({ size = 36, variant = "blue" }) {

  const w = size;

  const h = size * 1.3;

  const uid = `pk_${size}_${variant}`;

  // Colors: white variant lightens the gradient for use on dark backgrounds

  const grad1 = variant === "white" ? "#7DD4F8" : "#29A8E8"; // top-left highlight

  const grad2 = variant === "white" ? "#3B8FD8" : "#1565C8"; // mid

  const grad3 = variant === "white" ? "#1A4FAA" : "#0A2D8A"; // bottom dark

  return (

    <svg

      width={w}

      height={h}

      viewBox="0 0 100 130"

      fill="none"

      xmlns="http://www.w3.org/2000/svg"

    >

      <defs>

        {/* Main body gradient — top-left sky blue → dark navy bottom */}

        <linearGradient id={`${uid}_body`} x1="25%" y1="0%" x2="75%" y2="100%">

          <stop offset="0%" stopColor={grad1} />

          <stop offset="45%" stopColor={grad2} />

          <stop offset="100%" stopColor={grad3} />

        </linearGradient>

        {/* Inner dark pool at bottom of pin circle */}

        <radialGradient id={`${uid}_pool`} cx="50%" cy="80%" r="50%">

          <stop offset="0%" stopColor={grad3} />

          <stop offset="100%" stopColor={grad2} stopOpacity="0" />

        </radialGradient>

        {/* Gloss highlight on upper-left */}

        <radialGradient id={`${uid}_gloss`} cx="35%" cy="20%" r="50%">

          <stop offset="0%" stopColor="white" stopOpacity="0.35" />

          <stop offset="100%" stopColor="white" stopOpacity="0" />

        </radialGradient>

        <clipPath id={`${uid}_clip`}>

          <path d="M50 3C27 3 8 22 8 45c0 15 8 28 20 37L50 127l22-45C84 73 92 60 92 45 92 22 73 3 50 3z" />

        </clipPath>

      </defs>

      {/* ── Pin body ── */}

      <path

        d="M50 3C27 3 8 22 8 45c0 15 8 28 20 37L50 127l22-45C84 73 92 60 92 45 92 22 73 3 50 3z"

        fill={`url(#${uid}_body)`}

      />

      {/* Dark inner shadow / pool at bottom of circle */}

      <ellipse

        cx="50"

        cy="68"

        rx="32"

        ry="18"

        fill={`url(#${uid}_pool)`}

        opacity="0.7"

      />

      {/* Gloss on upper-left */}

      <ellipse cx="36" cy="28" rx="22" ry="16" fill={`url(#${uid}_gloss)`} />

      {/* ── Large white P ── */}

      <text

        x="45"

        y="58"

        fontFamily="Arial Black, Helvetica Neue, sans-serif"

        fontWeight="900"

        fontSize="58"

        fill="white"

        textAnchor="middle"

        opacity="0.97"

      >

        P

      </text>

      {/* ── Car silhouette (front 3/4 view, white) ── */}

      <g clipPath={`url(#${uid}_clip)`}>

        <g

          transform="translate(50, 76) scale(0.72)"

          fill="white"

          opacity="0.92"

        >

          {/* Main body */}

          <rect x="-38" y="-9" width="76" height="22" rx="6" />

          {/* Cabin / roof */}

          <path d="M-20,-9 C-14,-24 14,-24 20,-9 Z" />

          {/* Front windshield divider */}

          <path

            d="M-1,-23 L-1,-9"

            stroke="rgba(10,45,138,0.3)"

            strokeWidth="1.5"

          />

          {/* Side windows implied by darker roof area */}

          <path

            d="M-19,-9 C-13,-22 -2,-22 -1,-9 Z"

            fill="rgba(10,45,138,0.18)"

          />

          <path d="M1,-9 C2,-22 13,-22 19,-9 Z" fill="rgba(10,45,138,0.18)" />

          {/* Headlights */}

          <ellipse

            cx="-31"

            cy="-1"

            rx="4"

            ry="3"

            fill="#C8E8FF"

            opacity="0.9"

          />

          <ellipse

            cx=" 31"

            cy="-1"

            rx="4"

            ry="3"

            fill="#C8E8FF"

            opacity="0.9"

          />

          {/* Wheels */}

          <circle cx="-23" cy="13" r="8" fill="rgba(10,45,138,0.6)" />

          <circle cx="-23" cy="13" r="3.5" fill="white" opacity="0.8" />

          <circle cx=" 23" cy="13" r="8" fill="rgba(10,45,138,0.6)" />

          <circle cx=" 23" cy="13" r="3.5" fill="white" opacity="0.8" />

          {/* Grille */}

          <rect

            x="-14"

            y="3"

            width="28"

            height="4"

            rx="2"

            fill="rgba(10,45,138,0.35)"

          />

        </g>

      </g>

      {/* Bottom tip subtle dark edge */}

      <path

        d="M50 127 L36 82 C40 87 46 90 50 90s10-3 14-8Z"

        fill={grad3}

        opacity="0.4"

      />

    </svg>

  );

}

// Wordmark: "Parkealo" single color — blue on light, white on dark

function ParkealoWordmark({ size = 24, variant = "color" }) {

  const col = variant === "white" ? "#ffffff" : T.blue;

  return (

    <span

      style={{

        fontFamily: font,

        fontWeight: 900,

        fontSize: size,

        lineHeight: 1,

        letterSpacing: -0.5,

        display: "inline-block",

        color: col,

      }}

    >

      Parkealo

    </span>

  );

}

function BrandMark({ small, variant = "blue" }) {

  const tagColor = variant === "white" ? "rgba(255,255,255,0.65)" : T.textSub;

  return (

    <div

      style={{

        display: "inline-flex",

        alignItems: "center",

        gap: small ? 6 : 10,

      }}

    >

      <ParkealoPinLogo

        size={small ? 26 : 38}

        variant={variant === "white" ? "white" : "blue"}

      />

      <div>

        <ParkealoWordmark

          size={small ? 18 : 26}

          variant={variant === "white" ? "white" : "color"}

        />

        {!small && (

          <div

            style={{

              fontFamily: font,

              fontWeight: 500,

              fontSize: 10,

              color: tagColor,

              letterSpacing: 0.4,

              marginTop: 2,

            }}

          >

            Renta tu parqueo fácil

          </div>

        )}

      </div>

    </div>

  );

}

// ─── DESTINATION DATABASE (Santo Domingo) ────────────────────────────────────

const DESTINATIONS = [

  // Restaurantes

  {

    id: "d1",

    name: "Restaurante Adrian Tropical",

    type: "restaurant",

    area: "Malecón",

    icon: "🍽️",

    nearSpots: [1, 2],

  },

  {

    id: "d2",

    name: "La Caña by Il Circoletto",

    type: "restaurant",

    area: "Naco",

    icon: "🍽️",

    nearSpots: [2, 3],

  },

  {

    id: "d3",

    name: "Mesón de la Cava",

    type: "restaurant",

    area: "Mirador Sur",

    icon: "🍽️",

    nearSpots: [2],

  },

  {

    id: "d4",

    name: "Jalao por Nuestros Ingredientes",

    type: "restaurant",

    area: "Zona Colonial",

    icon: "🍽️",

    nearSpots: [1],

  },

  // Comercios / Malls

  {

    id: "d5",

    name: "Acropolis Center",

    type: "mall",

    area: "Churchill",

    icon: "🛍️",

    nearSpots: [2, 3],

  },

  {

    id: "d6",

    name: "Blue Mall",

    type: "mall",

    area: "Piantini",

    icon: "🛍️",

    nearSpots: [3],

  },

  {

    id: "d7",

    name: "Ágora Mall",

    type: "mall",

    area: "Arroyo Hondo",

    icon: "🛍️",

    nearSpots: [2, 3],

  },

  {

    id: "d8",

    name: "Las Praderas",

    type: "mall",

    area: "Bella Vista",

    icon: "🛍️",

    nearSpots: [2],

  },

  // Hoteles

  {

    id: "d9",

    name: "Hotel Intercontinental",

    type: "hotel",

    area: "Miramar",

    icon: "🏨",

    nearSpots: [1, 2],

  },

  {

    id: "d10",

    name: "Hyatt Regency Santo Domingo",

    type: "hotel",

    area: "Malecón",

    icon: "🏨",

    nearSpots: [1],

  },

  {

    id: "d11",

    name: "Hotel Casas del XVI",

    type: "hotel",

    area: "Zona Colonial",

    icon: "🏨",

    nearSpots: [1],

  },

  // Hospitales / Clínicas

  {

    id: "d12",

    name: "Centro Médico UCE",

    type: "hospital",

    area: "Gazcue",

    icon: "🏥",

    nearSpots: [1, 2],

  },

  {

    id: "d13",

    name: "Clínica Abreu",

    type: "hospital",

    area: "Gazcue",

    icon: "🏥",

    nearSpots: [1],

  },

  {

    id: "d14",

    name: "Centro de Diagnóstico de Medicina Avanzada (CEDIMAT)",

    type: "hospital",

    area: "Naco",

    icon: "🏥",

    nearSpots: [2, 3],

  },

  // Oficinas / Negocios

  {

    id: "d15",

    name: "Torre Caney",

    type: "office",

    area: "Piantini",

    icon: "🏢",

    nearSpots: [3],

  },

  {

    id: "d16",

    name: "Torre Empresarial Plaza Andalucía",

    type: "office",

    area: "Naco",

    icon: "🏢",

    nearSpots: [2, 3],

  },

  {

    id: "d17",

    name: "World Trade Center Santo Domingo",

    type: "office",

    area: "Miramar",

    icon: "🏢",

    nearSpots: [1, 2],

  },

  // Educación

  {

    id: "d18",

    name: "PUCMM — Madre y Maestra",

    type: "university",

    area: "Mirador Norte",

    icon: "🎓",

    nearSpots: [2],

  },

  {

    id: "d19",

    name: "INTEC",

    type: "university",

    area: "Los Cacicazgos",

    icon: "🎓",

    nearSpots: [2, 3],

  },

  {

    id: "d20",

    name: "UASD",

    type: "university",

    area: "Ciudad Universitaria",

    icon: "🎓",

    nearSpots: [1, 2],

  },

  // Entretenimiento

  {

    id: "d21",

    name: "Estadio Quisqueya",

    type: "stadium",

    area: "La Feria",

    icon: "⚽",

    nearSpots: [1, 2],

  },

  {

    id: "d22",

    name: "Palacio de los Deportes",

    type: "stadium",

    area: "La Feria",

    icon: "🏀",

    nearSpots: [1, 2],

  },

  {

    id: "d23",

    name: "Teatro Nacional",

    type: "theater",

    area: "Gazcue",

    icon: "🎭",

    nearSpots: [1],

  },

  {

    id: "d24",

    name: "El Embajador",

    type: "hotel",

    area: "La Julia",

    icon: "🎰",

    nearSpots: [2],

  },

  // Zonas

  {

    id: "d25",

    name: "Zona Colonial",

    type: "zone",

    area: "Zona Colonial",

    icon: "🏛️",

    nearSpots: [1],

  },

  {

    id: "d26",

    name: "Piantini",

    type: "zone",

    area: "Piantini",

    icon: "📍",

    nearSpots: [3],

  },

  {

    id: "d27",

    name: "Naco",

    type: "zone",

    area: "Naco",

    icon: "📍",

    nearSpots: [2, 3],

  },

  {

    id: "d28",

    name: "Bella Vista",

    type: "zone",

    area: "Bella Vista",

    icon: "📍",

    nearSpots: [2],

  },

  {

    id: "d29",

    name: "Malecón",

    type: "zone",

    area: "Malecón",

    icon: "🌊",

    nearSpots: [1],

  },

  {

    id: "d30",

    name: "Gazcue",

    type: "zone",

    area: "Gazcue",

    icon: "📍",

    nearSpots: [1, 2],

  },

];

const DEST_TYPE_LABELS = {

  restaurant: "Restaurante",

  mall: "Centro Comercial",

  hotel: "Hotel",

  hospital: "Hospital/Clínica",

  office: "Oficina",

  university: "Universidad",

  stadium: "Estadio",

  theater: "Teatro",

  zone: "Zona",

};

const RECENT_SEARCHES = [

  "Zona Colonial",

  "Blue Mall",

  "Estadio Quisqueya",

  "Clínica Abreu",

];

const AMENITIES = [

  { key: "covered", label: "Techado", icon: "🏠" },

  { key: "ev", label: "Carga EV", icon: "⚡" },

  { key: "cameras", label: "Cámaras", icon: "📹" },

  { key: "valet", label: "Valet", icon: "🤵" },

  { key: "h24", label: "24/7", icon: "🕐" },

  { key: "access_control", label: "Ctrl. acceso", icon: "🔐" },

  { key: "staff", label: "Personal", icon: "👤" },

  { key: "private", label: "Privado", icon: "🏡" },

];

const SPOTS = [

  {

    id: 1,

    name: "Parqueo Colonial Premium",

    location: "Zona Colonial, SD",

    price: 150,

    currency: "RD$",

    type: "public",

    distance: "0.2 km",

    rating: 4.87,

    reviews: 128,

    floors: 2,

    dynamic: true,

    amenities: {

      space: 5,

      cameras: 5,

      access_control: 5,

      covered: 4,

      staff: 3,

      h24: true,

      private: false,

      valet: 3,

      ev: 2,

    },

    transport: ["Metro L1 · 200m", "OMSA · 50m"],

  },

  {

    id: 2,

    name: "Estacionamiento Bella Vista",

    location: "Bella Vista, SD",

    price: 80,

    currency: "RD$",

    type: "public",

    distance: "0.8 km",

    rating: 3.92,

    reviews: 45,

    floors: 1,

    dynamic: false,

    amenities: {

      space: 3,

      cameras: 3,

      access_control: 2,

      covered: 0,

      staff: 0,

      h24: false,

      private: false,

      valet: 0,

      ev: 0,

    },

    transport: [],

  },

  {

    id: 3,

    name: "VIP Piantini · Casa Privada",

    location: "Piantini, SD",

    price: 200,

    currency: "RD$",

    type: "private",

    distance: "1.4 km",

    rating: 4.97,

    reviews: 203,

    floors: 1,

    dynamic: true,

    amenities: {

      space: 5,

      cameras: 5,

      access_control: 5,

      covered: 5,

      staff: 5,

      h24: true,

      private: true,

      valet: 5,

      ev: 5,

    },

    transport: ["Metro L2 · 800m"],

  },

];

function Tag({ children, color = T.blue, bg = T.blueLt, border = T.blueMid }) {

  return (

    <span

      style={{

        display: "inline-flex",

        alignItems: "center",

        fontSize: 11,

        fontWeight: 700,

        letterSpacing: 0.2,

        padding: "3px 9px",

        borderRadius: 100,

        background: bg,

        color,

        border: `1px solid ${border}`,

      }}

    >

      {children}

    </span>

  );

}

function Divider({ my = 14 }) {

  return (

    <div style={{ height: 1, background: T.border, margin: `${my}px 0` }} />

  );

}

function StarRating({ value, count }) {

  return (

    <span

      style={{

        display: "inline-flex",

        alignItems: "center",

        gap: 4,

        fontSize: 13,

        color: T.text,

        fontWeight: 700,

      }}

    >

      ★ {value?.toFixed(2)}

      {count && (

        <span style={{ color: T.textSub, fontWeight: 400 }}> ({count})</span>

      )}

    </span>

  );

}

function Toggle({ on, onToggle, label, sub }) {

  return (

    <div

      style={{

        display: "flex",

        alignItems: "flex-start",

        justifyContent: "space-between",

        gap: 10,

        marginBottom: 16,

      }}

    >

      <div>

        <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>

          {label}

        </div>

        {sub && (

          <div

            style={{

              color: T.textSub,

              fontSize: 12,

              marginTop: 2,

              lineHeight: 1.5,

            }}

          >

            {sub}

          </div>

        )}

      </div>

      <div

        onClick={onToggle}

        style={{

          width: 48,

          height: 28,

          borderRadius: 14,

          background: on ? T.green : T.surface2,

          position: "relative",

          cursor: "pointer",

          flexShrink: 0,

          transition: "background 0.2s",

          border: `2px solid ${on ? T.green : T.borderMd}`,

        }}

      >

        <div

          style={{

            position: "absolute",

            top: 2,

            left: on ? 22 : 2,

            width: 20,

            height: 20,

            borderRadius: "50%",

            background: "#fff",

            boxShadow: "0 1px 4px rgba(0,0,0,0.18)",

            transition: "left 0.2s",

          }}

        />

      </div>

    </div>

  );

}

function Btn({

  children,

  onClick,

  variant = "green",

  small,

  full,

  style: s = {},

}) {

  const map = {

    green: {

      background: T.green,

      color: "#fff",

      border: "none",

      boxShadow: `0 3px 14px ${T.green}44`,

    },

    blue: {

      background: T.blue,

      color: "#fff",

      border: "none",

      boxShadow: `0 3px 14px ${T.blue}44`,

    },

    navy: {

      background: T.blueNav,

      color: "#fff",

      border: "none",

      boxShadow: `0 3px 14px ${T.blueNav}55`,

    },

    secondary: {

      background: T.bg,

      color: T.text,

      border: `1.5px solid ${T.borderMd}`,

      boxShadow: "none",

    },

    outlineGreen: {

      background: "transparent",

      color: T.green,

      border: `1.5px solid ${T.green}`,

      boxShadow: "none",

    },

    outlineBlue: {

      background: "transparent",

      color: T.blue,

      border: `1.5px solid ${T.blue}`,

      boxShadow: "none",

    },

    danger: {

      background: T.dangerBg,

      color: T.danger,

      border: `1.5px solid ${T.dangerBd}`,

      boxShadow: "none",

    },

  };

  const base = map[variant] || map.green;

  return (

    <button

      onClick={onClick}

      style={{

        ...base,

        borderRadius: 12,

        cursor: "pointer",

        fontFamily: font,

        fontWeight: 700,

        fontSize: small ? 12 : 14,

        letterSpacing: 0.2,

        padding: small ? "7px 14px" : "13px 20px",

        width: full ? "100%" : undefined,

        display: "inline-flex",

        alignItems: "center",

        justifyContent: "center",

        gap: 6,

        transition: "all 0.15s",

        ...s,

      }}

    >

      {children}

    </button>

  );

}

function Card({ children, style: s = {}, onClick }) {

  const [hov, setHov] = useState(false);

  return (

    <div

      onClick={onClick}

      onMouseEnter={() => setHov(true)}

      onMouseLeave={() => setHov(false)}

      style={{

        background: T.bg,

        border: `1px solid ${hov && onClick ? T.borderMd : T.border}`,

        borderRadius: 16,

        padding: 16,

        cursor: onClick ? "pointer" : "default",

        boxShadow: hov && onClick ? T.shadowMd : T.shadow,

        transition: "all 0.18s",

        ...s,

      }}

    >

      {children}

    </div>

  );

}

function SectionLabel({ children }) {

  return (

    <div

      style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 14 }}

    >

      {children}

    </div>

  );

}

function NavIcon({ id, active }) {

  const c = active ? "#fff" : T.textSub;

  const sw = 2;

  const icons = {

    map: (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill="none"

        stroke={c}

        strokeWidth={sw}

        strokeLinecap="round"

      >

        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />

        <line x1="8" y1="2" x2="8" y2="18" />

        <line x1="16" y1="6" x2="16" y2="22" />

      </svg>

    ),

    reservations: (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill="none"

        stroke={c}

        strokeWidth={sw}

        strokeLinecap="round"

      >

        <rect x="3" y="4" width="18" height="18" rx="2" />

        <line x1="16" y1="2" x2="16" y2="6" />

        <line x1="8" y1="2" x2="8" y2="6" />

        <line x1="3" y1="10" x2="21" y2="10" />

      </svg>

    ),

    favorites: (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill={active ? "#fff" : "none"}

        stroke={c}

        strokeWidth={sw}

        strokeLinecap="round"

      >

        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />

      </svg>

    ),

    owner: (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill="none"

        stroke={c}

        strokeWidth={sw}

        strokeLinecap="round"

      >

        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />

        <polyline points="9 22 9 12 15 12 15 22" />

      </svg>

    ),

    account: (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill="none"

        stroke={c}

        strokeWidth={sw}

        strokeLinecap="round"

      >

        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

        <circle cx="12" cy="7" r="4" />

      </svg>

    ),

    admin: (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill="none"

        stroke={c}

        strokeWidth={sw}

        strokeLinecap="round"

      >

        <circle cx="12" cy="12" r="3" />

        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />

      </svg>

    ),

  };

  return icons[id] || null;

}

function BottomNav({ active, onChange, unreadMessages = 0 }) {

  const tabs = [

    { id: "map", label: "Explorar" },

    { id: "reservations", label: "Reservas" },

    { id: "favorites", label: "Favoritos" },

    { id: "owner", label: "Host" },

    { id: "account", label: "Cuenta" },

    { id: "admin", label: "Admin" },

  ];

  return (

    <div

      style={{

        position: "absolute",

        bottom: 0,

        left: 0,

        right: 0,

        background: T.bg,

        borderTop: `1px solid ${T.border}`,

        display: "flex",

        paddingBottom: 10,

        paddingTop: 8,

        zIndex: 50,

        boxShadow: "0 -2px 16px rgba(26,86,196,0.07)",

      }}

    >

      {tabs.map((t) => {

        const badge =

          t.id === "reservations" && unreadMessages > 0 ? unreadMessages : 0;

        return (

          <button

            key={t.id}

            onClick={() => onChange(t.id)}

            style={{

              flex: 1,

              background: "none",

              border: "none",

              cursor: "pointer",

              display: "flex",

              flexDirection: "column",

              alignItems: "center",

              gap: 3,

              fontFamily: font,

              position: "relative",

            }}

          >

            <div

              style={{

                width: 30,

                height: 30,

                borderRadius: 9,

                background: active === t.id ? T.blue : "transparent",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                transition: "background 0.2s",

                position: "relative",

              }}

            >

              <NavIcon id={t.id} active={active === t.id} />

              {badge > 0 && (

                <div

                  style={{

                    position: "absolute",

                    top: -4,

                    right: -4,

                    minWidth: 16,

                    height: 16,

                    borderRadius: 8,

                    background: T.danger,

                    border: "2px solid #fff",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    padding: "0 3px",

                  }}

                >

                  <span style={{ color: "#fff", fontSize: 8, fontWeight: 900 }}>

                    {badge > 9 ? "9+" : badge}

                  </span>

                </div>

              )}

            </div>

            <span

              style={{

                fontSize: 9.5,

                color: active === t.id ? T.blue : T.textFaint,

                fontWeight: active === t.id ? 800 : 500,

              }}

            >

              {t.label}

            </span>

            {active === t.id && (

              <div

                style={{

                  width: 16,

                  height: 2.5,

                  borderRadius: 2,

                  background: T.green,

                }}

              />

            )}

          </button>

        );

      })}

    </div>

  );

}

function Disclaimer({ onClose, onCancel }) {

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 300,

        background: "rgba(13,27,62,0.5)",

        display: "flex",

        alignItems: "flex-end",

      }}

    >

      <div

        style={{

          background: T.bg,

          borderRadius: "22px 22px 0 0",

          padding: "20px 22px 32px",

          width: "100%",

          boxShadow: T.shadowLg,

        }}

      >

        <div

          style={{

            width: 40,

            height: 4,

            borderRadius: 2,

            background: T.surface2,

            margin: "0 auto 18px",

          }}

        />

        <div

          style={{

            width: 54,

            height: 54,

            borderRadius: "50%",

            background: T.blueLt,

            border: `2px solid ${T.blueMid}`,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            margin: "0 auto 14px",

          }}

        >

          <svg

            width="24"

            height="24"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.blue}

            strokeWidth="2.2"

            strokeLinecap="round"

          >

            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />

            <line x1="12" y1="9" x2="12" y2="13" />

            <line x1="12" y1="17" x2="12.01" y2="17" />

          </svg>

        </div>

        <div

          style={{

            fontWeight: 900,

            fontSize: 17,

            color: T.text,

            textAlign: "center",

            marginBottom: 10,

          }}

        >

          Aviso de seguridad

        </div>

        <p

          style={{

            color: T.textMid,

            fontSize: 14,

            lineHeight: 1.7,

            textAlign: "center",

            marginBottom: 22,

          }}

        >

          Recuerde{" "}

          <strong style={{ color: T.text }}>no dejar objetos de valor</strong>{" "}

          dentro de su vehículo.

          <span style={{ fontSize: 12.5, color: T.textSub }}>

            {" "}

            Parkealo App no se responsabiliza por pérdida de artículos o daños

            al vehículo.

          </span>

        </p>

        <div style={{ display: "flex", gap: 10 }}>

          <Btn

            onClick={onCancel}

            variant="secondary"

            full

            style={{ borderRadius: 14, padding: "14px 0", fontSize: 15 }}

          >

            Cancelar

          </Btn>

          <Btn

            onClick={onClose}

            variant="green"

            full

            style={{ borderRadius: 14, padding: "14px 0", fontSize: 15 }}

          >

            Entendido

          </Btn>

        </div>

      </div>

    </div>

  );

}

function Splash({ onNext }) {

  useEffect(() => {

    const t = setTimeout(onNext, 1800);

    return () => clearTimeout(t);

  }, []);

  return (

    <div

      style={{

        height: "100%",

        display: "flex",

        flexDirection: "column",

        alignItems: "center",

        justifyContent: "space-between",

        background: `linear-gradient(170deg,${T.blueNav} 0%,${T.blue} 60%,${T.blueSky} 100%)`,

        overflow: "hidden",

        position: "relative",

      }}

    >

      {[38, 58, 32, 66, 46, 28, 72, 44, 60, 36].map((h, i) => (

        <div

          key={i}

          style={{

            position: "absolute",

            bottom: 0,

            left: `${i * 11}%`,

            width: 26 + (i % 3) * 6,

            height: h,

            background: "rgba(255,255,255,0.04)",

            borderRadius: "3px 3px 0 0",

          }}

        />

      ))}

      <div

        style={{

          flex: 1,

          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          justifyContent: "center",

          gap: 16,

          position: "relative",

          zIndex: 1,

        }}

      >

        <ParkealoPinLogo size={90} variant="white" />

        <ParkealoWordmark size={38} variant="white" />

        <div

          style={{

            fontFamily: font,

            fontWeight: 500,

            fontSize: 13,

            color: "rgba(255,255,255,0.65)",

            letterSpacing: 0.8,

            marginTop: -6,

          }}

        >

          Renta tu parqueo fácil

        </div>

      </div>

      <div

        style={{

          width: "100%",

          height: 4,

          background: `linear-gradient(90deg,${T.green},${T.greenAcct},${T.green})`,

        }}

      />

    </div>

  );

}

function MapScreen({ onSelect, favorites = [], onToggleFav }) {

  const [activeFilters, setActiveFilters] = useState([]);

  const [rentalMode, setRentalMode] = useState("hora");

  const [showModeMenu, setModeMenu] = useState(false);

  const [showSearch, setShowSearch] = useState(false);

  const [searchQ, setSearchQ] = useState("");

  const [selectedDest, setSelectedDest] = useState(null);

  const [destination, setDestination] = useState(null);

  const [sortMode, setSortMode] = useState("relevance");

  const [showSort, setShowSort] = useState(false);

  const toggleFilter = (key) =>

    setActiveFilters((prev) =>

      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]

    );

  const baseSpots = destination

    ? (destination.nearSpots || [])

        .map((sid) => SPOTS.find((s) => s.id === sid))

        .filter(Boolean)

    : SPOTS;

  const filteredSpots =

    activeFilters.length === 0

      ? baseSpots

      : baseSpots.filter((spot) =>

          activeFilters.every((key) => spot.amenities[key])

        );

  const rentalLabels = { hora: "Por hora", dia: "Por día", mes: "Por mes" };

  return (

    <div

      style={{

        height: "100%",

        overflowY: "auto",

        background: T.surface,

        paddingBottom: 80,

        position: "relative",

      }}

    >

      <div

        style={{

          background: T.bg,

          padding: "0 14px 0",

          borderBottom: `1px solid ${T.border}`,

        }}

      >

        <div

          style={{

            height: 3,

            background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

            marginBottom: 14,

          }}

        />

        <div

          style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            marginBottom: 12,

          }}

        >

          <BrandMark small />

        </div>

        {/* Destination Search Modal */}

        {showSearch && (

          <div

            style={{

              position: "absolute",

              inset: 0,

              zIndex: 200,

              background: T.bg,

              display: "flex",

              flexDirection: "column",

            }}

          >

            {/* Header */}

            <div

              style={{

                padding: "14px 16px 10px",

                borderBottom: `1px solid ${T.border}`,

                flexShrink: 0,

              }}

            >

              <div

                style={{

                  display: "flex",

                  gap: 10,

                  alignItems: "center",

                  marginBottom: 0,

                }}

              >

                <div

                  style={{

                    display: "flex",

                    flex: 1,

                    alignItems: "center",

                    gap: 8,

                    background: T.surface,

                    border: `1.5px solid ${T.blue}`,

                    borderRadius: 50,

                    padding: "10px 14px",

                  }}

                >

                  <svg

                    width="15"

                    height="15"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={T.blue}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

                    <circle cx="12" cy="10" r="3" />

                  </svg>

                  <input

                    autoFocus

                    value={searchQ}

                    onChange={(e) => {

                      setSearchQ(e.target.value);

                      setSelectedDest(null);

                    }}

                    placeholder="¿A dónde vas?"

                    style={{

                      flex: 1,

                      background: "none",

                      border: "none",

                      outline: "none",

                      fontSize: 14,

                      fontFamily: font,

                      color: T.text,

                    }}

                  />

                  {searchQ && (

                    <button

                      onClick={() => {

                        setSearchQ("");

                        setSelectedDest(null);

                      }}

                      style={{

                        background: "none",

                        border: "none",

                        cursor: "pointer",

                        color: T.textFaint,

                        fontSize: 17,

                        lineHeight: 1,

                      }}

                    >

                      ✕

                    </button>

                  )}

                </div>

                <button

                  onClick={() => {

                    setShowSearch(false);

                    setSearchQ("");

                    setSelectedDest(null);

                  }}

                  style={{

                    background: "none",

                    border: "none",

                    color: T.blue,

                    fontSize: 14,

                    fontWeight: 700,

                    cursor: "pointer",

                    fontFamily: font,

                    flexShrink: 0,

                  }}

                >

                  Cancelar

                </button>

              </div>

            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

              {/* ── Parqueos cercanos al destino seleccionado ── */}

              {selectedDest && (

                <div>

                  <div

                    style={{

                      background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                      borderRadius: 16,

                      padding: "14px 16px",

                      marginBottom: 18,

                      position: "relative",

                      overflow: "hidden",

                    }}

                  >

                    <div

                      style={{

                        position: "absolute",

                        top: -10,

                        right: -10,

                        width: 70,

                        height: 70,

                        borderRadius: "50%",

                        background: "rgba(255,255,255,0.06)",

                      }}

                    />

                    <div

                      style={{ display: "flex", alignItems: "center", gap: 10 }}

                    >

                      <span style={{ fontSize: 24 }}>{selectedDest.icon}</span>

                      <div>

                        <div

                          style={{

                            fontWeight: 800,

                            fontSize: 14,

                            color: "#fff",

                          }}

                        >

                          {selectedDest.name}

                        </div>

                        <div

                          style={{

                            fontSize: 12,

                            color: "rgba(255,255,255,0.65)",

                          }}

                        >

                          {DEST_TYPE_LABELS[selectedDest.type]} ·{" "}

                          {selectedDest.area}

                        </div>

                      </div>

                    </div>

                    <div

                      style={{

                        marginTop: 10,

                        height: 1,

                        background: "rgba(255,255,255,0.15)",

                      }}

                    />

                    <div

                      style={{

                        marginTop: 10,

                        display: "flex",

                        alignItems: "center",

                        gap: 6,

                      }}

                    >

                      <svg

                        width="11"

                        height="11"

                        viewBox="0 0 24 24"

                        fill="none"

                        stroke={T.greenAcct}

                        strokeWidth="2.5"

                        strokeLinecap="round"

                      >

                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

                        <circle cx="12" cy="10" r="3" />

                      </svg>

                      <span

                        style={{

                          fontSize: 12,

                          color: "rgba(255,255,255,0.75)",

                          fontWeight: 600,

                        }}

                      >

                        {selectedDest.nearSpots.length} parqueo

                        {selectedDest.nearSpots.length > 1 ? "s" : ""}{" "}

                        disponible{selectedDest.nearSpots.length > 1 ? "s" : ""}{" "}

                        cerca

                      </span>

                    </div>

                  </div>

                  {/* Ver en mapa button */}

                  <button

                    onClick={() => {

                      setDestination(selectedDest);

                      setShowSearch(false);

                    }}

                    style={{

                      width: "100%",

                      background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                      border: "none",

                      borderRadius: 12,

                      padding: "11px 0",

                      color: "#fff",

                      fontFamily: font,

                      fontWeight: 800,

                      fontSize: 13,

                      cursor: "pointer",

                      marginBottom: 14,

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      gap: 8,

                    }}

                  >

                    <svg

                      width="14"

                      height="14"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke="#fff"

                      strokeWidth="2.5"

                      strokeLinecap="round"

                    >

                      <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />

                      <line x1="8" y1="2" x2="8" y2="18" />

                      <line x1="16" y1="6" x2="16" y2="22" />

                    </svg>

                    Ver parqueos en el mapa

                  </button>

                  <div

                    style={{

                      fontSize: 12,

                      fontWeight: 800,

                      color: T.textSub,

                      letterSpacing: 1,

                      marginBottom: 12,

                    }}

                  >

                    PARQUEOS CERCANOS

                  </div>

                  {selectedDest.nearSpots.map((sid) => {

                    const sp = SPOTS.find((s) => s.id === sid);

                    if (!sp) return null;

                    const walkMins = Math.round(

                      (Math.random() * 0.3 + 0.1) * 20

                    );

                    return (

                      <div

                        key={sid}

                        onClick={() => {

                          setShowSearch(false);

                          setSearchQ("");

                          onSelect(sp);

                          setDestination(selectedDest);

                        }}

                        style={{

                          background: T.bg,

                          borderRadius: 16,

                          marginBottom: 12,

                          border: `1.5px solid ${T.border}`,

                          overflow: "hidden",

                          boxShadow: T.shadow,

                          cursor: "pointer",

                        }}

                      >

                        <div

                          style={{

                            height: 80,

                            background:

                              sp.type === "private"

                                ? `linear-gradient(135deg,${T.blueNav},${T.blue})`

                                : `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "center",

                            position: "relative",

                          }}

                        >

                          <ParkealoPinLogo size={32} variant="white" />

                          <div

                            style={{

                              position: "absolute",

                              bottom: 0,

                              left: 0,

                              right: 0,

                              height: 3,

                              background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

                            }}

                          />

                          <div

                            style={{

                              position: "absolute",

                              top: 8,

                              left: 10,

                              background: "rgba(255,255,255,0.14)",

                              backdropFilter: "blur(4px)",

                              borderRadius: 20,

                              padding: "3px 8px",

                              display: "flex",

                              alignItems: "center",

                              gap: 4,

                            }}

                          >

                            <svg

                              width="8"

                              height="11"

                              viewBox="0 0 14 20"

                              fill="none"

                              stroke="#fff"

                              strokeWidth="2"

                              strokeLinecap="round"

                              strokeLinejoin="round"

                            >

                              <circle

                                cx="7"

                                cy="2.5"

                                r="2"

                                fill="#fff"

                                stroke="none"

                              />

                              <path d="M4 7.5 C4 6 5.5 5 7 5.5 C8.5 6 9.5 7 9 8.5 L8 11 L10 14.5" />

                              <path d="M7 9 L5.5 12 L3.5 14.5" />

                              <path d="M8 11 L9.5 13" />

                            </svg>

                            <span

                              style={{

                                fontSize: 10,

                                color: "#fff",

                                fontWeight: 700,

                              }}

                            >

                              {walkMins} min a pie

                            </span>

                          </div>

                        </div>

                        <div style={{ padding: "10px 14px 12px" }}>

                          <div

                            style={{

                              display: "flex",

                              justifyContent: "space-between",

                              alignItems: "flex-start",

                            }}

                          >

                            <div>

                              <div

                                style={{

                                  fontSize: 14,

                                  fontWeight: 800,

                                  color: T.text,

                                  marginBottom: 2,

                                }}

                              >

                                {sp.name}

                              </div>

                              <div style={{ fontSize: 12, color: T.textSub }}>

                                {sp.location} · {sp.distance} del destino

                              </div>

                            </div>

                            <div style={{ textAlign: "right" }}>

                              <div

                                style={{

                                  fontSize: 16,

                                  fontWeight: 900,

                                  color: T.green,

                                }}

                              >

                                {sp.currency}

                                {sp.price}

                                <span

                                  style={{

                                    fontSize: 11,

                                    fontWeight: 400,

                                    color: T.textSub,

                                  }}

                                >

                                  /h

                                </span>

                              </div>

                              <StarRating value={sp.rating} />

                            </div>

                          </div>

                        </div>

                      </div>

                    );

                  })}

                </div>

              )}

              {/* ── Sin destino seleccionado: recientes + sugeridos ── */}

              {!selectedDest && searchQ.length === 0 && (

                <div>

                  <div

                    style={{

                      fontSize: 12,

                      fontWeight: 800,

                      color: T.textSub,

                      letterSpacing: 1,

                      marginBottom: 10,

                    }}

                  >

                    BÚSQUEDAS RECIENTES

                  </div>

                  {RECENT_SEARCHES.map((z) => {

                    const dest = DESTINATIONS.find(

                      (d) => d.name === z || d.area === z

                    );

                    return (

                      <div

                        key={z}

                        onClick={() => {

                          if (dest) {

                            setDestination(dest);

                            setSelectedDest(dest);

                            setSearchQ(dest.name);

                            setShowSearch(false);

                          } else setSearchQ(z);

                        }}

                        style={{

                          display: "flex",

                          alignItems: "center",

                          gap: 10,

                          padding: "11px 0",

                          borderBottom: `1px solid ${T.border}`,

                          cursor: "pointer",

                        }}

                      >

                        <div

                          style={{

                            width: 32,

                            height: 32,

                            borderRadius: 10,

                            background: T.surface2,

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "center",

                            flexShrink: 0,

                          }}

                        >

                          <svg

                            width="13"

                            height="13"

                            viewBox="0 0 24 24"

                            fill="none"

                            stroke={T.textSub}

                            strokeWidth="2"

                            strokeLinecap="round"

                          >

                            <circle cx="12" cy="12" r="10" />

                            <polyline points="12 6 12 12 16 14" />

                          </svg>

                        </div>

                        <div style={{ flex: 1 }}>

                          <div

                            style={{

                              fontSize: 13,

                              fontWeight: 600,

                              color: T.text,

                            }}

                          >

                            {z}

                          </div>

                          {dest && (

                            <div style={{ fontSize: 11, color: T.textSub }}>

                              {DEST_TYPE_LABELS[dest.type]} ·{" "}

                              {dest.nearSpots.length} parqueo

                              {dest.nearSpots.length > 1 ? "s" : ""} cerca

                            </div>

                          )}

                        </div>

                        <svg

                          width="12"

                          height="12"

                          viewBox="0 0 24 24"

                          fill="none"

                          stroke={T.textFaint}

                          strokeWidth="2"

                          strokeLinecap="round"

                        >

                          <polyline points="9 18 15 12 9 6" />

                        </svg>

                      </div>

                    );

                  })}

                  <div

                    style={{

                      fontSize: 12,

                      fontWeight: 800,

                      color: T.textSub,

                      letterSpacing: 1,

                      marginTop: 20,

                      marginBottom: 12,

                    }}

                  >

                    LUGARES POPULARES

                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

                    {[

                      { icon: "🛍️", l: "Malls" },

                      { icon: "🍽️", l: "Restaurantes" },

                      { icon: "🏨", l: "Hoteles" },

                      { icon: "🏥", l: "Clínicas" },

                      { icon: "🎓", l: "Universidades" },

                      { icon: "🏢", l: "Oficinas" },

                    ].map((cat) => (

                      <button

                        key={cat.l}

                        onClick={() => setSearchQ(cat.l)}

                        style={{

                          display: "flex",

                          alignItems: "center",

                          gap: 6,

                          padding: "7px 12px",

                          borderRadius: 100,

                          border: `1.5px solid ${T.border}`,

                          background: T.surface,

                          cursor: "pointer",

                          fontFamily: font,

                        }}

                      >

                        <span style={{ fontSize: 14 }}>{cat.icon}</span>

                        <span

                          style={{

                            fontSize: 12,

                            fontWeight: 700,

                            color: T.text,

                          }}

                        >

                          {cat.l}

                        </span>

                      </button>

                    ))}

                  </div>

                </div>

              )}

              {/* ── Resultados de búsqueda por texto ── */}

              {!selectedDest &&

                searchQ.length > 0 &&

                (() => {

                  const q = searchQ.toLowerCase();

                  const catMap = {

                    malls: "mall",

                    restaurantes: "restaurant",

                    hoteles: "hotel",

                    clínicas: "hospital",

                    universidades: "university",

                    oficinas: "office",

                  };

                  const catKey = catMap[q];

                  const results = catKey

                    ? DESTINATIONS.filter((d) => d.type === catKey)

                    : DESTINATIONS.filter(

                        (d) =>

                          d.name.toLowerCase().includes(q) ||

                          d.area.toLowerCase().includes(q) ||

                          d.type.toLowerCase().includes(q)

                      );

                  return (

                    <div>

                      <div

                        style={{

                          fontSize: 12,

                          fontWeight: 800,

                          color: T.textSub,

                          letterSpacing: 1,

                          marginBottom: 12,

                        }}

                      >

                        {results.length} LUGAR{results.length !== 1 ? "ES" : ""}{" "}

                        ENCONTRADO{results.length !== 1 ? "S" : ""}

                      </div>

                      {results.length === 0 && (

                        <div style={{ textAlign: "center", padding: "40px 0" }}>

                          <div style={{ fontSize: 36, marginBottom: 12 }}>

                            📍

                          </div>

                          <div

                            style={{

                              fontWeight: 800,

                              color: T.text,

                              fontSize: 15,

                              marginBottom: 6,

                            }}

                          >

                            Sin resultados

                          </div>

                          <div style={{ color: T.textSub, fontSize: 13 }}>

                            Intenta con otro nombre o zona

                          </div>

                        </div>

                      )}

                      {results.map((dest) => (

                        <div

                          key={dest.id}

                          onClick={() => {

                            setDestination(dest);

                            setSelectedDest(dest);

                            setSearchQ(dest.name);

                            setShowSearch(false);

                          }}

                          style={{

                            display: "flex",

                            alignItems: "center",

                            gap: 12,

                            padding: "11px 0",

                            borderBottom: `1px solid ${T.border}`,

                            cursor: "pointer",

                          }}

                        >

                          <div

                            style={{

                              width: 40,

                              height: 40,

                              borderRadius: 12,

                              background: `linear-gradient(135deg,${T.blueLt},${T.surface2})`,

                              border: `1.5px solid ${T.border}`,

                              display: "flex",

                              alignItems: "center",

                              justifyContent: "center",

                              fontSize: 20,

                              flexShrink: 0,

                            }}

                          >

                            {dest.icon}

                          </div>

                          <div style={{ flex: 1 }}>

                            <div

                              style={{

                                fontSize: 14,

                                fontWeight: 700,

                                color: T.text,

                              }}

                            >

                              {dest.name}

                            </div>

                            <div style={{ fontSize: 12, color: T.textSub }}>

                              {DEST_TYPE_LABELS[dest.type]} · {dest.area}

                            </div>

                          </div>

                          <div style={{ textAlign: "right", flexShrink: 0 }}>

                            <div

                              style={{

                                fontSize: 11,

                                fontWeight: 700,

                                color: T.green,

                              }}

                            >

                              {dest.nearSpots.length} parqueo

                              {dest.nearSpots.length > 1 ? "s" : ""}

                            </div>

                            <div style={{ fontSize: 10, color: T.textFaint }}>

                              cerca

                            </div>

                          </div>

                        </div>

                      ))}

                    </div>

                  );

                })()}

            </div>

          </div>

        )}

        {/* Search trigger bar */}

        <div

          style={{

            display: "flex",

            gap: 8,

            marginBottom: 10,

            alignItems: "center",

          }}

        >

          <div

            style={{

              display: "flex",

              flex: 1,

              alignItems: "center",

              gap: 8,

              background: destination ? T.blueLt : T.bg,

              border: `1.5px solid ${destination ? T.blue : T.borderMd}`,

              borderRadius: 50,

              padding: "9px 14px",

              boxShadow: T.shadow,

              cursor: "pointer",

            }}

            onClick={() => {

              if (!destination) setShowSearch(true);

            }}

          >

            {destination ? (

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.blue}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

                <circle cx="12" cy="10" r="3" />

              </svg>

            ) : (

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

                <circle cx="12" cy="10" r="3" />

              </svg>

            )}

            {destination ? (

              <span

                style={{

                  fontSize: 13,

                  flex: 1,

                  fontWeight: 700,

                  color: T.text,

                }}

              >

                {destination.icon} {destination.name}

              </span>

            ) : (

              <span style={{ color: T.textFaint, fontSize: 13, flex: 1 }}>

                ¿A dónde vas?

              </span>

            )}

            {destination ? (

              <button

                onClick={(e) => {

                  e.stopPropagation();

                  setDestination(null);

                }}

                style={{

                  background: "none",

                  border: "none",

                  cursor: "pointer",

                  color: T.textFaint,

                  fontSize: 16,

                  lineHeight: 1,

                }}

              >

                ✕

              </button>

            ) : (

              <div style={{ width: 1, height: 14, background: T.border }} />

            )}

            {!destination && (

              <svg

                width="12"

                height="12"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.green}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

                <circle cx="12" cy="10" r="3" />

              </svg>

            )}

          </div>

          {/* Rental mode dropdown */}

          <div style={{ position: "relative", flexShrink: 0 }}>

            <button

              onClick={() => setModeMenu(!showModeMenu)}

              style={{

                display: "flex",

                alignItems: "center",

                gap: 5,

                padding: "9px 12px",

                borderRadius: 50,

                border: `1.5px solid ${T.blue}`,

                background: T.blueLt,

                cursor: "pointer",

                fontFamily: font,

                whiteSpace: "nowrap",

              }}

            >

              <span style={{ fontSize: 12, fontWeight: 700, color: T.blue }}>

                {rentalLabels[rentalMode]}

              </span>

              <svg

                width="10"

                height="10"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.blue}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="6 9 12 15 18 9" />

              </svg>

            </button>

            {showModeMenu && (

              <div

                style={{

                  position: "absolute",

                  top: "110%",

                  right: 0,

                  background: T.bg,

                  border: `1.5px solid ${T.border}`,

                  borderRadius: 12,

                  boxShadow: T.shadowMd,

                  zIndex: 100,

                  minWidth: 110,

                  overflow: "hidden",

                }}

              >

                {Object.entries(rentalLabels).map(([k, l]) => (

                  <button

                    key={k}

                    onClick={() => {

                      setRentalMode(k);

                      setModeMenu(false);

                    }}

                    style={{

                      display: "block",

                      width: "100%",

                      padding: "10px 14px",

                      background: rentalMode === k ? T.blueLt : T.bg,

                      border: "none",

                      textAlign: "left",

                      fontSize: 13,

                      fontWeight: 700,

                      color: rentalMode === k ? T.blue : T.text,

                      cursor: "pointer",

                      fontFamily: font,

                    }}

                  >

                    {l}

                  </button>

                ))}

              </div>

            )}

          </div>

        </div>

        {/* Amenity filter pills */}

        <div

          style={{

            display: "flex",

            overflowX: "auto",

            gap: 6,

            paddingBottom: 10,

            scrollbarWidth: "none",

          }}

        >

          {[

            { key: "private", label: "Privado", icon: "🏡" },

            { key: "cameras", label: "Cámara", icon: "📹" },

            { key: "covered", label: "Techado", icon: "🏠" },

            { key: "staff", label: "Personal", icon: "👤" },

            { key: "h24", label: "24/7", icon: "🕐" },

            { key: "access_control", label: "Ctrl. acceso", icon: "🔐" },

            { key: "valet", label: "Valet", icon: "🤵" },

            { key: "ev", label: "Carga EV", icon: "⚡" },

          ].map((a) => {

            const on = activeFilters.includes(a.key);

            return (

              <button

                key={a.key}

                onClick={() => toggleFilter(a.key)}

                style={{

                  display: "inline-flex",

                  alignItems: "center",

                  gap: 4,

                  padding: "5px 10px",

                  borderRadius: 100,

                  border: `1.5px solid ${on ? T.blue : T.border}`,

                  background: on ? T.blueLt : T.bg,

                  cursor: "pointer",

                  fontFamily: font,

                  whiteSpace: "nowrap",

                  flexShrink: 0,

                  boxShadow: on ? `0 2px 8px ${T.blue}22` : "none",

                  transition: "all 0.15s",

                }}

              >

                <span style={{ fontSize: 12 }}>{a.icon}</span>

                <span

                  style={{

                    fontSize: 11,

                    fontWeight: 700,

                    color: on ? T.blue : T.textSub,

                  }}

                >

                  {a.label}

                </span>

              </button>

            );

          })}

          {activeFilters.length > 0 && (

            <button

              onClick={() => setActiveFilters([])}

              style={{

                display: "inline-flex",

                alignItems: "center",

                padding: "5px 10px",

                borderRadius: 100,

                border: `1.5px solid ${T.borderMd}`,

                background: T.surface2,

                cursor: "pointer",

                fontFamily: font,

                whiteSpace: "nowrap",

                flexShrink: 0,

              }}

            >

              <span style={{ fontSize: 11, fontWeight: 700, color: T.textSub }}>

                ✕ Limpiar

              </span>

            </button>

          )}

        </div>

      </div>

      {/* Destination active banner */}

      {destination && (

        <div

          style={{

            margin: "14px 14px 0",

            background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

            borderRadius: 14,

            padding: "10px 14px",

            display: "flex",

            alignItems: "center",

            gap: 10,

          }}

        >

          <span style={{ fontSize: 18 }}>{destination.icon}</span>

          <div style={{ flex: 1, minWidth: 0 }}>

            <div

              style={{

                fontWeight: 800,

                fontSize: 13,

                color: "#fff",

                overflow: "hidden",

                textOverflow: "ellipsis",

                whiteSpace: "nowrap",

              }}

            >

              {destination.name}

            </div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>

              {destination.nearSpots.length} parqueo

              {destination.nearSpots.length > 1 ? "s" : ""} cercanos ·{" "}

              {destination.area}

            </div>

          </div>

          <button

            onClick={() => {

              setDestination(null);

              setSelectedDest(null);

              setSearchQ("");

            }}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 28,

              height: 28,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

              flexShrink: 0,

            }}

          >

            <svg

              width="12"

              height="12"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <line x1="18" y1="6" x2="6" y2="18" />

              <line x1="6" y1="6" x2="18" y2="18" />

            </svg>

          </button>

        </div>

      )}

      <div

        style={{

          margin: "10px 14px 0",

          borderRadius: 18,

          overflow: "hidden",

          boxShadow: T.shadowMd,

          border: `1px solid ${T.border}`,

          height: 230,

          background: `linear-gradient(160deg,${T.blueLt},#EAF0FA)`,

          position: "relative",

        }}

      >

        {[...Array(9)].map((_, i) => (

          <div

            key={"v" + i}

            style={{

              position: "absolute",

              left: `${i * 12}%`,

              top: 0,

              bottom: 0,

              width: 1,

              background: "rgba(26,86,196,0.06)",

            }}

          />

        ))}

        {[...Array(9)].map((_, i) => (

          <div

            key={"h" + i}

            style={{

              position: "absolute",

              top: `${i * 12}%`,

              left: 0,

              right: 0,

              height: 1,

              background: "rgba(26,86,196,0.06)",

            }}

          />

        ))}

        <div

          style={{

            position: "absolute",

            left: "30%",

            top: 0,

            bottom: 0,

            width: 5,

            background: "rgba(180,200,235,0.8)",

          }}

        />

        <div

          style={{

            position: "absolute",

            top: "44%",

            left: 0,

            right: 0,

            height: 5,

            background: "rgba(180,200,235,0.8)",

          }}

        />

        <div

          style={{

            position: "absolute",

            left: "65%",

            top: 0,

            bottom: 0,

            width: 3,

            background: "rgba(180,200,235,0.6)",

          }}

        />

        {SPOTS.map((spot, i) => {

          const pos = [

            { top: "20%", left: "17%" },

            { top: "62%", left: "55%" },

            { top: "13%", left: "70%" },

          ][i];

          const isNear = destination

            ? destination.nearSpots.includes(spot.id)

            : true;

          const pinBg = !isNear

            ? T.textFaint

            : spot.type === "private"

            ? T.blueNav

            : T.green;

          return (

            <button

              key={spot.id}

              onClick={() => onSelect(spot)}

              style={{

                position: "absolute",

                ...pos,

                transform: "translate(-50%,-50%)",

                background: pinBg,

                color: "#fff",

                border: `2.5px solid ${

                  isNear ? "#fff" : "rgba(255,255,255,0.4)"

                }`,

                borderRadius: 100,

                padding: "5px 11px",

                fontSize: 12,

                fontWeight: 800,

                cursor: "pointer",

                fontFamily: font,

                boxShadow: isNear ? T.shadowMd : "none",

                whiteSpace: "nowrap",

                opacity: isNear ? 1 : 0.45,

                transition: "all 0.3s",

              }}

            >

              {spot.currency}

              {spot.price}

            </button>

          );

        })}

        <div

          style={{

            position: "absolute",

            top: "47%",

            left: "42%",

            transform: "translate(-50%,-50%)",

            width: 14,

            height: 14,

            borderRadius: "50%",

            background: T.blue,

            border: "3px solid #fff",

            boxShadow: `0 0 0 8px ${T.blue}22`,

          }}

        />

        <div

          style={{

            position: "absolute",

            top: 10,

            left: 10,

            background: "rgba(255,255,255,0.94)",

            borderRadius: 20,

            padding: "4px 12px",

            fontSize: 11,

            color: destination ? T.blue : T.textSub,

            fontWeight: 600,

            boxShadow: T.shadowSm,

          }}

        >

          {destination

            ? `${destination.icon} ${destination.area}`

            : "Zona Colonial · Santo Domingo"}

        </div>

        {destination && (

          <div

            style={{

              position: "absolute",

              top: "42%",

              left: "38%",

              transform: "translate(-50%,-100%)",

              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",

              zIndex: 10,

            }}

          >

            <div

              style={{

                background: T.danger,

                color: "#fff",

                borderRadius: 20,

                padding: "4px 10px",

                fontSize: 10,

                fontWeight: 800,

                marginBottom: 2,

                textAlign: "center",

                whiteSpace: "nowrap",

              }}

            >

              {destination.icon}{" "}

              {destination.name.length > 18

                ? destination.name.slice(0, 18) + "…"

                : destination.name}

            </div>

            <div

              style={{

                width: 0,

                height: 0,

                borderLeft: "6px solid transparent",

                borderRight: "6px solid transparent",

                borderTop: `8px solid ${T.danger}`,

                margin: "0 auto",

              }}

            />

          </div>

        )}

        <div

          style={{

            position: "absolute",

            bottom: 10,

            left: 10,

            display: "flex",

            gap: 6,

          }}

        >

          {[

            [T.green, "Público"],

            [T.blueNav, "Privado"],

          ].map(([c, l]) => (

            <div

              key={l}

              style={{

                background: "rgba(255,255,255,0.93)",

                borderRadius: 8,

                padding: "3px 8px",

                fontSize: 10,

                color: c,

                fontWeight: 700,

                boxShadow: T.shadowSm,

              }}

            >

              ● {l}

            </div>

          ))}

        </div>

      </div>

      <div style={{ padding: "14px 14px 0" }}>

        <div

          style={{

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            marginBottom: 12,

          }}

        >

          <div style={{ fontSize: 13, color: T.textSub }}>

            {destination ? (

              <>

                <span style={{ fontWeight: 700, color: T.text }}>

                  {filteredSpots.length}

                </span>{" "}

                cerca de{" "}

                <span style={{ fontWeight: 700, color: T.blue }}>

                  {destination.area}

                </span>

              </>

            ) : (

              <>

                <span style={{ fontWeight: 700, color: T.text }}>

                  {filteredSpots.length}

                </span>{" "}

                parqueo{filteredSpots.length !== 1 ? "s" : ""} encontrado

                {filteredSpots.length !== 1 ? "s" : ""}

              </>

            )}

            {activeFilters.length > 0 && (

              <span style={{ color: T.blue, fontWeight: 700 }}>

                {" "}

                &middot; {activeFilters.length} filtro

                {activeFilters.length > 1 ? "s" : ""}

              </span>

            )}

          </div>

          <div style={{ position: "relative" }}>

            <button

              onClick={() => setShowSort(!showSort)}

              style={{

                background: "none",

                border: "none",

                color: T.blue,

                fontSize: 12,

                fontWeight: 700,

                cursor: "pointer",

                fontFamily: font,

                display: "flex",

                alignItems: "center",

                gap: 4,

              }}

            >

              Ordenar{" "}

              <svg

                width="10"

                height="10"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.blue}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="6 9 12 15 18 9" />

              </svg>

            </button>

            {showSort && (

              <div

                style={{

                  position: "absolute",

                  right: 0,

                  top: "110%",

                  background: T.bg,

                  border: `1.5px solid ${T.border}`,

                  borderRadius: 12,

                  boxShadow: T.shadowMd,

                  zIndex: 100,

                  minWidth: 140,

                  overflow: "hidden",

                }}

              >

                {[

                  ["relevance", "Relevancia"],

                  ["price_asc", "Precio: menor"],

                  ["price_desc", "Precio: mayor"],

                  ["rating", "Mejor valorado"],

                  ["distance", "Más cercano"],

                ].map(([k, l]) => (

                  <button

                    key={k}

                    onClick={() => {

                      setSortMode(k);

                      setShowSort(false);

                    }}

                    style={{

                      display: "block",

                      width: "100%",

                      padding: "10px 14px",

                      background: sortMode === k ? T.blueLt : T.bg,

                      border: "none",

                      textAlign: "left",

                      fontSize: 13,

                      fontWeight: sortMode === k ? 700 : 500,

                      color: sortMode === k ? T.blue : T.text,

                      cursor: "pointer",

                      fontFamily: font,

                    }}

                  >

                    {sortMode === k && "✓ "}

                    {l}

                  </button>

                ))}

              </div>

            )}

          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {filteredSpots.length === 0 && (

            <Card style={{ textAlign: "center", padding: "32px 20px" }}>

              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>

              <div

                style={{

                  fontWeight: 800,

                  color: T.text,

                  fontSize: 15,

                  marginBottom: 6,

                }}

              >

                Sin resultados

              </div>

              <div

                style={{

                  color: T.textSub,

                  fontSize: 13,

                  marginBottom: 18,

                  lineHeight: 1.6,

                }}

              >

                Ningún parqueo tiene todos los servicios seleccionados a la vez.

              </div>

              <Btn onClick={() => setActiveFilters([])} variant="blue" small>

                Limpiar filtros

              </Btn>

            </Card>

          )}

          {filteredSpots.map((spot) => (

            <Card

              key={spot.id}

              onClick={() => onSelect(spot)}

              style={{ padding: 0, overflow: "hidden" }}

            >

              <div

                style={{

                  height: 138,

                  background:

                    spot.type === "private"

                      ? `linear-gradient(135deg,${T.blueNav},${T.blue})`

                      : `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  position: "relative",

                }}

              >

                <ParkealoPinLogo size={48} variant="white" />

                <div

                  style={{

                    position: "absolute",

                    bottom: 0,

                    left: 0,

                    right: 0,

                    height: 3,

                    background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

                  }}

                />

                <div

                  style={{

                    position: "absolute",

                    top: 10,

                    left: 10,

                    display: "flex",

                    gap: 5,

                  }}

                >

                  {spot.type === "private" && (

                    <Tag

                      color="#fff"

                      bg="rgba(0,0,0,0.25)"

                      border="rgba(255,255,255,0.15)"

                    >

                      Privado

                    </Tag>

                  )}

                </div>

                <button

                  onClick={(e) => {

                    e.stopPropagation();

                    onToggleFav(spot);

                  }}

                  style={{

                    position: "absolute",

                    top: 10,

                    right: 12,

                    background: "rgba(255,255,255,0.15)",

                    border: "none",

                    borderRadius: "50%",

                    width: 30,

                    height: 30,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    cursor: "pointer",

                  }}

                >

                  <svg

                    width="14"

                    height="14"

                    viewBox="0 0 24 24"

                    fill={

                      favorites.find((f) => f.id === spot.id)

                        ? "#ff6b6b"

                        : "none"

                    }

                    stroke={

                      favorites.find((f) => f.id === spot.id)

                        ? "#ff6b6b"

                        : "#fff"

                    }

                    strokeWidth="2"

                    strokeLinecap="round"

                  >

                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />

                  </svg>

                </button>

                <div

                  style={{

                    position: "absolute",

                    bottom: 12,

                    right: 10,

                    background: "rgba(255,255,255,0.15)",

                    backdropFilter: "blur(4px)",

                    borderRadius: 8,

                    padding: "2px 8px",

                    fontSize: 11,

                    fontWeight: 700,

                    color: "#fff",

                  }}

                >

                  {spot.floors} piso{spot.floors > 1 ? "s" : ""}

                </div>

              </div>

              <div style={{ padding: "12px 14px 14px" }}>

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "flex-start",

                    marginBottom: 3,

                  }}

                >

                  <div

                    style={{

                      fontSize: 15,

                      fontWeight: 800,

                      color: T.text,

                      flex: 1,

                    }}

                  >

                    {spot.name}

                  </div>

                  <StarRating value={spot.rating} />

                </div>

                <div

                  style={{

                    fontSize: 12,

                    color: T.textSub,

                    marginBottom: spot.transport.length > 0 ? 7 : 10,

                  }}

                >

                  {spot.location} · {spot.distance} · {spot.reviews} reseñas

                </div>

                {spot.transport.length > 0 && (

                  <div

                    style={{

                      display: "flex",

                      gap: 5,

                      flexWrap: "wrap",

                      marginBottom: 10,

                    }}

                  >

                    {spot.transport.map((tr) => (

                      <span

                        key={tr}

                        style={{

                          display: "inline-flex",

                          alignItems: "center",

                          gap: 4,

                          fontSize: 11,

                          fontWeight: 600,

                          padding: "3px 8px",

                          borderRadius: 100,

                          background: T.blueLt,

                          color: T.blue,

                          border: `1px solid ${T.blueMid}`,

                        }}

                      >

                        <svg

                          width="9"

                          height="12"

                          viewBox="0 0 14 20"

                          fill="none"

                          stroke={T.blue}

                          strokeWidth="1.8"

                          strokeLinecap="round"

                          strokeLinejoin="round"

                        >

                          <circle

                            cx="7"

                            cy="2.5"

                            r="2"

                            fill={T.blue}

                            stroke="none"

                          />

                          <path d="M4 7.5 C4 6 5.5 5 7 5.5 C8.5 6 9.5 7 9 8.5 L8 11 L10 14.5" />

                          <path d="M7 9 L5.5 12 L3.5 14.5" />

                          <path d="M8 11 L9.5 13" />

                        </svg>

                        {tr}

                      </span>

                    ))}

                  </div>

                )}

                <Divider my={10} />

                <div

                  style={{

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                  }}

                >

                  <div>

                    <span

                      style={{ fontSize: 17, fontWeight: 900, color: T.text }}

                    >

                      {spot.currency}

                      {spot.price}

                    </span>

                    <span style={{ fontSize: 12, color: T.textSub }}>

                      {" "}

                      / hora

                    </span>

                  </div>

                </div>

              </div>

            </Card>

          ))}

        </div>

      </div>

    </div>

  );

}

function DetailScreen({

  spot,

  onBack,

  onReserve,

  favorites = [],

  onToggleFav,

}) {

  const [hours, setHours] = useState(2);

  const [allDay, setAllDay] = useState(false);

  // Compute "Todo el día" hours = from selected arrival time until spot closes

  // Backend will provide exact closing time; here we simulate based on spot data

  const getClosingHour = () => {

    if (spot.amenities?.h24) return 24; // 24h parking closes at midnight

    return 22; // default 10 PM — backend provides real value per spot

  };

  const getAllDayHours = () => {

    // Parse selTime (e.g. "10:30 AM") → decimal hour

    const [timePart, ampm] = selTime.split(" ");

    const [hStr, mStr] = timePart.split(":");

    let h = parseInt(hStr);

    const m = parseInt(mStr);

    if (ampm === "PM" && h !== 12) h += 12;

    if (ampm === "AM" && h === 12) h = 0;

    const arrivalDecimal = h + m / 60;

    const closingHour = getClosingHour();

    const computed = Math.max(1, Math.floor(closingHour - arrivalDecimal));

    return computed;

  };

  const effectiveHours = allDay ? getAllDayHours() : hours;

  const [dateMode, setDateMode] = useState("today");

  const [forOther, setForOther] = useState(false);

  const [otherPlate, setOtherPlate] = useState("");

  const [insurance, setInsurance] = useState(true);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selDateIdx, setSelDateIdx] = useState(0); // 0 = Today

  const [selTime, setSelTime] = useState("10:30 AM");

  const dateScrollRef = useRef(null);

  // Build rolling 14-day list starting from today

  const buildDateItems = () => {

    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    const months = [

      "Ene",

      "Feb",

      "Mar",

      "Abr",

      "May",

      "Jun",

      "Jul",

      "Ago",

      "Sep",

      "Oct",

      "Nov",

      "Dic",

    ];

    const today = new Date(2026, 2, 9); // Mon 9 Mar 2026

    return Array.from({ length: 14 }, (_, i) => {

      const d = new Date(today);

      d.setDate(today.getDate() + i);

      const label =

        i === 0

          ? "Hoy"

          : `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;

      return { label, date: d };

    });

  };

  const subtotal = spot.price * effectiveHours;

  const itbis = Math.round(subtotal * 0.18);

  const total = subtotal + itbis + 25 + (insurance ? 25 : 0);

  return (

    <div

      style={{

        height: "100%",

        display: "flex",

        flexDirection: "column",

        background: T.bg,

        overflow: "hidden",

      }}

    >

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>

        <div

          style={{

            height: 210,

            background: `linear-gradient(160deg,${T.blueNav},${T.blue})`,

            position: "relative",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            overflow: "hidden",

          }}

        >

          {[38, 52, 30, 60, 44, 28, 68].map((h, i) => (

            <div

              key={i}

              style={{

                position: "absolute",

                bottom: 0,

                left: `${i * 15 + 1}%`,

                width: 28,

                height: h,

                background: "rgba(255,255,255,0.04)",

                borderRadius: "3px 3px 0 0",

              }}

            />

          ))}

          <div style={{ position: "relative", zIndex: 1 }}>

            <ParkealoPinLogo size={58} variant="white" />

          </div>

          <div

            style={{

              position: "absolute",

              bottom: 0,

              left: 0,

              right: 0,

              height: 4,

              background: `linear-gradient(90deg,${T.green},${T.greenAcct},${T.green})`,

            }}

          />

          <button

            onClick={onBack}

            style={{

              position: "absolute",

              top: 14,

              left: 14,

              background: "rgba(255,255,255,0.14)",

              border: "none",

              borderRadius: "50%",

              width: 36,

              height: 36,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <button

            onClick={() => onToggleFav(spot)}

            style={{

              position: "absolute",

              top: 14,

              right: 14,

              background: "rgba(255,255,255,0.14)",

              border: "none",

              borderRadius: "50%",

              width: 36,

              height: 36,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="15"

              height="15"

              viewBox="0 0 24 24"

              fill={

                favorites.find((f) => f.id === spot.id) ? "#ff6b6b" : "none"

              }

              stroke={

                favorites.find((f) => f.id === spot.id) ? "#ff6b6b" : "#fff"

              }

              strokeWidth="2"

              strokeLinecap="round"

            >

              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />

            </svg>

          </button>

          {spot.transport.length > 0 && (

            <div

              style={{

                position: "absolute",

                bottom: 14,

                left: 14,

                display: "flex",

                gap: 6,

              }}

            >

              {spot.transport.map((tr) => (

                <div

                  key={tr}

                  style={{

                    background: "rgba(255,255,255,0.14)",

                    backdropFilter: "blur(4px)",

                    borderRadius: 20,

                    padding: "3px 10px",

                    fontSize: 10,

                    color: "#fff",

                    fontWeight: 600,

                    display: "inline-flex",

                    alignItems: "center",

                    gap: 4,

                  }}

                >

                  <svg

                    width="7"

                    height="10"

                    viewBox="0 0 14 20"

                    fill="none"

                    stroke="#fff"

                    strokeWidth="2"

                    strokeLinecap="round"

                    strokeLinejoin="round"

                  >

                    <circle cx="7" cy="2.5" r="2" fill="#fff" stroke="none" />

                    <path d="M4 7.5 C4 6 5.5 5 7 5.5 C8.5 6 9.5 7 9 8.5 L8 11 L10 14.5" />

                    <path d="M7 9 L5.5 12 L3.5 14.5" />

                    <path d="M8 11 L9.5 13" />

                  </svg>

                  {tr}

                </div>

              ))}

            </div>

          )}

        </div>

        <div style={{ padding: "18px 16px 0" }}>

          <div style={{ marginBottom: 14 }}>

            <div

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "flex-start",

                gap: 8,

              }}

            >

              <h1

                style={{

                  fontFamily: font,

                  fontSize: 20,

                  fontWeight: 900,

                  color: T.text,

                  margin: "0 0 5px",

                  flex: 1,

                }}

              >

                {spot.name}

              </h1>

              <StarRating value={spot.rating} />

            </div>

            <div style={{ color: T.textSub, fontSize: 13, marginBottom: 10 }}>

              {spot.location} · {spot.distance} · {spot.reviews} reseñas

            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>

              <Tag

                color={spot.type === "private" ? T.blueNav : T.green}

                bg={spot.type === "private" ? T.blueLt : T.greenLt}

                border={spot.type === "private" ? T.blueMid : T.greenMid}

              >

                {spot.type === "private" ? "Privado" : "Público"}

              </Tag>

              {spot.amenities.h24 && <Tag>24/7</Tag>}

            </div>

          </div>

          <Divider />

          <div

            style={{

              display: "flex",

              alignItems: "center",

              gap: 12,

              marginBottom: 14,

            }}

          >

            <div

              style={{

                width: 46,

                height: 46,

                borderRadius: "50%",

                background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

              }}

            >

              <ParkealoPinLogo size={22} variant="white" />

            </div>

            <div>

              <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>

                Administrado por Parkealo

              </div>

              <div style={{ color: T.textSub, fontSize: 12 }}>

                {spot.reviews} reseñas · Verificado

              </div>

            </div>

            <div

              style={{

                marginLeft: "auto",

                background: T.greenLt,

                border: `1px solid ${T.greenMid}`,

                borderRadius: 20,

                padding: "4px 10px",

                display: "flex",

                alignItems: "center",

                gap: 5,

              }}

            >

              <svg

                width="11"

                height="11"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.green}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="20 6 9 17 4 12" />

              </svg>

              <span style={{ color: T.green, fontSize: 11, fontWeight: 700 }}>

                Verificado

              </span>

            </div>

          </div>

          <Divider />

          {spot.type === "private" && (

            <>

              <div

                style={{

                  background: T.blueLt,

                  border: `1.5px solid ${T.blueMid}`,

                  borderRadius: 14,

                  padding: 14,

                  marginBottom: 14,

                }}

              >

                <div

                  style={{

                    fontWeight: 800,

                    color: T.blueNav,

                    fontSize: 14,

                    marginBottom: 5,

                  }}

                >

                  Espacio privado — Aprobación requerida

                </div>

                <p

                  style={{

                    color: T.textMid,

                    fontSize: 13,

                    margin: 0,

                    lineHeight: 1.6,

                  }}

                >

                  El propietario revisará tu solicitud y te enviará el PIN de

                  acceso e instrucciones al aprobarla.

                </p>

              </div>

              <Divider />

            </>

          )}

          <div style={{ marginBottom: 14 }}>

            <SectionLabel>Servicios disponibles</SectionLabel>

            {/* Active amenities as compact pills */}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>

              {AMENITIES.map((a) => {

                const has = spot.amenities[a.key];

                if (!has) return null;

                return (

                  <div

                    key={a.key}

                    style={{

                      display: "inline-flex",

                      alignItems: "center",

                      gap: 5,

                      padding: "5px 10px",

                      borderRadius: 100,

                      background: T.greenLt,

                      border: `1px solid ${T.greenMid}`,

                    }}

                  >

                    <span style={{ fontSize: 13 }}>{a.icon}</span>

                    <span

                      style={{ fontSize: 11, fontWeight: 700, color: T.green }}

                    >

                      {a.label}

                    </span>

                  </div>

                );

              })}

              {/* Grey pills for unavailable */}

              {AMENITIES.filter((a) => !spot.amenities[a.key]).map((a) => (

                <div

                  key={a.key}

                  style={{

                    display: "inline-flex",

                    alignItems: "center",

                    gap: 5,

                    padding: "5px 10px",

                    borderRadius: 100,

                    background: T.surface2,

                    border: `1px solid ${T.border}`,

                    opacity: 0.45,

                  }}

                >

                  <span style={{ fontSize: 13 }}>{a.icon}</span>

                  <span

                    style={{

                      fontSize: 11,

                      fontWeight: 600,

                      color: T.textFaint,

                    }}

                  >

                    {a.label}

                  </span>

                </div>

              ))}

            </div>

          </div>

          <Divider />

          <div style={{ marginBottom: 14 }}>

            <SectionLabel>{"¿Cuándo llegas?"}</SectionLabel>

            {/* ── DATE: drum/scroll picker like iOS ── */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                {"Fecha"}

              </div>

              {showDatePicker ? (

                <div

                  style={{

                    background: T.bg,

                    border: `1.5px solid ${T.blue}`,

                    borderRadius: 16,

                    overflow: "hidden",

                    boxShadow: T.shadowMd,

                  }}

                >

                  {/* Drum scroll list */}

                  <div

                    style={{

                      position: "relative",

                      height: 220,

                      overflowY: "auto",

                      scrollSnapType: "y mandatory",

                      scrollbarWidth: "none",

                    }}

                    ref={dateScrollRef}

                    onScroll={(e) => {

                      const idx = Math.round(e.target.scrollTop / 52);

                      const items = buildDateItems();

                      if (items[idx]) setSelDateIdx(idx);

                    }}

                  >

                    {/* Top/bottom padding so first/last item can center */}

                    <div style={{ height: 84 }} />

                    {buildDateItems().map((item, idx) => (

                      <div

                        key={idx}

                        onClick={() => {

                          setSelDateIdx(idx);

                          setShowDatePicker(false);

                        }}

                        style={{

                          height: 52,

                          display: "flex",

                          alignItems: "center",

                          justifyContent: "center",

                          scrollSnapAlign: "center",

                          cursor: "pointer",

                        }}

                      >

                        <span

                          style={{

                            fontFamily: font,

                            fontSize:

                              selDateIdx === idx

                                ? 22

                                : Math.abs(selDateIdx - idx) === 1

                                ? 18

                                : 14,

                            fontWeight:

                              selDateIdx === idx

                                ? 900

                                : Math.abs(selDateIdx - idx) === 1

                                ? 500

                                : 400,

                            color:

                              selDateIdx === idx

                                ? T.text

                                : `rgba(13,27,62,${Math.max(

                                    0.15,

                                    0.7 - Math.abs(selDateIdx - idx) * 0.18

                                  )})`,

                            transition: "all 0.15s",

                          }}

                        >

                          {item.label}

                        </span>

                      </div>

                    ))}

                    <div style={{ height: 84 }} />

                  </div>

                  {/* Selection highlight — subtle line only, no box */}

                  {/* Fade top/bottom */}

                  <div

                    style={{

                      position: "absolute",

                      top: 0,

                      left: 0,

                      right: 0,

                      height: 70,

                      background: `linear-gradient(to bottom, ${T.bg}, transparent)`,

                      pointerEvents: "none",

                      zIndex: 2,

                    }}

                  />

                  <div

                    style={{

                      position: "absolute",

                      bottom: 0,

                      left: 0,

                      right: 0,

                      height: 70,

                      background: `linear-gradient(to top, ${T.bg}, transparent)`,

                      pointerEvents: "none",

                      zIndex: 2,

                    }}

                  />

                  {/* Done button */}

                  <div

                    style={{

                      padding: "8px 14px 10px",

                      borderTop: `1px solid ${T.border}`,

                      display: "flex",

                      justifyContent: "flex-end",

                      position: "relative",

                      zIndex: 3,

                    }}

                  >

                    <button

                      onClick={() => setShowDatePicker(false)}

                      style={{

                        background: T.blue,

                        border: "none",

                        borderRadius: 20,

                        padding: "6px 18px",

                        color: "#fff",

                        fontSize: 13,

                        fontWeight: 700,

                        cursor: "pointer",

                        fontFamily: font,

                      }}

                    >

                      Listo

                    </button>

                  </div>

                </div>

              ) : (

                <div

                  onClick={() => setShowDatePicker(true)}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 8,

                    background: T.surface,

                    border: `1.5px solid ${T.borderMd}`,

                    borderRadius: 12,

                    padding: "12px 14px",

                    cursor: "pointer",

                  }}

                >

                  <svg

                    width="15"

                    height="15"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={T.blue}

                    strokeWidth="2"

                    strokeLinecap="round"

                  >

                    <rect x="3" y="4" width="18" height="18" rx="2" />

                    <line x1="16" y1="2" x2="16" y2="6" />

                    <line x1="8" y1="2" x2="8" y2="6" />

                    <line x1="3" y1="10" x2="21" y2="10" />

                  </svg>

                  <div

                    style={{

                      flex: 1,

                      display: "flex",

                      alignItems: "center",

                      gap: 6,

                    }}

                  >

                    {selDateIdx === 0 && (

                      <span

                        style={{

                          background: T.blue,

                          color: "#fff",

                          fontSize: 10,

                          fontWeight: 800,

                          borderRadius: 6,

                          padding: "1px 7px",

                        }}

                      >

                        HOY

                      </span>

                    )}

                    <span

                      style={{ fontSize: 14, fontWeight: 700, color: T.text }}

                    >

                      {buildDateItems()[selDateIdx]?.label || "Hoy"}

                    </span>

                  </div>

                  <svg

                    width="10"

                    height="10"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={T.textSub}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <polyline points="6 9 12 15 18 9" />

                  </svg>

                </div>

              )}

            </div>

            {/* ── TIME: horizontal scrollable pill row ── */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 8,

                }}

              >

                {"Hora de llegada"}

              </div>

              <div

                style={{

                  display: "flex",

                  overflowX: "auto",

                  gap: 7,

                  paddingBottom: 4,

                  scrollbarWidth: "none",

                }}

              >

                {[

                  "7:00 AM",

                  "7:30 AM",

                  "8:00 AM",

                  "8:30 AM",

                  "9:00 AM",

                  "9:30 AM",

                  "10:00 AM",

                  "10:30 AM",

                  "11:00 AM",

                  "11:30 AM",

                  "12:00 PM",

                  "12:30 PM",

                  "1:00 PM",

                  "2:00 PM",

                  "3:00 PM",

                  "4:00 PM",

                  "5:00 PM",

                  "6:00 PM",

                  "7:00 PM",

                  "8:00 PM",

                ].map((t) => (

                  <button

                    key={t}

                    onClick={() => setSelTime(t)}

                    style={{

                      flexShrink: 0,

                      padding: "8px 14px",

                      borderRadius: 100,

                      border: `1.5px solid ${

                        selTime === t ? T.blue : T.border

                      }`,

                      background: selTime === t ? T.blue : T.bg,

                      color: selTime === t ? "#fff" : T.textMid,

                      fontSize: 13,

                      fontWeight: selTime === t ? 800 : 500,

                      cursor: "pointer",

                      fontFamily: font,

                      boxShadow:

                        selTime === t ? `0 2px 8px ${T.blue}44` : "none",

                      transition: "all 0.15s",

                    }}

                  >

                    {t}

                  </button>

                ))}

              </div>

            </div>

            <div

              style={{

                fontWeight: 700,

                color: T.textMid,

                fontSize: 13,

                marginBottom: 10,

              }}

            >

              {"Duración"}

            </div>

            <div style={{ display: "flex", gap: 7 }}>

              {[1, 2, 4, 6, 8, "all"].map((h) => {

                const isAll = h === "all";

                const isActive = isAll ? allDay : !allDay && hours === h;

                return (

                  <button

                    key={h}

                    onClick={() => {

                      if (isAll) {

                        setAllDay(true);

                      } else {

                        setAllDay(false);

                        setHours(h);

                      }

                    }}

                    style={{

                      flex: 1,

                      padding: "8px 2px",

                      borderRadius: 10,

                      border: `2px solid ${isActive ? T.green : T.border}`,

                      background: isActive ? T.greenLt : T.bg,

                      color: isActive ? T.green : T.textMid,

                      fontSize: 13,

                      fontWeight: 700,

                      cursor: "pointer",

                      fontFamily: font,

                      textAlign: "center",

                      lineHeight: 1.2,

                    }}

                  >

                    {isAll ? (

                      <span style={{ fontSize: 10, fontWeight: 800 }}>

                        {"Todo el día"}

                      </span>

                    ) : (

                      `${h}h`

                    )}

                  </button>

                );

              })}

            </div>

          </div>

          <Divider />

          <div style={{ marginBottom: 4 }}>

            <Toggle

              on={forOther}

              onToggle={() => setForOther(!forOther)}

              label="Reservar para otra persona"

              sub="Ingresa la placa del vehículo a parquear."

            />

            {forOther && (

              <div style={{ marginBottom: 10 }}>

                <div

                  style={{

                    color: T.textMid,

                    fontSize: 13,

                    fontWeight: 600,

                    marginBottom: 5,

                  }}

                >

                  Placa del vehículo

                </div>

                <input

                  value={otherPlate}

                  onChange={(e) => setOtherPlate(e.target.value.toUpperCase())}

                  placeholder="Ej: A123456"

                  style={{

                    width: "100%",

                    background: T.surface,

                    border: `1.5px solid ${T.borderMd}`,

                    borderRadius: 10,

                    padding: "11px 14px",

                    color: T.text,

                    fontSize: 14,

                    fontFamily: font,

                    outline: "none",

                    boxSizing: "border-box",

                  }}

                />

              </div>

            )}

          </div>

          <Divider />

          <div style={{ marginBottom: 4 }}>

            <Toggle

              on={insurance}

              onToggle={() => setInsurance(!insurance)}

              label={

                <span>

                  Seguro{" "}

                  <span

                    style={{ fontWeight: 600, fontSize: 11, color: T.textSub }}

                  >

                    — RD$25

                  </span>

                </span>

              }

              sub={

                <span>

                  Protegido con <strong>Seguros Reservas</strong> · Cubre hasta

                  RD$3,000 en daños a su vehículo durante su tiempo de reserva.

                </span>

              }

            />

            {insurance && (

              <div

                style={{

                  background: T.greenLt,

                  border: `1.5px solid ${T.greenMid}`,

                  borderRadius: 12,

                  padding: 12,

                  marginBottom: 4,

                }}

              >

                <div style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>

                  Protección activa durante tu estadía de {effectiveHours}h

                </div>

              </div>

            )}

          </div>

          <Divider />

          <div style={{ marginBottom: 20 }}>

            <SectionLabel>Resumen de precio</SectionLabel>

            {[

              [

                `${spot.currency}${spot.price} × ${effectiveHours} hora${

                  effectiveHours > 1 ? "s" : ""

                }`,

                `${spot.currency}${subtotal}`,

              ],

              ...(insurance ? [["Seguro Reservas", `${spot.currency}25`]] : []),

              ["ITBIS (18%)", `${spot.currency}${itbis}`],

              ["Fee de servicio", `${spot.currency}25`],

            ].map(([l, v]) => (

              <div

                key={l}

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginBottom: 10,

                  fontSize: 14,

                }}

              >

                <span style={{ color: T.textMid }}>{l}</span>

                <span style={{ color: T.text }}>{v}</span>

              </div>

            ))}

            <div

              style={{ height: 1.5, background: T.border, margin: "12px 0 0" }}

            />

          </div>

        </div>

      </div>

      {/* end scrollable */}

      {/* ── Sticky bottom bar ── */}

      <div

        style={{

          flexShrink: 0,

          background: T.bg,

          borderTop: `1px solid ${T.border}`,

          padding: "12px 16px",

          boxShadow: "0 -4px 20px rgba(26,86,196,0.09)",

        }}

      >

        <div

          style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            gap: 12,

          }}

        >

          <div>

            <div

              style={{

                fontSize: 11,

                color: T.textSub,

                fontWeight: 600,

                marginBottom: 1,

              }}

            >

              Total estimado · {hours}h

            </div>

            <div

              style={{

                fontSize: 20,

                fontWeight: 900,

                color: T.green,

                lineHeight: 1,

              }}

            >

              {spot.currency}

              {total}

            </div>

          </div>

          <Btn

            onClick={onReserve}

            variant="green"

            style={{

              padding: "13px 32px",

              fontSize: 15,

              borderRadius: 14,

              flexShrink: 0,

            }}

          >

            {spot.type === "private" ? "Solicitar" : "Reservar"}

          </Btn>

        </div>

      </div>

    </div>

  );

}

function CheckoutScreen({ spot, onBack }) {

  const [method, setMethod] = useState("card");

  const [done, setDone] = useState(false);

  const [showDisclaimer, setDisc] = useState(true);

  const [cardFields, setCardFields] = useState({

    cardNum: "",

    cardName: "",

    exp: "",

    cvv: "",

  });

  if (done)

    return (

      <div

        style={{

          height: "100%",

          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          justifyContent: "center",

          background: T.bg,

          padding: 28,

        }}

      >

        <div

          style={{

            width: 80,

            height: 80,

            borderRadius: "50%",

            background: T.greenLt,

            border: `2.5px solid ${T.green}`,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            marginBottom: 20,

          }}

        >

          <svg

            width="36"

            height="36"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.green}

            strokeWidth="2.5"

            strokeLinecap="round"

          >

            <polyline points="20 6 9 17 4 12" />

          </svg>

        </div>

        <div

          style={{

            fontSize: 26,

            fontWeight: 900,

            color: T.text,

            textAlign: "center",

            marginBottom: 8,

          }}

        >

          ¡Reserva confirmada!

        </div>

        <p

          style={{

            color: T.textSub,

            fontSize: 14,

            textAlign: "center",

            marginBottom: 16,

            lineHeight: 1.6,

          }}

        >

          Tu espacio en <strong>{spot.name}</strong> está listo.

        </p>

        {/* Mini map block → smart map picker */}

        <MapPickerButton spot={spot} />

        {/* Compact QR + receipt row */}

        <div

          style={{

            display: "flex",

            gap: 10,

            alignItems: "flex-start",

            width: "100%",

            marginBottom: 12,

          }}

        >

          <div

            style={{

              background: T.bg,

              border: `2px solid ${T.border}`,

              borderRadius: 14,

              padding: 10,

              boxShadow: T.shadowSm,

              flexShrink: 0,

            }}

          >

            <div

              style={{

                width: 80,

                height: 80,

                display: "grid",

                gridTemplateColumns: "repeat(8,1fr)",

                gap: 1.5,

              }}

            >

              {[...Array(64)].map((_, i) => (

                <div

                  key={i}

                  style={{

                    background: Math.random() > 0.55 ? T.text : "#fff",

                    borderRadius: 1,

                  }}

                />

              ))}

            </div>

            <div

              style={{

                width: 80,

                height: 2.5,

                background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

                borderRadius: "0 0 3px 3px",

                marginTop: 2,

              }}

            />

            <div

              style={{

                color: T.textSub,

                fontSize: 9,

                fontWeight: 600,

                textAlign: "center",

                marginTop: 4,

              }}

            >

              Escanear al entrar

            </div>

          </div>

          <div

            style={{

              flex: 1,

              background: T.surface,

              borderRadius: 12,

              padding: "10px 12px",

            }}

          >

            {[

              ["Parqueo", spot.name],

              ["Duración", "2 horas"],

              [

                "Total",

                `${spot.currency}${

                  spot.price * 2 + Math.round(spot.price * 2 * 0.18) + 25

                }`,

              ],

            ].map(([l, v]) => (

              <div

                key={l}

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  padding: "5px 0",

                  borderBottom: `1px solid ${T.border}`,

                  fontSize: 11,

                }}

              >

                <span style={{ color: T.textSub }}>{l}</span>

                <span style={{ color: T.text, fontWeight: 700, fontSize: 11 }}>

                  {v}

                </span>

              </div>

            ))}

          </div>

        </div>

      </div>

    );

  return (

    <div

      style={{

        height: "100%",

        overflowY: "auto",

        background: T.bg,

        paddingBottom: 80,

      }}

    >

      {showDisclaimer && (

        <Disclaimer onClose={() => setDisc(false)} onCancel={onBack} />

      )}

      <div style={{ padding: "14px 16px" }}>

        <button

          onClick={onBack}

          style={{

            background: "none",

            border: "none",

            color: T.blue,

            fontSize: 14,

            cursor: "pointer",

            marginBottom: 14,

            padding: 0,

            fontFamily: font,

            fontWeight: 700,

            display: "flex",

            alignItems: "center",

            gap: 5,

          }}

        >

          <svg

            width="14"

            height="14"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.blue}

            strokeWidth="2.5"

            strokeLinecap="round"

          >

            <polyline points="15 18 9 12 15 6" />

          </svg>{" "}

          Volver

        </button>

        <div

          style={{

            fontSize: 22,

            fontWeight: 900,

            color: T.text,

            marginBottom: 4,

          }}

        >

          Confirmar y pagar

        </div>

        <div style={{ color: T.textSub, fontSize: 13, marginBottom: 20 }}>

          {spot.name}

        </div>

        <div

          style={{

            background: T.surface,

            borderRadius: 14,

            padding: 14,

            marginBottom: 20,

            borderLeft: `3px solid ${T.blue}`,

          }}

        >

          <div

            style={{

              fontWeight: 800,

              color: T.text,

              fontSize: 14,

              marginBottom: 10,

            }}

          >

            Tu reserva

          </div>

          {[

            ["Fecha", "Hoy · 10:30 – 12:30"],

            ["Duración", "2 horas"],

            ["Espacio", "Asignado al llegar"],

          ].map(([l, v]) => (

            <div

              key={l}

              style={{

                display: "flex",

                justifyContent: "space-between",

                fontSize: 13,

                marginBottom: 7,

              }}

            >

              <span style={{ color: T.textSub }}>{l}</span>

              <span style={{ color: T.text, fontWeight: 600 }}>{v}</span>

            </div>

          ))}

        </div>

        <div

          style={{

            fontWeight: 800,

            color: T.text,

            fontSize: 15,

            marginBottom: 12,

          }}

        >

          Método de pago

        </div>

        <div

          style={{

            display: "flex",

            flexDirection: "column",

            gap: 10,

            marginBottom: 20,

          }}

        >

          {[

            { id: "card", label: "Tarjeta de crédito / débito" },

            { id: "cash", label: "Efectivo al llegar" },

          ].map((m) => (

            <button

              key={m.id}

              onClick={() => setMethod(m.id)}

              style={{

                padding: "13px 16px",

                borderRadius: 14,

                border: `2px solid ${method === m.id ? T.blue : T.border}`,

                background: method === m.id ? T.blueLt : T.bg,

                display: "flex",

                alignItems: "center",

                gap: 12,

                cursor: "pointer",

                textAlign: "left",

                fontFamily: font,

              }}

            >

              <div

                style={{

                  width: 20,

                  height: 20,

                  borderRadius: "50%",

                  border: `2px solid ${method === m.id ? T.blue : T.borderMd}`,

                  background: method === m.id ? T.blue : "transparent",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  flexShrink: 0,

                }}

              >

                {method === m.id && (

                  <div

                    style={{

                      width: 8,

                      height: 8,

                      borderRadius: "50%",

                      background: "#fff",

                    }}

                  />

                )}

              </div>

              <span

                style={{

                  fontSize: 14,

                  fontWeight: 600,

                  color: method === m.id ? T.blue : T.text,

                }}

              >

                {m.label}

              </span>

            </button>

          ))}

        </div>

        {method === "card" && (

          <div

            style={{

              background: T.surface,

              borderRadius: 14,

              padding: 14,

              marginBottom: 20,

            }}

          >

            {[

              {

                l: "Número de tarjeta",

                p: "•••• •••• •••• ••••",

                k: "cardNum",

              },

              {

                l: "Nombre en la tarjeta",

                p: "NOMBRE APELLIDO",

                k: "cardName",

              },

            ].map((f) => (

              <div key={f.l} style={{ marginBottom: 12 }}>

                <div

                  style={{

                    color: T.textMid,

                    fontSize: 12,

                    fontWeight: 600,

                    marginBottom: 5,

                  }}

                >

                  {f.l}

                </div>

                <input

                  value={cardFields[f.k]}

                  onChange={(e) =>

                    setCardFields((cf) => ({ ...cf, [f.k]: e.target.value }))

                  }

                  placeholder={f.p}

                  style={{

                    width: "100%",

                    background: T.bg,

                    border: `1.5px solid ${T.border}`,

                    borderRadius: 10,

                    padding: "11px 14px",

                    color: T.text,

                    fontSize: 14,

                    fontFamily: font,

                    outline: "none",

                    boxSizing: "border-box",

                  }}

                />

              </div>

            ))}

            <div style={{ display: "flex", gap: 10 }}>

              {[

                ["Expiración", "MM/AA", "exp"],

                ["CVV", "•••", "cvv"],

              ].map(([l, p, k]) => (

                <div key={l} style={{ flex: 1 }}>

                  <div

                    style={{

                      color: T.textMid,

                      fontSize: 12,

                      fontWeight: 600,

                      marginBottom: 5,

                    }}

                  >

                    {l}

                  </div>

                  <input

                    value={cardFields[k]}

                    onChange={(e) =>

                      setCardFields((cf) => ({ ...cf, [k]: e.target.value }))

                    }

                    placeholder={p}

                    style={{

                      width: "100%",

                      background: T.bg,

                      border: `1.5px solid ${T.border}`,

                      borderRadius: 10,

                      padding: "11px 14px",

                      color: T.text,

                      fontSize: 14,

                      fontFamily: font,

                      outline: "none",

                      boxSizing: "border-box",

                    }}

                  />

                </div>

              ))}

            </div>

          </div>

        )}

        <div

          style={{

            background: T.surface,

            borderRadius: 14,

            padding: 14,

            marginBottom: 20,

          }}

        >

          {[

            ["Subtotal", `${spot.currency}${spot.price * 2}`],

            [

              "ITBIS 18%",

              `${spot.currency}${Math.round(spot.price * 2 * 0.18)}`,

            ],

            ["Fee de servicio", `${spot.currency}25`],

          ].map(([l, v]) => (

            <div

              key={l}

              style={{

                display: "flex",

                justifyContent: "space-between",

                fontSize: 13,

                marginBottom: 8,

              }}

            >

              <span style={{ color: T.textSub }}>{l}</span>

              <span style={{ color: T.text }}>{v}</span>

            </div>

          ))}

          <div

            style={{ height: 1.5, background: T.text, margin: "10px 0 8px" }}

          />

          <div

            style={{

              display: "flex",

              justifyContent: "space-between",

              fontWeight: 900,

              fontSize: 15,

            }}

          >

            <span style={{ color: T.text }}>Total</span>

            <span style={{ color: T.green }}>

              {spot.currency}

              {spot.price * 2 + Math.round(spot.price * 2 * 0.18) + 25}

            </span>

          </div>

        </div>

        <Btn

          onClick={() => setDone(true)}

          variant="green"

          full

          style={{ padding: "15px 0", fontSize: 15, borderRadius: 14 }}

        >

          Confirmar reserva

        </Btn>

        <p

          style={{

            color: T.textFaint,

            fontSize: 11,

            textAlign: "center",

            marginTop: 12,

            lineHeight: 1.6,

          }}

        >

          No se realiza cobro hasta el check-out. Al continuar aceptas los

          Términos de Uso.

        </p>

      </div>

    </div>

  );

}

// ─── QR SCANNER MODAL ─────────────────────────────────────────────────────────

function QRScannerModal({ mode, onScanned, onCancel }) {

  const [scanning, setScanning] = useState(true);

  const [progress, setProgress] = useState(0);

  const intervalRef = useRef(null);

  useEffect(() => {

    // Simulate camera scanning progress, then auto-scan after 2.5s

    intervalRef.current = setInterval(() => {

      setProgress((p) => {

        if (p >= 100) {

          clearInterval(intervalRef.current);

          setTimeout(() => onScanned(), 300);

          return 100;

        }

        return p + 4;

      });

    }, 100);

    return () => clearInterval(intervalRef.current);

  }, []);

  const isCheckIn = mode === "checkin";

  const accentColor = isCheckIn ? T.green : T.danger;

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 400,

        background: "#0a0a0a",

        display: "flex",

        flexDirection: "column",

      }}

    >

      {/* Fake camera viewfinder */}

      <div

        style={{

          flex: 1,

          position: "relative",

          overflow: "hidden",

          display: "flex",

          alignItems: "center",

          justifyContent: "center",

        }}

      >

        {/* Simulated camera background with blur effect */}

        <div

          style={{

            position: "absolute",

            inset: 0,

            background: "linear-gradient(160deg,#1a1a2e,#16213e,#0f3460)",

            opacity: 0.95,

          }}

        />

        {/* Scan grid lines */}

        {[...Array(8)].map((_, i) => (

          <div

            key={"sv" + i}

            style={{

              position: "absolute",

              left: `${i * 14}%`,

              top: 0,

              bottom: 0,

              width: 1,

              background: "rgba(255,255,255,0.04)",

            }}

          />

        ))}

        {[...Array(8)].map((_, i) => (

          <div

            key={"sh" + i}

            style={{

              position: "absolute",

              top: `${i * 14}%`,

              left: 0,

              right: 0,

              height: 1,

              background: "rgba(255,255,255,0.04)",

            }}

          />

        ))}

        {/* Instruction top */}

        <div

          style={{

            position: "absolute",

            top: 56,

            left: 0,

            right: 0,

            textAlign: "center",

          }}

        >

          <div

            style={{

              display: "inline-flex",

              alignItems: "center",

              gap: 8,

              background: "rgba(0,0,0,0.55)",

              backdropFilter: "blur(8px)",

              borderRadius: 24,

              padding: "8px 18px",

            }}

          >

            <div

              style={{

                width: 8,

                height: 8,

                borderRadius: "50%",

                background: accentColor,

                boxShadow: `0 0 8px ${accentColor}`,

              }}

            />

            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>

              {isCheckIn

                ? "Check-in — Apunta al QR del parqueo"

                : "Check-out — Apunta al QR de salida"}

            </span>

          </div>

        </div>

        {/* QR Frame */}

        <div style={{ position: "relative", width: 220, height: 220 }}>

          {/* Corner markers */}

          {[

            {

              top: 0,

              left: 0,

              borderTop: `3px solid ${accentColor}`,

              borderLeft: `3px solid ${accentColor}`,

              borderRadius: "8px 0 0 0",

            },

            {

              top: 0,

              right: 0,

              borderTop: `3px solid ${accentColor}`,

              borderRight: `3px solid ${accentColor}`,

              borderRadius: "0 8px 0 0",

            },

            {

              bottom: 0,

              left: 0,

              borderBottom: `3px solid ${accentColor}`,

              borderLeft: `3px solid ${accentColor}`,

              borderRadius: "0 0 0 8px",

            },

            {

              bottom: 0,

              right: 0,

              borderBottom: `3px solid ${accentColor}`,

              borderRight: `3px solid ${accentColor}`,

              borderRadius: "0 0 8px 0",

            },

          ].map((s, i) => (

            <div

              key={i}

              style={{ position: "absolute", width: 30, height: 30, ...s }}

            />

          ))}

          {/* Scan line animation */}

          <div

            style={{

              position: "absolute",

              left: 8,

              right: 8,

              top: `${progress}%`,

              height: 2,

              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,

              boxShadow: `0 0 8px ${accentColor}`,

              transition: "top 0.1s linear",

            }}

          />

          {/* Mock QR inside frame */}

          <div

            style={{

              position: "absolute",

              inset: 20,

              display: "grid",

              gridTemplateColumns: "repeat(9,1fr)",

              gap: 2,

              opacity: 0.35,

            }}

          >

            {[...Array(81)].map((_, i) => (

              <div

                key={i}

                style={{

                  background:

                    Math.random() > 0.5

                      ? "rgba(255,255,255,0.9)"

                      : "transparent",

                  borderRadius: 1,

                }}

              />

            ))}

          </div>

          {/* Scanned overlay */}

          {progress >= 100 && (

            <div

              style={{

                position: "absolute",

                inset: 0,

                background: "rgba(11,138,76,0.18)",

                borderRadius: 8,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

              }}

            >

              <div

                style={{

                  width: 56,

                  height: 56,

                  borderRadius: "50%",

                  background: T.green,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  boxShadow: `0 0 24px ${T.green}`,

                }}

              >

                <svg

                  width="28"

                  height="28"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke="#fff"

                  strokeWidth="3"

                  strokeLinecap="round"

                >

                  <polyline points="20 6 9 17 4 12" />

                </svg>

              </div>

            </div>

          )}

        </div>

        {/* Progress bar */}

        <div style={{ position: "absolute", bottom: 100, left: 40, right: 40 }}>

          <div

            style={{

              height: 3,

              background: "rgba(255,255,255,0.15)",

              borderRadius: 3,

            }}

          >

            <div

              style={{

                height: "100%",

                width: `${progress}%`,

                background: `linear-gradient(90deg,${accentColor},${

                  isCheckIn ? T.greenAcct : "#ff6b6b"

                })`,

                borderRadius: 3,

                transition: "width 0.1s linear",

              }}

            />

          </div>

          <div

            style={{

              color: "rgba(255,255,255,0.5)",

              fontSize: 11,

              textAlign: "center",

              marginTop: 6,

            }}

          >

            {progress < 100 ? "Escaneando..." : "¡QR detectado!"}

          </div>

        </div>

        {/* Cancel */}

        <button

          onClick={onCancel}

          style={{

            position: "absolute",

            bottom: 36,

            left: "50%",

            transform: "translateX(-50%)",

            background: "rgba(255,255,255,0.12)",

            border: "1.5px solid rgba(255,255,255,0.2)",

            borderRadius: 24,

            padding: "11px 32px",

            color: "#fff",

            fontSize: 14,

            fontWeight: 700,

            cursor: "pointer",

            fontFamily: font,

          }}

        >

          Cancelar

        </button>

      </div>

    </div>

  );

}

// ─── CHECKOUT RECEIPT MODAL ────────────────────────────────────────────────────

function CheckoutReceiptModal({ reservation, elapsedSecs, onClose }) {

  const pricePerHour = 150;

  const reservedHours = 2;

  const reservedMins = reservedHours * 60;

  const elapsedMins = Math.floor(elapsedSecs / 60);

  const overtimeMins = Math.max(0, elapsedMins - reservedMins);

  const overtimeHours = overtimeMins / 60;

  const subtotal = pricePerHour * reservedHours;

  const overtimeCharge = Math.ceil(overtimeHours * pricePerHour * 1.5);

  const itbis = Math.round((subtotal + overtimeCharge) * 0.18);

  const total = subtotal + overtimeCharge + itbis + 25;

  const hrs = Math.floor(elapsedSecs / 3600);

  const mins = Math.floor((elapsedSecs % 3600) / 60);

  const secs = elapsedSecs % 60;

  const fmt = (n) => String(n).padStart(2, "0");

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 400,

        background: "rgba(13,27,62,0.6)",

        display: "flex",

        alignItems: "flex-end",

      }}

    >

      <div

        style={{

          background: T.bg,

          borderRadius: "22px 22px 0 0",

          width: "100%",

          maxHeight: "85%",

          overflowY: "auto",

          boxShadow: T.shadowLg,

        }}

      >

        <div

          style={{

            background: `linear-gradient(135deg,${T.green},${T.greenDk})`,

            borderRadius: "22px 22px 0 0",

            padding: "22px 22px 18px",

          }}

        >

          <div

            style={{

              display: "flex",

              justifyContent: "center",

              marginBottom: 14,

            }}

          >

            <div

              style={{

                width: 44,

                height: 44,

                borderRadius: "50%",

                background: "rgba(255,255,255,0.2)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

              }}

            >

              <svg

                width="22"

                height="22"

                viewBox="0 0 24 24"

                fill="none"

                stroke="#fff"

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="20 6 9 17 4 12" />

              </svg>

            </div>

          </div>

          <div

            style={{

              fontWeight: 900,

              fontSize: 20,

              color: "#fff",

              textAlign: "center",

              marginBottom: 4,

            }}

          >

            ¡Check-out exitoso!

          </div>

          <div

            style={{

              color: "rgba(255,255,255,0.75)",

              fontSize: 13,

              textAlign: "center",

            }}

          >

            Tiempo total en parqueo

          </div>

          <div

            style={{

              fontWeight: 900,

              fontSize: 32,

              color: "#fff",

              textAlign: "center",

              letterSpacing: 2,

              marginTop: 6,

            }}

          >

            {fmt(hrs)}:{fmt(mins)}:{fmt(secs)}

          </div>

        </div>

        <div style={{ padding: "18px 20px 32px" }}>

          {overtimeMins > 0 && (

            <div

              style={{

                background: T.warnBg,

                border: `1.5px solid ${T.warnBd}`,

                borderRadius: 12,

                padding: "10px 14px",

                marginBottom: 16,

                display: "flex",

                gap: 10,

                alignItems: "flex-start",

              }}

            >

              <span style={{ fontSize: 18 }}>⏱️</span>

              <div>

                <div style={{ fontWeight: 800, color: T.warn, fontSize: 13 }}>

                  Sobretiempo: {overtimeMins} min

                </div>

                <div style={{ color: T.warn, fontSize: 12, marginTop: 2 }}>

                  Se aplicó cargo adicional de RD${overtimeCharge}

                </div>

              </div>

            </div>

          )}

          <div

            style={{

              background: T.surface,

              borderRadius: 14,

              padding: "14px 16px",

              marginBottom: 18,

            }}

          >

            {[

              [`Reserva (${reservedHours}h)`, `RD$${subtotal}`],

              ...(overtimeMins > 0

                ? [[`Sobretiempo (${overtimeMins}min)`, `RD$${overtimeCharge}`]]

                : []),

              ["ITBIS 18%", `RD$${itbis}`],

              ["Fee de servicio", "RD$25"],

            ].map(([l, v]) => (

              <div

                key={l}

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginBottom: 10,

                  fontSize: 13,

                }}

              >

                <span style={{ color: T.textSub }}>{l}</span>

                <span

                  style={{

                    color: l.includes("Sobre") ? T.warn : T.text,

                    fontWeight: 600,

                  }}

                >

                  {v}

                </span>

              </div>

            ))}

            <div

              style={{

                height: 1.5,

                background: T.borderMd,

                margin: "10px 0 10px",

              }}

            />

            <div

              style={{

                display: "flex",

                justifyContent: "space-between",

                fontWeight: 900,

                fontSize: 17,

              }}

            >

              <span style={{ color: T.text }}>Total cobrado</span>

              <span style={{ color: T.green }}>RD${total}</span>

            </div>

          </div>

          <Btn

            onClick={onClose}

            variant="green"

            full

            style={{ padding: "15px 0", fontSize: 15, borderRadius: 14 }}

          >

            Listo

          </Btn>

        </div>

      </div>

    </div>

  );

}

// ─── EXTEND TIME SCREEN ────────────────────────────────────────────────────────

function ExtendTimeScreen({ reservation, pricePerHour, onClose, onConfirm }) {

  const [blocks, setBlocks] = useState(1); // 1 block = 1 hour

  const [payMethod, setPayMethod] = useState("card");

  const [confirmed, setConfirmed] = useState(false);

  const [checking, setChecking] = useState(false);

  const [available, setAvailable] = useState(null); // null=not checked, true/false

  const subtotal = pricePerHour * blocks;

  const itbis = Math.round(subtotal * 0.18);

  const fee = 25;

  const total = subtotal + itbis + fee;

  // Simulate availability check when blocks change

  useEffect(() => {

    setAvailable(null);

    setChecking(true);

    const t = setTimeout(() => {

      setAvailable(blocks <= 3); // simulate: up to 3 extra hours available

      setChecking(false);

    }, 700);

    return () => clearTimeout(t);

  }, [blocks]);

  if (confirmed)

    return (

      <div

        style={{

          position: "absolute",

          inset: 0,

          zIndex: 500,

          background: T.bg,

          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          justifyContent: "center",

          padding: 32,

        }}

      >

        <div

          style={{

            width: 80,

            height: 80,

            borderRadius: "50%",

            background: T.greenLt,

            border: `3px solid ${T.green}`,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            marginBottom: 20,

          }}

        >

          <svg

            width="36"

            height="36"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.green}

            strokeWidth="2.5"

            strokeLinecap="round"

          >

            <polyline points="20 6 9 17 4 12" />

          </svg>

        </div>

        <div

          style={{

            fontFamily: font,

            fontWeight: 900,

            fontSize: 22,

            color: T.text,

            textAlign: "center",

            marginBottom: 8,

          }}

        >

          ¡Tiempo extendido!

        </div>

        <div

          style={{

            color: T.textSub,

            fontSize: 14,

            textAlign: "center",

            marginBottom: 6,

          }}

        >

          Se agregaron{" "}

          <strong>

            {blocks} hora{blocks > 1 ? "s" : ""}

          </strong>{" "}

          a tu reserva

        </div>

        <div

          style={{

            color: T.green,

            fontWeight: 800,

            fontSize: 18,

            marginBottom: 28,

          }}

        >

          RD${total} cobrado

        </div>

        <Btn

          onClick={() => {

            onConfirm(blocks);

            onClose();

          }}

          variant="green"

          full

          style={{ padding: "14px 0", fontSize: 15, borderRadius: 14 }}

        >

          Volver a mi reserva

        </Btn>

      </div>

    );

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 500,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      {/* Header */}

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "18px 16px 16px",

        }}

      >

        <div

          style={{

            display: "flex",

            alignItems: "center",

            gap: 12,

            marginBottom: 2,

          }}

        >

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div>

            <div style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>

              Extender Tiempo

            </div>

            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>

              {reservation.name}

            </div>

          </div>

        </div>

      </div>

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "20px 16px",

          background: T.surface,

        }}

      >

        {/* Availability badge */}

        <div style={{ marginBottom: 16 }}>

          {checking ? (

            <div

              style={{

                background: T.surface2,

                borderRadius: 12,

                padding: "10px 14px",

                display: "flex",

                alignItems: "center",

                gap: 10,

              }}

            >

              <div

                style={{

                  width: 10,

                  height: 10,

                  borderRadius: "50%",

                  background: T.textFaint,

                  animation: "pulse 1s infinite",

                }}

              />

              <span style={{ fontSize: 13, color: T.textSub, fontWeight: 600 }}>

                Verificando disponibilidad…

              </span>

            </div>

          ) : available ? (

            <div

              style={{

                background: T.greenLt,

                border: `1.5px solid ${T.greenMid}`,

                borderRadius: 12,

                padding: "10px 14px",

                display: "flex",

                alignItems: "center",

                gap: 10,

              }}

            >

              <svg

                width="16"

                height="16"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.green}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="20 6 9 17 4 12" />

              </svg>

              <span style={{ fontSize: 13, color: T.green, fontWeight: 700 }}>

                Espacio disponible — puedes extender hasta 3h más

              </span>

            </div>

          ) : (

            <div

              style={{

                background: T.dangerBg,

                border: `1.5px solid ${T.dangerBd}`,

                borderRadius: 12,

                padding: "10px 14px",

                display: "flex",

                alignItems: "center",

                gap: 10,

              }}

            >

              <svg

                width="16"

                height="16"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.danger}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <circle cx="12" cy="12" r="10" />

                <line x1="15" y1="9" x2="9" y2="15" />

                <line x1="9" y1="9" x2="15" y2="15" />

              </svg>

              <span style={{ fontSize: 13, color: T.danger, fontWeight: 700 }}>

                Sin disponibilidad para {blocks}h adicionales

              </span>

            </div>

          )}

        </div>

        {/* Hour block selector */}

        <Card style={{ marginBottom: 14 }}>

          <SectionLabel>¿Cuántas horas más?</SectionLabel>

          <div

            style={{

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              gap: 20,

              padding: "10px 0 6px",

            }}

          >

            <button

              onClick={() => setBlocks((b) => Math.max(1, b - 1))}

              style={{

                width: 44,

                height: 44,

                borderRadius: "50%",

                background: blocks === 1 ? T.surface2 : T.blueLt,

                border: `2px solid ${blocks === 1 ? T.border : T.blue}`,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                cursor: blocks === 1 ? "not-allowed" : "pointer",

              }}

            >

              <svg

                width="18"

                height="18"

                viewBox="0 0 24 24"

                fill="none"

                stroke={blocks === 1 ? T.textFaint : T.blue}

                strokeWidth="3"

                strokeLinecap="round"

              >

                <line x1="5" y1="12" x2="19" y2="12" />

              </svg>

            </button>

            <div style={{ textAlign: "center", minWidth: 80 }}>

              <div

                style={{

                  fontSize: 52,

                  fontWeight: 900,

                  color: T.blue,

                  fontFamily: font,

                  lineHeight: 1,

                }}

              >

                {blocks}

              </div>

              <div

                style={{

                  fontSize: 13,

                  color: T.textSub,

                  fontWeight: 600,

                  marginTop: 4,

                }}

              >

                hora{blocks > 1 ? "s" : ""}

              </div>

            </div>

            <button

              onClick={() => setBlocks((b) => Math.min(6, b + 1))}

              style={{

                width: 44,

                height: 44,

                borderRadius: "50%",

                background: blocks === 6 ? T.surface2 : T.blueLt,

                border: `2px solid ${blocks === 6 ? T.border : T.blue}`,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                cursor: blocks === 6 ? "not-allowed" : "pointer",

              }}

            >

              <svg

                width="18"

                height="18"

                viewBox="0 0 24 24"

                fill="none"

                stroke={blocks === 6 ? T.textFaint : T.blue}

                strokeWidth="3"

                strokeLinecap="round"

              >

                <line x1="12" y1="5" x2="12" y2="19" />

                <line x1="5" y1="12" x2="19" y2="12" />

              </svg>

            </button>

          </div>

          {/* Quick pills */}

          <div style={{ display: "flex", gap: 7, marginTop: 12 }}>

            {[1, 2, 3, 4, 6].map((h) => (

              <button

                key={h}

                onClick={() => setBlocks(h)}

                style={{

                  flex: 1,

                  padding: "8px 4px",

                  borderRadius: 10,

                  border: `1.5px solid ${blocks === h ? T.blue : T.border}`,

                  background: blocks === h ? T.blueLt : T.bg,

                  color: blocks === h ? T.blue : T.textSub,

                  fontSize: 12,

                  fontWeight: 700,

                  cursor: "pointer",

                  fontFamily: font,

                }}

              >

                {h}h

              </button>

            ))}

          </div>

        </Card>

        {/* Price summary */}

        <Card style={{ marginBottom: 14 }}>

          <SectionLabel>Resumen de pago</SectionLabel>

          {[

            [

              `RD$${pricePerHour} × ${blocks} hora${blocks > 1 ? "s" : ""}`,

              `RD$${subtotal}`,

            ],

            ["ITBIS (18%)", `RD$${itbis}`],

            ["Fee de servicio", `RD$${fee}`],

          ].map(([l, v]) => (

            <div

              key={l}

              style={{

                display: "flex",

                justifyContent: "space-between",

                marginBottom: 9,

              }}

            >

              <span style={{ fontSize: 13, color: T.textSub }}>{l}</span>

              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>

                {v}

              </span>

            </div>

          ))}

          <div style={{ height: 1, background: T.border, margin: "10px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between" }}>

            <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>

              Total

            </span>

            <span style={{ fontSize: 18, fontWeight: 900, color: T.green }}>

              RD${total}

            </span>

          </div>

        </Card>

        {/* Payment method */}

        <Card style={{ marginBottom: 20 }}>

          <SectionLabel>Método de pago</SectionLabel>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {[

              {

                key: "card",

                icon: "💳",

                label: "Tarjeta guardada",

                sub: "Visa •••• 4242",

              },

              {

                key: "cash",

                icon: "💵",

                label: "Efectivo en taquilla",

                sub: "Paga al salir",

              },

            ].map((m) => (

              <div

                key={m.key}

                onClick={() => setPayMethod(m.key)}

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  padding: "12px 14px",

                  borderRadius: 12,

                  border: `2px solid ${

                    payMethod === m.key ? T.blue : T.border

                  }`,

                  background: payMethod === m.key ? T.blueLt : T.bg,

                  cursor: "pointer",

                }}

              >

                <span style={{ fontSize: 22 }}>{m.icon}</span>

                <div style={{ flex: 1 }}>

                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>

                    {m.label}

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>{m.sub}</div>

                </div>

                <div

                  style={{

                    width: 20,

                    height: 20,

                    borderRadius: "50%",

                    border: `2px solid ${

                      payMethod === m.key ? T.blue : T.borderMd

                    }`,

                    background: payMethod === m.key ? T.blue : "transparent",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  {payMethod === m.key && (

                    <div

                      style={{

                        width: 8,

                        height: 8,

                        borderRadius: "50%",

                        background: "#fff",

                      }}

                    />

                  )}

                </div>

              </div>

            ))}

          </div>

        </Card>

      </div>

      {/* Confirm button pinned to bottom */}

      <div

        style={{

          padding: "14px 16px 28px",

          background: T.bg,

          borderTop: `1px solid ${T.border}`,

        }}

      >

        <Btn

          onClick={() => {

            if (available) setConfirmed(true);

          }}

          variant={available ? "green" : "secondary"}

          full

          style={{

            padding: "15px 0",

            fontSize: 15,

            borderRadius: 14,

            opacity: available ? 1 : 0.5,

          }}

        >

          {checking

            ? "Verificando…"

            : available

            ? `Confirmar y pagar RD$${total}`

            : "Sin disponibilidad"}

        </Btn>

      </div>

    </div>

  );

}

// ─── OCCUPIED SPACE MODAL ─────────────────────────────────────────────────────

function OccupiedSpaceModal({ reservation, pricePerHour, onClose, onCheckin }) {

  const [step, setStep] = useState("checking");

  const [choice, setChoice] = useState(null);

  const [reassignDiff, setDiff] = useState(null);

  // Derive parking type from the reservation name (mock — in production comes from backend)

  const isPublic =

    !reservation.name?.toLowerCase().includes("privad") &&

    !reservation.name?.toLowerCase().includes("vip");

  // Simulate backend check on mount

  useEffect(() => {

    const t = setTimeout(() => {

      setStep(Math.random() > 0.3 ? "activeReservation" : "noReservation");

    }, 1800);

    return () => clearTimeout(t);

  }, []);

  const handleReassign = () => {

    setStep("reassigning");

    setTimeout(() => {

      if (isPublic) {

        // Public: check if same parking has spaces, else find nearby

        const hasSpaceSame = Math.random() > 0.4; // simulate: 60% chance same parking has free space

        if (hasSpaceSame) {

          setDiff({

            type: "sameParking",

            newSpace: "B4",

            newParking: reservation.name,

            address: null,

            lat: 18.4742,

            lng: -69.8923,

            distance: null,

            priceDiff: 0,

            amenities: ["Techado", "Cámaras", "24/7"],

            note: "Mismo parqueo — otro espacio disponible",

          });

        } else {

          // Public parking full — find nearby

          setDiff({

            type: "nearbyParking",

            newSpace: "A3",

            newParking: "Parqueo Bella Vista",

            address: "Av. Sarasota 65, Bella Vista",

            lat: 18.471,

            lng: -69.928,

            distance: "0.4 km",

            priceDiff: -20,

            amenities: ["Techado", "Cámaras", "Personal"],

            note: "Parqueo lleno — te asignamos uno cercano disponible",

          });

        }

      } else {

        // Private: always find nearby parking

        setDiff({

          type: "nearbyParking",

          newSpace: "A2",

          newParking: "Parqueo Naco Center",

          address: "Av. Lope de Vega 95, Naco",

          lat: 18.4762,

          lng: -69.9354,

          distance: "0.3 km",

          priceDiff: -30,

          amenities: ["Cámaras", "Ctrl. acceso"],

          note: "Parqueo cercano en el área — disponible ahora",

        });

      }

      setStep("reassigned");

    }, 1500);

  };

  const CURRENT_EXIT = "11:45 AM"; // simulated current occupant's scheduled exit

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: "rgba(13,27,62,0.6)",

        display: "flex",

        alignItems: "flex-end",

      }}

    >

      <div

        style={{

          background: T.bg,

          borderRadius: "22px 22px 0 0",

          width: "100%",

          maxHeight: "88%",

          overflowY: "auto",

          boxShadow: T.shadowLg,

        }}

      >

        {/* ── Checking ── */}

        {step === "checking" && (

          <div style={{ padding: "32px 24px", textAlign: "center" }}>

            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>

            <div

              style={{

                fontWeight: 900,

                fontSize: 18,

                color: T.text,

                marginBottom: 8,

              }}

            >

              Verificando espacio…

            </div>

            <div style={{ color: T.textSub, fontSize: 13, marginBottom: 24 }}>

              Consultando el sistema para determinar el estado de tu espacio

            </div>

            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>

              {[0, 1, 2].map((i) => (

                <div

                  key={i}

                  style={{

                    width: 10,

                    height: 10,

                    borderRadius: "50%",

                    background: T.blue,

                    opacity: 0.3,

                    animation: `pulse ${0.6 + i * 0.2}s infinite alternate`,

                  }}

                />

              ))}

            </div>

          </div>

        )}

        {/* ── No reservation — just notify host ── */}

        {step === "noReservation" && (

          <div style={{ padding: "32px 24px", textAlign: "center" }}>

            <div

              style={{

                width: 40,

                height: 4,

                background: T.border,

                borderRadius: 2,

                margin: "0 auto 24px",

              }}

            />

            <div

              style={{

                width: 72,

                height: 72,

                borderRadius: "50%",

                background: T.greenLt,

                border: `2.5px solid ${T.greenMid}`,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                margin: "0 auto 20px",

              }}

            >

              <svg

                width="32"

                height="32"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.green}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="20 6 9 17 4 12" />

              </svg>

            </div>

            <div

              style={{

                fontWeight: 900,

                fontSize: 18,

                color: T.text,

                marginBottom: 8,

              }}

            >

              Notificación enviada

            </div>

            <div

              style={{

                color: T.textSub,

                fontSize: 13,

                lineHeight: 1.7,

                marginBottom: 28,

              }}

            >

              El host ha sido notificado y se encargará de gestionar la

              situación. Te avisaremos cuando tu espacio esté listo.

            </div>

            <div style={{ display: "flex", gap: 10 }}>

              <button

                onClick={onClose}

                style={{

                  flex: 1,

                  background: T.surface2,

                  border: "none",

                  borderRadius: 12,

                  padding: "13px 0",

                  fontFamily: font,

                  fontWeight: 700,

                  fontSize: 14,

                  color: T.textSub,

                  cursor: "pointer",

                }}

              >

                Volver

              </button>

              <button

                onClick={() => setStep("checking")}

                style={{

                  flex: 1,

                  background: T.blue,

                  border: "none",

                  borderRadius: 12,

                  padding: "13px 0",

                  fontFamily: font,

                  fontWeight: 800,

                  fontSize: 14,

                  color: "#fff",

                  cursor: "pointer",

                }}

              >

                Verificar de nuevo

              </button>

            </div>

          </div>

        )}

        {/* ── Active reservation in that space ── */}

        {step === "activeReservation" && (

          <div style={{ padding: "24px 20px 32px" }}>

            <div

              style={{

                width: 40,

                height: 4,

                background: T.border,

                borderRadius: 2,

                margin: "0 auto 20px",

              }}

            />

            <div

              style={{

                display: "flex",

                alignItems: "center",

                gap: 12,

                marginBottom: 16,

              }}

            >

              <div

                style={{

                  width: 48,

                  height: 48,

                  borderRadius: 16,

                  background: T.warnBg,

                  border: `2px solid ${T.warnBd}`,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  flexShrink: 0,

                }}

              >

                <svg

                  width="22"

                  height="22"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke={T.warn}

                  strokeWidth="2.5"

                  strokeLinecap="round"

                >

                  <circle cx="12" cy="12" r="10" />

                  <polyline points="12 6 12 12 16 14" />

                </svg>

              </div>

              <div>

                <div style={{ fontWeight: 900, fontSize: 16, color: T.warn }}>

                  Reserva activa en este espacio

                </div>

                <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>

                  Hay un usuario de Parkealo que llegó antes

                </div>

              </div>

            </div>

            <div

              style={{

                background: T.warnBg,

                border: `1.5px solid ${T.warnBd}`,

                borderRadius: 14,

                padding: "12px 16px",

                marginBottom: 20,

              }}

            >

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginBottom: 6,

                }}

              >

                <span style={{ fontSize: 12, color: T.textSub }}>

                  Hora de salida programada

                </span>

                <span style={{ fontSize: 14, fontWeight: 900, color: T.warn }}>

                  {CURRENT_EXIT}

                </span>

              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>

                <span style={{ fontSize: 12, color: T.textSub }}>

                  Tiempo restante aprox.

                </span>

                <span style={{ fontSize: 13, fontWeight: 700, color: T.warn }}>

                  ~25 min

                </span>

              </div>

            </div>

            <div

              style={{

                fontSize: 13,

                fontWeight: 700,

                color: T.text,

                marginBottom: 12,

              }}

            >

              ¿Qué deseas hacer?

            </div>

            <div

              style={{

                display: "flex",

                flexDirection: "column",

                gap: 10,

                marginBottom: 20,

              }}

            >

              <button

                onClick={() => {

                  setChoice("wait");

                }}

                style={{

                  padding: "14px 16px",

                  borderRadius: 14,

                  border: `2px solid ${choice === "wait" ? T.blue : T.border}`,

                  background: choice === "wait" ? T.blueLt : T.bg,

                  cursor: "pointer",

                  fontFamily: font,

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  textAlign: "left",

                }}

              >

                <div

                  style={{

                    width: 40,

                    height: 40,

                    borderRadius: 12,

                    background: choice === "wait" ? T.blue : T.surface2,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    flexShrink: 0,

                  }}

                >

                  <svg

                    width="18"

                    height="18"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={choice === "wait" ? "#fff" : T.textSub}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <circle cx="12" cy="12" r="10" />

                    <polyline points="12 6 12 12 16 14" />

                  </svg>

                </div>

                <div>

                  <div

                    style={{

                      fontWeight: 800,

                      fontSize: 14,

                      color: choice === "wait" ? T.blue : T.text,

                    }}

                  >

                    Esperar a que salga

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>

                    Recibirás una notificación cuando el espacio se libere (~

                    {CURRENT_EXIT})

                  </div>

                </div>

              </button>

              <button

                onClick={() => {

                  setChoice("reassign");

                }}

                style={{

                  padding: "14px 16px",

                  borderRadius: 14,

                  border: `2px solid ${

                    choice === "reassign" ? T.green : T.border

                  }`,

                  background: choice === "reassign" ? T.greenLt : T.bg,

                  cursor: "pointer",

                  fontFamily: font,

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  textAlign: "left",

                }}

              >

                <div

                  style={{

                    width: 40,

                    height: 40,

                    borderRadius: 12,

                    background: choice === "reassign" ? T.green : T.surface2,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    flexShrink: 0,

                  }}

                >

                  <svg

                    width="18"

                    height="18"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={choice === "reassign" ? "#fff" : T.textSub}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <polyline points="17 1 21 5 17 9" />

                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />

                    <polyline points="7 23 3 19 7 15" />

                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />

                  </svg>

                </div>

                <div>

                  <div

                    style={{

                      fontWeight: 800,

                      fontSize: 14,

                      color: choice === "reassign" ? T.green : T.text,

                    }}

                  >

                    Reasignar a otro espacio

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>

                    {isPublic

                      ? "Te asignamos otro espacio disponible en este mismo parqueo"

                      : "Te buscamos el mejor parqueo disponible en el área"}

                  </div>

                </div>

              </button>

            </div>

            <div style={{ display: "flex", gap: 10 }}>

              <button

                onClick={onClose}

                style={{

                  flex: 1,

                  background: T.surface2,

                  border: "none",

                  borderRadius: 12,

                  padding: "13px 0",

                  fontFamily: font,

                  fontWeight: 700,

                  fontSize: 14,

                  color: T.textSub,

                  cursor: "pointer",

                }}

              >

                Cancelar

              </button>

              <button

                onClick={() => {

                  if (choice === "wait") {

                    onClose();

                  } else if (choice === "reassign") {

                    handleReassign();

                  }

                }}

                disabled={!choice}

                style={{

                  flex: 2,

                  background: choice

                    ? `linear-gradient(135deg,${T.blue},${T.blueSky})`

                    : "transparent",

                  border: choice ? "none" : `1.5px solid ${T.border}`,

                  borderRadius: 12,

                  padding: "13px 0",

                  fontFamily: font,

                  fontWeight: 800,

                  fontSize: 14,

                  color: choice ? "#fff" : T.textFaint,

                  cursor: choice ? "pointer" : "not-allowed",

                }}

              >

                {choice === "wait"

                  ? "Confirmar — Esperar"

                  : choice === "reassign"

                  ? "Reasignar ahora"

                  : "Selecciona una opción"}

              </button>

            </div>

          </div>

        )}

        {/* ── Reassigning ── */}

        {step === "reassigning" && (

          <div style={{ padding: "40px 24px", textAlign: "center" }}>

            <div style={{ fontSize: 40, marginBottom: 16 }}>🔄</div>

            <div

              style={{

                fontWeight: 900,

                fontSize: 18,

                color: T.text,

                marginBottom: 8,

              }}

            >

              Buscando espacio disponible…

            </div>

            <div style={{ color: T.textSub, fontSize: 13 }}>

              Analizando disponibilidad en tiempo real

            </div>

          </div>

        )}

        {/* ── Reassigned ── */}

        {step === "reassigned" && reassignDiff && (

          <div style={{ padding: "24px 20px 32px" }}>

            <div

              style={{

                width: 40,

                height: 4,

                background: T.border,

                borderRadius: 2,

                margin: "0 auto 20px",

              }}

            />

            {/* Header */}

            <div

              style={{

                display: "flex",

                alignItems: "center",

                gap: 12,

                marginBottom: 16,

              }}

            >

              <div

                style={{

                  width: 48,

                  height: 48,

                  borderRadius: 16,

                  background: T.greenLt,

                  border: `2px solid ${T.greenMid}`,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  flexShrink: 0,

                }}

              >

                <svg

                  width="22"

                  height="22"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke={T.green}

                  strokeWidth="2.5"

                  strokeLinecap="round"

                >

                  <polyline points="20 6 9 17 4 12" />

                </svg>

              </div>

              <div>

                <div style={{ fontWeight: 900, fontSize: 16, color: T.green }}>

                  ¡Espacio reasignado!

                </div>

                <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>

                  {reassignDiff.note}

                </div>

              </div>

            </div>

            {/* Details card */}

            <div

              style={{

                background: T.greenLt,

                border: `1.5px solid ${T.greenMid}`,

                borderRadius: 14,

                padding: "14px 16px",

                marginBottom: reassignDiff.type === "nearbyParking" ? 12 : 16,

              }}

            >

              {reassignDiff.type === "nearbyParking" && (

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "flex-start",

                    marginBottom: 10,

                    paddingBottom: 10,

                    borderBottom: `1px solid ${T.greenMid}`,

                  }}

                >

                  <div>

                    <div

                      style={{

                        fontSize: 11,

                        color: T.textSub,

                        marginBottom: 2,

                      }}

                    >

                      Nuevo parqueo

                    </div>

                    <div

                      style={{ fontSize: 14, fontWeight: 900, color: T.text }}

                    >

                      {reassignDiff.newParking}

                    </div>

                    <div

                      style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}

                    >

                      {reassignDiff.address}

                    </div>

                  </div>

                  <div

                    style={{

                      background: T.blue,

                      borderRadius: 20,

                      padding: "3px 10px",

                      flexShrink: 0,

                    }}

                  >

                    <span

                      style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}

                    >

                      📍 {reassignDiff.distance}

                    </span>

                  </div>

                </div>

              )}

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                  marginBottom: reassignDiff.priceDiff !== 0 ? 10 : 0,

                }}

              >

                <span style={{ fontSize: 12, color: T.textSub }}>

                  {reassignDiff.type === "sameParking"

                    ? "Nuevo espacio asignado"

                    : "Espacio en el nuevo parqueo"}

                </span>

                <span style={{ fontSize: 24, fontWeight: 900, color: T.green }}>

                  {reassignDiff.newSpace}

                </span>

              </div>

              {reassignDiff.priceDiff !== 0 ? (

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                    paddingTop: 10,

                    borderTop: `1px solid ${T.greenMid}`,

                  }}

                >

                  <span style={{ fontSize: 12, color: T.textSub }}>

                    Diferencia de precio

                  </span>

                  <div style={{ textAlign: "right" }}>

                    <div

                      style={{

                        fontSize: 15,

                        fontWeight: 900,

                        color: reassignDiff.priceDiff > 0 ? T.danger : T.green,

                      }}

                    >

                      {reassignDiff.priceDiff > 0 ? "+" : ""}RD$

                      {Math.abs(reassignDiff.priceDiff)}/h

                    </div>

                    <div

                      style={{

                        fontSize: 10,

                        color: reassignDiff.priceDiff > 0 ? T.danger : T.green,

                      }}

                    >

                      {reassignDiff.priceDiff > 0

                        ? "Cargo adicional"

                        : "Ahorro por hora"}

                    </div>

                  </div>

                </div>

              ) : (

                <div style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>

                  ✓ Sin costo adicional

                </div>

              )}

            </div>

            {/* Map thumbnail — only for nearby parkings */}

            {reassignDiff.type === "nearbyParking" && (

              <MapPickerButton

                spot={{

                  name: reassignDiff.newParking,

                  location: reassignDiff.address,

                }}

              />

            )}

            {/* Amenities */}

            <div

              style={{

                background: T.surface,

                borderRadius: 12,

                padding: "12px 14px",

                marginBottom: 20,

              }}

            >

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 8,

                }}

              >

                Servicios{" "}

                {reassignDiff.type === "sameParking"

                  ? "del espacio"

                  : "del nuevo parqueo"}

              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>

                {reassignDiff.amenities.map((a) => (

                  <div

                    key={a}

                    style={{

                      background: T.greenLt,

                      border: `1px solid ${T.greenMid}`,

                      borderRadius: 20,

                      padding: "3px 10px",

                      fontSize: 11,

                      fontWeight: 700,

                      color: T.green,

                    }}

                  >

                    ✓ {a}

                  </div>

                ))}

              </div>

            </div>

            {/* Confirm — check-in happens on arrival */}

            <Btn

              onClick={onCheckin}

              variant="green"

              full

              style={{ padding: "14px 0", fontSize: 15, borderRadius: 14 }}

            >

              Confirmar

            </Btn>

            <div

              style={{

                textAlign: "center",

                marginTop: 10,

                fontSize: 11,

                color: T.textFaint,

              }}

            >

              Escanea el QR del nuevo parqueo al llegar para activar tu estadía

            </div>

          </div>

        )}

      </div>

    </div>

  );

}

// ─── LIVE TIMER CARD ───────────────────────────────────────────────────────────

function ActiveReservationCard({ reservation, onCheckOut }) {

  const [elapsed, setElapsed] = useState(0); // seconds since check-in

  const [checkedIn, setCheckedIn] = useState(false);

  const [showScanner, setScanner] = useState(null); // "checkin" | "checkout" | null

  const [showReceipt, setReceipt] = useState(false);

  const [extending, setExtending] = useState(false);

  const [extraHours, setExtraHours] = useState(0);

  const [spaceOccupied, setSpaceOccupied] = useState(false);

  const timerRef = useRef(null);

  const pricePerHour = 150;

  const reservedHours = 2 + extraHours;

  const reservedSecs = reservedHours * 3600;

  const isOvertime = elapsed > reservedSecs;

  const overtimeSecs = Math.max(0, elapsed - reservedSecs);

  const overtimeMins = Math.floor(overtimeSecs / 60);

  const overtimeCharge = Math.ceil((overtimeMins / 60) * pricePerHour * 1.5);

  const fmt = (n) => String(n).padStart(2, "0");

  const hrs = Math.floor(elapsed / 3600);

  const mins = Math.floor((elapsed % 3600) / 60);

  const secs = elapsed % 60;

  // Start ticking after check-in

  useEffect(() => {

    if (checkedIn) {

      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    }

    return () => clearInterval(timerRef.current);

  }, [checkedIn]);

  const handleScanned = () => {

    if (showScanner === "checkin") {

      setScanner(null);

      setCheckedIn(true);

    } else {

      // checkout

      clearInterval(timerRef.current);

      setScanner(null);

      setReceipt(true);

    }

  };

  return (

    <>

      {spaceOccupied && (

        <OccupiedSpaceModal

          reservation={reservation}

          pricePerHour={pricePerHour}

          onClose={() => setSpaceOccupied(false)}

          onCheckin={() => {

            setSpaceOccupied(false);

          }}

        />

      )}

      {extending && (

        <ExtendTimeScreen

          reservation={reservation}

          pricePerHour={pricePerHour}

          onClose={() => setExtending(false)}

          onConfirm={(h) => setExtraHours((prev) => prev + h)}

        />

      )}

      {showScanner && (

        <QRScannerModal

          mode={showScanner}

          onScanned={handleScanned}

          onCancel={() => setScanner(null)}

        />

      )}

      {showReceipt && (

        <CheckoutReceiptModal

          reservation={reservation}

          elapsedSecs={elapsed}

          onClose={() => {

            setReceipt(false);

            onCheckOut();

          }}

        />

      )}

      <Card style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>

        {/* Header gradient */}

        <div

          style={{

            height: 64,

            background: checkedIn

              ? `linear-gradient(135deg,${T.green},${T.greenDk})`

              : `linear-gradient(135deg,${T.blueNav},${T.blue})`,

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            padding: "0 16px",

            position: "relative",

            transition: "background 0.5s",

          }}

        >

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            <ParkealoPinLogo size={26} variant="white" />

            <div>

              <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>

                {reservation.name}

              </div>

              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>

                {reservation.time}

              </div>

            </div>

          </div>

          {checkedIn ? (

            <Tag

              color={T.green}

              bg="rgba(255,255,255,0.18)"

              border="rgba(255,255,255,0.3)"

              style={{ color: "#fff" }}

            >

              En parqueo

            </Tag>

          ) : (

            <Tag

              color="#fff"

              bg="rgba(255,255,255,0.14)"

              border="rgba(255,255,255,0.25)"

            >

              Pendiente check-in

            </Tag>

          )}

          <div

            style={{

              position: "absolute",

              bottom: 0,

              left: 0,

              right: 0,

              height: 3,

              background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

            }}

          />

        </div>

        <div style={{ padding: "14px 16px" }}>

          {/* Live clock — only shows after check-in */}

          {checkedIn && (

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  background: isOvertime

                    ? `linear-gradient(135deg,${T.warnBg},#FFF3D0)`

                    : `linear-gradient(135deg,${T.greenLt},#E0F7EC)`,

                  border: `1.5px solid ${isOvertime ? T.warnBd : T.greenMid}`,

                  borderRadius: 16,

                  padding: "14px 0",

                  textAlign: "center",

                }}

              >

                <div

                  style={{

                    fontSize: 11,

                    fontWeight: 700,

                    color: isOvertime ? T.warn : T.green,

                    letterSpacing: 1.5,

                    marginBottom: 4,

                  }}

                >

                  {isOvertime ? "⏱ SOBRETIEMPO" : "🕐 TIEMPO EN PARQUEO"}

                </div>

                <div

                  style={{

                    fontFamily: "monospace",

                    fontSize: 38,

                    fontWeight: 900,

                    color: isOvertime ? T.warn : T.green,

                    letterSpacing: 3,

                  }}

                >

                  {fmt(hrs)}:{fmt(mins)}:{fmt(secs)}

                </div>

                {isOvertime && (

                  <div

                    style={{

                      fontSize: 12,

                      color: T.warn,

                      fontWeight: 700,

                      marginTop: 4,

                    }}

                  >

                    +RD${overtimeCharge} sobretiempo acumulado

                  </div>

                )}

              </div>

              {/* Progress bar: reserved time */}

              <div style={{ marginTop: 10 }}>

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    fontSize: 10,

                    color: T.textFaint,

                    marginBottom: 4,

                  }}

                >

                  <span>Inicio</span>

                  <span

                    style={{

                      color: isOvertime ? T.warn : T.textSub,

                      fontWeight: 700,

                    }}

                  >

                    {isOvertime

                      ? `+${overtimeMins}min sobretiempo`

                      : `${reservedHours}h reservadas`}

                  </span>

                  <span>Fin reserva</span>

                </div>

                <div

                  style={{

                    height: 6,

                    background: T.surface2,

                    borderRadius: 6,

                    overflow: "hidden",

                  }}

                >

                  <div

                    style={{

                      height: "100%",

                      width: `${Math.min(

                        100,

                        (elapsed / reservedSecs) * 100

                      )}%`,

                      background: isOvertime

                        ? `linear-gradient(90deg,${T.green},${T.warn})`

                        : `linear-gradient(90deg,${T.green},${T.greenAcct})`,

                      borderRadius: 6,

                      transition: "width 1s linear",

                    }}

                  />

                </div>

              </div>

            </div>

          )}

          {/* Plate + info */}

          <div

            style={{

              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              marginBottom: 12,

            }}

          >

            <div>

              <div style={{ fontSize: 11, color: T.textSub, fontWeight: 600 }}>

                Placa

              </div>

              <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>

                {reservation.plate}

              </div>

            </div>

            <div style={{ textAlign: "right" }}>

              <div style={{ fontSize: 11, color: T.textSub, fontWeight: 600 }}>

                Reserva

              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: T.blue }}>

                RD$150 × {reservedHours}h

              </div>

            </div>

          </div>

          {/* Action buttons */}

          {!checkedIn ? (

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              {/* Parqueo ocupado button */}

              <button

                onClick={() => setSpaceOccupied(true)}

                style={{

                  width: "100%",

                  padding: "11px 0",

                  borderRadius: 12,

                  border: `1.5px solid ${T.warnBd}`,

                  background: T.warnBg,

                  color: T.warn,

                  fontSize: 13,

                  fontWeight: 800,

                  fontFamily: font,

                  cursor: "pointer",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  gap: 8,

                }}

              >

                <svg

                  width="15"

                  height="15"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke={T.warn}

                  strokeWidth="2.5"

                  strokeLinecap="round"

                >

                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />

                  <line x1="12" y1="9" x2="12" y2="13" />

                  <line x1="12" y1="17" x2="12.01" y2="17" />

                </svg>

                Parqueo ocupado

              </button>

              {/* Scan QR for check-in */}

              <Btn

                onClick={() => setScanner("checkin")}

                variant="green"

                full

                style={{

                  padding: "13px 0",

                  fontSize: 14,

                  borderRadius: 12,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  gap: 8,

                }}

              >

                <svg

                  width="16"

                  height="16"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke="#fff"

                  strokeWidth="2.5"

                  strokeLinecap="round"

                >

                  <rect x="3" y="3" width="7" height="7" rx="1" />

                  <rect x="14" y="3" width="7" height="7" rx="1" />

                  <rect x="3" y="14" width="7" height="7" rx="1" />

                  <path d="M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z" />

                </svg>

                Escanear QR — Check-in

              </Btn>

            </div>

          ) : (

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              {/* Extender Tiempo */}

              <button

                onClick={() => setExtending(true)}

                style={{

                  width: "100%",

                  padding: "13px 0",

                  borderRadius: 12,

                  border: `2px solid ${T.blue}`,

                  background: T.blueLt,

                  color: T.blue,

                  fontSize: 14,

                  fontWeight: 800,

                  fontFamily: font,

                  cursor: "pointer",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  gap: 8,

                }}

              >

                <svg

                  width="16"

                  height="16"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke={T.blue}

                  strokeWidth="2.5"

                  strokeLinecap="round"

                >

                  <circle cx="12" cy="12" r="10" />

                  <polyline points="12 6 12 12 16 14" />

                  <line x1="12" y1="2" x2="12" y2="4" />

                  <line x1="19" y1="5" x2="17.5" y2="6.5" />

                </svg>

                Extender Tiempo

              </button>

              {/* Check-out */}

              <Btn

                onClick={() => setScanner("checkout")}

                variant="danger"

                style={{

                  flex: 1,

                  padding: "13px 0",

                  fontSize: 14,

                  borderRadius: 12,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  gap: 7,

                }}

                full

              >

                <svg

                  width="15"

                  height="15"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke="#fff"

                  strokeWidth="2.5"

                  strokeLinecap="round"

                >

                  <rect x="3" y="3" width="7" height="7" rx="1" />

                  <rect x="14" y="3" width="7" height="7" rx="1" />

                  <rect x="3" y="14" width="7" height="7" rx="1" />

                  <path d="M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z" />

                </svg>

                Check-out

              </Btn>

            </div>

          )}

        </div>

      </Card>

    </>

  );

}

// ─── MAP PICKER BUTTON ────────────────────────────────────────────────────────

function MapPickerButton({ spot }) {

  const [showPicker, setShowPicker] = useState(false);

  const query = encodeURIComponent(`${spot.name} ${spot.location}`);

  const maps = [

    {

      label: "Google Maps",

      icon: "🗺️",

      color: "#4285F4",

      url: `https://www.google.com/maps/search/?api=1&query=${query}`,

    },

    {

      label: "Apple Maps",

      icon: "🍎",

      color: "#555",

      url: `https://maps.apple.com/?q=${query}`,

    },

    {

      label: "Waze",

      icon: "🚗",

      color: "#36B6E8",

      url: `https://waze.com/ul?q=${query}&navigate=yes`,

    },

  ];

  return (

    <>

      {/* Map thumbnail — tap to open picker */}

      <div

        onClick={() => setShowPicker(true)}

        style={{

          width: "100%",

          borderRadius: 14,

          overflow: "hidden",

          border: `1.5px solid ${T.border}`,

          boxShadow: T.shadowMd,

          marginBottom: 16,

          cursor: "pointer",

          position: "relative",

        }}

      >

        <div

          style={{

            height: 90,

            background: `linear-gradient(145deg,${T.blueLt},#DDE8F8)`,

            position: "relative",

            overflow: "hidden",

          }}

        >

          {[...Array(7)].map((_, i) => (

            <div

              key={"mv" + i}

              style={{

                position: "absolute",

                left: `${i * 16}%`,

                top: 0,

                bottom: 0,

                width: 1,

                background: "rgba(26,86,196,0.08)",

              }}

            />

          ))}

          {[...Array(5)].map((_, i) => (

            <div

              key={"mh" + i}

              style={{

                position: "absolute",

                top: `${i * 25}%`,

                left: 0,

                right: 0,

                height: 1,

                background: "rgba(26,86,196,0.08)",

              }}

            />

          ))}

          <div

            style={{

              position: "absolute",

              left: "35%",

              top: 0,

              bottom: 0,

              width: 4,

              background: "rgba(180,200,235,0.7)",

            }}

          />

          <div

            style={{

              position: "absolute",

              top: "48%",

              left: 0,

              right: 0,

              height: 4,

              background: "rgba(180,200,235,0.7)",

            }}

          />

          <div

            style={{

              position: "absolute",

              top: "50%",

              left: "37%",

              transform: "translate(-50%,-100%)",

            }}

          >

            <ParkealoPinLogo size={22} variant="green" />

          </div>

          <div

            style={{

              position: "absolute",

              bottom: 8,

              right: 10,

              background: "rgba(255,255,255,0.92)",

              borderRadius: 8,

              padding: "4px 10px",

              display: "flex",

              alignItems: "center",

              gap: 5,

            }}

          >

            <svg

              width="11"

              height="11"

              viewBox="0 0 24 24"

              fill="none"

              stroke={T.blue}

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

              <circle cx="12" cy="10" r="3" />

            </svg>

            <span style={{ fontSize: 11, fontWeight: 700, color: T.blue }}>

              Ver cómo llegar

            </span>

          </div>

        </div>

        <div

          style={{

            background: T.bg,

            padding: "8px 12px",

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

          }}

        >

          <div>

            <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>

              {spot.name}

            </div>

            <div style={{ fontSize: 11, color: T.textSub }}>

              {spot.location}

            </div>

          </div>

          <svg

            width="14"

            height="14"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.textSub}

            strokeWidth="2"

            strokeLinecap="round"

          >

            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

            <circle cx="12" cy="10" r="3" />

          </svg>

        </div>

      </div>

      {/* App picker bottom sheet */}

      {showPicker && (

        <div

          style={{

            position: "fixed",

            inset: 0,

            zIndex: 600,

            background: "rgba(13,27,62,0.55)",

            display: "flex",

            alignItems: "flex-end",

          }}

          onClick={() => setShowPicker(false)}

        >

          <div

            style={{

              background: T.bg,

              borderRadius: "22px 22px 0 0",

              width: "100%",

              padding: "20px 20px 36px",

            }}

            onClick={(e) => e.stopPropagation()}

          >

            <div

              style={{

                width: 40,

                height: 4,

                borderRadius: 2,

                background: T.border,

                margin: "0 auto 18px",

              }}

            />

            <div

              style={{

                fontWeight: 900,

                fontSize: 16,

                color: T.text,

                marginBottom: 4,

              }}

            >

              Abrir con…

            </div>

            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 18 }}>

              {spot.name} · {spot.location}

            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {maps.map((m) => (

                <a

                  key={m.label}

                  href={m.url}

                  target="_blank"

                  rel="noreferrer"

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 14,

                    padding: "13px 16px",

                    borderRadius: 14,

                    border: `1.5px solid ${T.border}`,

                    background: T.surface,

                    textDecoration: "none",

                    cursor: "pointer",

                  }}

                >

                  <div

                    style={{

                      width: 42,

                      height: 42,

                      borderRadius: 12,

                      background: m.color,

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      fontSize: 22,

                      flexShrink: 0,

                    }}

                  >

                    {m.icon}

                  </div>

                  <div style={{ flex: 1 }}>

                    <div

                      style={{ fontWeight: 800, fontSize: 14, color: T.text }}

                    >

                      {m.label}

                    </div>

                    <div style={{ fontSize: 11, color: T.textSub }}>

                      Abrir con {m.label}

                    </div>

                  </div>

                  <svg

                    width="14"

                    height="14"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={T.textFaint}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <polyline points="9 18 15 12 9 6" />

                  </svg>

                </a>

              ))}

            </div>

            <button

              onClick={() => setShowPicker(false)}

              style={{

                marginTop: 14,

                width: "100%",

                background: T.surface2,

                border: "none",

                borderRadius: 14,

                padding: "13px 0",

                fontFamily: font,

                fontWeight: 700,

                fontSize: 14,

                color: T.textSub,

                cursor: "pointer",

              }}

            >

              Cancelar

            </button>

          </div>

        </div>

      )}

    </>

  );

}

// ─── CHAT SCREEN ──────────────────────────────────────────────────────────────

function ChatScreen({ reservation, onClose }) {

  const [messages, setMessages] = useState([

    {

      id: 1,

      from: "host",

      text: "¡Hola! Tu reserva está confirmada. El acceso es por la entrada lateral en la Calle Las Damas.",

      time: "10:05 AM",

    },

    {

      id: 2,

      from: "user",

      text: "Gracias, ¿el parqueo tiene techo?",

      time: "10:07 AM",

    },

    {

      id: 3,

      from: "host",

      text: "Sí, toda la planta baja está cubierta. Tu espacio es el A3.",

      time: "10:08 AM",

    },

  ]);

  const [input, setInput] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages]);

  const send = () => {

    const t = input.trim();

    if (!t) return;

    const now = new Date();

    const time = now.toLocaleTimeString("es-DO", {

      hour: "2-digit",

      minute: "2-digit",

    });

    setMessages((m) => [...m, { id: Date.now(), from: "user", text: t, time }]);

    setInput("");

    // Simulate host reply

    setTimeout(() => {

      setMessages((m) => [

        ...m,

        {

          id: Date.now() + 1,

          from: "host",

          text: "Recibido, enseguida te ayudo 👍",

          time,

        },

      ]);

    }, 1200);

  };

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 500,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      {/* Header */}

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 14px",

          flexShrink: 0,

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

              flexShrink: 0,

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div

            style={{

              width: 38,

              height: 38,

              borderRadius: "50%",

              background: "rgba(255,255,255,0.2)",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              flexShrink: 0,

            }}

          >

            <ParkealoPinLogo size={20} variant="white" />

          </div>

          <div style={{ flex: 1, minWidth: 0 }}>

            <div

              style={{

                color: "#fff",

                fontWeight: 800,

                fontSize: 14,

                overflow: "hidden",

                textOverflow: "ellipsis",

                whiteSpace: "nowrap",

              }}

            >

              Host · {reservation.name}

            </div>

            <div

              style={{

                color: "rgba(255,255,255,0.6)",

                fontSize: 11,

                display: "flex",

                alignItems: "center",

                gap: 5,

              }}

            >

              <div

                style={{

                  width: 7,

                  height: 7,

                  borderRadius: "50%",

                  background: "#4ade80",

                }}

              />

              En línea

            </div>

          </div>

        </div>

      </div>

      {/* Messages */}

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "14px 14px",

          background: T.surface,

          display: "flex",

          flexDirection: "column",

          gap: 10,

        }}

      >

        {/* Date separator */}

        <div

          style={{

            textAlign: "center",

            fontSize: 11,

            color: T.textFaint,

            fontWeight: 600,

            margin: "4px 0",

          }}

        >

          Hoy

        </div>

        {messages.map((msg) => {

          const isUser = msg.from === "user";

          return (

            <div

              key={msg.id}

              style={{

                display: "flex",

                justifyContent: isUser ? "flex-end" : "flex-start",

                alignItems: "flex-end",

                gap: 8,

              }}

            >

              {!isUser && (

                <div

                  style={{

                    width: 28,

                    height: 28,

                    borderRadius: "50%",

                    background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    flexShrink: 0,

                    marginBottom: 2,

                  }}

                >

                  <ParkealoPinLogo size={14} variant="white" />

                </div>

              )}

              <div style={{ maxWidth: "72%" }}>

                <div

                  style={{

                    background: isUser ? T.blue : T.bg,

                    borderRadius: isUser

                      ? "18px 18px 4px 18px"

                      : "18px 18px 18px 4px",

                    padding: "10px 14px",

                    boxShadow: T.shadowSm,

                  }}

                >

                  <div

                    style={{

                      fontSize: 13,

                      color: isUser ? "#fff" : T.text,

                      lineHeight: 1.5,

                    }}

                  >

                    {msg.text}

                  </div>

                </div>

                <div

                  style={{

                    fontSize: 10,

                    color: T.textFaint,

                    marginTop: 3,

                    textAlign: isUser ? "right" : "left",

                  }}

                >

                  {msg.time}

                </div>

              </div>

            </div>

          );

        })}

        <div ref={bottomRef} />

      </div>

      {/* Input bar */}

      <div

        style={{

          padding: "10px 12px 24px",

          background: T.bg,

          borderTop: `1px solid ${T.border}`,

          display: "flex",

          gap: 10,

          alignItems: "center",

        }}

      >

        <input

          value={input}

          onChange={(e) => setInput(e.target.value)}

          onKeyDown={(e) => {

            if (e.key === "Enter") send();

          }}

          placeholder="Escribe un mensaje…"

          style={{

            flex: 1,

            background: T.surface,

            border: `1.5px solid ${T.border}`,

            borderRadius: 22,

            padding: "11px 16px",

            fontSize: 14,

            fontFamily: font,

            outline: "none",

            color: T.text,

          }}

        />

        <button

          onClick={send}

          style={{

            width: 42,

            height: 42,

            borderRadius: "50%",

            background: input.trim() ? T.blue : T.surface2,

            border: "none",

            cursor: "pointer",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            flexShrink: 0,

            transition: "background 0.2s",

          }}

        >

          <svg

            width="17"

            height="17"

            viewBox="0 0 24 24"

            fill="none"

            stroke={input.trim() ? "#fff" : T.textFaint}

            strokeWidth="2.5"

            strokeLinecap="round"

            strokeLinejoin="round"

          >

            <line x1="22" y1="2" x2="11" y2="13" />

            <polygon points="22 2 15 22 11 13 2 9 22 2" />

          </svg>

        </button>

      </div>

    </div>

  );

}

function ReservationsScreen() {

  const [tab, setTab] = useState("active");

  const [doneIds, setDoneIds] = useState([]);

  const [filter, setFilter] = useState("all"); // "all" | "auto" | "manual"

  const [chatRes, setChatRes] = useState(null); // reservation to chat with

  const ALL_RESERVATIONS = {

    active: [

      {

        id: "r1",

        name: "Parqueo Colonial Premium",

        time: "Hoy · 10:30 – 12:30",

        plate: "A123456",

        mode: "auto",

      },

    ],

    requests: [

      {

        id: "r2",

        name: "VIP Piantini · Casa Privada",

        time: "Mañana · 09:00",

        plate: "B789012",

        mode: "manual",

        status: "pending",

      },

      {

        id: "r3",

        name: "Parqueo Bella Vista",

        time: "Mañana · 14:00",

        plate: "B789012",

        mode: "auto",

        status: "confirmed",

      },

    ],

    history: [

      {

        id: "r4",

        name: "Bella Vista",

        time: "Ayer · 14:00–16:30",

        plate: "A123456",

        amount: "RD$200",

        mode: "auto",

      },

      {

        id: "r5",

        name: "Parqueo Colonial",

        time: "Hace 3 días",

        plate: "A123456",

        amount: "RD$300",

        mode: "manual",

      },

    ],

  };

  const filterFn = (r) => (filter === "all" ? true : r.mode === filter);

  const activeItems = ALL_RESERVATIONS.active.filter(

    (r) => !doneIds.includes(r.id) && filterFn(r)

  );

  const requestItems = ALL_RESERVATIONS.requests.filter(filterFn);

  const historyItems = ALL_RESERVATIONS.history.filter(filterFn);

  return (

    <div

      style={{

        height: "100%",

        display: "flex",

        flexDirection: "column",

        background: T.bg,

        position: "relative",

      }}

    >

      {/* Chat overlay */}

      {chatRes && (

        <ChatScreen reservation={chatRes} onClose={() => setChatRes(null)} />

      )}

      {/* Header */}

      <div

        style={{

          padding: "0 16px 0",

          borderBottom: `1px solid ${T.border}`,

          flexShrink: 0,

        }}

      >

        <div

          style={{

            height: 3,

            background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

            marginBottom: 14,

          }}

        />

        <div

          style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            marginBottom: 12,

          }}

        >

          <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>

            Mis reservas

          </div>

          {/* Filter pill */}

          <div style={{ display: "flex", gap: 5 }}>

            {[

              ["all", "Todas"],

              ["auto", "⚡ Rápidas"],

              ["manual", "⏳ Pendientes"],

            ].map(([k, l]) => (

              <button

                key={k}

                onClick={() => setFilter(k)}

                style={{

                  padding: "5px 10px",

                  borderRadius: 20,

                  border: `1.5px solid ${filter === k ? T.blue : T.border}`,

                  background: filter === k ? T.blueLt : T.bg,

                  color: filter === k ? T.blue : T.textSub,

                  fontSize: 10,

                  fontWeight: 700,

                  cursor: "pointer",

                  fontFamily: font,

                  whiteSpace: "nowrap",

                }}

              >

                {l}

              </button>

            ))}

          </div>

        </div>

        <div style={{ display: "flex" }}>

          {[

            ["active", "Activas"],

            ["requests", "Solicitudes"],

            ["history", "Historial"],

          ].map(([t, l]) => (

            <button

              key={t}

              onClick={() => setTab(t)}

              style={{

                flex: 1,

                background: "none",

                border: "none",

                padding: "10px 0",

                fontSize: 13,

                fontWeight: 700,

                color: tab === t ? T.blue : T.textFaint,

                cursor: "pointer",

                fontFamily: font,

                borderBottom: `2.5px solid ${

                  tab === t ? T.blue : "transparent"

                }`,

              }}

            >

              {l}

            </button>

          ))}

        </div>

      </div>

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "16px 14px",

          paddingBottom: 80,

        }}

      >

        {/* ── Activas ── */}

        {tab === "active" &&

          (activeItems.length === 0 ? (

            <div style={{ textAlign: "center", padding: "50px 20px" }}>

              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>

              <div

                style={{

                  fontWeight: 800,

                  color: T.text,

                  fontSize: 16,

                  marginBottom: 6,

                }}

              >

                Sin reservas activas

              </div>

              <div style={{ color: T.textSub, fontSize: 13 }}>

                Tus estadías completadas aparecerán en Historial.

              </div>

            </div>

          ) : (

            activeItems.map((r) => (

              <div key={r.id}>

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                    marginBottom: 6,

                  }}

                >

                  <ModeBadge mode={r.mode} />

                  <button

                    onClick={() => setChatRes(r)}

                    style={{

                      display: "flex",

                      alignItems: "center",

                      gap: 5,

                      background: T.blueLt,

                      border: `1px solid ${T.blueMid}`,

                      borderRadius: 20,

                      padding: "4px 12px",

                      fontSize: 11,

                      fontWeight: 700,

                      color: T.blue,

                      cursor: "pointer",

                      fontFamily: font,

                    }}

                  >

                    <svg

                      width="12"

                      height="12"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={T.blue}

                      strokeWidth="2.5"

                      strokeLinecap="round"

                    >

                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />

                    </svg>

                    Chat

                  </button>

                </div>

                <ActiveReservationCard

                  reservation={r}

                  onCheckOut={() => setDoneIds((d) => [...d, r.id])}

                />

              </div>

            ))

          ))}

        {/* ── Solicitudes ── */}

        {tab === "requests" &&

          (requestItems.length === 0 ? (

            <div style={{ textAlign: "center", padding: "50px 20px" }}>

              <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>

              <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>

                No hay solicitudes

              </div>

            </div>

          ) : (

            requestItems.map((r, i) => (

              <Card

                key={i}

                style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}

              >

                <div

                  style={{

                    height: 58,

                    background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    position: "relative",

                  }}

                >

                  <ParkealoPinLogo size={28} variant="white" />

                  <div

                    style={{

                      position: "absolute",

                      bottom: 0,

                      left: 0,

                      right: 0,

                      height: 3,

                      background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

                    }}

                  />

                </div>

                <div style={{ padding: 14 }}>

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      alignItems: "flex-start",

                      marginBottom: 8,

                    }}

                  >

                    <div>

                      <div

                        style={{

                          fontSize: 14,

                          fontWeight: 800,

                          color: T.text,

                          marginBottom: 3,

                        }}

                      >

                        {r.name}

                      </div>

                      <div style={{ fontSize: 12, color: T.textSub }}>

                        {r.time}

                      </div>

                      <div

                        style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}

                      >

                        Placa: {r.plate}

                      </div>

                    </div>

                    <div

                      style={{

                        display: "flex",

                        flexDirection: "column",

                        alignItems: "flex-end",

                        gap: 5,

                      }}

                    >

                      {r.status === "pending" ? (

                        <Tag color={T.warn} bg={T.warnBg} border={T.warnBd}>

                          Pendiente

                        </Tag>

                      ) : (

                        <Tag color={T.green} bg={T.greenLt} border={T.greenMid}>

                          Confirmada

                        </Tag>

                      )}

                      <ModeBadge mode={r.mode} />

                    </div>

                  </div>

                  <div

                    style={{

                      background: T.surface,

                      borderRadius: 10,

                      padding: "8px 12px",

                      marginBottom: 10,

                      fontSize: 12,

                      color: T.textSub,

                    }}

                  >

                    {r.status === "pending"

                      ? "⏳ Esperando aprobación. Recibirás la informacion de acceso o PIN al ser confirmado."

                      : "✅ Reserva confirmada. Revisa la informacion de acceso o PIN en el chat."}

                  </div>

                  <button

                    onClick={() => setChatRes(r)}

                    style={{

                      width: "100%",

                      background: T.blueLt,

                      border: `1.5px solid ${T.blueMid}`,

                      borderRadius: 10,

                      padding: "9px 0",

                      fontFamily: font,

                      fontWeight: 700,

                      fontSize: 13,

                      color: T.blue,

                      cursor: "pointer",

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      gap: 7,

                    }}

                  >

                    <svg

                      width="14"

                      height="14"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={T.blue}

                      strokeWidth="2.5"

                      strokeLinecap="round"

                    >

                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />

                    </svg>

                    Mensaje al host

                  </button>

                </div>

              </Card>

            ))

          ))}

        {/* ── Historial ── */}

        {tab === "history" &&

          (historyItems.length === 0 ? (

            <div style={{ textAlign: "center", padding: "50px 20px" }}>

              <div style={{ fontSize: 44, marginBottom: 14 }}>🕐</div>

              <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>

                Sin historial

              </div>

            </div>

          ) : (

            historyItems.map((r, i) => (

              <Card

                key={i}

                style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}

              >

                <div

                  style={{

                    height: 58,

                    background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    position: "relative",

                  }}

                >

                  <ParkealoPinLogo size={28} variant="white" />

                  <div

                    style={{

                      position: "absolute",

                      bottom: 0,

                      left: 0,

                      right: 0,

                      height: 3,

                      background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

                    }}

                  />

                </div>

                <div style={{ padding: 14 }}>

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      alignItems: "flex-start",

                      marginBottom: 8,

                    }}

                  >

                    <div>

                      <div

                        style={{

                          fontSize: 14,

                          fontWeight: 800,

                          color: T.text,

                          marginBottom: 3,

                        }}

                      >

                        {r.name}

                      </div>

                      <div style={{ fontSize: 12, color: T.textSub }}>

                        {r.time}

                      </div>

                      <div

                        style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}

                      >

                        Placa: {r.plate}

                      </div>

                    </div>

                    <div

                      style={{

                        display: "flex",

                        flexDirection: "column",

                        alignItems: "flex-end",

                        gap: 5,

                      }}

                    >

                      <div

                        style={{

                          color: T.green,

                          fontWeight: 800,

                          fontSize: 14,

                        }}

                      >

                        {r.amount}

                      </div>

                      <ModeBadge mode={r.mode} />

                    </div>

                  </div>

                </div>

              </Card>

            ))

          ))}

      </div>

    </div>

  );

}

// ─── FAVORITES SCREEN ─────────────────────────────────────────────────────────

function FavoritesScreen({ favorites, onSelect, onRemove }) {

  return (

    <div

      style={{

        height: "100%",

        overflowY: "auto",

        background: T.surface,

        paddingBottom: 80,

      }}

    >

      <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>

        <div

          style={{

            height: 3,

            background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

          }}

        />

        <div style={{ padding: "14px 16px 14px" }}>

          <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>

            Favoritos

          </div>

          <div style={{ color: T.textSub, fontSize: 13, marginTop: 3 }}>

            {favorites.length} parqueo{favorites.length !== 1 ? "s" : ""}{" "}

            guardado{favorites.length !== 1 ? "s" : ""}

          </div>

        </div>

      </div>

      <div style={{ padding: "14px 14px 0" }}>

        {favorites.length === 0 ? (

          <div style={{ textAlign: "center", padding: "60px 24px" }}>

            <div style={{ fontSize: 52, marginBottom: 16 }}>🤍</div>

            <div

              style={{

                fontWeight: 800,

                color: T.text,

                fontSize: 17,

                marginBottom: 8,

              }}

            >

              Aún no tienes favoritos

            </div>

            <div style={{ color: T.textSub, fontSize: 14, lineHeight: 1.6 }}>

              Presiona el corazón en cualquier parqueo para guardarlo aquí.

            </div>

          </div>

        ) : (

          favorites.map((spot) => (

            <div

              key={spot.id}

              style={{

                background: T.bg,

                borderRadius: 16,

                marginBottom: 12,

                border: `1px solid ${T.border}`,

                overflow: "hidden",

                boxShadow: T.shadow,

              }}

            >

              <div

                style={{

                  height: 90,

                  background:

                    spot.type === "private"

                      ? `linear-gradient(135deg,${T.blueNav},${T.blue})`

                      : `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  position: "relative",

                }}

              >

                <ParkealoPinLogo size={36} variant="white" />

                <div

                  style={{

                    position: "absolute",

                    bottom: 0,

                    left: 0,

                    right: 0,

                    height: 3,

                    background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

                  }}

                />

                <button

                  onClick={() => onRemove(spot.id)}

                  style={{

                    position: "absolute",

                    top: 8,

                    right: 10,

                    background: "rgba(255,255,255,0.15)",

                    border: "none",

                    borderRadius: "50%",

                    width: 28,

                    height: 28,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    cursor: "pointer",

                  }}

                >

                  <svg

                    width="13"

                    height="13"

                    viewBox="0 0 24 24"

                    fill="#ff6b6b"

                    stroke="#ff6b6b"

                    strokeWidth="2"

                    strokeLinecap="round"

                  >

                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />

                  </svg>

                </button>

              </div>

              <div style={{ padding: "10px 14px 14px" }}>

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "flex-start",

                    marginBottom: 3,

                  }}

                >

                  <div

                    style={{

                      fontSize: 14,

                      fontWeight: 800,

                      color: T.text,

                      flex: 1,

                    }}

                  >

                    {spot.name}

                  </div>

                  <StarRating value={spot.rating} />

                </div>

                <div

                  style={{ fontSize: 12, color: T.textSub, marginBottom: 10 }}

                >

                  {spot.location} · {spot.distance}

                </div>

                <div

                  style={{

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                  }}

                >

                  <div>

                    <span

                      style={{ fontSize: 16, fontWeight: 900, color: T.text }}

                    >

                      {spot.currency}

                      {spot.price}

                    </span>

                    <span style={{ fontSize: 11, color: T.textSub }}>

                      {" "}

                      /hora

                    </span>

                  </div>

                  <Btn onClick={() => onSelect(spot)} variant="green" small>

                    Reservar

                  </Btn>

                </div>

              </div>

            </div>

          ))

        )}

      </div>

    </div>

  );

}

// ─── ACCOUNT SCREEN ──────────────────────────────────────────────────────────

// ─── SUPPORT CHAT SCREEN ──────────────────────────────────────────────────────

function SupportChatScreen({ onClose, reservationId }) {

  const [messages, setMessages] = useState([

    {

      id: 1,

      from: "support",

      text: "¡Hola! Soy el equipo de soporte de Parkealo. ¿En qué podemos ayudarte hoy?",

      time: "Ahora",

    },

  ]);

  const [input, setInput] = useState("");

  const [category, setCategory] = useState(null);

  const bottomRef = useRef(null);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [messages]);

  const CATEGORIES = [

    { key: "reservation", label: "Problema con mi reserva", icon: "🅿️" },

    { key: "payment", label: "Problema de pago", icon: "💳" },

    { key: "damage", label: "Daño a mi vehículo", icon: "🚗" },

    { key: "refund", label: "Solicitar reembolso", icon: "💰" },

    { key: "other", label: "Otra consulta", icon: "💬" },

  ];

  const AUTO_REPLIES = {

    reservation:

      "Entendido. ¿Puedes describir qué ocurrió con tu reserva? Revisaremos el caso de inmediato.",

    payment:

      "Te ayudamos con el problema de pago. ¿El cargo fue incorrecto o no se procesó correctamente?",

    damage:

      "Lamentamos escuchar eso. Por favor envíanos fotos del daño. Activamos el seguro Parkealo automáticamente.",

    refund:

      "Revisaremos tu caso para el reembolso. El proceso toma 3-5 días hábiles una vez aprobado.",

    other: "Con gusto te ayudamos. Cuéntanos más sobre tu situación.",

  };

  const selectCategory = (cat) => {

    setCategory(cat.key);

    const now = new Date().toLocaleTimeString("es-DO", {

      hour: "2-digit",

      minute: "2-digit",

    });

    setMessages((m) => [

      ...m,

      { id: Date.now(), from: "user", text: cat.label, time: now },

      {

        id: Date.now() + 1,

        from: "support",

        text: AUTO_REPLIES[cat.key],

        time: now,

      },

    ]);

  };

  const send = () => {

    const t = input.trim();

    if (!t) return;

    const now = new Date().toLocaleTimeString("es-DO", {

      hour: "2-digit",

      minute: "2-digit",

    });

    setMessages((m) => [

      ...m,

      { id: Date.now(), from: "user", text: t, time: now },

    ]);

    setInput("");

    setTimeout(() => {

      setMessages((m) => [

        ...m,

        {

          id: Date.now() + 1,

          from: "support",

          text: "Hemos recibido tu mensaje. Un agente te responderá en los próximos minutos.",

          time: now,

        },

      ]);

    }, 1000);

  };

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 14px",

          flexShrink: 0,

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div

            style={{

              width: 38,

              height: 38,

              borderRadius: "50%",

              background: "rgba(255,255,255,0.2)",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

            }}

          >

            <span style={{ fontSize: 20 }}>🎧</span>

          </div>

          <div>

            <div style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>

              Soporte Parkealo

            </div>

            <div

              style={{

                color: "rgba(255,255,255,0.6)",

                fontSize: 11,

                display: "flex",

                alignItems: "center",

                gap: 5,

              }}

            >

              <div

                style={{

                  width: 7,

                  height: 7,

                  borderRadius: "50%",

                  background: "#4ade80",

                }}

              />

              Disponible · Resp. en ~5 min

            </div>

          </div>

          {reservationId && (

            <div

              style={{

                marginLeft: "auto",

                background: "rgba(255,255,255,0.15)",

                borderRadius: 20,

                padding: "3px 10px",

              }}

            >

              <span

                style={{

                  fontSize: 10,

                  color: "rgba(255,255,255,0.8)",

                  fontWeight: 700,

                }}

              >

                {reservationId}

              </span>

            </div>

          )}

        </div>

      </div>

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "14px",

          background: T.surface,

          display: "flex",

          flexDirection: "column",

          gap: 10,

        }}

      >

        {messages.map((msg) => {

          const isUser = msg.from === "user";

          return (

            <div

              key={msg.id}

              style={{

                display: "flex",

                justifyContent: isUser ? "flex-end" : "flex-start",

                alignItems: "flex-end",

                gap: 8,

              }}

            >

              {!isUser && (

                <div

                  style={{

                    width: 28,

                    height: 28,

                    borderRadius: "50%",

                    background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    flexShrink: 0,

                  }}

                >

                  <span style={{ fontSize: 14 }}>🎧</span>

                </div>

              )}

              <div style={{ maxWidth: "75%" }}>

                <div

                  style={{

                    background: isUser ? T.blue : T.bg,

                    borderRadius: isUser

                      ? "18px 18px 4px 18px"

                      : "18px 18px 18px 4px",

                    padding: "10px 14px",

                    boxShadow: T.shadowSm,

                  }}

                >

                  <div

                    style={{

                      fontSize: 13,

                      color: isUser ? "#fff" : T.text,

                      lineHeight: 1.5,

                    }}

                  >

                    {msg.text}

                  </div>

                </div>

                <div

                  style={{

                    fontSize: 10,

                    color: T.textFaint,

                    marginTop: 3,

                    textAlign: isUser ? "right" : "left",

                  }}

                >

                  {msg.time}

                </div>

              </div>

            </div>

          );

        })}

        {/* Category picker if no category selected */}

        {!category && (

          <div

            style={{

              background: T.bg,

              borderRadius: 16,

              padding: "14px",

              boxShadow: T.shadowSm,

            }}

          >

            <div

              style={{

                fontSize: 12,

                fontWeight: 700,

                color: T.textSub,

                marginBottom: 10,

              }}

            >

              ¿Cómo podemos ayudarte?

            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              {CATEGORIES.map((c) => (

                <button

                  key={c.key}

                  onClick={() => selectCategory(c)}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 12,

                    padding: "10px 14px",

                    borderRadius: 12,

                    border: `1px solid ${T.border}`,

                    background: T.surface,

                    cursor: "pointer",

                    fontFamily: font,

                    textAlign: "left",

                  }}

                >

                  <span style={{ fontSize: 20 }}>{c.icon}</span>

                  <span

                    style={{ fontSize: 13, fontWeight: 600, color: T.text }}

                  >

                    {c.label}

                  </span>

                  <svg

                    width="12"

                    height="12"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={T.textFaint}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                    style={{ marginLeft: "auto" }}

                  >

                    <polyline points="9 18 15 12 9 6" />

                  </svg>

                </button>

              ))}

            </div>

          </div>

        )}

        <div ref={bottomRef} />

      </div>

      <div

        style={{

          padding: "10px 12px 24px",

          background: T.bg,

          borderTop: `1px solid ${T.border}`,

          display: "flex",

          gap: 10,

          alignItems: "center",

          flexShrink: 0,

        }}

      >

        <input

          value={input}

          onChange={(e) => setInput(e.target.value)}

          onKeyDown={(e) => {

            if (e.key === "Enter") send();

          }}

          placeholder="Escribe tu mensaje…"

          autoComplete="off"

          style={{

            flex: 1,

            background: T.surface,

            border: `1.5px solid ${T.border}`,

            borderRadius: 22,

            padding: "11px 16px",

            fontSize: 14,

            fontFamily: font,

            outline: "none",

            color: T.text,

          }}

        />

        <button

          onClick={send}

          style={{

            width: 42,

            height: 42,

            borderRadius: "50%",

            background: input.trim() ? T.blue : T.surface2,

            border: "none",

            cursor: "pointer",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

          }}

        >

          <svg

            width="17"

            height="17"

            viewBox="0 0 24 24"

            fill="none"

            stroke={input.trim() ? "#fff" : T.textFaint}

            strokeWidth="2.5"

            strokeLinecap="round"

            strokeLinejoin="round"

          >

            <line x1="22" y1="2" x2="11" y2="13" />

            <polygon points="22 2 15 22 11 13 2 9 22 2" />

          </svg>

        </button>

      </div>

    </div>

  );

}

// ─── CLAIM FORM ───────────────────────────────────────────────────────────────

function ClaimForm({ onClose }) {

  const [step, setStep] = useState(0); // 0=type, 1=details, 2=evidence, 3=submitted

  const [claimType, setClaimType] = useState("");

  const [description, setDesc] = useState("");

  const [date, setDate] = useState("");

  const [reservId, setReservId] = useState("");

  const [amount, setAmount] = useState("");

  const [evidence, setEvidence] = useState([]);

  const TYPES = [

    {

      key: "charge",

      label: "Cobro incorrecto",

      icon: "💳",

      desc: "Se me cobró un monto diferente al acordado",

    },

    {

      key: "damage",

      label: "Daño a mi vehículo",

      icon: "🚗",

      desc: "Mi vehículo sufrió daños durante la estadía",

    },

    {

      key: "service",

      label: "Servicio no disponible",

      icon: "❌",

      desc: "Un servicio anunciado no estaba disponible",

    },

    {

      key: "safety",

      label: "Condición insegura",

      icon: "⚠️",

      desc: "El parqueo presentó condiciones de riesgo",

    },

    {

      key: "host",

      label: "Mal comportamiento",

      icon: "👤",

      desc: "El host actuó de forma inapropiada",

    },

    {

      key: "other",

      label: "Otro",

      icon: "📋",

      desc: "Otra situación no listada",

    },

  ];

  if (step === 3)

    return (

      <div

        style={{

          position: "absolute",

          inset: 0,

          zIndex: 600,

          background: T.bg,

          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          justifyContent: "center",

          padding: 32,

        }}

      >

        <div

          style={{

            width: 80,

            height: 80,

            borderRadius: "50%",

            background: T.greenLt,

            border: `3px solid ${T.green}`,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            marginBottom: 24,

          }}

        >

          <svg

            width="38"

            height="38"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.green}

            strokeWidth="2.5"

            strokeLinecap="round"

          >

            <polyline points="20 6 9 17 4 12" />

          </svg>

        </div>

        <div

          style={{

            fontWeight: 900,

            fontSize: 22,

            color: T.text,

            textAlign: "center",

            marginBottom: 8,

          }}

        >

          Reclamación enviada

        </div>

        <div

          style={{

            color: T.textSub,

            fontSize: 14,

            textAlign: "center",

            lineHeight: 1.7,

            marginBottom: 10,

          }}

        >

          Tu caso ha sido registrado con el número{" "}

          <strong style={{ color: T.blue }}>

            CLM-{Math.floor(Math.random() * 9000) + 1000}

          </strong>

        </div>

        <div

          style={{

            background: T.blueLt,

            border: `1px solid ${T.blueMid}`,

            borderRadius: 12,

            padding: "10px 16px",

            marginBottom: 28,

            width: "100%",

            textAlign: "center",

          }}

        >

          <div style={{ fontSize: 12, color: T.blue, fontWeight: 700 }}>

            📋 Recibirás una respuesta en máximo 48 horas hábiles

          </div>

        </div>

        <Btn

          onClick={onClose}

          variant="green"

          full

          style={{ padding: "14px 0", fontSize: 15, borderRadius: 14 }}

        >

          Volver a mi cuenta

        </Btn>

      </div>

    );

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 14px",

          flexShrink: 0,

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <button

            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div>

            <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>

              Hacer una reclamación

            </div>

            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>

              Paso {step + 1} de 3

            </div>

          </div>

        </div>

        <div

          style={{

            marginTop: 12,

            height: 4,

            background: "rgba(255,255,255,0.2)",

            borderRadius: 2,

          }}

        >

          <div

            style={{

              height: "100%",

              width: `${((step + 1) / 3) * 100}%`,

              background: "#fff",

              borderRadius: 2,

              transition: "width 0.3s",

            }}

          />

        </div>

      </div>

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "20px 16px",

          background: T.surface,

        }}

      >

        {/* Step 0 — Type */}

        {step === 0 && (

          <>

            <div

              style={{

                fontSize: 15,

                fontWeight: 800,

                color: T.text,

                marginBottom: 4,

              }}

            >

              ¿Qué tipo de reclamación es?

            </div>

            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 16 }}>

              Selecciona la categoría que mejor describe tu situación.

            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {TYPES.map((c) => (

                <button

                  key={c.key}

                  onClick={() => setClaimType(c.key)}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 14,

                    padding: "14px 16px",

                    borderRadius: 14,

                    border: `2px solid ${

                      claimType === c.key ? T.blue : T.border

                    }`,

                    background: claimType === c.key ? T.blueLt : T.bg,

                    cursor: "pointer",

                    fontFamily: font,

                    textAlign: "left",

                  }}

                >

                  <div

                    style={{

                      width: 44,

                      height: 44,

                      borderRadius: 14,

                      background: claimType === c.key ? T.blue : T.surface2,

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      fontSize: 22,

                      flexShrink: 0,

                    }}

                  >

                    {c.icon}

                  </div>

                  <div>

                    <div

                      style={{

                        fontWeight: 800,

                        fontSize: 14,

                        color: claimType === c.key ? T.blue : T.text,

                      }}

                    >

                      {c.label}

                    </div>

                    <div

                      style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}

                    >

                      {c.desc}

                    </div>

                  </div>

                </button>

              ))}

            </div>

          </>

        )}

        {/* Step 1 — Details */}

        {step === 1 && (

          <>

            <div

              style={{

                fontSize: 15,

                fontWeight: 800,

                color: T.text,

                marginBottom: 16,

              }}

            >

              Detalles de la reclamación

            </div>

            {[

              {

                label: "Número de reserva",

                val: reservId,

                set: setReservId,

                ph: "Ej: R-4821",

                note: "Encuéntralo en tu historial de reservas",

              },

              {

                label: "Fecha del incidente",

                val: date,

                set: setDate,

                ph: "Ej: 12 Mar 2026",

              },

              {

                label: "Monto en disputa (RD$)",

                val: amount,

                set: setAmount,

                ph: "Ej: 500",

              },

            ].map((f) => (

              <div key={f.label} style={{ marginBottom: 14 }}>

                <div

                  style={{

                    fontSize: 11,

                    fontWeight: 700,

                    color: T.textSub,

                    marginBottom: 5,

                  }}

                >

                  {f.label.toUpperCase()}

                </div>

                <input

                  value={f.val}

                  onChange={(e) => f.set(e.target.value)}

                  placeholder={f.ph}

                  autoComplete="off"

                  style={{

                    width: "100%",

                    background: T.bg,

                    border: `1.5px solid ${T.borderMd}`,

                    borderRadius: 10,

                    padding: "11px 14px",

                    fontSize: 14,

                    fontFamily: font,

                    outline: "none",

                    color: T.text,

                    boxSizing: "border-box",

                  }}

                />

                {f.note && (

                  <div

                    style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}

                  >

                    {f.note}

                  </div>

                )}

              </div>

            ))}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 5,

                }}

              >

                DESCRIPCIÓN DETALLADA *

              </div>

              <textarea

                value={description}

                onChange={(e) => setDesc(e.target.value)}

                placeholder="Describe con el mayor detalle posible lo ocurrido: hora, lugar, personas involucradas, daños…"

                rows={5}

                style={{

                  width: "100%",

                  background: T.bg,

                  border: `1.5px solid ${T.borderMd}`,

                  borderRadius: 10,

                  padding: "11px 14px",

                  fontSize: 13,

                  fontFamily: font,

                  outline: "none",

                  color: T.text,

                  boxSizing: "border-box",

                  resize: "none",

                  lineHeight: 1.6,

                }}

              />

            </div>

          </>

        )}

        {/* Step 2 — Evidence */}

        {step === 2 && (

          <>

            <div

              style={{

                fontSize: 15,

                fontWeight: 800,

                color: T.text,

                marginBottom: 4,

              }}

            >

              Evidencia

            </div>

            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 16 }}>

              Adjunta fotos, videos o documentos que respalden tu reclamación.

              Más evidencia = resolución más rápida.

            </div>

            <div

              style={{

                display: "grid",

                gridTemplateColumns: "1fr 1fr",

                gap: 10,

                marginBottom: 16,

              }}

            >

              {[

                "📷 Foto del daño",

                "📄 Captura de pantalla",

                "🎥 Video del incidente",

                "🧾 Recibo / Comprobante",

              ].map((label, i) => (

                <button

                  key={i}

                  onClick={() =>

                    setEvidence((prev) =>

                      prev.includes(label)

                        ? prev.filter((e) => e !== label)

                        : [...prev, label]

                    )

                  }

                  style={{

                    padding: "16px 10px",

                    borderRadius: 14,

                    border: `2px solid ${

                      evidence.includes(label) ? T.blue : T.border

                    }`,

                    background: evidence.includes(label) ? T.blueLt : T.bg,

                    cursor: "pointer",

                    fontFamily: font,

                    textAlign: "center",

                  }}

                >

                  <div style={{ fontSize: 24, marginBottom: 6 }}>

                    {label.split(" ")[0]}

                  </div>

                  <div

                    style={{

                      fontSize: 11,

                      fontWeight: 700,

                      color: evidence.includes(label) ? T.blue : T.textSub,

                    }}

                  >

                    {label.split(" ").slice(1).join(" ")}

                  </div>

                  {evidence.includes(label) && (

                    <div style={{ fontSize: 10, color: T.blue, marginTop: 3 }}>

                      ✓ Seleccionado

                    </div>

                  )}

                </button>

              ))}

            </div>

            <div

              style={{

                background: T.warnBg,

                border: `1px solid ${T.warnBd}`,

                borderRadius: 12,

                padding: "10px 14px",

                marginBottom: 12,

              }}

            >

              <div

                style={{

                  fontSize: 11,

                  color: T.warn,

                  fontWeight: 700,

                  marginBottom: 2,

                }}

              >

                💡 Recomendaciones

              </div>

              <div style={{ fontSize: 11, color: T.warn, lineHeight: 1.6 }}>

                • Fotos con marca de tiempo cuando sea posible{"\n"}• Capturas

                del chat con el host{"\n"}• Foto de tu placa junto al daño

              </div>

            </div>

            {/* Summary */}

            <Card>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 10,

                }}

              >

                RESUMEN DE TU RECLAMACIÓN

              </div>

              {[

                ["Tipo", TYPES.find((t) => t.key === claimType)?.label || "—"],

                ["Reserva", reservId || "—"],

                ["Monto", amount ? `RD$${amount}` : "—"],

                [

                  "Evidencia",

                  evidence.length > 0

                    ? `${evidence.length} archivo(s)`

                    : "Ninguna",

                ],

              ].map(([l, v]) => (

                <div

                  key={l}

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    padding: "7px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <span style={{ fontSize: 12, color: T.textSub }}>{l}</span>

                  <span

                    style={{ fontSize: 12, fontWeight: 700, color: T.text }}

                  >

                    {v}

                  </span>

                </div>

              ))}

            </Card>

          </>

        )}

      </div>

      <div

        style={{

          padding: "12px 16px 28px",

          background: T.bg,

          borderTop: `1px solid ${T.border}`,

          flexShrink: 0,

        }}

      >

        <Btn

          onClick={() => {

            if (step < 2) setStep((s) => s + 1);

            else setStep(3);

          }}

          variant={step === 2 ? "green" : "blue"}

          full

          style={{ padding: "14px 0", fontSize: 15, borderRadius: 14 }}

          disabled={(step === 0 && !claimType) || (step === 1 && !description)}

        >

          {step === 2 ? "Enviar reclamación" : "Continuar →"}

        </Btn>

      </div>

    </div>

  );

}

// ─── REFERRAL SYSTEM ──────────────────────────────────────────────────────────

function ReferralScreen({ onClose }) {

  const [copied, setCopied] = useState(false);

  const code = "PARK-CM7X2";

  const referrals = [

    {

      name: "Roberto P.",

      joined: "Hace 2 días",

      reward: "RD$50",

      status: "earned",

    },

    {

      name: "Lucia M.",

      joined: "Hace 5 días",

      reward: "RD$50",

      status: "earned",

    },

    {

      name: "Diego F.",

      joined: "Pendiente",

      reward: "RD$50",

      status: "pending",

    },

  ];

  const totalEarned =

    referrals.filter((r) => r.status === "earned").length * 50;

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 28px",

          flexShrink: 0,

          position: "relative",

          overflow: "hidden",

        }}

      >

        {[30, 48, 26, 52, 38].map((h, i) => (

          <div

            key={i}

            style={{

              position: "absolute",

              bottom: 0,

              left: `${i * 22}%`,

              width: 20,

              height: h,

              background: "rgba(255,255,255,0.05)",

              borderRadius: "3px 3px 0 0",

            }}

          />

        ))}

        <div

          style={{

            display: "flex",

            alignItems: "center",

            gap: 12,

            marginBottom: 20,

          }}

        >

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>

            Invita amigos · Gana RD$50

          </div>

        </div>

        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>

          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>

          <div

            style={{

              color: "#fff",

              fontWeight: 900,

              fontSize: 22,

              marginBottom: 4,

            }}

          >

            RD${totalEarned} ganados

          </div>

          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>

            Por {referrals.filter((r) => r.status === "earned").length} amigos

            referidos

          </div>

        </div>

      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>

        {/* How it works */}

        <Card style={{ marginBottom: 16 }}>

          <SectionLabel>¿Cómo funciona?</SectionLabel>

          {[

            ["1", "Comparte tu código con amigos", "🔗"],

            ["2", "Tu amigo se registra con tu código", "✅"],

            ["3", "Ambos ganan RD$50 al hacer su primera reserva", "🎁"],

          ].map(([n, txt, icon]) => (

            <div

              key={n}

              style={{

                display: "flex",

                alignItems: "center",

                gap: 12,

                padding: "10px 0",

                borderBottom: `1px solid ${T.border}`,

              }}

            >

              <div

                style={{

                  width: 32,

                  height: 32,

                  borderRadius: "50%",

                  background: T.blueLt,

                  border: `1.5px solid ${T.blue}`,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  flexShrink: 0,

                }}

              >

                <span style={{ fontSize: 13, fontWeight: 900, color: T.blue }}>

                  {n}

                </span>

              </div>

              <span style={{ flex: 1, fontSize: 13, color: T.text }}>

                {txt}

              </span>

              <span style={{ fontSize: 20 }}>{icon}</span>

            </div>

          ))}

        </Card>

        {/* Referral code */}

        <Card style={{ marginBottom: 16 }}>

          <SectionLabel>Tu código de referido</SectionLabel>

          <div

            style={{

              display: "flex",

              alignItems: "center",

              gap: 10,

              background: `linear-gradient(135deg,${T.blueLt},#E8F0FF)`,

              border: `2px dashed ${T.blue}`,

              borderRadius: 14,

              padding: "14px 16px",

              marginBottom: 12,

            }}

          >

            <span

              style={{

                flex: 1,

                fontFamily: "monospace",

                fontSize: 22,

                fontWeight: 900,

                color: T.blue,

                letterSpacing: 3,

              }}

            >

              {code}

            </span>

            <button

              onClick={() => {

                setCopied(true);

                setTimeout(() => setCopied(false), 2000);

              }}

              style={{

                background: copied ? T.green : T.blue,

                border: "none",

                borderRadius: 10,

                padding: "8px 14px",

                color: "#fff",

                fontFamily: font,

                fontWeight: 700,

                fontSize: 12,

                cursor: "pointer",

              }}

            >

              {copied ? "✓ Copiado" : "Copiar"}

            </button>

          </div>

          <div style={{ display: "flex", gap: 8 }}>

            {[

              ["📱 WhatsApp", "#25D366"],

              ["📘 Facebook", "#1877F2"],

              ["📤 Compartir", "#555"],

            ].map(([l, c]) => (

              <button

                key={l}

                style={{

                  flex: 1,

                  background: c,

                  border: "none",

                  borderRadius: 10,

                  padding: "9px 4px",

                  color: "#fff",

                  fontFamily: font,

                  fontWeight: 700,

                  fontSize: 11,

                  cursor: "pointer",

                }}

              >

                {l}

              </button>

            ))}

          </div>

        </Card>

        {/* Referral list */}

        <Card>

          <SectionLabel>Tus referidos ({referrals.length})</SectionLabel>

          {referrals.map((r, i) => (

            <div

              key={i}

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                padding: "10px 0",

                borderBottom:

                  i < referrals.length - 1 ? `1px solid ${T.border}` : "none",

              }}

            >

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <div

                  style={{

                    width: 36,

                    height: 36,

                    borderRadius: "50%",

                    background: T.blueLt,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <span

                    style={{ fontWeight: 900, fontSize: 14, color: T.blue }}

                  >

                    {r.name[0]}

                  </span>

                </div>

                <div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>

                    {r.name}

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>

                    {r.joined}

                  </div>

                </div>

              </div>

              <div style={{ textAlign: "right" }}>

                <div

                  style={{

                    fontSize: 14,

                    fontWeight: 900,

                    color: r.status === "earned" ? T.green : T.textFaint,

                  }}

                >

                  {r.reward}

                </div>

                <div

                  style={{

                    fontSize: 10,

                    color: r.status === "earned" ? T.green : T.warn,

                    fontWeight: 700,

                  }}

                >

                  {r.status === "earned" ? "Ganado" : "Pendiente"}

                </div>

              </div>

            </div>

          ))}

          <div

            style={{

              marginTop: 12,

              background: T.greenLt,

              border: `1px solid ${T.greenMid}`,

              borderRadius: 10,

              padding: "8px 12px",

              textAlign: "center",

            }}

          >

            <span style={{ fontSize: 12, fontWeight: 700, color: T.green }}>

              💰 Balance disponible: RD${totalEarned} — Redimible en tu próxima

              reserva

            </span>

          </div>

        </Card>

      </div>

    </div>

  );

}

// ─── SETTINGS SCREEN ──────────────────────────────────────────────────────────

function SettingsScreen({ onClose, onClaim, onSupport }) {

  const [expandedTOS, setTOS] = useState(false);

  const [expandedPriv, setPriv] = useState(false);

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.surface,

        display: "flex",

        flexDirection: "column",

      }}

    >

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 14px",

          flexShrink: 0,

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>

            Configuración

          </div>

        </div>

      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>

        {/* App info */}

        <Card style={{ marginBottom: 14 }}>

          <div

            style={{

              display: "flex",

              alignItems: "center",

              gap: 14,

              padding: "6px 0",

            }}

          >

            <ParkealoPinLogo size={40} variant="blue" />

            <div>

              <div style={{ fontWeight: 900, fontSize: 15, color: T.text }}>

                Parkealo

              </div>

              <div style={{ fontSize: 12, color: T.textSub }}>

                Versión 1.0.0 (Build 100)

              </div>

              <div style={{ fontSize: 11, color: T.textFaint }}>

                © 2026 Parkealo SRL · Santo Domingo, RD

              </div>

            </div>

          </div>

        </Card>

        {/* Legal */}

        <Card style={{ marginBottom: 14 }}>

          <SectionLabel>Legal</SectionLabel>

          {/* Terms */}

          <div>

            <div

              onClick={() => setTOS((v) => !v)}

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                padding: "11px 0",

                cursor: "pointer",

                borderBottom: expandedTOS ? "none" : `1px solid ${T.border}`,

              }}

            >

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <span style={{ fontSize: 18 }}>📄</span>

                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>

                  Términos y condiciones

                </span>

              </div>

              <svg

                width="12"

                height="12"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2.5"

                strokeLinecap="round"

                style={{

                  transform: expandedTOS ? "rotate(90deg)" : "none",

                  transition: "transform 0.2s",

                }}

              >

                <polyline points="9 18 15 12 9 6" />

              </svg>

            </div>

            {expandedTOS && (

              <div

                style={{

                  background: T.surface,

                  borderRadius: 10,

                  padding: "12px 14px",

                  marginBottom: 10,

                  fontSize: 12,

                  color: T.textMid,

                  lineHeight: 1.8,

                }}

              >

                <div

                  style={{ fontWeight: 800, marginBottom: 6, color: T.text }}

                >

                  Términos de uso — Parkealo

                </div>

                Al usar Parkealo aceptas que: (1) Eres responsable del vehículo

                y sus documentos. (2) Parkealo actúa como intermediario entre el

                usuario y el host. (3) Las reservas confirmadas generan un cobro

                inmediato. (4) Los reembolsos están sujetos a revisión según la

                política de disputas. (5) Parkealo no se responsabiliza por

                daños no cubiertos por el seguro contratado. (6) El

                incumplimiento de las normas puede resultar en la suspensión de

                la cuenta.

              </div>

            )}

          </div>

          {/* Privacy */}

          <div>

            <div

              onClick={() => setPriv((v) => !v)}

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                padding: "11px 0",

                cursor: "pointer",

              }}

            >

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <span style={{ fontSize: 18 }}>🔒</span>

                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>

                  Política de privacidad

                </span>

              </div>

              <svg

                width="12"

                height="12"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2.5"

                strokeLinecap="round"

                style={{

                  transform: expandedPriv ? "rotate(90deg)" : "none",

                  transition: "transform 0.2s",

                }}

              >

                <polyline points="9 18 15 12 9 6" />

              </svg>

            </div>

            {expandedPriv && (

              <div

                style={{

                  background: T.surface,

                  borderRadius: 10,

                  padding: "12px 14px",

                  fontSize: 12,

                  color: T.textMid,

                  lineHeight: 1.8,

                }}

              >

                <div

                  style={{ fontWeight: 800, marginBottom: 6, color: T.text }}

                >

                  Privacidad de datos

                </div>

                Parkealo recopila: nombre, email, placa del vehículo, ubicación

                (solo durante reservas activas) e historial de transacciones.

                Estos datos se usan exclusivamente para: procesar reservas,

                mejorar el servicio y cumplir requerimientos legales. Nunca

                vendemos tu información. Puedes solicitar la eliminación de tus

                datos enviando un correo a privacidad@parkealo.com.

              </div>

            )}

          </div>

        </Card>

        {/* Support options */}

        <Card style={{ marginBottom: 14 }}>

          <SectionLabel>Ayuda y soporte</SectionLabel>

          {[

            {

              icon: "🎧",

              label: "Chat de soporte",

              sub: "Respuesta en ~5 min",

              action: onSupport,

            },

            {

              icon: "📋",

              label: "Hacer una reclamación",

              sub: "Reembolsos y disputas",

              action: onClaim,

            },

            {

              icon: "📧",

              label: "Enviar email",

              sub: "soporte@parkealo.com",

              action: null,

            },

            {

              icon: "📞",

              label: "Llamar al soporte",

              sub: "+1 (809) 000-0000",

              action: null,

            },

            {

              icon: "❓",

              label: "Preguntas frecuentes",

              sub: "Centro de ayuda",

              action: null,

            },

          ].map((item, i) => (

            <div

              key={i}

              onClick={item.action || undefined}

              style={{

                display: "flex",

                alignItems: "center",

                gap: 12,

                padding: "11px 0",

                borderBottom: i < 4 ? `1px solid ${T.border}` : "none",

                cursor: item.action ? "pointer" : "default",

              }}

            >

              <div

                style={{

                  width: 38,

                  height: 38,

                  borderRadius: 12,

                  background: T.surface2,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  fontSize: 20,

                  flexShrink: 0,

                }}

              >

                {item.icon}

              </div>

              <div style={{ flex: 1 }}>

                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>

                  {item.label}

                </div>

                <div style={{ fontSize: 11, color: T.textSub }}>{item.sub}</div>

              </div>

              <svg

                width="12"

                height="12"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="9 18 15 12 9 6" />

              </svg>

            </div>

          ))}

        </Card>

        {/* Danger zone */}

        <Card>

          <SectionLabel>Cuenta</SectionLabel>

          {[

            { icon: "🗑️", label: "Eliminar mi cuenta", color: T.danger },

            { icon: "📤", label: "Exportar mis datos", color: T.blue },

          ].map((item, i) => (

            <div

              key={i}

              style={{

                display: "flex",

                alignItems: "center",

                gap: 12,

                padding: "11px 0",

                borderBottom: i === 0 ? `1px solid ${T.border}` : "none",

                cursor: "pointer",

              }}

            >

              <span style={{ fontSize: 18 }}>{item.icon}</span>

              <span

                style={{

                  flex: 1,

                  fontSize: 14,

                  fontWeight: 600,

                  color: item.color,

                }}

              >

                {item.label}

              </span>

              <svg

                width="12"

                height="12"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="9 18 15 12 9 6" />

              </svg>

            </div>

          ))}

        </Card>

      </div>

    </div>

  );

}

// ─── VEHICLE FORM ─────────────────────────────────────────────────────────────

const Field = ({ label, children, note }) => (

  <div style={{ marginBottom: 14 }}>

    <div

      style={{

        fontSize: 11,

        fontWeight: 700,

        color: T.textSub,

        marginBottom: 5,

      }}

    >

      {label}

    </div>

    {children}

    {note && (

      <div style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}>

        {note}

      </div>

    )}

  </div>

);

function VehicleForm({ onClose, onSave, existing }) {

  const MAKES = [

    "Toyota",

    "Honda",

    "Hyundai",

    "Kia",

    "Nissan",

    "Chevrolet",

    "Ford",

    "Volkswagen",

    "BMW",

    "Mercedes-Benz",

    "Audi",

    "Jeep",

    "Mitsubishi",

    "Mazda",

    "Suzuki",

    "Otro",

  ];

  const COLORS = [

    "Blanco",

    "Negro",

    "Gris",

    "Plata",

    "Rojo",

    "Azul",

    "Verde",

    "Amarillo",

    "Naranja",

    "Marrón",

    "Beige",

    "Otro",

  ];

  const TYPES = [

    { key: "sedan", label: "Sedán", icon: "🚗" },

    { key: "suv", label: "SUV / 4x4", icon: "🚙" },

    { key: "pickup", label: "Pickup", icon: "🛻" },

    { key: "coupe", label: "Coupé", icon: "🚘" },

    { key: "van", label: "Minivan / Van", icon: "🚐" },

    { key: "moto", label: "Motocicleta", icon: "🏍️" },

  ];

  const [plate, setPlate] = useState(existing?.plate || "");

  const [make, setMake] = useState(existing?.make || "");

  const [model, setModel] = useState(existing?.model || "");

  const [year, setYear] = useState(existing?.year || "");

  const [color, setColor] = useState(existing?.color || "");

  const [type, setType] = useState(existing?.type || "sedan");

  const [notes, setNotes] = useState(existing?.notes || "");

  const canSave = plate.trim() && make && type;

  const handleSave = () => {

    if (!canSave) return;

    onSave({

      plate: plate.trim().toUpperCase(),

      make,

      model,

      year,

      color,

      type,

      notes,

    });

  };

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      {/* Header */}

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 14px",

          flexShrink: 0,

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div>

            <div style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>

              {existing ? "Editar vehículo" : "Agregar vehículo"}

            </div>

            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>

              Información del vehículo

            </div>

          </div>

        </div>

      </div>

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "20px 16px",

          background: T.surface,

        }}

      >

        {/* Type selector */}

        <Field label="TIPO DE VEHÍCULO *">

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

            {TYPES.map((t) => (

              <button

                key={t.key}

                onClick={() => setType(t.key)}

                style={{

                  flex: "1 1 28%",

                  padding: "10px 6px",

                  borderRadius: 12,

                  border: `2px solid ${type === t.key ? T.blue : T.border}`,

                  background: type === t.key ? T.blueLt : T.bg,

                  cursor: "pointer",

                  fontFamily: font,

                  textAlign: "center",

                }}

              >

                <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>

                <div

                  style={{

                    fontSize: 10,

                    fontWeight: 700,

                    color: type === t.key ? T.blue : T.textSub,

                  }}

                >

                  {t.label}

                </div>

              </button>

            ))}

          </div>

        </Field>

        {/* Plate */}

        <Field label="PLACA *" note="Formato dominicano: A123456 o AB1234">

          <div

            style={{

              display: "flex",

              alignItems: "center",

              background: T.bg,

              border: `1.5px solid ${plate ? T.blue : T.borderMd}`,

              borderRadius: 10,

              overflow: "hidden",

            }}

          >

            <div

              style={{

                padding: "0 12px",

                borderRight: `1px solid ${T.border}`,

              }}

            >

              <svg

                width="16"

                height="16"

                viewBox="0 0 24 24"

                fill="none"

                stroke={plate ? T.blue : T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <rect x="1" y="3" width="22" height="18" rx="2" />

                <line x1="1" y1="9" x2="23" y2="9" />

                <path d="M7 15h2m4 0h4" />

              </svg>

            </div>

            <input

              value={plate}

              onChange={(e) =>

                setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))

              }

              placeholder="Ej: A123456"

              autoComplete="off"

              maxLength={8}

              style={{

                flex: 1,

                padding: "12px 12px",

                border: "none",

                outline: "none",

                fontSize: 16,

                fontFamily: font,

                color: T.text,

                background: "transparent",

                fontWeight: 800,

                letterSpacing: 2,

              }}

            />

          </div>

        </Field>

        {/* Make */}

        <Field label="MARCA *">

          <div style={{ position: "relative" }}>

            <select

              value={make}

              onChange={(e) => setMake(e.target.value)}

              style={{

                width: "100%",

                background: T.bg,

                border: `1.5px solid ${make ? T.blue : T.borderMd}`,

                borderRadius: 10,

                padding: "12px 40px 12px 14px",

                fontSize: 14,

                fontFamily: font,

                color: make ? T.text : T.textFaint,

                outline: "none",

                appearance: "none",

                cursor: "pointer",

                fontWeight: make ? 600 : 400,

              }}

            >

              <option value="">Selecciona la marca…</option>

              {MAKES.map((m) => (

                <option key={m} value={m}>

                  {m}

                </option>

              ))}

            </select>

            <svg

              style={{

                position: "absolute",

                right: 14,

                top: "50%",

                transform: "translateY(-50%)",

                pointerEvents: "none",

              }}

              width="13"

              height="13"

              viewBox="0 0 24 24"

              fill="none"

              stroke={T.blue}

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="6 9 12 15 18 9" />

            </svg>

          </div>

        </Field>

        {/* Model */}

        <Field label="MODELO">

          <input

            value={model}

            onChange={(e) => setModel(e.target.value)}

            placeholder="Ej: Corolla, Civic, Tucson…"

            autoComplete="off"

            style={{

              width: "100%",

              background: T.bg,

              border: `1.5px solid ${T.borderMd}`,

              borderRadius: 10,

              padding: "12px 14px",

              fontSize: 14,

              fontFamily: font,

              outline: "none",

              color: T.text,

              boxSizing: "border-box",

            }}

          />

        </Field>

        {/* Year + Color side by side */}

        <div style={{ display: "flex", gap: 12 }}>

          <Field label="AÑO">

            <input

              value={year}

              onChange={(e) =>

                setYear(e.target.value.replace(/\D/, "").slice(0, 4))

              }

              placeholder="Ej: 2022"

              inputMode="numeric"

              maxLength={4}

              autoComplete="off"

              style={{

                width: "100%",

                background: T.bg,

                border: `1.5px solid ${T.borderMd}`,

                borderRadius: 10,

                padding: "12px 14px",

                fontSize: 14,

                fontFamily: font,

                outline: "none",

                color: T.text,

                boxSizing: "border-box",

              }}

            />

          </Field>

          <Field label="COLOR">

            <div style={{ position: "relative" }}>

              <select

                value={color}

                onChange={(e) => setColor(e.target.value)}

                style={{

                  width: "100%",

                  background: T.bg,

                  border: `1.5px solid ${color ? T.blue : T.borderMd}`,

                  borderRadius: 10,

                  padding: "12px 32px 12px 14px",

                  fontSize: 14,

                  fontFamily: font,

                  color: color ? T.text : T.textFaint,

                  outline: "none",

                  appearance: "none",

                  cursor: "pointer",

                }}

              >

                <option value="">Color…</option>

                {COLORS.map((c) => (

                  <option key={c} value={c}>

                    {c}

                  </option>

                ))}

              </select>

              <svg

                style={{

                  position: "absolute",

                  right: 10,

                  top: "50%",

                  transform: "translateY(-50%)",

                  pointerEvents: "none",

                }}

                width="12"

                height="12"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.blue}

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="6 9 12 15 18 9" />

              </svg>

            </div>

          </Field>

        </div>

        {/* Notes */}

        <Field

          label="NOTAS (opcional)"

          note="Características especiales, observaciones para el host"

        >

          <textarea

            value={notes}

            onChange={(e) => setNotes(e.target.value)}

            placeholder="Ej: Tiene calcomanía en el parabrisas, asientos de cuero…"

            rows={2}

            style={{

              width: "100%",

              background: T.bg,

              border: `1.5px solid ${T.borderMd}`,

              borderRadius: 10,

              padding: "11px 14px",

              fontSize: 13,

              fontFamily: font,

              outline: "none",

              color: T.text,

              boxSizing: "border-box",

              resize: "none",

              lineHeight: 1.5,

            }}

          />

        </Field>

        {/* Preview card */}

        {(plate || make) && (

          <div

            style={{

              background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

              borderRadius: 16,

              padding: "16px 18px",

              marginTop: 4,

              position: "relative",

              overflow: "hidden",

            }}

          >

            <div

              style={{

                position: "absolute",

                top: -14,

                right: -14,

                width: 80,

                height: 80,

                borderRadius: "50%",

                background: "rgba(255,255,255,0.06)",

              }}

            />

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

              <span style={{ fontSize: 32 }}>

                {TYPES.find((t) => t.key === type)?.icon || "🚗"}

              </span>

              <div>

                <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>

                  {make || "—"} {model}

                </div>

                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>

                  {year && `${year} · `}

                  {color}

                </div>

                <div

                  style={{

                    fontFamily: "monospace",

                    fontSize: 15,

                    fontWeight: 900,

                    color: "#fff",

                    letterSpacing: 2,

                    marginTop: 4,

                  }}

                >

                  {plate || "SIN PLACA"}

                </div>

              </div>

            </div>

          </div>

        )}

      </div>

      {/* Save button */}

      <div

        style={{

          padding: "12px 16px 28px",

          background: T.bg,

          borderTop: `1px solid ${T.border}`,

          flexShrink: 0,

        }}

      >

        <button

          onClick={handleSave}

          disabled={!canSave}

          style={{

            width: "100%",

            background: canSave

              ? `linear-gradient(135deg,${T.green},${T.greenDk})`

              : "transparent",

            border: canSave ? "none" : `1.5px solid ${T.border}`,

            borderRadius: 14,

            padding: "14px 0",

            color: canSave ? "#fff" : T.textFaint,

            fontFamily: font,

            fontWeight: 800,

            fontSize: 15,

            cursor: canSave ? "pointer" : "default",

            boxShadow: canSave ? T.shadowMd : "none",

          }}

        >

          {existing ? "Guardar cambios" : "Agregar vehículo"}

        </button>

      </div>

    </div>

  );

}

function AccountScreen({ user, onLogout, lang = "es", setLang }) {

  const t = (k) => TRANSLATIONS[lang]?.[k] || TRANSLATIONS.es[k] || k;

  const [name, setName] = useState("Carlos Marte");

  const [phone, setPhone] = useState("+1 (809) 555-1234");

  const [placa, setPlaca] = useState("");

  const [editing, setEditing] = useState(false);

  const [tab, setTab] = useState("profile");

  const [showSupport, setSupport] = useState(false);

  const [showClaim, setClaim] = useState(false);

  const [showReferral, setReferral] = useState(false);

  const [showSettings, setSettings] = useState(false);

  const [showAddVehicle, setAddVehicle] = useState(false);

  const [editVehicle, setEditVehicle] = useState(null); // vehicle id being edited

  const [vehicles, setVehicles] = useState([

    {

      id: 1,

      plate: "A123456",

      make: "Toyota",

      model: "Corolla",

      year: "2020",

      color: "Blanco",

      type: "sedan",

    },

  ]);

  const CARDS = [

    {

      id: 1,

      type: "VISA",

      last4: "4242",

      exp: "12/26",

      color: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

    },

    {

      id: 2,

      type: "MASTER",

      last4: "8881",

      exp: "08/25",

      color: `linear-gradient(135deg,#1a1a2e,#16213e)`,

    },

  ];

  return (

    <div

      style={{

        height: "100%",

        overflowY: "auto",

        background: T.surface,

        paddingBottom: 80,

      }}

    >

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "20px 16px 0",

          position: "relative",

          overflow: "hidden",

        }}

      >

        {[24, 36, 20, 42, 28, 18, 48].map((h, i) => (

          <div

            key={i}

            style={{

              position: "absolute",

              bottom: 0,

              left: `${i * 15}%`,

              width: 18,

              height: h,

              background: "rgba(255,255,255,0.04)",

              borderRadius: "3px 3px 0 0",

            }}

          />

        ))}

        <div

          style={{

            position: "relative",

            display: "flex",

            alignItems: "center",

            gap: 14,

            marginBottom: 16,

          }}

        >

          <div

            style={{

              width: 56,

              height: 56,

              borderRadius: "50%",

              background: `linear-gradient(135deg,${T.green},${T.greenAcct})`,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              border: "3px solid rgba(255,255,255,0.3)",

              flexShrink: 0,

            }}

          >

            <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>

              {name.charAt(0)}

            </span>

          </div>

          <div>

            <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>

              {name}

            </div>

            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>

              {phone}

            </div>

          </div>

          <button

            onClick={() => setEditing(!editing)}

            style={{

              marginLeft: "auto",

              background: "rgba(255,255,255,0.14)",

              border: "none",

              borderRadius: 10,

              padding: "6px 12px",

              color: "#fff",

              fontSize: 12,

              fontWeight: 700,

              cursor: "pointer",

              fontFamily: font,

            }}

          >

            {editing ? "Listo" : "Editar"}

          </button>

        </div>

        <div style={{ display: "flex" }}>

          {[

            ["profile", "Perfil"],

            ["vehicles", "Vehículos"],

            ["payments", "Pagos"],

          ].map(([t, l]) => (

            <button

              key={t}

              onClick={() => setTab(t)}

              style={{

                flex: 1,

                background: "none",

                border: "none",

                padding: "9px 0",

                fontSize: 13,

                fontWeight: 700,

                color: tab === t ? "#fff" : "rgba(255,255,255,0.45)",

                cursor: "pointer",

                fontFamily: font,

                borderBottom: `2.5px solid ${

                  tab === t ? T.greenAcct : "transparent"

                }`,

              }}

            >

              {l}

            </button>

          ))}

        </div>

        <div

          style={{

            height: 3,

            background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

          }}

        />

      </div>

      <div style={{ padding: "16px 14px" }}>

        {tab === "profile" && (

          <Card>

            <SectionLabel>Información personal</SectionLabel>

            {[

              { l: "Nombre completo", v: name, set: setName, ph: "Tu nombre" },

              {

                l: "Teléfono",

                v: phone,

                set: setPhone,

                ph: "+1 (809) 000-0000",

              },

            ].map((f) => (

              <div key={f.l} style={{ marginBottom: 14 }}>

                <div

                  style={{

                    fontSize: 12,

                    fontWeight: 700,

                    color: T.textSub,

                    marginBottom: 5,

                  }}

                >

                  {f.l}

                </div>

                {editing ? (

                  <input

                    value={f.v}

                    onChange={(e) => f.set(e.target.value)}

                    placeholder={f.ph}

                    style={{

                      width: "100%",

                      background: T.surface,

                      border: `1.5px solid ${T.borderMd}`,

                      borderRadius: 10,

                      padding: "10px 12px",

                      fontSize: 14,

                      fontFamily: font,

                      outline: "none",

                      boxSizing: "border-box",

                      color: T.text,

                    }}

                  />

                ) : (

                  <div

                    style={{

                      padding: "10px 12px",

                      background: T.surface,

                      borderRadius: 10,

                      fontSize: 14,

                      color: T.text,

                      fontWeight: 600,

                    }}

                  >

                    {f.v}

                  </div>

                )}

              </div>

            ))}

            {/* Placa del vehículo */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 12,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 5,

                }}

              >

                Placa del vehículo

              </div>

              {editing ? (

                <div

                  style={{

                    display: "flex",

                    alignItems: "center",

                    background: T.surface,

                    border: `1.5px solid ${T.blue}`,

                    borderRadius: 10,

                    overflow: "hidden",

                  }}

                >

                  <div

                    style={{

                      padding: "0 12px",

                      borderRight: `1px solid ${T.border}`,

                    }}

                  >

                    <svg

                      width="16"

                      height="16"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={T.blue}

                      strokeWidth="2"

                      strokeLinecap="round"

                    >

                      <rect x="1" y="3" width="22" height="18" rx="2" />

                      <line x1="1" y1="9" x2="23" y2="9" />

                      <path d="M7 15h2m4 0h4" />

                    </svg>

                  </div>

                  <input

                    value={placa}

                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}

                    placeholder="Ej: A123456"

                    autoComplete="off"

                    style={{

                      flex: 1,

                      padding: "11px 12px",

                      border: "none",

                      outline: "none",

                      fontSize: 14,

                      fontFamily: font,

                      color: T.text,

                      background: "transparent",

                      fontWeight: 700,

                      letterSpacing: 1,

                    }}

                  />

                  {placa && (

                    <button

                      onClick={() => setPlaca("")}

                      style={{

                        padding: "0 12px",

                        background: "none",

                        border: "none",

                        cursor: "pointer",

                        color: T.textFaint,

                        fontSize: 16,

                        lineHeight: 1,

                      }}

                    >

                      ✕

                    </button>

                  )}

                </div>

              ) : (

                <div

                  style={{

                    padding: "11px 12px",

                    background: T.surface,

                    border: `1.5px solid ${placa ? T.blueMid : T.border}`,

                    borderRadius: 10,

                    display: "flex",

                    alignItems: "center",

                    gap: 10,

                  }}

                >

                  <svg

                    width="16"

                    height="16"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={placa ? T.blue : T.textFaint}

                    strokeWidth="2"

                    strokeLinecap="round"

                  >

                    <rect x="1" y="3" width="22" height="18" rx="2" />

                    <line x1="1" y1="9" x2="23" y2="9" />

                    <path d="M7 15h2m4 0h4" />

                  </svg>

                  <span

                    style={{

                      fontSize: 14,

                      fontWeight: placa ? 700 : 400,

                      color: placa ? T.text : T.textFaint,

                      letterSpacing: placa ? 1 : 0,

                    }}

                  >

                    {placa || "Sin placa registrada"}

                  </span>

                  {placa && (

                    <Tag

                      color={T.blue}

                      bg={T.blueLt}

                      border={T.blueMid}

                      style={{ marginLeft: "auto" }}

                    >

                      Registrada

                    </Tag>

                  )}

                </div>

              )}

              <div style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>

                Se usará automáticamente al reservar para otro vehículo

              </div>

            </div>

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 12,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 5,

                }}

              >

                Correo electrónico

              </div>

              <div

                style={{

                  padding: "10px 12px",

                  background: T.surface,

                  borderRadius: 10,

                  fontSize: 14,

                  color: T.textSub,

                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                }}

              >

                <span>carlos@email.com</span>

                <Tag color={T.green} bg={T.greenLt} border={T.greenMid}>

                  Verificado

                </Tag>

              </div>

            </div>

            <Divider />

            {/* Overlays */}

            {showSupport && (

              <SupportChatScreen onClose={() => setSupport(false)} />

            )}

            {showClaim && <ClaimForm onClose={() => setClaim(false)} />}

            {showReferral && (

              <ReferralScreen onClose={() => setReferral(false)} />

            )}

            {showSettings && (

              <SettingsScreen

                onClose={() => setSettings(false)}

                onClaim={() => {

                  setSettings(false);

                  setClaim(true);

                }}

                onSupport={() => {

                  setSettings(false);

                  setSupport(true);

                }}

              />

            )}

            {[

              {

                l: "Referir amigos",

                icon: "🎁",

                action: () => setReferral(true),

              },

              {

                l: "Configuración",

                icon: "⚙️",

                action: () => setSettings(true),

              },

              { l: "Notificaciones", icon: "🔔", action: null },

            ].map((item) => (

              <div

                key={item.l}

                onClick={item.action || undefined}

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  padding: "11px 0",

                  borderBottom: `1px solid ${T.border}`,

                  cursor: item.action ? "pointer" : "default",

                }}

              >

                <span style={{ fontSize: 16 }}>{item.icon}</span>

                <span

                  style={{

                    flex: 1,

                    fontSize: 14,

                    fontWeight: 600,

                    color: T.text,

                  }}

                >

                  {item.l}

                </span>

                <svg

                  width="14"

                  height="14"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke={T.textFaint}

                  strokeWidth="2"

                  strokeLinecap="round"

                >

                  <polyline points="9 18 15 12 9 6" />

                </svg>

              </div>

            ))}

            <Divider />

            <button

              onClick={onLogout}

              style={{

                width: "100%",

                padding: "12px 0",

                borderRadius: 12,

                border: `1.5px solid ${T.dangerBd}`,

                background: T.dangerBg,

                color: T.danger,

                fontSize: 14,

                fontWeight: 700,

                cursor: "pointer",

                fontFamily: font,

              }}

            >

              Cerrar sesión

            </button>

          </Card>

        )}

        {/* ── Vehículos ── */}

        {showAddVehicle && (

          <VehicleForm

            onClose={() => {

              setAddVehicle(false);

              setEditVehicle(null);

            }}

            onSave={(v) => {

              if (editVehicle) {

                setVehicles((prev) =>

                  prev.map((x) =>

                    x.id === editVehicle ? { ...v, id: editVehicle } : x

                  )

                );

              } else {

                setVehicles((prev) => [...prev, { ...v, id: Date.now() }]);

              }

              setAddVehicle(false);

              setEditVehicle(null);

            }}

            existing={

              editVehicle ? vehicles.find((v) => v.id === editVehicle) : null

            }

          />

        )}

        {tab === "vehicles" && (

          <div>

            {vehicles.length === 0 ? (

              <div style={{ textAlign: "center", padding: "40px 20px" }}>

                <div style={{ fontSize: 52, marginBottom: 16 }}>🚗</div>

                <div

                  style={{

                    fontWeight: 800,

                    color: T.text,

                    fontSize: 16,

                    marginBottom: 8,

                  }}

                >

                  Sin vehículos registrados

                </div>

                <div

                  style={{ color: T.textSub, fontSize: 13, marginBottom: 20 }}

                >

                  Agrega tu vehículo para agilizar tus reservas.

                </div>

              </div>

            ) : (

              vehicles.map((v) => (

                <div

                  key={v.id}

                  style={{

                    background: T.bg,

                    borderRadius: 16,

                    marginBottom: 12,

                    border: `1px solid ${T.border}`,

                    overflow: "hidden",

                    boxShadow: T.shadowSm,

                  }}

                >

                  {/* Color strip */}

                  <div

                    style={{

                      height: 4,

                      background: `linear-gradient(90deg,${T.blue},${T.blueSky})`,

                    }}

                  />

                  <div style={{ padding: "14px 16px" }}>

                    <div

                      style={{ display: "flex", alignItems: "center", gap: 12 }}

                    >

                      <div

                        style={{

                          width: 48,

                          height: 48,

                          borderRadius: 14,

                          background: T.blueLt,

                          border: `1.5px solid ${T.blueMid}`,

                          display: "flex",

                          alignItems: "center",

                          justifyContent: "center",

                          fontSize: 26,

                          flexShrink: 0,

                        }}

                      >

                        {v.type === "suv"

                          ? "🚙"

                          : v.type === "pickup"

                          ? "🛻"

                          : v.type === "moto"

                          ? "🏍️"

                          : "🚗"}

                      </div>

                      <div style={{ flex: 1 }}>

                        <div

                          style={{

                            fontWeight: 900,

                            fontSize: 15,

                            color: T.text,

                          }}

                        >

                          {v.make} {v.model}

                        </div>

                        <div style={{ fontSize: 12, color: T.textSub }}>

                          {v.year} · {v.color}

                        </div>

                        <div

                          style={{

                            fontFamily: "monospace",

                            fontSize: 13,

                            fontWeight: 800,

                            color: T.blue,

                            marginTop: 2,

                            letterSpacing: 1,

                          }}

                        >

                          {v.plate}

                        </div>

                      </div>

                      <div

                        style={{

                          display: "flex",

                          flexDirection: "column",

                          gap: 6,

                        }}

                      >

                        <button

                          onClick={() => {

                            setEditVehicle(v.id);

                            setAddVehicle(true);

                          }}

                          style={{

                            background: T.blueLt,

                            border: `1px solid ${T.blueMid}`,

                            borderRadius: 8,

                            padding: "5px 10px",

                            color: T.blue,

                            fontSize: 11,

                            fontWeight: 700,

                            cursor: "pointer",

                            fontFamily: font,

                          }}

                        >

                          ✏️ Editar

                        </button>

                        <button

                          onClick={() =>

                            setVehicles((prev) =>

                              prev.filter((x) => x.id !== v.id)

                            )

                          }

                          style={{

                            background: T.dangerBg,

                            border: `1px solid ${T.dangerBd}`,

                            borderRadius: 8,

                            padding: "5px 10px",

                            color: T.danger,

                            fontSize: 11,

                            fontWeight: 700,

                            cursor: "pointer",

                            fontFamily: font,

                          }}

                        >

                          🗑️ Eliminar

                        </button>

                      </div>

                    </div>

                  </div>

                </div>

              ))

            )}

            <button

              onClick={() => setAddVehicle(true)}

              style={{

                width: "100%",

                background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                border: "none",

                borderRadius: 14,

                padding: "14px 0",

                color: "#fff",

                fontFamily: font,

                fontWeight: 800,

                fontSize: 14,

                cursor: "pointer",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                gap: 10,

                boxShadow: T.shadowMd,

              }}

            >

              <svg

                width="18"

                height="18"

                viewBox="0 0 24 24"

                fill="none"

                stroke="#fff"

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <line x1="12" y1="5" x2="12" y2="19" />

                <line x1="5" y1="12" x2="19" y2="12" />

              </svg>

              Agregar vehículo

            </button>

          </div>

        )}

        {tab === "payments" && (

          <>

            <SectionLabel>Métodos de pago guardados</SectionLabel>

            {CARDS.map((card) => (

              <div

                key={card.id}

                style={{

                  background: card.color,

                  borderRadius: 16,

                  padding: "18px 20px",

                  marginBottom: 12,

                  position: "relative",

                  overflow: "hidden",

                }}

              >

                <div

                  style={{

                    position: "absolute",

                    top: -20,

                    right: -20,

                    width: 100,

                    height: 100,

                    borderRadius: "50%",

                    background: "rgba(255,255,255,0.06)",

                  }}

                />

                <div

                  style={{

                    position: "absolute",

                    top: 12,

                    right: 14,

                    color: "rgba(255,255,255,0.6)",

                    fontSize: 11,

                    fontWeight: 800,

                  }}

                >

                  {card.type}

                </div>

                <div

                  style={{

                    color: "rgba(255,255,255,0.5)",

                    fontSize: 12,

                    marginBottom: 10,

                    letterSpacing: 2,

                  }}

                >

                  •••• •••• •••• {card.last4}

                </div>

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "flex-end",

                  }}

                >

                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>

                    {name.toUpperCase()}

                  </div>

                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>

                    Exp. {card.exp}

                  </div>

                </div>

              </div>

            ))}

            <div

              style={{

                background: T.bg,

                borderRadius: 16,

                border: `1.5px dashed ${T.borderMd}`,

                padding: "14px 16px",

                marginBottom: 20,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                gap: 8,

                cursor: "pointer",

              }}

            >

              <div

                style={{

                  width: 26,

                  height: 26,

                  borderRadius: "50%",

                  background: T.blueLt,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                }}

              >

                <svg

                  width="13"

                  height="13"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke={T.blue}

                  strokeWidth="2.5"

                  strokeLinecap="round"

                >

                  <line x1="12" y1="5" x2="12" y2="19" />

                  <line x1="5" y1="12" x2="19" y2="12" />

                </svg>

              </div>

              <span style={{ fontSize: 14, fontWeight: 700, color: T.blue }}>

                Agregar tarjeta

              </span>

            </div>

            <SectionLabel>Nueva tarjeta</SectionLabel>

            <Card>

              {[

                { l: "Número de tarjeta", p: "•••• •••• •••• ••••" },

                { l: "Nombre en la tarjeta", p: "NOMBRE APELLIDO" },

              ].map((f) => (

                <div key={f.l} style={{ marginBottom: 12 }}>

                  <div

                    style={{

                      color: T.textMid,

                      fontSize: 12,

                      fontWeight: 600,

                      marginBottom: 5,

                    }}

                  >

                    {f.l}

                  </div>

                  <input

                    placeholder={f.p}

                    style={{

                      width: "100%",

                      background: T.surface,

                      border: `1.5px solid ${T.border}`,

                      borderRadius: 10,

                      padding: "10px 12px",

                      color: T.text,

                      fontSize: 13,

                      fontFamily: font,

                      outline: "none",

                      boxSizing: "border-box",

                    }}

                  />

                </div>

              ))}

              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>

                {[

                  ["Expiración", "MM/AA"],

                  ["CVV", "•••"],

                ].map(([l, p]) => (

                  <div key={l} style={{ flex: 1 }}>

                    <div

                      style={{

                        color: T.textMid,

                        fontSize: 12,

                        fontWeight: 600,

                        marginBottom: 5,

                      }}

                    >

                      {l}

                    </div>

                    <input

                      placeholder={p}

                      style={{

                        width: "100%",

                        background: T.surface,

                        border: `1.5px solid ${T.border}`,

                        borderRadius: 10,

                        padding: "10px 12px",

                        color: T.text,

                        fontSize: 13,

                        fontFamily: font,

                        outline: "none",

                        boxSizing: "border-box",

                      }}

                    />

                  </div>

                ))}

              </div>

              <Btn variant="blue" full>

                Guardar tarjeta

              </Btn>

            </Card>

          </>

        )}

      </div>

    </div>

  );

}

// ─── PARKING SPACE MANAGER (tab "parqueo") ────────────────────────────────────

function ParkingSpaceManager({ unitPricing }) {

  // Each section has: id, name (editable), prefix (editable), count, spaces[]

  const [sections, setSections] = useState([

    {

      id: 1,

      name: "Planta Baja",

      prefix: "A",

      count: 10,

      spaces: Array.from({ length: 10 }, (_, i) => ({

        id: `A${i + 1}`,

        label: `A${i + 1}`,

        status: [0, 3, 6].includes(i) ? "occupied" : "free",

        price: "",

      })),

    },

    {

      id: 2,

      name: "Nivel 1",

      prefix: "B",

      count: 8,

      spaces: Array.from({ length: 8 }, (_, i) => ({

        id: `B${i + 1}`,

        label: `B${i + 1}`,

        status: [1, 4].includes(i) ? "occupied" : "free",

        price: "",

      })),

    },

  ]);

  const [editingSection, setEditingSection] = useState(null); // section id being configured

  const [showAddSection, setShowAddSection] = useState(false);

  const [newSection, setNewSection] = useState({

    name: "",

    prefix: "",

    count: "10",

  });

  // Regenerate spaces when prefix/count changes

  const rebuildSpaces = (prefix, count, oldSpaces = []) => {

    return Array.from({ length: count }, (_, i) => {

      const label = `${prefix}${i + 1}`;

      const old = oldSpaces[i];

      return {

        id: label,

        label,

        status: old?.status || "free",

        price: old?.price || "",

      };

    });

  };

  const updateSection = (id, changes) => {

    setSections((prev) =>

      prev.map((s) => {

        if (s.id !== id) return s;

        const updated = { ...s, ...changes };

        // Rebuild spaces if prefix or count changed

        if (changes.prefix !== undefined || changes.count !== undefined) {

          updated.spaces = rebuildSpaces(

            changes.prefix ?? s.prefix,

            changes.count ?? s.count,

            s.spaces

          );

        }

        return updated;

      })

    );

  };

  const toggleStatus = (secId, spaceId) => {

    setSections((prev) =>

      prev.map((s) => {

        if (s.id !== secId) return s;

        return {

          ...s,

          spaces: s.spaces.map((sp) =>

            sp.id === spaceId

              ? {

                  ...sp,

                  status: sp.status === "occupied" ? "free" : "occupied",

                }

              : sp

          ),

        };

      })

    );

  };

  const updateSpaceLabel = (secId, spaceId, newLabel) => {

    setSections((prev) =>

      prev.map((s) => {

        if (s.id !== secId) return s;

        return {

          ...s,

          spaces: s.spaces.map((sp) =>

            sp.id === spaceId ? { ...sp, label: newLabel } : sp

          ),

        };

      })

    );

  };

  const addSection = () => {

    if (!newSection.name || !newSection.prefix) return;

    const count = parseInt(newSection.count) || 10;

    setSections((prev) => [

      ...prev,

      {

        id: Date.now(),

        name: newSection.name,

        prefix: newSection.prefix.toUpperCase(),

        count,

        spaces: rebuildSpaces(newSection.prefix.toUpperCase(), count),

      },

    ]);

    setNewSection({ name: "", prefix: "", count: "10" });

    setShowAddSection(false);

  };

  const statusColor = (st) => (st === "occupied" ? T.danger : T.green);

  const statusBg = (st) => (st === "occupied" ? T.dangerBg : T.greenLt);

  const statusBd = (st) => (st === "occupied" ? T.dangerBd : T.greenMid);

  const statusLabel = (st) => (st === "occupied" ? "Ocupado" : "Libre");

  return (

    <div>

      {sections.map((sec) => {

        const freeCount = sec.spaces.filter(

          (sp) => sp.status === "free"

        ).length;

        const occCount = sec.spaces.length - freeCount;

        const isEditing = editingSection === sec.id;

        return (

          <Card key={sec.id} style={{ marginBottom: 14 }}>

            {/* Section header */}

            <div

              style={{

                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                marginBottom: 12,

              }}

            >

              <div style={{ flex: 1 }}>

                <input

                  value={sec.name}

                  onChange={(e) =>

                    updateSection(sec.id, { name: e.target.value })

                  }

                  style={{

                    background: "transparent",

                    border: "none",

                    color: T.text,

                    fontSize: 15,

                    fontWeight: 900,

                    fontFamily: font,

                    outline: "none",

                    borderBottom: `1.5px dashed ${T.border}`,

                    width: "100%",

                    maxWidth: 160,

                  }}

                />

                <div style={{ fontSize: 11, color: T.textSub, marginTop: 3 }}>

                  <span style={{ color: T.green, fontWeight: 700 }}>

                    {freeCount} libres

                  </span>

                  {" · "}

                  <span style={{ color: T.danger, fontWeight: 700 }}>

                    {occCount} ocupados

                  </span>

                  {" · "}

                  {sec.spaces.length} total

                </div>

              </div>

              <button

                onClick={() => setEditingSection(isEditing ? null : sec.id)}

                style={{

                  background: isEditing ? T.blueLt : T.surface2,

                  border: `1.5px solid ${isEditing ? T.blue : T.border}`,

                  borderRadius: 20,

                  padding: "5px 12px",

                  fontSize: 11,

                  fontWeight: 700,

                  color: isEditing ? T.blue : T.textSub,

                  cursor: "pointer",

                  fontFamily: font,

                }}

              >

                {isEditing ? "✓ Listo" : "⚙ Config"}

              </button>

            </div>

            {/* Config panel */}

            {isEditing && (

              <div

                style={{

                  background: T.surface,

                  borderRadius: 12,

                  padding: "12px 14px",

                  marginBottom: 14,

                  border: `1.5px solid ${T.blueMid}`,

                }}

              >

                <div

                  style={{

                    fontSize: 11,

                    fontWeight: 800,

                    color: T.blue,

                    letterSpacing: 1,

                    marginBottom: 10,

                  }}

                >

                  CONFIGURAR SECCIÓN

                </div>

                <div

                  style={{

                    display: "grid",

                    gridTemplateColumns: "1fr 1fr",

                    gap: 10,

                    marginBottom: 10,

                  }}

                >

                  <div>

                    <div

                      style={{

                        fontSize: 11,

                        fontWeight: 700,

                        color: T.textSub,

                        marginBottom: 4,

                      }}

                    >

                      Prefijo de espacios

                    </div>

                    <input

                      value={sec.prefix}

                      maxLength={3}

                      onChange={(e) =>

                        updateSection(sec.id, {

                          prefix: e.target.value.toUpperCase(),

                        })

                      }

                      placeholder="Ej: A, B, VIP"

                      style={{

                        width: "100%",

                        background: T.bg,

                        border: `1.5px solid ${T.border}`,

                        borderRadius: 8,

                        padding: "8px 10px",

                        fontSize: 14,

                        fontWeight: 800,

                        fontFamily: font,

                        color: T.blue,

                        outline: "none",

                        boxSizing: "border-box",

                        textAlign: "center",

                      }}

                    />

                    <div

                      style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}

                    >

                      → Los espacios serán {sec.prefix}1, {sec.prefix}2...

                    </div>

                  </div>

                  <div>

                    <div

                      style={{

                        fontSize: 11,

                        fontWeight: 700,

                        color: T.textSub,

                        marginBottom: 4,

                      }}

                    >

                      Cantidad de espacios

                    </div>

                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>

                      {[5, 10, 15, 20, 25, 30].map((n) => (

                        <button

                          key={n}

                          onClick={() => updateSection(sec.id, { count: n })}

                          style={{

                            flex: "1 0 30%",

                            padding: "7px 4px",

                            borderRadius: 8,

                            border: `1.5px solid ${

                              sec.count === n ? T.blue : T.border

                            }`,

                            background: sec.count === n ? T.blueLt : T.bg,

                            color: sec.count === n ? T.blue : T.textMid,

                            fontSize: 12,

                            fontWeight: 700,

                            cursor: "pointer",

                            fontFamily: font,

                          }}

                        >

                          {n}

                        </button>

                      ))}

                    </div>

                  </div>

                </div>

                <div

                  style={{

                    fontSize: 11,

                    color: T.textSub,

                    background: T.blueLt,

                    borderRadius: 8,

                    padding: "7px 10px",

                  }}

                >

                  💡 Toca cualquier espacio en el mapa de abajo para cambiar su

                  identificador o estado

                </div>

              </div>

            )}

            {/* Space map grid */}

            <div

              style={{

                display: "grid",

                gridTemplateColumns: "repeat(5,1fr)",

                gap: 6,

              }}

            >

              {sec.spaces.map((sp) => (

                <div key={sp.id} style={{ position: "relative" }}>

                  {isEditing ? (

                    // Editable label input

                    <div

                      style={{

                        background: statusBg(sp.status),

                        border: `1.5px solid ${statusBd(sp.status)}`,

                        borderRadius: 10,

                        padding: "6px 4px",

                        textAlign: "center",

                      }}

                    >

                      <input

                        value={sp.label}

                        onChange={(e) =>

                          updateSpaceLabel(

                            sec.id,

                            sp.id,

                            e.target.value.toUpperCase()

                          )

                        }

                        style={{

                          background: "transparent",

                          border: "none",

                          outline: "none",

                          fontFamily: font,

                          fontWeight: 800,

                          fontSize: 12,

                          color: statusColor(sp.status),

                          textAlign: "center",

                          width: "100%",

                        }}

                      />

                      <button

                        onClick={() => toggleStatus(sec.id, sp.id)}

                        style={{

                          background: "none",

                          border: "none",

                          cursor: "pointer",

                          fontSize: 9,

                          color: statusColor(sp.status),

                          fontWeight: 700,

                          fontFamily: font,

                          lineHeight: 1.2,

                        }}

                      >

                        {statusLabel(sp.status)}

                      </button>

                    </div>

                  ) : (

                    // Read-only space card (tap to toggle status for demo)

                    <button

                      onClick={() => toggleStatus(sec.id, sp.id)}

                      style={{

                        width: "100%",

                        background: statusBg(sp.status),

                        border: `1.5px solid ${statusBd(sp.status)}`,

                        borderRadius: 10,

                        padding: "8px 4px",

                        cursor: "pointer",

                        textAlign: "center",

                        fontFamily: font,

                      }}

                    >

                      <div

                        style={{

                          fontSize: 12,

                          fontWeight: 900,

                          color: statusColor(sp.status),

                        }}

                      >

                        {sp.label}

                      </div>

                      <div

                        style={{

                          fontSize: 9,

                          color: statusColor(sp.status),

                          fontWeight: 600,

                          marginTop: 2,

                          opacity: 0.8,

                        }}

                      >

                        {sp.status === "occupied" ? "🚗" : "✓"}

                      </div>

                    </button>

                  )}

                </div>

              ))}

            </div>

            {/* Legend */}

            <div style={{ display: "flex", gap: 14, marginTop: 10 }}>

              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>

                <div

                  style={{

                    width: 10,

                    height: 10,

                    borderRadius: 3,

                    background: T.greenLt,

                    border: `1px solid ${T.greenMid}`,

                  }}

                />

                <span

                  style={{ fontSize: 10, color: T.textSub, fontWeight: 600 }}

                >

                  Libre

                </span>

              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>

                <div

                  style={{

                    width: 10,

                    height: 10,

                    borderRadius: 3,

                    background: T.dangerBg,

                    border: `1px solid ${T.dangerBd}`,

                  }}

                />

                <span

                  style={{ fontSize: 10, color: T.textSub, fontWeight: 600 }}

                >

                  Ocupado

                </span>

              </div>

              {!isEditing && (

                <span

                  style={{

                    fontSize: 10,

                    color: T.textFaint,

                    marginLeft: "auto",

                  }}

                >

                  Toca para cambiar estado

                </span>

              )}

            </div>

          </Card>

        );

      })}

      {/* Add new section */}

      {showAddSection ? (

        <Card

          style={{ border: `1.5px dashed ${T.blue}`, background: T.blueLt }}

        >

          <div

            style={{

              fontSize: 13,

              fontWeight: 800,

              color: T.blue,

              marginBottom: 12,

            }}

          >

            Nueva sección de parqueo

          </div>

          <div style={{ marginBottom: 10 }}>

            <div

              style={{

                fontSize: 11,

                fontWeight: 700,

                color: T.textSub,

                marginBottom: 4,

              }}

            >

              Nombre de la sección

            </div>

            <input

              value={newSection.name}

              onChange={(e) =>

                setNewSection((s) => ({ ...s, name: e.target.value }))

              }

              placeholder="Ej: Planta Baja, VIP, Techo"

              style={{

                width: "100%",

                background: T.bg,

                border: `1.5px solid ${T.border}`,

                borderRadius: 8,

                padding: "9px 12px",

                fontSize: 13,

                fontFamily: font,

                outline: "none",

                boxSizing: "border-box",

              }}

            />

          </div>

          <div

            style={{

              display: "grid",

              gridTemplateColumns: "1fr 1fr",

              gap: 10,

              marginBottom: 14,

            }}

          >

            <div>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 4,

                }}

              >

                Prefijo (letras/número)

              </div>

              <input

                value={newSection.prefix}

                onChange={(e) =>

                  setNewSection((s) => ({

                    ...s,

                    prefix: e.target.value.toUpperCase(),

                  }))

                }

                maxLength={3}

                placeholder="A, VIP, T1…"

                style={{

                  width: "100%",

                  background: T.bg,

                  border: `1.5px solid ${T.border}`,

                  borderRadius: 8,

                  padding: "9px 12px",

                  fontSize: 14,

                  fontWeight: 800,

                  color: T.blue,

                  fontFamily: font,

                  outline: "none",

                  boxSizing: "border-box",

                  textAlign: "center",

                }}

              />

            </div>

            <div>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 4,

                }}

              >

                Cantidad

              </div>

              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>

                {[5, 10, 15, 20].map((n) => (

                  <button

                    key={n}

                    onClick={() =>

                      setNewSection((s) => ({ ...s, count: String(n) }))

                    }

                    style={{

                      flex: 1,

                      padding: "9px 4px",

                      borderRadius: 8,

                      border: `1.5px solid ${

                        newSection.count === String(n) ? T.blue : T.border

                      }`,

                      background:

                        newSection.count === String(n) ? T.blueLt : T.bg,

                      color:

                        newSection.count === String(n) ? T.blue : T.textMid,

                      fontSize: 12,

                      fontWeight: 700,

                      cursor: "pointer",

                      fontFamily: font,

                    }}

                  >

                    {n}

                  </button>

                ))}

              </div>

            </div>

          </div>

          {newSection.prefix && (

            <div

              style={{

                fontSize: 11,

                color: T.blue,

                background: "rgba(26,86,196,0.08)",

                borderRadius: 8,

                padding: "6px 10px",

                marginBottom: 12,

              }}

            >

              Vista previa: {newSection.prefix}1, {newSection.prefix}2 ...{" "}

              {newSection.prefix}

              {newSection.count || 10}

            </div>

          )}

          <div style={{ display: "flex", gap: 8 }}>

            <Btn

              onClick={() => setShowAddSection(false)}

              variant="secondary"

              style={{ flex: 1 }}

            >

              Cancelar

            </Btn>

            <Btn

              onClick={addSection}

              variant="blue"

              style={{ flex: 1 }}

              disabled={!newSection.name || !newSection.prefix}

            >

              Crear sección

            </Btn>

          </div>

        </Card>

      ) : (

        <button

          onClick={() => setShowAddSection(true)}

          style={{

            width: "100%",

            background: "none",

            border: `1.5px dashed ${T.border}`,

            borderRadius: 14,

            padding: "13px 0",

            color: T.blue,

            fontSize: 13,

            fontWeight: 700,

            cursor: "pointer",

            fontFamily: font,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            gap: 8,

          }}

        >

          <svg

            width="16"

            height="16"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.blue}

            strokeWidth="2.5"

            strokeLinecap="round"

          >

            <line x1="12" y1="5" x2="12" y2="19" />

            <line x1="5" y1="12" x2="19" y2="12" />

          </svg>

          Agregar sección de parqueo

        </button>

      )}

    </div>

  );

}

// ─── AMENITIES EDITOR ─────────────────────────────────────────────────────────

function AmenitiesEditor() {

  const ALL_AMENITIES = [

    {

      key: "covered",

      label: "Techado",

      icon: "🏠",

      desc: "Área cubierta / techo",

    },

    { key: "ev", label: "Carga EV", icon: "⚡", desc: "Cargadores eléctricos" },

    { key: "cameras", label: "Cámaras", icon: "📹", desc: "Vigilancia 24h" },

    { key: "valet", label: "Valet", icon: "🤵", desc: "Servicio de valet" },

    { key: "h24", label: "24/7", icon: "🕐", desc: "Abierto las 24 horas" },

    {

      key: "access_control",

      label: "Ctrl. acceso",

      icon: "🔐",

      desc: "Acceso con tarjeta o PIN",

    },

    {

      key: "staff",

      label: "Personal",

      icon: "👤",

      desc: "Personal de seguridad",

    },

    {

      key: "private",

      label: "Privado",

      icon: "🏡",

      desc: "Espacio privado exclusivo",

    },

    { key: "wifi", label: "Wi-Fi", icon: "📶", desc: "Internet gratuito" },

    {

      key: "disabled",

      label: "Discapacitados",

      icon: "♿",

      desc: "Espacios accesibles",

    },

    {

      key: "motorcycle",

      label: "Motos",

      icon: "🏍️",

      desc: "Área para motocicletas",

    },

    {

      key: "restroom",

      label: "Baños",

      icon: "🚻",

      desc: "Servicios sanitarios",

    },

  ];

  const [active, setActive] = useState({

    covered: true,

    cameras: true,

    h24: true,

    access_control: true,

    staff: false,

    ev: false,

    valet: false,

    private: false,

    wifi: false,

    disabled: true,

    motorcycle: false,

    restroom: false,

  });

  const [saved, setSaved] = useState(false);

  const toggle = (key) => {

    setActive((a) => ({ ...a, [key]: !a[key] }));

    setSaved(false);

  };

  const activeCount = Object.values(active).filter(Boolean).length;

  return (

    <div>

      {/* Summary bar */}

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          borderRadius: 16,

          padding: "14px 16px",

          marginBottom: 16,

          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

        }}

      >

        <div>

          <div

            style={{

              color: "rgba(255,255,255,0.7)",

              fontSize: 11,

              fontWeight: 600,

            }}

          >

            Servicios activos

          </div>

          <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>

            {activeCount}{" "}

            <span style={{ fontSize: 13, fontWeight: 500 }}>

              de {ALL_AMENITIES.length}

            </span>

          </div>

        </div>

        <div

          style={{

            display: "flex",

            flexWrap: "wrap",

            gap: 4,

            maxWidth: 160,

            justifyContent: "flex-end",

          }}

        >

          {ALL_AMENITIES.filter((a) => active[a.key]).map((a) => (

            <span key={a.key} style={{ fontSize: 16 }}>

              {a.icon}

            </span>

          ))}

        </div>

      </div>

      {/* Amenity toggles */}

      <Card style={{ marginBottom: 14 }}>

        <SectionLabel>Servicios del parqueo</SectionLabel>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {ALL_AMENITIES.map((a, i) => (

            <div key={a.key}>

              {i > 0 && (

                <div

                  style={{ height: 1, background: T.border, margin: "0 0" }}

                />

              )}

              <div

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  padding: "12px 0",

                  cursor: "pointer",

                }}

                onClick={() => toggle(a.key)}

              >

                {/* Icon badge */}

                <div

                  style={{

                    width: 40,

                    height: 40,

                    borderRadius: 12,

                    background: active[a.key] ? T.greenLt : T.surface2,

                    border: `1.5px solid ${

                      active[a.key] ? T.greenMid : T.border

                    }`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    fontSize: 20,

                    flexShrink: 0,

                    transition: "all 0.2s",

                  }}

                >

                  {a.icon}

                </div>

                <div style={{ flex: 1, minWidth: 0 }}>

                  <div

                    style={{

                      fontSize: 14,

                      fontWeight: 700,

                      color: active[a.key] ? T.text : T.textSub,

                    }}

                  >

                    {a.label}

                  </div>

                  <div style={{ fontSize: 11, color: T.textFaint }}>

                    {a.desc}

                  </div>

                </div>

                {/* iOS-style toggle */}

                <div

                  onClick={(e) => {

                    e.stopPropagation();

                    toggle(a.key);

                  }}

                  style={{

                    width: 44,

                    height: 26,

                    borderRadius: 13,

                    background: active[a.key] ? T.green : T.surface2,

                    border: `1.5px solid ${

                      active[a.key] ? T.green : T.borderMd

                    }`,

                    position: "relative",

                    cursor: "pointer",

                    flexShrink: 0,

                    transition: "background 0.2s",

                  }}

                >

                  <div

                    style={{

                      position: "absolute",

                      top: 2,

                      left: active[a.key] ? 20 : 2,

                      width: 19,

                      height: 19,

                      borderRadius: "50%",

                      background: "#fff",

                      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",

                      transition: "left 0.2s",

                    }}

                  />

                </div>

              </div>

            </div>

          ))}

        </div>

      </Card>

      {/* Save button */}

      {saved ? (

        <div

          style={{

            background: T.greenLt,

            border: `1.5px solid ${T.greenMid}`,

            borderRadius: 14,

            padding: "13px 0",

            textAlign: "center",

            marginBottom: 8,

          }}

        >

          <span style={{ color: T.green, fontWeight: 800, fontSize: 14 }}>

            ✓ Cambios guardados

          </span>

        </div>

      ) : (

        <Btn

          onClick={() => setSaved(true)}

          variant="green"

          full

          style={{ padding: "14px 0", fontSize: 15, borderRadius: 14 }}

        >

          Guardar servicios

        </Btn>

      )}

    </div>

  );

}

// ─── PRICING EDITOR ───────────────────────────────────────────────────────────

function PricingEditor({ dynamic, setDynamic }) {

  // Initial sections mirror ParkingSpaceManager sections

  const [sections, setSections] = useState([

    {

      id: 1,

      name: "Planta Baja",

      prefix: "A",

      hora: "150",

      dia: "800",

      semana: "4500",

      active: true,

    },

    {

      id: 2,

      name: "Nivel 1",

      prefix: "B",

      hora: "120",

      dia: "650",

      semana: "3800",

      active: true,

    },

  ]);

  const [priceMode, setPriceMode] = useState("seccion"); // "global" | "seccion"

  const [globalPrices, setGlobalPrices] = useState({

    hora: "150",

    dia: "800",

    semana: "4500",

  });

  const [saved, setSaved] = useState(false);

  const updateSection = (id, field, val) => {

    setSections((prev) =>

      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))

    );

    setSaved(false);

  };

  return (

    <div>

      {/* Mode selector */}

      <Card style={{ marginBottom: 14 }}>

        <SectionLabel>Modo de precios</SectionLabel>

        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>

          {[

            ["global", "Global (todo igual)"],

            ["seccion", "Por sección"],

          ].map(([k, l]) => (

            <button

              key={k}

              onClick={() => {

                setPriceMode(k);

                setSaved(false);

              }}

              style={{

                flex: 1,

                padding: "10px 8px",

                borderRadius: 12,

                border: `2px solid ${priceMode === k ? T.blue : T.border}`,

                background: priceMode === k ? T.blueLt : T.bg,

                color: priceMode === k ? T.blue : T.textSub,

                fontSize: 12,

                fontWeight: 700,

                cursor: "pointer",

                fontFamily: font,

                textAlign: "center",

              }}

            >

              {priceMode === k && "✓ "}

              {l}

            </button>

          ))}

        </div>

        <Divider />

        <Toggle

          on={dynamic}

          onToggle={() => {

            setDynamic(!dynamic);

            setSaved(false);

          }}

          label="Precio dinámico"

          sub="Sube automáticamente cuando ocupación supera 80%."

        />

        {dynamic && (

          <div

            style={{

              background: T.warnBg,

              border: `1px solid ${T.warnBd}`,

              borderRadius: 10,

              padding: "8px 12px",

              marginTop: 8,

            }}

          >

            <div style={{ fontSize: 11, color: T.warn, fontWeight: 700 }}>

              ⚡ Activo — Se aplica un 20% extra en hora pico

            </div>

          </div>

        )}

      </Card>

      {/* Global pricing */}

      {priceMode === "global" && (

        <Card style={{ marginBottom: 14 }}>

          <SectionLabel>Tarifas globales</SectionLabel>

          <div style={{ fontSize: 11, color: T.textSub, marginBottom: 14 }}>

            Se aplica igual a todas las secciones del parqueo.

          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>

            <PriceInput

              label="POR HORA"

              value={globalPrices.hora}

              onChange={(v) => setGlobalPrices((p) => ({ ...p, hora: v }))}

              accent={T.blue}

            />

            <PriceInput

              label="POR DÍA"

              value={globalPrices.dia}

              onChange={(v) => setGlobalPrices((p) => ({ ...p, dia: v }))}

              accent={T.green}

            />

            <PriceInput

              label="POR SEMANA"

              value={globalPrices.semana}

              onChange={(v) => setGlobalPrices((p) => ({ ...p, semana: v }))}

              accent={T.blueNav}

            />

          </div>

          {/* Preview card */}

          <div

            style={{

              background: T.surface,

              borderRadius: 12,

              padding: "10px 14px",

            }}

          >

            <div

              style={{

                fontSize: 11,

                fontWeight: 700,

                color: T.textSub,

                marginBottom: 8,

              }}

            >

              Vista previa de tarifas

            </div>

            {[

              ["1 hora", `RD$${globalPrices.hora}`],

              ["1 día completo", `RD$${globalPrices.dia}`],

              ["1 semana", `RD$${globalPrices.semana}`],

            ].map(([l, v]) => (

              <div

                key={l}

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  fontSize: 13,

                  marginBottom: 6,

                }}

              >

                <span style={{ color: T.textSub }}>{l}</span>

                <span style={{ fontWeight: 800, color: T.text }}>{v}</span>

              </div>

            ))}

          </div>

        </Card>

      )}

      {/* Per-section pricing */}

      {priceMode === "seccion" &&

        sections.map((sec) => (

          <Card key={sec.id} style={{ marginBottom: 14 }}>

            {/* Section header */}

            <div

              style={{

                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                marginBottom: 12,

              }}

            >

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <div

                  style={{

                    width: 36,

                    height: 36,

                    borderRadius: 10,

                    background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <span

                    style={{ color: "#fff", fontWeight: 900, fontSize: 14 }}

                  >

                    {sec.prefix}

                  </span>

                </div>

                <div>

                  <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>

                    {sec.name}

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>

                    Sección {sec.prefix}1 – {sec.prefix}10

                  </div>

                </div>

              </div>

              {/* Active toggle per section */}

              <div

                onClick={() => updateSection(sec.id, "active", !sec.active)}

                style={{

                  width: 40,

                  height: 23,

                  borderRadius: 12,

                  background: sec.active ? T.green : T.surface2,

                  border: `1.5px solid ${sec.active ? T.green : T.borderMd}`,

                  position: "relative",

                  cursor: "pointer",

                  flexShrink: 0,

                  transition: "background 0.2s",

                }}

              >

                <div

                  style={{

                    position: "absolute",

                    top: 1.5,

                    left: sec.active ? 18 : 1.5,

                    width: 17,

                    height: 17,

                    borderRadius: "50%",

                    background: "#fff",

                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",

                    transition: "left 0.2s",

                  }}

                />

              </div>

            </div>

            {sec.active ? (

              <>

                {/* 3 price inputs */}

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>

                  <PriceInput

                    label="POR HORA"

                    value={sec.hora}

                    onChange={(v) => updateSection(sec.id, "hora", v)}

                    accent={T.blue}

                  />

                  <PriceInput

                    label="POR DÍA"

                    value={sec.dia}

                    onChange={(v) => updateSection(sec.id, "dia", v)}

                    accent={T.green}

                  />

                  <PriceInput

                    label="POR SEMANA"

                    value={sec.semana}

                    onChange={(v) => updateSection(sec.id, "semana", v)}

                    accent={T.blueNav}

                  />

                </div>

                {/* Mini preview */}

                <div

                  style={{

                    background: T.surface,

                    borderRadius: 10,

                    padding: "8px 12px",

                    display: "flex",

                    gap: 10,

                  }}

                >

                  {[

                    ["1h", sec.hora, "hora"],

                    ["Día", sec.dia, "dia"],

                    ["Semana", sec.semana, "semana"],

                  ].map(([label, val]) => (

                    <div key={label} style={{ flex: 1, textAlign: "center" }}>

                      <div

                        style={{

                          fontSize: 10,

                          color: T.textFaint,

                          marginBottom: 2,

                        }}

                      >

                        {label}

                      </div>

                      <div

                        style={{ fontSize: 13, fontWeight: 900, color: T.text }}

                      >

                        RD${val || "—"}

                      </div>

                    </div>

                  ))}

                </div>

              </>

            ) : (

              <div

                style={{

                  padding: "10px 0",

                  textAlign: "center",

                  color: T.textFaint,

                  fontSize: 13,

                }}

              >

                Sección desactivada — no se mostrará en la app

              </div>

            )}

          </Card>

        ))}

      {/* Overtime settings */}

      <Card style={{ marginBottom: 14 }}>

        <SectionLabel>Sobretiempo</SectionLabel>

        <div style={{ fontSize: 12, color: T.textSub, marginBottom: 12 }}>

          Cargo adicional cuando el usuario supera el tiempo reservado.

        </div>

        <div style={{ display: "flex", gap: 8 }}>

          <div style={{ flex: 1 }}>

            <div

              style={{

                fontSize: 10,

                fontWeight: 700,

                color: T.textFaint,

                marginBottom: 4,

              }}

            >

              MULTIPLICADOR

            </div>

            <div style={{ display: "flex", gap: 6 }}>

              {["1.0×", "1.5×", "2.0×", "2.5×"].map((m, i) => (

                <button

                  key={m}

                  onClick={() => setSaved(false)}

                  style={{

                    flex: 1,

                    padding: "8px 4px",

                    borderRadius: 8,

                    border: `1.5px solid ${i === 1 ? T.warn : T.border}`,

                    background: i === 1 ? T.warnBg : T.bg,

                    color: i === 1 ? T.warn : T.textSub,

                    fontSize: 12,

                    fontWeight: i === 1 ? 800 : 500,

                    cursor: "pointer",

                    fontFamily: font,

                  }}

                >

                  {m}

                </button>

              ))}

            </div>

          </div>

        </div>

        <div

          style={{

            marginTop: 10,

            background: T.warnBg,

            borderRadius: 10,

            padding: "8px 12px",

            fontSize: 11,

            color: T.warn,

            fontWeight: 600,

          }}

        >

          ⏱ Ej: si reservó 2h a RD$150/h y se pasó 30min → cobro extra:

          RD$112.50

        </div>

      </Card>

      {/* Save */}

      {saved ? (

        <div

          style={{

            background: T.greenLt,

            border: `1.5px solid ${T.greenMid}`,

            borderRadius: 14,

            padding: "13px 0",

            textAlign: "center",

          }}

        >

          <span style={{ color: T.green, fontWeight: 800, fontSize: 14 }}>

            ✓ Precios guardados correctamente

          </span>

        </div>

      ) : (

        <Btn

          onClick={() => setSaved(true)}

          variant="green"

          full

          style={{ padding: "14px 0", fontSize: 15, borderRadius: 14 }}

        >

          Guardar precios

        </Btn>

      )}

    </div>

  );

}

function HostChatScreen({ onClose }) {

  // List of user conversations

  const [activeConv, setActiveConv] = useState(null);

  const CONVS = [

    {

      id: 1,

      user: "Carlos M.",

      plate: "A123456",

      lastMsg: "¿Puedo llegar 10 min antes?",

      time: "10:12 AM",

      unread: 1,

      reservation: "Hoy · A3 · 10:30",

    },

    {

      id: 2,

      user: "María G.",

      plate: "B789012",

      lastMsg: "Gracias por la confirmación",

      time: "9:45 AM",

      unread: 0,

      reservation: "Mañana · B1 · 09:00",

    },

    {

      id: 3,

      user: "Juan R.",

      plate: "C234567",

      lastMsg: "¿Tienen cargador EV disponible?",

      time: "Ayer",

      unread: 2,

      reservation: "Ayer · A7 · 14:00",

    },

  ];

  const [convMessages, setConvMessages] = useState({

    1: [

      {

        id: 1,

        from: "user",

        text: "¿Puedo llegar 10 min antes?",

        time: "10:12 AM",

      },

    ],

    2: [

      {

        id: 1,

        from: "host",

        text: "Tu reserva está confirmada. Espacio B1.",

        time: "9:40 AM",

      },

      {

        id: 2,

        from: "user",

        text: "Gracias por la confirmación",

        time: "9:45 AM",

      },

    ],

    3: [

      {

        id: 1,

        from: "user",

        text: "¿Tienen cargador EV disponible?",

        time: "Ayer",

      },

    ],

  });

  const [input, setInput] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [convMessages, activeConv]);

  const sendHost = () => {

    const t = input.trim();

    if (!t || !activeConv) return;

    const now = new Date();

    const time = now.toLocaleTimeString("es-DO", {

      hour: "2-digit",

      minute: "2-digit",

    });

    setConvMessages((prev) => ({

      ...prev,

      [activeConv.id]: [

        ...(prev[activeConv.id] || []),

        { id: Date.now(), from: "host", text: t, time },

      ],

    }));

    setInput("");

  };

  if (activeConv) {

    const msgs = convMessages[activeConv.id] || [];

    return (

      <div

        style={{

          position: "absolute",

          inset: 0,

          zIndex: 600,

          background: T.bg,

          display: "flex",

          flexDirection: "column",

        }}

      >

        <div

          style={{

            background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

            padding: "16px 16px 14px",

            flexShrink: 0,

          }}

        >

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

            <button

              onClick={() => setActiveConv(null)}

              style={{

                background: "rgba(255,255,255,0.15)",

                border: "none",

                borderRadius: "50%",

                width: 34,

                height: 34,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                cursor: "pointer",

              }}

            >

              <svg

                width="16"

                height="16"

                viewBox="0 0 24 24"

                fill="none"

                stroke="#fff"

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="15 18 9 12 15 6" />

              </svg>

            </button>

            <div

              style={{

                width: 38,

                height: 38,

                borderRadius: "50%",

                background: "rgba(255,255,255,0.2)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

              }}

            >

              <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>

                {activeConv.user[0]}

              </span>

            </div>

            <div>

              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>

                {activeConv.user}

              </div>

              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>

                {activeConv.reservation} · {activeConv.plate}

              </div>

            </div>

          </div>

        </div>

        <div

          style={{

            flex: 1,

            overflowY: "auto",

            padding: "14px",

            background: T.surface,

            display: "flex",

            flexDirection: "column",

            gap: 10,

          }}

        >

          {msgs.map((msg) => {

            const isHost = msg.from === "host";

            return (

              <div

                key={msg.id}

                style={{

                  display: "flex",

                  justifyContent: isHost ? "flex-end" : "flex-start",

                }}

              >

                <div style={{ maxWidth: "72%" }}>

                  <div

                    style={{

                      background: isHost ? T.blue : T.bg,

                      borderRadius: isHost

                        ? "18px 18px 4px 18px"

                        : "18px 18px 18px 4px",

                      padding: "10px 14px",

                      boxShadow: T.shadowSm,

                    }}

                  >

                    <div

                      style={{ fontSize: 13, color: isHost ? "#fff" : T.text }}

                    >

                      {msg.text}

                    </div>

                  </div>

                  <div

                    style={{

                      fontSize: 10,

                      color: T.textFaint,

                      marginTop: 3,

                      textAlign: isHost ? "right" : "left",

                    }}

                  >

                    {msg.time}

                  </div>

                </div>

              </div>

            );

          })}

          <div ref={bottomRef} />

        </div>

        <div

          style={{

            padding: "10px 12px 24px",

            background: T.bg,

            borderTop: `1px solid ${T.border}`,

            display: "flex",

            gap: 10,

            alignItems: "center",

          }}

        >

          <input

            value={input}

            onChange={(e) => setInput(e.target.value)}

            onKeyDown={(e) => {

              if (e.key === "Enter") sendHost();

            }}

            placeholder="Responder…"

            style={{

              flex: 1,

              background: T.surface,

              border: `1.5px solid ${T.border}`,

              borderRadius: 22,

              padding: "11px 16px",

              fontSize: 14,

              fontFamily: font,

              outline: "none",

              color: T.text,

            }}

          />

          <button

            onClick={sendHost}

            style={{

              width: 42,

              height: 42,

              borderRadius: "50%",

              background: input.trim() ? T.blue : T.surface2,

              border: "none",

              cursor: "pointer",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

            }}

          >

            <svg

              width="17"

              height="17"

              viewBox="0 0 24 24"

              fill="none"

              stroke={input.trim() ? "#fff" : T.textFaint}

              strokeWidth="2.5"

              strokeLinecap="round"

              strokeLinejoin="round"

            >

              <line x1="22" y1="2" x2="11" y2="13" />

              <polygon points="22 2 15 22 11 13 2 9 22 2" />

            </svg>

          </button>

        </div>

      </div>

    );

  }

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 14px",

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>

            Mensajes de usuarios

          </div>

        </div>

      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>

        {CONVS.map((c) => (

          <div

            key={c.id}

            onClick={() => setActiveConv(c)}

            style={{

              display: "flex",

              alignItems: "center",

              gap: 12,

              padding: "14px 16px",

              borderBottom: `1px solid ${T.border}`,

              cursor: "pointer",

              background: T.bg,

            }}

          >

            <div

              style={{

                width: 44,

                height: 44,

                borderRadius: "50%",

                background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                flexShrink: 0,

                position: "relative",

              }}

            >

              <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>

                {c.user[0]}

              </span>

              {c.unread > 0 && (

                <div

                  style={{

                    position: "absolute",

                    top: 0,

                    right: 0,

                    width: 18,

                    height: 18,

                    borderRadius: "50%",

                    background: T.danger,

                    border: "2px solid #fff",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>

                    {c.unread}

                  </span>

                </div>

              )}

            </div>

            <div style={{ flex: 1, minWidth: 0 }}>

              <div style={{ display: "flex", justifyContent: "space-between" }}>

                <span style={{ fontWeight: 800, fontSize: 14, color: T.text }}>

                  {c.user}

                </span>

                <span style={{ fontSize: 11, color: T.textFaint }}>

                  {c.time}

                </span>

              </div>

              <div

                style={{

                  fontSize: 12,

                  color: T.textSub,

                  overflow: "hidden",

                  textOverflow: "ellipsis",

                  whiteSpace: "nowrap",

                }}

              >

                {c.plate} · {c.reservation}

              </div>

              <div

                style={{

                  fontSize: 12,

                  color: c.unread > 0 ? T.text : T.textFaint,

                  fontWeight: c.unread > 0 ? 700 : 400,

                  overflow: "hidden",

                  textOverflow: "ellipsis",

                  whiteSpace: "nowrap",

                }}

              >

                {c.lastMsg}

              </div>

            </div>

            <svg

              width="12"

              height="12"

              viewBox="0 0 24 24"

              fill="none"

              stroke={T.textFaint}

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="9 18 15 12 9 6" />

            </svg>

          </div>

        ))}

      </div>

    </div>

  );

}

function OwnerDashboard() {

  const [tab, setTab] = useState("dashboard");

  const [dynamic, setDynamic] = useState(true);

  const [autoMode, setAutoMode] = useState(true);

  const [showHostChat, setHostChat] = useState(false);

  const [showAddParking, setAddParking] = useState(false);

  const [showEarnings, setEarnings] = useState(false);

  const [showParkingQR, setParkingQR] = useState(false);

  const [publishedParking, setPublished] = useState(false); // starts empty

  const notifs = [

    {

      msg: "Usuario A123456 terminó su tiempo en espacio B1",

      t: "hace 5 min",

      acc: T.warn,

    },

    {

      msg: "Nueva solicitud privada — placa C789012",

      t: "hace 18 min",

      acc: T.blue,

    },

    {

      msg: "Sobretiempo detectado — A2 (+12 min)",

      t: "hace 32 min",

      acc: T.danger,

    },

    {

      msg: "Reserva confirmada — D901234 · mañana 09:00",

      t: "hace 1h",

      acc: T.green,

    },

  ];

  return (

    <div

      style={{

        height: "100%",

        overflowY: "auto",

        background: T.surface,

        paddingBottom: 80,

        position: "relative",

      }}

    >

      {showHostChat && <HostChatScreen onClose={() => setHostChat(false)} />}

      {showAddParking && (

        <AddParkingForm

          onClose={() => setAddParking(false)}

          onPublish={() => {

            setPublished(true);

            setAddParking(false);

          }}

        />

      )}

      {showEarnings && <EarningsScreen onClose={() => setEarnings(false)} />}

      {showParkingQR && (

        <ParkingQRModal

          parking={{ id: "COL001", name: "Parqueo Colonial Premium" }}

          onClose={() => setParkingQR(false)}

        />

      )}

      {!publishedParking ? (

        /* ── EMPTY STATE ── */

        <div

          style={{

            flex: 1,

            display: "flex",

            flexDirection: "column",

            alignItems: "center",

            justifyContent: "center",

            padding: "40px 28px",

            textAlign: "center",

          }}

        >

          <div

            style={{

              width: 100,

              height: 100,

              borderRadius: 28,

              background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              marginBottom: 24,

              boxShadow: T.shadowLg,

            }}

          >

            <ParkealoPinLogo size={50} variant="white" />

          </div>

          <div

            style={{

              fontWeight: 900,

              fontSize: 22,

              color: T.text,

              marginBottom: 8,

            }}

          >

            Bienvenido a Parkealo

          </div>

          <div

            style={{

              fontSize: 14,

              color: T.textSub,

              lineHeight: 1.7,

              marginBottom: 32,

            }}

          >

            Publica tu primer parqueo y empieza a recibir reservas hoy mismo. El

            proceso toma menos de 5 minutos.

          </div>

          <button

            onClick={() => setAddParking(true)}

            style={{

              width: "100%",

              background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

              border: "none",

              borderRadius: 18,

              padding: "18px 24px",

              display: "flex",

              alignItems: "center",

              gap: 16,

              cursor: "pointer",

              boxShadow: T.shadowLg,

              marginBottom: 16,

            }}

          >

            <div

              style={{

                width: 52,

                height: 52,

                borderRadius: 16,

                background: "rgba(255,255,255,0.22)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                flexShrink: 0,

              }}

            >

              <svg

                width="26"

                height="26"

                viewBox="0 0 24 24"

                fill="none"

                stroke="#fff"

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <line x1="12" y1="5" x2="12" y2="19" />

                <line x1="5" y1="12" x2="19" y2="12" />

              </svg>

            </div>

            <div style={{ textAlign: "left", flex: 1 }}>

              <div style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>

                Agregar mi parqueo

              </div>

              <div

                style={{

                  color: "rgba(255,255,255,0.7)",

                  fontSize: 12,

                  marginTop: 2,

                }}

              >

                Publica espacios y empieza a ganar

              </div>

            </div>

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="rgba(255,255,255,0.7)"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="9 18 15 12 9 6" />

            </svg>

          </button>

          <div style={{ display: "flex", gap: 16, width: "100%" }}>

            {[

              ["🅿️", "Hasta 30 espacios por sección"],

              ["⚡", "Confirmación automática"],

              ["💳", "Retiros en 24h"],

            ].map(([icon, txt]) => (

              <div

                key={txt}

                style={{

                  flex: 1,

                  background: T.surface,

                  borderRadius: 14,

                  padding: "12px 8px",

                  textAlign: "center",

                }}

              >

                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>

                <div

                  style={{

                    fontSize: 10,

                    fontWeight: 600,

                    color: T.textSub,

                    lineHeight: 1.4,

                  }}

                >

                  {txt}

                </div>

              </div>

            ))}

          </div>

        </div>

      ) : (

        <>

          <div

            style={{

              background: T.bg,

              padding: "0 16px 0",

              borderBottom: `1px solid ${T.border}`,

            }}

          >

            <div

              style={{

                height: 3,

                background: `linear-gradient(90deg,${T.blue},${T.green})`,

                marginBottom: 14,

              }}

            />

            <div

              style={{

                display: "flex",

                alignItems: "center",

                gap: 10,

                marginBottom: 14,

              }}

            >

              <div

                style={{

                  width: 44,

                  height: 44,

                  borderRadius: 12,

                  background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                }}

              >

                <ParkealoPinLogo size={24} variant="white" />

              </div>

              <div style={{ flex: 1 }}>

                <div style={{ fontWeight: 900, fontSize: 17, color: T.text }}>

                  Panel Host

                </div>

                <div style={{ color: T.textSub, fontSize: 12 }}>

                  Parqueo Colonial Premium

                </div>

              </div>

              <div style={{ display: "flex", gap: 8 }}>

                {/* QR button */}

                {publishedParking && (

                  <button

                    onClick={() => setParkingQR(true)}

                    style={{

                      background: T.greenLt,

                      border: `1.5px solid ${T.greenMid}`,

                      borderRadius: 12,

                      width: 40,

                      height: 40,

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      cursor: "pointer",

                    }}

                  >

                    <svg

                      width="18"

                      height="18"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={T.green}

                      strokeWidth="2"

                      strokeLinecap="round"

                    >

                      <rect x="3" y="3" width="7" height="7" rx="1" />

                      <rect x="14" y="3" width="7" height="7" rx="1" />

                      <rect x="3" y="14" width="7" height="7" rx="1" />

                      <path d="M14 14h2v2h-2z M18 14h2v2h-2z M14 18h2v2h-2z M18 18h2v2h-2z" />

                    </svg>

                  </button>

                )}

                {/* Chat button with unread badge */}

                <button

                  onClick={() => setHostChat(true)}

                  style={{

                    position: "relative",

                    background: T.blueLt,

                    border: `1.5px solid ${T.blueMid}`,

                    borderRadius: 12,

                    width: 40,

                    height: 40,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    cursor: "pointer",

                  }}

                >

                  <svg

                    width="18"

                    height="18"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={T.blue}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />

                  </svg>

                  <div

                    style={{

                      position: "absolute",

                      top: -4,

                      right: -4,

                      width: 16,

                      height: 16,

                      borderRadius: "50%",

                      background: T.danger,

                      border: "2px solid #fff",

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                    }}

                  >

                    <span

                      style={{ color: "#fff", fontSize: 8, fontWeight: 900 }}

                    >

                      3

                    </span>

                  </div>

                </button>

              </div>

            </div>

            <div

              style={{

                display: "flex",

                overflowX: "auto",

                scrollbarWidth: "none",

              }}

            >

              {[

                ["dashboard", "Panel"],

                ["parqueo", "Parqueo"],

                ["amenities", "Servicios"],

                ["pricing", "Precios"],

                ["notifications", "Alertas"],

              ].map(([t, l]) => (

                <button

                  key={t}

                  onClick={() => setTab(t)}

                  style={{

                    padding: "9px 14px",

                    border: "none",

                    background: "none",

                    fontFamily: font,

                    fontSize: 12,

                    fontWeight: 700,

                    color: tab === t ? T.blue : T.textFaint,

                    cursor: "pointer",

                    whiteSpace: "nowrap",

                    borderBottom: `2.5px solid ${

                      tab === t ? T.green : "transparent"

                    }`,

                    flexShrink: 0,

                  }}

                >

                  {l}

                </button>

              ))}

            </div>

          </div>

          <div style={{ padding: "16px 14px" }}>

            {/* ── Panel ── */}

            {tab === "dashboard" && (

              <>

                <div

                  style={{

                    display: "grid",

                    gridTemplateColumns: "1fr 1fr",

                    gap: 10,

                    marginBottom: 14,

                  }}

                >

                  {[

                    {

                      l: "Ingresos hoy",

                      v: "RD$4,200",

                      c: T.green,

                      bd: T.green,

                      click: true,

                    },

                    { l: "Ocupación", v: "8 / 12", c: T.blue, bd: T.blue },

                    { l: "Reservas hoy", v: "14", c: T.warn, bd: T.warn },

                    { l: "Rating", v: "4.87 ★", c: T.blueNav, bd: T.blueNav },

                  ].map((s) => (

                    <Card

                      key={s.l}

                      style={{

                        padding: 14,

                        borderTop: `3px solid ${s.bd}`,

                        cursor: s.click ? "pointer" : "default",

                        position: "relative",

                      }}

                      onClick={s.click ? () => setEarnings(true) : undefined}

                    >

                      <div

                        style={{

                          color: s.c,

                          fontSize: 22,

                          fontWeight: 900,

                          marginBottom: 4,

                        }}

                      >

                        {s.v}

                      </div>

                      <div style={{ color: T.textSub, fontSize: 11 }}>

                        {s.l}

                      </div>

                      {s.click && (

                        <div

                          style={{

                            position: "absolute",

                            top: 8,

                            right: 10,

                            fontSize: 12,

                          }}

                        >

                          💳

                        </div>

                      )}

                    </Card>

                  ))}

                </div>

                {/* Reservation mode toggle card */}

                <Card style={{ marginBottom: 14 }}>

                  <SectionLabel>Modo de reservación</SectionLabel>

                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>

                    <button

                      onClick={() => setAutoMode(true)}

                      style={{

                        flex: 1,

                        padding: "12px 8px",

                        borderRadius: 14,

                        border: `2px solid ${autoMode ? T.green : T.border}`,

                        background: autoMode ? T.greenLt : T.bg,

                        cursor: "pointer",

                        fontFamily: font,

                        textAlign: "center",

                      }}

                    >

                      <div style={{ fontSize: 22, marginBottom: 4 }}>⚡</div>

                      <div

                        style={{

                          fontSize: 13,

                          fontWeight: 800,

                          color: autoMode ? T.green : T.textSub,

                        }}

                      >

                        Automático

                      </div>

                      <div

                        style={{

                          fontSize: 10,

                          color: autoMode ? T.green : T.textFaint,

                          marginTop: 2,

                        }}

                      >

                        El usuario recibe PIN y confirmación al instante

                      </div>

                    </button>

                    <button

                      onClick={() => setAutoMode(false)}

                      style={{

                        flex: 1,

                        padding: "12px 8px",

                        borderRadius: 14,

                        border: `2px solid ${!autoMode ? T.warn : T.border}`,

                        background: !autoMode ? T.warnBg : T.bg,

                        cursor: "pointer",

                        fontFamily: font,

                        textAlign: "center",

                      }}

                    >

                      <div style={{ fontSize: 22, marginBottom: 4 }}>👋</div>

                      <div

                        style={{

                          fontSize: 13,

                          fontWeight: 800,

                          color: !autoMode ? T.warn : T.textSub,

                        }}

                      >

                        Manual

                      </div>

                      <div

                        style={{

                          fontSize: 10,

                          color: !autoMode ? T.warn : T.textFaint,

                          marginTop: 2,

                        }}

                      >

                        Tú apruebas cada reserva antes de confirmarla

                      </div>

                    </button>

                  </div>

                  <div

                    style={{

                      background: autoMode ? T.greenLt : T.warnBg,

                      border: `1px solid ${autoMode ? T.greenMid : T.warnBd}`,

                      borderRadius: 10,

                      padding: "8px 12px",

                      fontSize: 11,

                      color: autoMode ? T.green : T.warn,

                      fontWeight: 600,

                    }}

                  >

                    {autoMode

                      ? "⚡ Activo — Las reservas se confirman solas. El usuario recibe toda la info de inmediato."

                      : "👋 Activo — Cada reserva requiere tu aprobación. Recibirás una notificación para aprobar o rechazar."}

                  </div>

                </Card>

                {/* Add parking CTA */}

                <button

                  onClick={() => setAddParking(true)}

                  style={{

                    width: "100%",

                    background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                    border: "none",

                    borderRadius: 16,

                    padding: "16px 20px",

                    display: "flex",

                    alignItems: "center",

                    gap: 14,

                    cursor: "pointer",

                    marginBottom: 14,

                    boxShadow: T.shadowMd,

                  }}

                >

                  <div

                    style={{

                      width: 46,

                      height: 46,

                      borderRadius: 14,

                      background: "rgba(255,255,255,0.2)",

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      flexShrink: 0,

                    }}

                  >

                    <svg

                      width="22"

                      height="22"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke="#fff"

                      strokeWidth="2.5"

                      strokeLinecap="round"

                    >

                      <line x1="12" y1="5" x2="12" y2="19" />

                      <line x1="5" y1="12" x2="19" y2="12" />

                    </svg>

                  </div>

                  <div style={{ textAlign: "left", flex: 1 }}>

                    <div

                      style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}

                    >

                      Agregar parqueo

                    </div>

                    <div

                      style={{

                        color: "rgba(255,255,255,0.7)",

                        fontSize: 11,

                        marginTop: 2,

                      }}

                    >

                      Publica un nuevo espacio en Parkealo

                    </div>

                  </div>

                  <svg

                    width="14"

                    height="14"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke="rgba(255,255,255,0.7)"

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <polyline points="9 18 15 12 9 6" />

                  </svg>

                </button>

                <Card>

                  <SectionLabel>Hora pico del día</SectionLabel>

                  <div

                    style={{

                      display: "flex",

                      gap: 3,

                      alignItems: "flex-end",

                      height: 64,

                    }}

                  >

                    {[2, 4, 7, 11, 8, 6, 9, 12, 10, 7, 4, 2].map((v, i) => (

                      <div

                        key={i}

                        style={{

                          flex: 1,

                          background:

                            v >= 9 ? T.green : v >= 6 ? T.blue : T.blueLt,

                          borderRadius: "3px 3px 0 0",

                          height: `${(v / 12) * 100}%`,

                        }}

                      />

                    ))}

                  </div>

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      marginTop: 5,

                    }}

                  >

                    {["6am", "9am", "12pm", "3pm", "6pm", "9pm"].map((h) => (

                      <span key={h} style={{ fontSize: 9, color: T.textFaint }}>

                        {h}

                      </span>

                    ))}

                  </div>

                  <div style={{ display: "flex", gap: 14, marginTop: 10 }}>

                    <div

                      style={{ display: "flex", alignItems: "center", gap: 5 }}

                    >

                      <div

                        style={{

                          width: 10,

                          height: 10,

                          borderRadius: 2,

                          background: T.green,

                        }}

                      />

                      <span style={{ fontSize: 10, color: T.textSub }}>

                        Alto

                      </span>

                    </div>

                    <div

                      style={{ display: "flex", alignItems: "center", gap: 5 }}

                    >

                      <div

                        style={{

                          width: 10,

                          height: 10,

                          borderRadius: 2,

                          background: T.blue,

                        }}

                      />

                      <span style={{ fontSize: 10, color: T.textSub }}>

                        Medio

                      </span>

                    </div>

                    <div

                      style={{ display: "flex", alignItems: "center", gap: 5 }}

                    >

                      <div

                        style={{

                          width: 10,

                          height: 10,

                          borderRadius: 2,

                          background: T.blueLt,

                        }}

                      />

                      <span style={{ fontSize: 10, color: T.textSub }}>

                        Bajo

                      </span>

                    </div>

                  </div>

                </Card>

                {/* ── Host referral card — visible only to hosts with published parking ── */}

                <Card

                  style={{

                    marginTop: 14,

                    border: `1.5px solid ${T.greenMid}`,

                    background: T.greenLt,

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      alignItems: "center",

                      gap: 10,

                      marginBottom: 12,

                    }}

                  >

                    <div

                      style={{

                        width: 44,

                        height: 44,

                        borderRadius: 14,

                        background: T.green,

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "center",

                        flexShrink: 0,

                      }}

                    >

                      <span style={{ fontSize: 22 }}>🎁</span>

                    </div>

                    <div>

                      <div

                        style={{

                          fontWeight: 800,

                          fontSize: 14,

                          color: T.green,

                        }}

                      >

                        Invita a otros hosts

                      </div>

                      <div style={{ fontSize: 12, color: T.textSub }}>

                        Gana RD$100 por cada host que publique su primer parqueo

                        con tu código

                      </div>

                    </div>

                  </div>

                  <div

                    style={{

                      background: T.bg,

                      borderRadius: 12,

                      padding: "10px 14px",

                      display: "flex",

                      alignItems: "center",

                      gap: 10,

                      marginBottom: 10,

                      border: `1px dashed ${T.blue}`,

                    }}

                  >

                    <span

                      style={{

                        fontFamily: "monospace",

                        fontWeight: 900,

                        fontSize: 16,

                        color: T.blue,

                        flex: 1,

                        letterSpacing: 2,

                      }}

                    >

                      HOST-JM3K9

                    </span>

                    <button

                      style={{

                        background: T.blue,

                        border: "none",

                        borderRadius: 8,

                        padding: "6px 12px",

                        color: "#fff",

                        fontFamily: font,

                        fontWeight: 700,

                        fontSize: 11,

                        cursor: "pointer",

                      }}

                    >

                      Copiar

                    </button>

                  </div>

                  <div style={{ display: "flex", gap: 8 }}>

                    <button

                      style={{

                        flex: 1,

                        background: "#25D366",

                        border: "none",

                        borderRadius: 10,

                        padding: "9px 0",

                        color: "#fff",

                        fontFamily: font,

                        fontWeight: 700,

                        fontSize: 12,

                        cursor: "pointer",

                      }}

                    >

                      📱 WhatsApp

                    </button>

                    <button

                      style={{

                        flex: 1,

                        background: T.blue,

                        border: "none",

                        borderRadius: 10,

                        padding: "9px 0",

                        color: "#fff",

                        fontFamily: font,

                        fontWeight: 700,

                        fontSize: 12,

                        cursor: "pointer",

                      }}

                    >

                      📤 Compartir

                    </button>

                  </div>

                  <div

                    style={{

                      marginTop: 10,

                      fontSize: 10,

                      color: T.textSub,

                      textAlign: "center",

                    }}

                  >

                    3 hosts referidos · RD$300 ganados hasta ahora

                  </div>

                </Card>

              </>

            )}

            {/* ── Parqueo ── */}

            {tab === "parqueo" && <ParkingSpaceManager />}

            {/* ── Servicios / Amenidades ── */}

            {tab === "amenities" && <AmenitiesEditor />}

            {/* ── Precios ── */}

            {tab === "pricing" && (

              <PricingEditor dynamic={dynamic} setDynamic={setDynamic} />

            )}

            {/* ── Alertas ── */}

            {tab === "notifications" &&

              notifs.map((n, i) => (

                <Card

                  key={i}

                  style={{

                    marginBottom: 10,

                    borderLeft: `4px solid ${n.acc}`,

                    padding: "12px 14px",

                  }}

                >

                  <div

                    style={{

                      color: T.text,

                      fontSize: 13,

                      fontWeight: 600,

                      marginBottom: 3,

                    }}

                  >

                    {n.msg}

                  </div>

                  <div style={{ color: T.textFaint, fontSize: 11 }}>{n.t}</div>

                </Card>

              ))}

          </div>

        </>

      )}

    </div>

  );

}

// ─── EARNINGS / PAYOUT SCREEN ─────────────────────────────────────────────────

function EarningsScreen({ onClose }) {

  const [showAddBank, setShowAddBank] = useState(false);

  const [bankAdded, setBankAdded] = useState(false);

  const [bankForm, setBankForm] = useState({

    bank: "",

    account: "",

    type: "corriente",

    name: "",

    cedula: "",

  });

  const BANKS = [

    "Banco Popular",

    "BanReservas",

    "BHD León",

    "Banco Santa Cruz",

    "Scotiabank",

    "Apap",

    "Bancamérica",

    "Banesco",

  ];

  // Use top-level FInput instead — avoids focus loss

  const F = ({ label, value, onChange, placeholder, type = "text", note }) => (

    <FInput

      label={label}

      value={value}

      onChange={onChange}

      placeholder={placeholder}

      type={type}

      note={note}

    />

  );

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      {/* Header */}

      <div

        style={{

          background: `linear-gradient(135deg,${T.green},${T.greenDk})`,

          padding: "18px 16px 16px",

          flexShrink: 0,

        }}

      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.18)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div>

            <div style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>

              Ingresos y retiros

            </div>

            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>

              Parqueo Colonial Premium

            </div>

          </div>

        </div>

      </div>

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "16px 14px",

          background: T.surface,

        }}

      >

        {/* Balance cards */}

        <div

          style={{

            display: "grid",

            gridTemplateColumns: "1fr 1fr",

            gap: 10,

            marginBottom: 16,

          }}

        >

          {[

            {

              label: "Disponible para retirar",

              value: "RD$12,450",

              color: T.green,

              bg: T.greenLt,

              bd: T.green,

            },

            {

              label: "Pendiente de liquidar",

              value: "RD$4,200",

              color: T.warn,

              bg: T.warnBg,

              bd: T.warn,

            },

            {

              label: "Retirado este mes",

              value: "RD$28,600",

              color: T.blueNav,

              bg: T.blueLt,

              bd: T.blue,

            },

            {

              label: "Reservas este mes",

              value: "47",

              color: T.blue,

              bg: T.blueLt,

              bd: T.blue,

            },

          ].map((c) => (

            <Card

              key={c.label}

              style={{

                padding: 14,

                borderTop: `3px solid ${c.bd}`,

                background: c.bg,

              }}

            >

              <div

                style={{

                  fontSize: 18,

                  fontWeight: 900,

                  color: c.color,

                  marginBottom: 4,

                }}

              >

                {c.value}

              </div>

              <div

                style={{

                  fontSize: 10,

                  color: c.color,

                  fontWeight: 600,

                  lineHeight: 1.3,

                }}

              >

                {c.label}

              </div>

            </Card>

          ))}

        </div>

        {/* Withdraw button */}

        <Btn

          variant="green"

          full

          style={{

            marginBottom: 16,

            padding: "14px 0",

            fontSize: 15,

            borderRadius: 14,

          }}

        >

          💳 Solicitar retiro — RD$12,450

        </Btn>

        {/* Payout account */}

        <Card style={{ marginBottom: 14 }}>

          <div

            style={{

              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              marginBottom: 12,

            }}

          >

            <SectionLabel style={{ margin: 0 }}>Cuenta de retiro</SectionLabel>

            <button

              onClick={() => setShowAddBank(true)}

              style={{

                background: T.blueLt,

                border: `1px solid ${T.blueMid}`,

                borderRadius: 20,

                padding: "4px 12px",

                fontSize: 11,

                fontWeight: 700,

                color: T.blue,

                cursor: "pointer",

                fontFamily: font,

              }}

            >

              {bankAdded ? "✏️ Editar" : "+ Agregar"}

            </button>

          </div>

          {bankAdded ? (

            <div

              style={{

                background: T.surface,

                borderRadius: 12,

                padding: "12px 14px",

              }}

            >

              <div

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 10,

                  marginBottom: 8,

                }}

              >

                <div

                  style={{

                    width: 40,

                    height: 40,

                    borderRadius: 10,

                    background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <span style={{ color: "#fff", fontSize: 18 }}>🏦</span>

                </div>

                <div>

                  <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>

                    {bankForm.bank}

                  </div>

                  <div style={{ fontSize: 12, color: T.textSub }}>

                    Cta. {bankForm.type} · •••• {bankForm.account.slice(-4)}

                  </div>

                </div>

                <div

                  style={{

                    marginLeft: "auto",

                    background: T.greenLt,

                    border: `1px solid ${T.greenMid}`,

                    borderRadius: 20,

                    padding: "3px 10px",

                  }}

                >

                  <span

                    style={{ fontSize: 10, fontWeight: 700, color: T.green }}

                  >

                    ✓ Verificada

                  </span>

                </div>

              </div>

              <div style={{ fontSize: 11, color: T.textSub }}>

                Titular: {bankForm.name} · Cédula ••••

                {bankForm.cedula.slice(-4)}

              </div>

            </div>

          ) : (

            <div

              style={{

                background: T.surface,

                borderRadius: 12,

                padding: "14px",

                textAlign: "center",

              }}

            >

              <div style={{ fontSize: 32, marginBottom: 8 }}>🏦</div>

              <div

                style={{

                  fontWeight: 700,

                  color: T.textMid,

                  fontSize: 13,

                  marginBottom: 4,

                }}

              >

                Sin cuenta de retiro

              </div>

              <div style={{ fontSize: 12, color: T.textSub }}>

                Agrega tu cuenta bancaria para recibir pagos de tus parqueos.

              </div>

            </div>

          )}

        </Card>

        {/* Recent transactions */}

        <Card>

          <SectionLabel>Últimos movimientos</SectionLabel>

          {[

            {

              desc: "Reserva A3 · Carlos M.",

              amount: "+RD$300",

              date: "Hoy 10:30",

              c: T.green,

            },

            {

              desc: "Reserva B1 · María G.",

              amount: "+RD$150",

              date: "Hoy 09:00",

              c: T.green,

            },

            {

              desc: "Retiro a Banco Popular",

              amount: "-RD$5,000",

              date: "Ayer",

              c: T.danger,

            },

            {

              desc: "Reserva A7 · Juan R.",

              amount: "+RD$450",

              date: "Hace 2 días",

              c: T.green,

            },

            {

              desc: "Retiro a Banco Popular",

              amount: "-RD$8,000",

              date: "Hace 5 días",

              c: T.danger,

            },

          ].map((t, i) => (

            <div

              key={i}

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                padding: "10px 0",

                borderBottom: i < 4 ? `1px solid ${T.border}` : "none",

              }}

            >

              <div>

                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>

                  {t.desc}

                </div>

                <div style={{ fontSize: 11, color: T.textFaint }}>{t.date}</div>

              </div>

              <div style={{ fontSize: 14, fontWeight: 800, color: t.c }}>

                {t.amount}

              </div>

            </div>

          ))}

        </Card>

      </div>

      {/* Add bank account sheet */}

      {showAddBank && (

        <div

          style={{

            position: "absolute",

            inset: 0,

            zIndex: 700,

            background: "rgba(13,27,62,0.55)",

            display: "flex",

            alignItems: "flex-end",

          }}

        >

          <div

            style={{

              background: T.bg,

              borderRadius: "22px 22px 0 0",

              width: "100%",

              maxHeight: "88%",

              overflowY: "auto",

              padding: "20px 18px 36px",

            }}

          >

            <div

              style={{

                width: 40,

                height: 4,

                background: T.border,

                borderRadius: 2,

                margin: "0 auto 20px",

              }}

            />

            <div

              style={{

                fontWeight: 900,

                fontSize: 18,

                color: T.text,

                marginBottom: 4,

              }}

            >

              Agregar cuenta de retiro

            </div>

            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 20 }}>

              Esta cuenta recibirá los fondos de tus parqueos.

            </div>

            {/* Bank selector */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                Banco

              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>

                {BANKS.map((b) => (

                  <button

                    key={b}

                    onClick={() => setBankForm((f) => ({ ...f, bank: b }))}

                    style={{

                      padding: "7px 12px",

                      borderRadius: 20,

                      border: `1.5px solid ${

                        bankForm.bank === b ? T.blue : T.border

                      }`,

                      background: bankForm.bank === b ? T.blueLt : T.bg,

                      color: bankForm.bank === b ? T.blue : T.textMid,

                      fontSize: 11,

                      fontWeight: 700,

                      cursor: "pointer",

                      fontFamily: font,

                    }}

                  >

                    {b}

                  </button>

                ))}

              </div>

            </div>

            {/* Account type */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                Tipo de cuenta

              </div>

              <div style={{ display: "flex", gap: 8 }}>

                {["corriente", "ahorro"].map((t) => (

                  <button

                    key={t}

                    onClick={() => setBankForm((f) => ({ ...f, type: t }))}

                    style={{

                      flex: 1,

                      padding: "10px 0",

                      borderRadius: 10,

                      border: `1.5px solid ${

                        bankForm.type === t ? T.blue : T.border

                      }`,

                      background: bankForm.type === t ? T.blueLt : T.bg,

                      color: bankForm.type === t ? T.blue : T.textMid,

                      fontSize: 13,

                      fontWeight: 700,

                      cursor: "pointer",

                      fontFamily: font,

                      textTransform: "capitalize",

                    }}

                  >

                    {t.charAt(0).toUpperCase() + t.slice(1)}

                  </button>

                ))}

              </div>

            </div>

            <F

              label="Número de cuenta"

              value={bankForm.account}

              onChange={(v) => setBankForm((f) => ({ ...f, account: v }))}

              placeholder="Ej: 01234567890"

              type="number"

            />

            <F

              label="Nombre completo del titular"

              value={bankForm.name}

              onChange={(v) => setBankForm((f) => ({ ...f, name: v }))}

              placeholder="Ej: Juan Carlos Pérez"

            />

            <F

              label="Cédula de identidad"

              value={bankForm.cedula}

              onChange={(v) => setBankForm((f) => ({ ...f, cedula: v }))}

              placeholder="Ej: 001-1234567-8"

              note="Requerida para verificación de identidad"

            />

            <div

              style={{

                background: T.warnBg,

                border: `1px solid ${T.warnBd}`,

                borderRadius: 10,

                padding: "9px 12px",

                marginBottom: 18,

              }}

            >

              <div style={{ fontSize: 11, color: T.warn, fontWeight: 600 }}>

                🔒 Tu información bancaria está cifrada y solo se usa para

                procesar retiros.

              </div>

            </div>

            <div style={{ display: "flex", gap: 8 }}>

              <Btn

                onClick={() => setShowAddBank(false)}

                variant="secondary"

                style={{ flex: 1 }}

              >

                Cancelar

              </Btn>

              <Btn

                onClick={() => {

                  if (

                    bankForm.bank &&

                    bankForm.account &&

                    bankForm.name &&

                    bankForm.cedula

                  ) {

                    setBankAdded(true);

                    setShowAddBank(false);

                  }

                }}

                variant="green"

                style={{ flex: 2 }}

              >

                Guardar cuenta

              </Btn>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

// ─── ADD PARKING FORM ─────────────────────────────────────────────────────────

// ─── FORM FIELD COMPONENTS (top-level to prevent focus loss on re-render) ──────

function FInput({

  label,

  value,

  onChange,

  placeholder,

  type = "text",

  note,

  half,

}) {

  return (

    <div style={{ marginBottom: 14, flex: half ? "1 1 45%" : "1 1 100%" }}>

      <div

        style={{

          fontSize: 11,

          fontWeight: 700,

          color: T.textSub,

          marginBottom: 5,

        }}

      >

        {label}

      </div>

      <input

        value={value}

        onChange={(e) => onChange(e.target.value)}

        placeholder={placeholder}

        type={type === "number" ? "text" : type}

        inputMode={type === "number" ? "numeric" : undefined}

        autoComplete="off"

        style={{

          width: "100%",

          background: T.bg,

          border: `1.5px solid ${T.borderMd}`,

          borderRadius: 10,

          padding: "11px 14px",

          fontSize: 14,

          fontFamily: font,

          outline: "none",

          color: T.text,

          boxSizing: "border-box",

        }}

      />

      {note && (

        <div style={{ fontSize: 10, color: T.textFaint, marginTop: 3 }}>

          {note}

        </div>

      )}

    </div>

  );

}

function FTextarea({ label, value, onChange, placeholder }) {

  return (

    <div style={{ marginBottom: 14 }}>

      <div

        style={{

          fontSize: 11,

          fontWeight: 700,

          color: T.textSub,

          marginBottom: 5,

        }}

      >

        {label}

      </div>

      <textarea

        value={value}

        onChange={(e) => onChange(e.target.value)}

        placeholder={placeholder}

        rows={3}

        style={{

          width: "100%",

          background: T.bg,

          border: `1.5px solid ${T.borderMd}`,

          borderRadius: 10,

          padding: "11px 14px",

          fontSize: 13,

          fontFamily: font,

          outline: "none",

          color: T.text,

          boxSizing: "border-box",

          resize: "none",

          lineHeight: 1.5,

        }}

      />

    </div>

  );

}

function AddParkingForm({ onClose, onPublish }) {

  const STEPS = [

    "Ubicación",

    "Detalles",

    "Espacios",

    "Servicios",

    "Fotos",

    "Revisión",

  ];

  const [step, setStep] = useState(0);

  const [saved, setSaved] = useState(false);

  // Form state

  const [sectorSearch, setSectorSearch] = useState("");

  const [showSectorDrop, setShowSectorDrop] = useState(false);

  const [form, setForm] = useState({

    name: "",

    address: "",

    sector: "",

    city: "Santo Domingo",

    lat: "",

    lng: "",

    gpsUsed: false,

    type: "public",

    floors: 1,

    totalSpaces: 10,

    description: "",

    rules: "",

    schedule: "24h",

    openTime: "07:00",

    closeTime: "23:00",

    phone: "",

    instagram: "",

    amenities: {

      covered: false,

      cameras: false,

      access_control: false,

      staff: false,

      h24: false,

      ev: false,

      valet: false,

      private: false,

      wifi: false,

      disabled: false,

      motorcycle: false,

      restroom: false,

    },

    photos: [],

  });

  const set = (k, v) => {

    if (typeof v === "string" && isSuspicious(v)) return; // block suspicious input

    setForm((f) => ({ ...f, [k]: typeof v === "string" ? sanitize(v) : v }));

  };

  const setAm = (k, v) =>

    setForm((f) => ({ ...f, amenities: { ...f.amenities, [k]: v } }));

  const SECTORS = [

    "Zona Colonial",

    "Piantini",

    "Bella Vista",

    "Naco",

    "Gazcue",

    "Los Cacicazgos",

    "Evaristo Morales",

    "La Esperilla",

    "Mirador Norte",

    "Mirador Sur",

    "Arroyo Hondo",

    "Los Prados",

    "Serrallés",

    "Renacimiento",

    "Ciudad Nueva",

    "La Julia",

    "Alma Rosa",

    "Los Restauradores",

  ];

  const AMENITY_LIST = [

    { key: "covered", label: "Techado", icon: "🏠" },

    { key: "cameras", label: "Cámaras", icon: "📹" },

    { key: "h24", label: "24/7", icon: "🕐" },

    { key: "access_control", label: "Ctrl. acceso", icon: "🔐" },

    { key: "staff", label: "Personal", icon: "👤" },

    { key: "ev", label: "Carga EV", icon: "⚡" },

    { key: "valet", label: "Valet", icon: "🤵" },

    { key: "private", label: "Privado", icon: "🏡" },

    { key: "wifi", label: "Wi-Fi", icon: "📶" },

    { key: "disabled", label: "Discapacitados", icon: "♿" },

    { key: "motorcycle", label: "Motos", icon: "🏍️" },

    { key: "restroom", label: "Baños", icon: "🚻" },

  ];

  const canNext = () => {

    if (step === 0)

      return form.name && (form.address || form.gpsUsed) && form.sector;

    if (step === 1) return form.totalSpaces > 0;

    return true;

  };

  // Success screen

  if (saved)

    return (

      <div

        style={{

          position: "absolute",

          inset: 0,

          zIndex: 600,

          background: T.bg,

          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          justifyContent: "center",

          padding: 32,

        }}

      >

        <div

          style={{

            width: 90,

            height: 90,

            borderRadius: "50%",

            background: T.greenLt,

            border: `3px solid ${T.green}`,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            marginBottom: 24,

          }}

        >

          <svg

            width="42"

            height="42"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.green}

            strokeWidth="2.5"

            strokeLinecap="round"

          >

            <polyline points="20 6 9 17 4 12" />

          </svg>

        </div>

        <div

          style={{

            fontWeight: 900,

            fontSize: 24,

            color: T.text,

            textAlign: "center",

            marginBottom: 10,

          }}

        >

          ¡Solicitud enviada!

        </div>

        <div

          style={{

            color: T.textSub,

            fontSize: 14,

            textAlign: "center",

            lineHeight: 1.6,

            marginBottom: 8,

          }}

        >

          <strong>{form.name}</strong> está siendo revisado por el equipo de

          Parkealo.

        </div>

        <div

          style={{

            background: T.warnBg,

            border: `1px solid ${T.warnBd}`,

            borderRadius: 12,

            padding: "10px 16px",

            marginBottom: 28,

            width: "100%",

          }}

        >

          <div

            style={{

              fontSize: 12,

              color: T.warn,

              fontWeight: 700,

              textAlign: "center",

            }}

          >

            ⏳ En revisión · Estará visible en el mapa en ~2 horas

          </div>

        </div>

        <Btn

          onClick={() => {

            onPublish(form);

            onClose();

          }}

          variant="green"

          full

          style={{

            padding: "14px 0",

            fontSize: 15,

            borderRadius: 14,

            marginBottom: 10,

          }}

        >

          Ir al panel de administración

        </Btn>

        <div

          style={{

            background: T.greenLt,

            border: `1px solid ${T.greenMid}`,

            borderRadius: 12,

            padding: "10px 14px",

            width: "100%",

            textAlign: "center",

          }}

        >

          <div style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>

            💡 En el panel encontrarás el código QR de tu parqueo para imprimir

          </div>

        </div>

      </div>

    );

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 600,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

      }}

    >

      {/* Header */}

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

          padding: "16px 16px 0",

          flexShrink: 0,

        }}

      >

        <div

          style={{

            display: "flex",

            alignItems: "center",

            gap: 12,

            marginBottom: 14,

          }}

        >

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 34,

              height: 34,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <polyline points="15 18 9 12 15 6" />

            </svg>

          </button>

          <div style={{ flex: 1 }}>

            <div style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>

              Publicar parqueo

            </div>

            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>

              Paso {step + 1} de {STEPS.length} · {STEPS[step]}

            </div>

          </div>

        </div>

        {/* Progress bar */}

        <div

          style={{

            height: 3,

            background: "rgba(255,255,255,0.2)",

            borderRadius: 3,

            marginBottom: 0,

          }}

        >

          <div

            style={{

              height: "100%",

              width: `${((step + 1) / STEPS.length) * 100}%`,

              background: "#fff",

              borderRadius: 3,

              transition: "width 0.3s",

            }}

          />

        </div>

        {/* Step pills */}

        <div

          style={{

            display: "flex",

            overflowX: "auto",

            scrollbarWidth: "none",

            padding: "10px 0 12px",

            gap: 6,

          }}

        >

          {STEPS.map((s, i) => (

            <div

              key={i}

              style={{

                flexShrink: 0,

                padding: "4px 10px",

                borderRadius: 20,

                background:

                  i === step

                    ? "#fff"

                    : i < step

                    ? "rgba(255,255,255,0.3)"

                    : "rgba(255,255,255,0.1)",

                fontSize: 10,

                fontWeight: 700,

                color:

                  i === step

                    ? T.blue

                    : i < step

                    ? "rgba(255,255,255,0.9)"

                    : "rgba(255,255,255,0.5)",

              }}

            >

              {i < step ? "✓ " : ""}

              {s}

            </div>

          ))}

        </div>

      </div>

      {/* Step content */}

      <div

        style={{

          flex: 1,

          overflowY: "auto",

          padding: "20px 16px",

          background: T.surface,

        }}

      >

        {/* STEP 0 — UBICACIÓN */}

        {step === 0 && (

          <>

            <FInput

              label="NOMBRE DEL PARQUEO O HOST *"

              value={form.name}

              onChange={(v) => set("name", v)}

              placeholder="Ej: Parqueo Central o Casa de Juan"

              note="Puede ser el nombre de tu negocio o simplemente tu nombre si es un parqueo residencial"

            />

            {/* GPS / drop-pin mockup */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                UBICACIÓN *

              </div>

              <button

                onClick={() => {

                  set("gpsUsed", true);

                  set("address", "Calle Las Damas 23, Zona Colonial");

                  set("lat", "18.4742");

                  set("lng", "-69.8923");

                }}

                style={{

                  width: "100%",

                  background: form.gpsUsed ? T.greenLt : T.blueLt,

                  border: `1.5px solid ${

                    form.gpsUsed ? T.greenMid : T.blueMid

                  }`,

                  borderRadius: 12,

                  padding: "12px 16px",

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  cursor: "pointer",

                  marginBottom: 10,

                  fontFamily: font,

                }}

              >

                <div

                  style={{

                    width: 38,

                    height: 38,

                    borderRadius: "50%",

                    background: form.gpsUsed ? T.green : T.blue,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <svg

                    width="18"

                    height="18"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke="#fff"

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <circle cx="12" cy="12" r="3" />

                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />

                    <circle cx="12" cy="12" r="8" strokeDasharray="3 2" />

                  </svg>

                </div>

                <div style={{ textAlign: "left" }}>

                  <div

                    style={{

                      fontWeight: 800,

                      fontSize: 13,

                      color: form.gpsUsed ? T.green : T.blue,

                    }}

                  >

                    {form.gpsUsed

                      ? "✓ Ubicación obtenida"

                      : "Usar mi ubicación actual"}

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>

                    {form.gpsUsed

                      ? form.address

                      : "Activa el GPS para mayor precisión"}

                  </div>

                </div>

              </button>

              {/* Drop-pin mock map */}

              <div

                style={{

                  borderRadius: 14,

                  overflow: "hidden",

                  border: `1.5px solid ${T.border}`,

                  marginBottom: 10,

                  position: "relative",

                  cursor: "pointer",

                }}

                onClick={() => {

                  set("gpsUsed", true);

                  set("address", "Av. Winston Churchill 1099, Piantini");

                  set("lat", "18.4726");

                  set("lng", "-69.9354");

                }}

              >

                <div

                  style={{

                    height: 130,

                    background: `linear-gradient(145deg,${T.blueLt},#DDE8F8)`,

                    position: "relative",

                  }}

                >

                  {[...Array(8)].map((_, i) => (

                    <div

                      key={i}

                      style={{

                        position: "absolute",

                        left: `${i * 14}%`,

                        top: 0,

                        bottom: 0,

                        width: 1,

                        background: "rgba(26,86,196,0.06)",

                      }}

                    />

                  ))}

                  {[...Array(6)].map((_, i) => (

                    <div

                      key={i}

                      style={{

                        position: "absolute",

                        top: `${i * 20}%`,

                        left: 0,

                        right: 0,

                        height: 1,

                        background: "rgba(26,86,196,0.06)",

                      }}

                    />

                  ))}

                  <div

                    style={{

                      position: "absolute",

                      left: "38%",

                      top: 0,

                      bottom: 0,

                      width: 3,

                      background: "rgba(180,200,235,0.6)",

                    }}

                  />

                  <div

                    style={{

                      position: "absolute",

                      top: "55%",

                      left: 0,

                      right: 0,

                      height: 3,

                      background: "rgba(180,200,235,0.6)",

                    }}

                  />

                  {form.gpsUsed && (

                    <div

                      style={{

                        position: "absolute",

                        top: "45%",

                        left: "38%",

                        transform: "translate(-50%,-100%)",

                      }}

                    >

                      <ParkealoPinLogo size={28} variant="blue" />

                      <div

                        style={{

                          width: 8,

                          height: 8,

                          borderRadius: "50%",

                          background: "rgba(26,86,196,0.2)",

                          margin: "0 auto",

                          marginTop: -2,

                        }}

                      />

                    </div>

                  )}

                  {!form.gpsUsed && (

                    <div

                      style={{

                        position: "absolute",

                        inset: 0,

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "center",

                      }}

                    >

                      <div

                        style={{

                          background: "rgba(255,255,255,0.9)",

                          borderRadius: 10,

                          padding: "8px 14px",

                          fontSize: 12,

                          fontWeight: 700,

                          color: T.blue,

                        }}

                      >

                        📍 Toca para colocar pin

                      </div>

                    </div>

                  )}

                  <div

                    style={{

                      position: "absolute",

                      bottom: 8,

                      right: 8,

                      background: "rgba(255,255,255,0.9)",

                      borderRadius: 8,

                      padding: "4px 10px",

                      fontSize: 10,

                      fontWeight: 700,

                      color: T.textSub,

                    }}

                  >

                    Mapa interactivo

                  </div>

                </div>

              </div>

              <FInput

                label="DIRECCIÓN EXACTA *"

                value={form.address}

                onChange={(v) => set("address", v)}

                placeholder="Calle, número, edificio..."

                note="Añade referencias para que los usuarios te encuentren fácil"

              />

            </div>

            {/* SECTOR — searchable dropdown, right below address */}

            <div style={{ marginBottom: 14, position: "relative" }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                SECTOR / ZONA *

              </div>

              <button

                type="button"

                onClick={() => {

                  setShowSectorDrop((v) => !v);

                  setSectorSearch("");

                }}

                style={{

                  width: "100%",

                  background: T.bg,

                  border: `1.5px solid ${form.sector ? T.blue : T.borderMd}`,

                  borderRadius: 12,

                  padding: "12px 14px",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  cursor: "pointer",

                  fontFamily: font,

                }}

              >

                <span

                  style={{

                    fontSize: 14,

                    fontWeight: form.sector ? 700 : 400,

                    color: form.sector ? T.text : T.textFaint,

                  }}

                >

                  {form.sector || "Selecciona un sector…"}

                </span>

                {form.sector ? (

                  <span

                    onClick={(e) => {

                      e.stopPropagation();

                      set("sector", "");

                      setShowSectorDrop(false);

                    }}

                    style={{

                      color: T.textFaint,

                      fontSize: 16,

                      lineHeight: 1,

                      padding: "0 4px",

                    }}

                  >

                    ✕

                  </span>

                ) : (

                  <svg

                    width="14"

                    height="14"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke={T.blue}

                    strokeWidth="2.5"

                    strokeLinecap="round"

                  >

                    <polyline points="6 9 12 15 18 9" />

                  </svg>

                )}

              </button>

              {showSectorDrop && (

                <div

                  style={{

                    position: "absolute",

                    left: 0,

                    right: 0,

                    top: "calc(100% + 4px)",

                    background: T.bg,

                    border: `1.5px solid ${T.blue}`,

                    borderRadius: 14,

                    zIndex: 200,

                    boxShadow: T.shadowLg,

                    overflow: "hidden",

                  }}

                >

                  <div

                    style={{

                      padding: "10px 12px",

                      borderBottom: `1px solid ${T.border}`,

                      display: "flex",

                      alignItems: "center",

                      gap: 8,

                    }}

                  >

                    <svg

                      width="14"

                      height="14"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={T.textFaint}

                      strokeWidth="2.5"

                      strokeLinecap="round"

                    >

                      <circle cx="11" cy="11" r="8" />

                      <line x1="21" y1="21" x2="16.65" y2="16.65" />

                    </svg>

                    <input

                      autoFocus

                      value={sectorSearch}

                      onChange={(e) => setSectorSearch(e.target.value)}

                      placeholder="Buscar sector…"

                      autoComplete="off"

                      style={{

                        flex: 1,

                        border: "none",

                        outline: "none",

                        fontSize: 14,

                        fontFamily: font,

                        color: T.text,

                        background: "transparent",

                      }}

                    />

                    {sectorSearch && (

                      <button

                        onClick={() => setSectorSearch("")}

                        style={{

                          background: "none",

                          border: "none",

                          cursor: "pointer",

                          color: T.textFaint,

                          fontSize: 16,

                          lineHeight: 1,

                          padding: 0,

                        }}

                      >

                        ✕

                      </button>

                    )}

                  </div>

                  <div style={{ maxHeight: 200, overflowY: "auto" }}>

                    {SECTORS.filter((s) =>

                      s.toLowerCase().includes(sectorSearch.toLowerCase())

                    ).length === 0 ? (

                      <div

                        style={{

                          padding: "14px 16px",

                          color: T.textFaint,

                          fontSize: 13,

                          textAlign: "center",

                        }}

                      >

                        Sin resultados para "{sectorSearch}"

                      </div>

                    ) : (

                      SECTORS.filter((s) =>

                        s.toLowerCase().includes(sectorSearch.toLowerCase())

                      ).map((s) => (

                        <div

                          key={s}

                          onClick={() => {

                            set("sector", s);

                            setShowSectorDrop(false);

                            setSectorSearch("");

                          }}

                          style={{

                            padding: "12px 16px",

                            fontSize: 14,

                            fontWeight: s === form.sector ? 800 : 400,

                            color: s === form.sector ? T.blue : T.text,

                            background:

                              s === form.sector ? T.blueLt : "transparent",

                            cursor: "pointer",

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "space-between",

                            borderBottom: `1px solid ${T.border}`,

                          }}

                        >

                          {s}

                          {s === form.sector && (

                            <svg

                              width="14"

                              height="14"

                              viewBox="0 0 24 24"

                              fill="none"

                              stroke={T.blue}

                              strokeWidth="2.5"

                              strokeLinecap="round"

                            >

                              <polyline points="20 6 9 17 4 12" />

                            </svg>

                          )}

                        </div>

                      ))

                    )}

                  </div>

                </div>

              )}

            </div>

            <FInput

              label="TELÉFONO DE CONTACTO"

              value={form.phone}

              onChange={(v) => set("phone", v)}

              placeholder="+1 (809) 000-0000"

              type="tel"

            />

            <FInput

              label="INSTAGRAM (opcional)"

              value={form.instagram}

              onChange={(v) => set("instagram", v)}

              placeholder="@miparqueo"

            />

          </>

        )}

        {/* STEP 1 — DETALLES */}

        {step === 1 && (

          <>

            {/* Type */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                TIPO DE PARQUEO *

              </div>

              <div style={{ display: "flex", gap: 8 }}>

                {[

                  ["public", "🏢 Público", "Cualquier usuario puede reservar"],

                  ["private", "🔒 Privado", "Solo usuarios aprobados por ti"],

                ].map(([k, l, sub]) => (

                  <button

                    key={k}

                    onClick={() => set("type", k)}

                    style={{

                      flex: 1,

                      padding: "12px 10px",

                      borderRadius: 14,

                      border: `2px solid ${

                        form.type === k

                          ? k === "private"

                            ? T.blue

                            : T.green

                          : T.border

                      }`,

                      background:

                        form.type === k

                          ? k === "private"

                            ? T.blueLt

                            : T.greenLt

                          : T.bg,

                      cursor: "pointer",

                      fontFamily: font,

                      textAlign: "center",

                    }}

                  >

                    <div style={{ fontSize: 20, marginBottom: 4 }}>

                      {l.split(" ")[0]}

                    </div>

                    <div

                      style={{

                        fontSize: 12,

                        fontWeight: 800,

                        color:

                          form.type === k

                            ? k === "private"

                              ? T.blue

                              : T.green

                            : T.textSub,

                      }}

                    >

                      {l.split(" ").slice(1).join(" ")}

                    </div>

                    <div

                      style={{

                        fontSize: 10,

                        color: T.textFaint,

                        marginTop: 3,

                        lineHeight: 1.3,

                      }}

                    >

                      {sub}

                    </div>

                  </button>

                ))}

              </div>

            </div>

            {/* Capacity — free number input */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                CANTIDAD DE ESPACIOS *

              </div>

              <div

                style={{

                  display: "flex",

                  alignItems: "center",

                  background: T.bg,

                  border: `1.5px solid ${T.borderMd}`,

                  borderRadius: 12,

                  overflow: "hidden",

                }}

              >

                <span

                  style={{ padding: "0 12px", color: T.textSub, fontSize: 20 }}

                >

                  🅿️

                </span>

                <input

                  type="text"

                  inputMode="numeric"

                  autoComplete="off"

                  value={form.totalSpaces === 0 ? "" : form.totalSpaces}

                  onChange={(e) => {

                    const raw = e.target.value.replace(/[^0-9]/g, "");

                    set("totalSpaces", raw === "" ? 0 : parseInt(raw));

                  }}

                  placeholder="0"

                  style={{

                    flex: 1,

                    padding: "13px 8px",

                    border: "none",

                    outline: "none",

                    fontSize: 22,

                    fontWeight: 900,

                    color: T.blue,

                    fontFamily: font,

                    background: "transparent",

                    width: "100%",

                    minWidth: 0,

                  }}

                />

                <span

                  style={{

                    padding: "0 14px",

                    color: T.textSub,

                    fontSize: 13,

                    fontWeight: 600,

                    borderLeft: `1px solid ${T.border}`,

                    paddingLeft: 12,

                    paddingRight: 12,

                    whiteSpace: "nowrap",

                  }}

                >

                  espacios

                </span>

              </div>

              <div style={{ fontSize: 10, color: T.textFaint, marginTop: 5 }}>

                Escribe cualquier número: 1, 2, 10, 50, 100… Podrás configurar

                secciones y etiquetas desde el panel.

              </div>

            </div>

            {/* Floors */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                NIVELES / PISOS

              </div>

              <div

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 16,

                  background: T.bg,

                  border: `1.5px solid ${T.border}`,

                  borderRadius: 12,

                  padding: "10px 16px",

                }}

              >

                <button

                  onClick={() => set("floors", Math.max(1, form.floors - 1))}

                  style={{

                    width: 34,

                    height: 34,

                    borderRadius: "50%",

                    background: T.surface2,

                    border: `1px solid ${T.border}`,

                    fontSize: 18,

                    cursor: "pointer",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  −

                </button>

                <div style={{ flex: 1, textAlign: "center" }}>

                  <span

                    style={{ fontSize: 28, fontWeight: 900, color: T.blue }}

                  >

                    {form.floors}

                  </span>

                  <span style={{ fontSize: 13, color: T.textSub }}>

                    {" "}

                    nivel{form.floors > 1 ? "es" : ""}

                  </span>

                </div>

                <button

                  onClick={() => set("floors", Math.min(10, form.floors + 1))}

                  style={{

                    width: 34,

                    height: 34,

                    borderRadius: "50%",

                    background: T.blueLt,

                    border: `1.5px solid ${T.blue}`,

                    fontSize: 18,

                    cursor: "pointer",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    color: T.blue,

                    fontWeight: 700,

                  }}

                >

                  +

                </button>

              </div>

            </div>

            {/* Schedule */}

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 6,

                }}

              >

                HORARIO

              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>

                {[

                  ["24h", "🕐 24/7"],

                  ["custom", "⏰ Horario específico"],

                ].map(([k, l]) => (

                  <button

                    key={k}

                    onClick={() => set("schedule", k)}

                    style={{

                      flex: 1,

                      padding: "9px 8px",

                      borderRadius: 10,

                      border: `1.5px solid ${

                        form.schedule === k ? T.blue : T.border

                      }`,

                      background: form.schedule === k ? T.blueLt : T.bg,

                      color: form.schedule === k ? T.blue : T.textSub,

                      fontSize: 12,

                      fontWeight: 700,

                      cursor: "pointer",

                      fontFamily: font,

                    }}

                  >

                    {l}

                  </button>

                ))}

              </div>

              {form.schedule === "custom" && (

                <div style={{ display: "flex", gap: 10 }}>

                  <FInput

                    label="ABRE"

                    value={form.openTime}

                    onChange={(v) => set("openTime", v)}

                    placeholder="07:00"

                    type="time"

                    half

                  />

                  <FInput

                    label="CIERRA"

                    value={form.closeTime}

                    onChange={(v) => set("closeTime", v)}

                    placeholder="23:00"

                    type="time"

                    half

                  />

                </div>

              )}

            </div>

            <FTextarea

              label="DESCRIPCIÓN"

              value={form.description}

              onChange={(v) => set("description", v)}

              placeholder="Describe tu parqueo: materiales, seguridad, cómo encontrarlo..."

            />

            <FTextarea

              label="REGLAS DEL PARQUEO"

              value={form.rules}

              onChange={(v) => set("rules", v)}

              placeholder="Ej: No se permiten camiones. Respeta las señales de velocidad..."

            />

          </>

        )}

        {/* STEP 2 — ESPACIOS (preview) */}

        {step === 2 && (

          <>

            <Card style={{ marginBottom: 14 }}>

              <div style={{ textAlign: "center", padding: "8px 0 16px" }}>

                <div style={{ fontSize: 40, marginBottom: 8 }}>🅿️</div>

                <div style={{ fontWeight: 900, fontSize: 18, color: T.text }}>

                  {form.totalSpaces} espacios · {form.floors} nivel

                  {form.floors > 1 ? "es" : ""}

                </div>

                <div style={{ fontSize: 12, color: T.textSub, marginTop: 4 }}>

                  Vista previa del mapa de tu parqueo

                </div>

              </div>

              {/* Space grid preview — numbers only */}

              <div

                style={{

                  display: "grid",

                  gridTemplateColumns: "repeat(5,1fr)",

                  gap: 5,

                  marginBottom: 12,

                }}

              >

                {Array.from(

                  { length: Math.min(form.totalSpaces, 25) },

                  (_, i) => (

                    <div

                      key={i}

                      style={{

                        background: T.greenLt,

                        border: `1px solid ${T.greenMid}`,

                        borderRadius: 8,

                        padding: "8px 2px",

                        textAlign: "center",

                      }}

                    >

                      <div

                        style={{

                          fontSize: 12,

                          fontWeight: 900,

                          color: T.green,

                        }}

                      >

                        {i + 1}

                      </div>

                    </div>

                  )

                )}

                {form.totalSpaces > 25 && (

                  <div

                    style={{

                      gridColumn: "span 5",

                      textAlign: "center",

                      fontSize: 11,

                      color: T.textFaint,

                      padding: "6px 0",

                    }}

                  >

                    +{form.totalSpaces - 25} espacios más · podrás nombrarlos en

                    el panel

                  </div>

                )}

              </div>

              <div

                style={{

                  background: T.blueLt,

                  borderRadius: 10,

                  padding: "9px 12px",

                  fontSize: 11,

                  color: T.blue,

                  fontWeight: 600,

                }}

              >

                💡 Podrás personalizar los identificadores (A1, VIP, T1...) y

                secciones desde el panel de administración.

              </div>

            </Card>

          </>

        )}

        {/* STEP 3 — SERVICIOS */}

        {step === 3 && (

          <Card>

            <SectionLabel>¿Qué servicios ofrece tu parqueo?</SectionLabel>

            <div style={{ fontSize: 12, color: T.textSub, marginBottom: 14 }}>

              Selecciona todos los que apliquen. Puedes editarlos después.

            </div>

            {AMENITY_LIST.map((a, i) => (

              <div key={a.key}>

                {i > 0 && <div style={{ height: 1, background: T.border }} />}

                <div

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 12,

                    padding: "12px 0",

                    cursor: "pointer",

                  }}

                  onClick={() => setAm(a.key, !form.amenities[a.key])}

                >

                  <div

                    style={{

                      width: 40,

                      height: 40,

                      borderRadius: 12,

                      background: form.amenities[a.key]

                        ? T.greenLt

                        : T.surface2,

                      border: `1.5px solid ${

                        form.amenities[a.key] ? T.greenMid : T.border

                      }`,

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      fontSize: 20,

                      flexShrink: 0,

                    }}

                  >

                    {a.icon}

                  </div>

                  <div

                    style={{

                      flex: 1,

                      fontWeight: 700,

                      fontSize: 14,

                      color: form.amenities[a.key] ? T.text : T.textSub,

                    }}

                  >

                    {a.label}

                  </div>

                  <div

                    style={{

                      width: 44,

                      height: 26,

                      borderRadius: 13,

                      background: form.amenities[a.key] ? T.green : T.surface2,

                      border: `1.5px solid ${

                        form.amenities[a.key] ? T.green : T.borderMd

                      }`,

                      position: "relative",

                      flexShrink: 0,

                    }}

                  >

                    <div

                      style={{

                        position: "absolute",

                        top: 2,

                        left: form.amenities[a.key] ? 20 : 2,

                        width: 19,

                        height: 19,

                        borderRadius: "50%",

                        background: "#fff",

                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",

                        transition: "left 0.2s",

                      }}

                    />

                  </div>

                </div>

              </div>

            ))}

          </Card>

        )}

        {/* STEP 4 — FOTOS */}

        {step === 4 && (

          <>

            <div style={{ marginBottom: 14 }}>

              <div

                style={{

                  fontSize: 11,

                  fontWeight: 700,

                  color: T.textSub,

                  marginBottom: 8,

                }}

              >

                FOTOS DEL PARQUEO

              </div>

              <div

                style={{

                  display: "grid",

                  gridTemplateColumns: "1fr 1fr",

                  gap: 8,

                }}

              >

                {/* Upload placeholders */}

                {[0, 1, 2, 3].map((i) => (

                  <div

                    key={i}

                    style={{

                      height: 100,

                      borderRadius: 14,

                      border: `2px dashed ${i === 0 ? T.blue : T.border}`,

                      background: i === 0 ? T.blueLt : T.surface2,

                      display: "flex",

                      flexDirection: "column",

                      alignItems: "center",

                      justifyContent: "center",

                      cursor: "pointer",

                      gap: 6,

                    }}

                  >

                    {i === 0 && (

                      <div

                        style={{

                          fontSize: 8,

                          fontWeight: 700,

                          color: T.blue,

                          background: T.blue,

                          color: "#fff",

                          borderRadius: 10,

                          padding: "2px 8px",

                        }}

                      >

                        PORTADA

                      </div>

                    )}

                    <svg

                      width="24"

                      height="24"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={i === 0 ? T.blue : T.textFaint}

                      strokeWidth="1.5"

                      strokeLinecap="round"

                    >

                      <rect x="3" y="3" width="18" height="18" rx="2" />

                      <circle cx="8.5" cy="8.5" r="1.5" />

                      <polyline points="21 15 16 10 5 21" />

                    </svg>

                    <span

                      style={{

                        fontSize: 10,

                        color: i === 0 ? T.blue : T.textFaint,

                        fontWeight: 600,

                      }}

                    >

                      {i === 0 ? "Foto principal" : "Agregar foto"}

                    </span>

                  </div>

                ))}

              </div>

            </div>

            <div

              style={{

                background: T.surface,

                borderRadius: 12,

                padding: "12px 14px",

                fontSize: 12,

                color: T.textSub,

                lineHeight: 1.6,

              }}

            >

              <div style={{ fontWeight: 700, color: T.text, marginBottom: 4 }}>

                📸 Consejos para mejores fotos:

              </div>

              <div>• Fotografía en luz natural de día</div>

              <div>• Muestra la entrada y los espacios</div>

              <div>• Incluye señalizaciones visibles</div>

              <div>• Al menos 3 fotos mejoran conversiones en 60%</div>

            </div>

          </>

        )}

        {/* STEP 5 — REVISIÓN */}

        {step === 5 && (

          <>

            <Card style={{ marginBottom: 14 }}>

              <div

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  marginBottom: 14,

                }}

              >

                <div

                  style={{

                    width: 52,

                    height: 52,

                    borderRadius: 14,

                    background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <ParkealoPinLogo size={28} variant="white" />

                </div>

                <div>

                  <div style={{ fontWeight: 900, fontSize: 16, color: T.text }}>

                    {form.name || "Sin nombre"}

                  </div>

                  <div style={{ fontSize: 12, color: T.textSub }}>

                    {form.address || "Sin dirección"}

                  </div>

                </div>

              </div>

              {[

                ["Tipo", form.type === "private" ? "🔒 Privado" : "🏢 Público"],

                ["Sector", form.sector || "—"],

                [

                  "Espacios",

                  `${form.totalSpaces} espacios · ${form.floors} nivel${

                    form.floors > 1 ? "es" : ""

                  }`,

                ],

                [

                  "Horario",

                  form.schedule === "24h"

                    ? "24 horas"

                    : (() => {

                        const fmt = (t) => {

                          if (!t) return "";

                          const [h, m] = t.split(":").map(Number);

                          const ampm = h >= 12 ? "PM" : "AM";

                          return `${h % 12 || 12}:${String(m).padStart(

                            2,

                            "0"

                          )} ${ampm}`;

                        };

                        return `${fmt(form.openTime)} – ${fmt(form.closeTime)}`;

                      })(),

                ],

                ["Contacto", form.phone || "—"],

                [

                  "Servicios",

                  `${

                    Object.values(form.amenities).filter(Boolean).length

                  } activos`,

                ],

              ].map(([l, v]) => (

                <div

                  key={l}

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    padding: "9px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <span style={{ fontSize: 12, color: T.textSub }}>{l}</span>

                  <span

                    style={{ fontSize: 13, fontWeight: 700, color: T.text }}

                  >

                    {v}

                  </span>

                </div>

              ))}

            </Card>

            <div

              style={{

                background: T.blueLt,

                border: `1.5px solid ${T.blueMid}`,

                borderRadius: 14,

                padding: "12px 16px",

                marginBottom: 14,

              }}

            >

              <div

                style={{

                  fontWeight: 800,

                  color: T.blue,

                  fontSize: 13,

                  marginBottom: 4,

                }}

              >

                📋 ¿Qué pasa después?

              </div>

              <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>

                Tu parqueo será revisado por el equipo de Parkealo en máximo 2

                horas. Una vez aprobado, aparecerá en el mapa y podrás empezar a

                recibir reservas.

              </div>

            </div>

          </>

        )}

      </div>

      {/* Navigation buttons */}

      <div

        style={{

          padding: "12px 16px 28px",

          background: T.bg,

          borderTop: `1px solid ${T.border}`,

          display: "flex",

          gap: 10,

          flexShrink: 0,

        }}

      >

        {step > 0 && (

          <Btn

            onClick={() => setStep((s) => s - 1)}

            variant="secondary"

            style={{ flex: 1 }}

          >

            ← Atrás

          </Btn>

        )}

        {step < STEPS.length - 1 ? (

          <Btn

            onClick={() => {

              if (canNext()) setStep((s) => s + 1);

            }}

            variant="blue"

            style={{ flex: 2, opacity: canNext() ? 1 : 0.5 }}

          >

            Continuar →

          </Btn>

        ) : (

          <Btn

            onClick={() => setSaved(true)}

            variant="green"

            style={{ flex: 2 }}

          >

            Publicar parqueo

          </Btn>

        )}

      </div>

    </div>

  );

}

// ─── DISPUTE SYSTEM ──────────────────────────────────────────────────────────

const DISPUTE_CATEGORIES = [

  { key: "space_unavailable", label: "Espacio no disponible", icon: "🚫" },

  { key: "wrong_charge", label: "Cobro incorrecto", icon: "💳" },

  { key: "host_no_approve", label: "Host no aprobó a tiempo", icon: "⏳" },

  { key: "vehicle_damage", label: "Daño al vehículo", icon: "🚗" },

  { key: "unsafe", label: "Condiciones inseguras", icon: "⚠️" },

  { key: "amenity_missing", label: "Servicio no disponible", icon: "❌" },

  { key: "other", label: "Otro", icon: "📋" },

];

const INITIAL_DISPUTES = [

  {

    id: "D001",

    status: "open",

    priority: "high",

    category: "space_unavailable",

    user: { name: "Carlos Marte", plate: "A123456", email: "carlos@email.com" },

    host: { name: "J. Martínez", parking: "Parqueo Colonial Premium" },

    amount: "RD$300",

    created: "Hace 1h",

    reservationId: "R-4821",

    description:

      "Llegué al parqueo y el espacio A3 estaba ocupado por otro vehículo sin reserva activa en la plataforma.",

    evidence: ["foto_espacio.jpg", "screenshot_reserva.png"],

    timeline: [

      {

        time: "10:32 AM",

        actor: "user",

        text: "Disputa abierta por el usuario",

      },

      {

        time: "10:33 AM",

        actor: "system",

        text: "Notificación enviada al host y al equipo Parkealo",

      },

    ],

    hostResponse: null,

    resolution: null,

  },

  {

    id: "D002",

    status: "reviewing",

    priority: "medium",

    category: "wrong_charge",

    user: { name: "María García", plate: "B789012", email: "maria@email.com" },

    host: { name: "M. García", parking: "Bella Vista" },

    amount: "RD$85",

    created: "Hace 3h",

    reservationId: "R-4799",

    description:

      "Se me cobró un sobretiempo de 34 minutos pero salí dentro del tiempo reservado. Tengo foto del ticket de salida.",

    evidence: ["ticket_salida.jpg"],

    timeline: [

      { time: "8:15 AM", actor: "user", text: "Disputa abierta" },

      {

        time: "8:17 AM",

        actor: "system",

        text: "Caso asignado al equipo de soporte",

      },

      {

        time: "9:02 AM",

        actor: "host",

        text: "Host respondió: El sistema registra salida a las 2:34 PM, 34 min después del límite.",

      },

      {

        time: "9:45 AM",

        actor: "admin",

        text: "Solicitando evidencia adicional al usuario",

      },

    ],

    hostResponse:

      "El sistema registra la salida a las 2:34 PM, 34 minutos después del límite reservado.",

    resolution: null,

  },

  {

    id: "D003",

    status: "resolved",

    priority: "low",

    category: "host_no_approve",

    user: { name: "Juan Rodríguez", plate: "C234567", email: "juan@email.com" },

    host: { name: "R. Pérez", parking: "VIP Piantini" },

    amount: "RD$200",

    created: "Hace 5h",

    reservationId: "R-4780",

    description:

      "El host tardó más de 2 horas en aprobar mi reserva privada y llegué tarde a mi reunión.",

    evidence: [],

    timeline: [

      { time: "7:00 AM", actor: "user", text: "Disputa abierta" },

      { time: "7:02 AM", actor: "system", text: "Caso creado — SLA: 24h" },

      {

        time: "9:30 AM",

        actor: "admin",

        text: "Se verificó el tiempo de aprobación del host: 2h 18min (incumple SLA de 30min)",

      },

      {

        time: "10:00 AM",

        actor: "admin",

        text: "Reembolso aprobado. Host penalizado.",

      },

    ],

    hostResponse: "No vi la notificación a tiempo.",

    resolution: {

      type: "refund",

      amount: "RD$200",

      note: "Reembolso completo por incumplimiento del SLA del host.",

    },

  },

  {

    id: "D004",

    status: "open",

    priority: "high",

    category: "vehicle_damage",

    user: { name: "Ana Castillo", plate: "D901234", email: "ana@email.com" },

    host: { name: "A. Rodríguez", parking: "Naco Center" },

    amount: "RD$1,500",

    created: "Hace 20 min",

    reservationId: "R-4835",

    description:

      "Al recoger mi vehículo encontré un rayón en la puerta del conductor. El parqueo tiene cámaras pero el host dice que no vio nada.",

    evidence: ["foto_danio_1.jpg", "foto_danio_2.jpg", "foto_danio_3.jpg"],

    timeline: [

      {

        time: "11:45 AM",

        actor: "user",

        text: "Disputa abierta con 3 fotos de evidencia",

      },

      {

        time: "11:46 AM",

        actor: "system",

        text: "Caso marcado como ALTA PRIORIDAD — daño a vehículo",

      },

    ],

    hostResponse: null,

    resolution: null,

  },

];

function DisputeSystem() {

  const [disputes, setDisputes] = useState(INITIAL_DISPUTES);

  const [selected, setSelected] = useState(null);

  const [filterStatus, setFilter] = useState("all");

  const [filterPriority, setPriority] = useState("all");

  const [replyText, setReplyText] = useState("");

  const [showResolve, setShowResolve] = useState(false);

  const [resolveType, setResolveType] = useState("refund");

  const [resolveNote, setResolveNote] = useState("");

  const STATUS_CONFIG = {

    open: { label: "Abierta", color: T.danger, bg: T.dangerBg, bd: T.dangerBd },

    reviewing: {

      label: "En revisión",

      color: T.warn,

      bg: T.warnBg,

      bd: T.warnBd,

    },

    resolved: {

      label: "Resuelta",

      color: T.green,

      bg: T.greenLt,

      bd: T.greenMid,

    },

    closed: {

      label: "Cerrada",

      color: T.textSub,

      bg: T.surface2,

      bd: T.border,

    },

  };

  const PRIORITY_CONFIG = {

    high: { label: "Alta", color: "#B8172A", dot: "#FF4444" },

    medium: { label: "Media", color: T.warn, dot: "#F59E0B" },

    low: { label: "Baja", color: T.textSub, dot: "#9BAFD0" },

  };

  const filtered = disputes.filter((d) => {

    const matchStatus = filterStatus === "all" || d.status === filterStatus;

    const matchPriority =

      filterPriority === "all" || d.priority === filterPriority;

    return matchStatus && matchPriority;

  });

  const counts = {

    open: disputes.filter((d) => d.status === "open").length,

    reviewing: disputes.filter((d) => d.status === "reviewing").length,

    resolved: disputes.filter((d) => d.status === "resolved").length,

  };

  const sendReply = (id) => {

    if (!replyText.trim()) return;

    const now = new Date().toLocaleTimeString("es-DO", {

      hour: "2-digit",

      minute: "2-digit",

    });

    setDisputes((prev) =>

      prev.map((d) =>

        d.id !== id

          ? d

          : {

              ...d,

              status: "reviewing",

              timeline: [

                ...d.timeline,

                { time: now, actor: "admin", text: replyText.trim() },

              ],

            }

      )

    );

    setReplyText("");

  };

  const resolveDispute = (id) => {

    const now = new Date().toLocaleTimeString("es-DO", {

      hour: "2-digit",

      minute: "2-digit",

    });

    setDisputes((prev) =>

      prev.map((d) =>

        d.id !== id

          ? d

          : {

              ...d,

              status: "resolved",

              resolution: { type: resolveType, note: resolveNote },

              timeline: [

                ...d.timeline,

                {

                  time: now,

                  actor: "admin",

                  text: `Disputa resuelta — ${

                    resolveType === "refund"

                      ? "Reembolso aprobado"

                      : resolveType === "warning"

                      ? "Advertencia al host"

                      : resolveType === "dismiss"

                      ? "Caso desestimado"

                      : "Resolución parcial"

                  }. ${resolveNote}`,

                },

              ],

            }

      )

    );

    setShowResolve(false);

    setResolveNote("");

    setSelected(null);

  };

  const getCat = (key) =>

    DISPUTE_CATEGORIES.find((c) => c.key === key) || DISPUTE_CATEGORIES[6];

  // ── Detail view ──

  if (selected) {

    const d = disputes.find((dd) => dd.id === selected);

    if (!d) {

      setSelected(null);

      return null;

    }

    const sc = STATUS_CONFIG[d.status];

    const pc = PRIORITY_CONFIG[d.priority];

    const cat = getCat(d.category);

    return (

      <div

        style={{

          position: "absolute",

          inset: 0,

          zIndex: 10,

          background: T.surface,

          overflowY: "auto",

          paddingBottom: 80,

        }}

      >

        {/* Header */}

        <div

          style={{

            background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

            padding: "14px 16px",

          }}

        >

          <div

            style={{

              display: "flex",

              alignItems: "center",

              gap: 12,

              marginBottom: 10,

            }}

          >

            <button

              onClick={() => {

                setSelected(null);

                setShowResolve(false);

              }}

              style={{

                background: "rgba(255,255,255,0.15)",

                border: "none",

                borderRadius: "50%",

                width: 32,

                height: 32,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                cursor: "pointer",

              }}

            >

              <svg

                width="14"

                height="14"

                viewBox="0 0 24 24"

                fill="none"

                stroke="#fff"

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="15 18 9 12 15 6" />

              </svg>

            </button>

            <div style={{ flex: 1 }}>

              <div style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>

                Disputa #{d.id}

              </div>

              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>

                {d.reservationId} · {d.created}

              </div>

            </div>

            <div

              style={{

                display: "flex",

                flexDirection: "column",

                alignItems: "flex-end",

                gap: 4,

              }}

            >

              <span

                style={{

                  background: sc.bg,

                  color: sc.color,

                  border: `1px solid ${sc.bd}`,

                  borderRadius: 20,

                  padding: "2px 10px",

                  fontSize: 10,

                  fontWeight: 800,

                }}

              >

                {sc.label}

              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>

                <div

                  style={{

                    width: 7,

                    height: 7,

                    borderRadius: "50%",

                    background: pc.dot,

                  }}

                />

                <span

                  style={{

                    fontSize: 10,

                    color: "rgba(255,255,255,0.7)",

                    fontWeight: 600,

                  }}

                >

                  Prioridad {pc.label}

                </span>

              </div>

            </div>

          </div>

        </div>

        <div style={{ padding: "14px 14px" }}>

          {/* Category + amount */}

          <Card style={{ marginBottom: 12 }}>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

              <div

                style={{

                  width: 44,

                  height: 44,

                  borderRadius: 14,

                  background: T.dangerBg,

                  border: `1.5px solid ${T.dangerBd}`,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  fontSize: 22,

                  flexShrink: 0,

                }}

              >

                {cat.icon}

              </div>

              <div style={{ flex: 1 }}>

                <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>

                  {cat.label}

                </div>

                <div style={{ fontSize: 12, color: T.textSub }}>

                  Monto en disputa:{" "}

                  <strong style={{ color: T.danger }}>{d.amount}</strong>

                </div>

              </div>

            </div>

          </Card>

          {/* Parties */}

          <Card style={{ marginBottom: 12 }}>

            <SectionLabel>Partes involucradas</SectionLabel>

            <div style={{ display: "flex", gap: 10 }}>

              {[

                {

                  role: "Usuario",

                  name: d.user.name,

                  sub: d.user.plate,

                  icon: "👤",

                  c: T.blue,

                },

                {

                  role: "Host",

                  name: d.host.name,

                  sub: d.host.parking,

                  icon: "🏢",

                  c: T.green,

                },

              ].map((p) => (

                <div

                  key={p.role}

                  style={{

                    flex: 1,

                    background: T.surface,

                    borderRadius: 12,

                    padding: "10px 12px",

                  }}

                >

                  <div

                    style={{

                      fontSize: 10,

                      fontWeight: 700,

                      color: T.textFaint,

                      marginBottom: 4,

                    }}

                  >

                    {p.role}

                  </div>

                  <div

                    style={{ display: "flex", alignItems: "center", gap: 8 }}

                  >

                    <div

                      style={{

                        width: 32,

                        height: 32,

                        borderRadius: "50%",

                        background: p.c,

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "center",

                        fontSize: 16,

                        flexShrink: 0,

                      }}

                    >

                      {p.icon}

                    </div>

                    <div style={{ minWidth: 0 }}>

                      <div

                        style={{

                          fontSize: 13,

                          fontWeight: 800,

                          color: T.text,

                          overflow: "hidden",

                          textOverflow: "ellipsis",

                          whiteSpace: "nowrap",

                        }}

                      >

                        {p.name}

                      </div>

                      <div

                        style={{

                          fontSize: 10,

                          color: T.textSub,

                          overflow: "hidden",

                          textOverflow: "ellipsis",

                          whiteSpace: "nowrap",

                        }}

                      >

                        {p.sub}

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </Card>

          {/* Description */}

          <Card style={{ marginBottom: 12 }}>

            <SectionLabel>Descripción del usuario</SectionLabel>

            <div

              style={{

                background: T.surface,

                borderRadius: 12,

                padding: "12px 14px",

                fontSize: 13,

                color: T.text,

                lineHeight: 1.6,

              }}

            >

              {d.description}

            </div>

            {d.evidence.length > 0 && (

              <div style={{ marginTop: 10 }}>

                <div

                  style={{

                    fontSize: 11,

                    fontWeight: 700,

                    color: T.textSub,

                    marginBottom: 6,

                  }}

                >

                  Evidencia adjunta

                </div>

                <div style={{ display: "flex", gap: 8 }}>

                  {d.evidence.map((e, i) => (

                    <div

                      key={i}

                      style={{

                        background: T.blueLt,

                        border: `1px solid ${T.blueMid}`,

                        borderRadius: 8,

                        padding: "5px 10px",

                        fontSize: 10,

                        color: T.blue,

                        fontWeight: 700,

                      }}

                    >

                      📎 {e}

                    </div>

                  ))}

                </div>

              </div>

            )}

          </Card>

          {/* Host response */}

          {d.hostResponse && (

            <Card style={{ marginBottom: 12 }}>

              <SectionLabel>Respuesta del host</SectionLabel>

              <div

                style={{

                  background: T.greenLt,

                  border: `1px solid ${T.greenMid}`,

                  borderRadius: 12,

                  padding: "10px 14px",

                  fontSize: 13,

                  color: T.text,

                  lineHeight: 1.6,

                }}

              >

                {d.hostResponse}

              </div>

            </Card>

          )}

          {/* Timeline */}

          <Card style={{ marginBottom: 12 }}>

            <SectionLabel>Historial del caso</SectionLabel>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

              {d.timeline.map((e, i) => {

                const colors = {

                  user: T.blue,

                  host: T.green,

                  system: T.textFaint,

                  admin: "#7C3AED",

                };

                const labels = {

                  user: "Usuario",

                  host: "Host",

                  system: "Sistema",

                  admin: "Parkealo",

                };

                const col = colors[e.actor] || T.textFaint;

                return (

                  <div

                    key={i}

                    style={{

                      display: "flex",

                      gap: 12,

                      paddingBottom: i < d.timeline.length - 1 ? 12 : 0,

                    }}

                  >

                    <div

                      style={{

                        display: "flex",

                        flexDirection: "column",

                        alignItems: "center",

                        flexShrink: 0,

                      }}

                    >

                      <div

                        style={{

                          width: 10,

                          height: 10,

                          borderRadius: "50%",

                          background: col,

                          border: `2px solid ${col}`,

                          marginTop: 2,

                        }}

                      />

                      {i < d.timeline.length - 1 && (

                        <div

                          style={{

                            width: 2,

                            flex: 1,

                            background: T.border,

                            marginTop: 3,

                          }}

                        />

                      )}

                    </div>

                    <div

                      style={{

                        flex: 1,

                        paddingBottom: i < d.timeline.length - 1 ? 0 : 0,

                      }}

                    >

                      <div

                        style={{

                          display: "flex",

                          justifyContent: "space-between",

                          marginBottom: 2,

                        }}

                      >

                        <span

                          style={{ fontSize: 11, fontWeight: 800, color: col }}

                        >

                          {labels[e.actor]}

                        </span>

                        <span style={{ fontSize: 10, color: T.textFaint }}>

                          {e.time}

                        </span>

                      </div>

                      <div

                        style={{

                          fontSize: 12,

                          color: T.textMid,

                          lineHeight: 1.5,

                        }}

                      >

                        {e.text}

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          </Card>

          {/* Resolution card if resolved */}

          {d.resolution && (

            <Card

              style={{ marginBottom: 12, borderLeft: `4px solid ${T.green}` }}

            >

              <SectionLabel>Resolución</SectionLabel>

              <div

                style={{

                  background: T.greenLt,

                  borderRadius: 12,

                  padding: "10px 14px",

                }}

              >

                <div

                  style={{

                    fontSize: 13,

                    fontWeight: 800,

                    color: T.green,

                    marginBottom: 4,

                  }}

                >

                  {d.resolution.type === "refund"

                    ? "💳 Reembolso aprobado"

                    : d.resolution.type === "warning"

                    ? "⚠️ Advertencia emitida"

                    : d.resolution.type === "dismiss"

                    ? "✗ Caso desestimado"

                    : "⚡ Resolución parcial"}

                </div>

                <div style={{ fontSize: 12, color: T.textMid }}>

                  {d.resolution.note}

                </div>

              </div>

            </Card>

          )}

          {/* Admin reply box */}

          {d.status !== "resolved" && d.status !== "closed" && (

            <Card style={{ marginBottom: 12 }}>

              <SectionLabel>Respuesta del equipo</SectionLabel>

              <textarea

                value={replyText}

                onChange={(e) => setReplyText(e.target.value)}

                placeholder="Escribe una respuesta visible para el usuario y el host…"

                rows={3}

                style={{

                  width: "100%",

                  background: T.surface,

                  border: `1.5px solid ${T.borderMd}`,

                  borderRadius: 10,

                  padding: "10px 12px",

                  fontSize: 13,

                  fontFamily: font,

                  outline: "none",

                  color: T.text,

                  boxSizing: "border-box",

                  resize: "none",

                  lineHeight: 1.5,

                  marginBottom: 10,

                }}

              />

              <div style={{ display: "flex", gap: 8 }}>

                <button

                  onClick={() => sendReply(d.id)}

                  disabled={!replyText.trim()}

                  style={{

                    flex: 1,

                    background: replyText.trim() ? T.blue : T.surface2,

                    border: "none",

                    borderRadius: 10,

                    padding: "10px 0",

                    color: replyText.trim() ? "#fff" : T.textFaint,

                    fontFamily: font,

                    fontWeight: 700,

                    fontSize: 13,

                    cursor: replyText.trim() ? "pointer" : "default",

                  }}

                >

                  Enviar respuesta

                </button>

                <button

                  onClick={() => setShowResolve(true)}

                  style={{

                    flex: 1,

                    background: T.greenLt,

                    border: `1.5px solid ${T.greenMid}`,

                    borderRadius: 10,

                    padding: "10px 0",

                    color: T.green,

                    fontFamily: font,

                    fontWeight: 700,

                    fontSize: 13,

                    cursor: "pointer",

                  }}

                >

                  Resolver disputa

                </button>

              </div>

            </Card>

          )}

          {/* Quick actions */}

          {d.status !== "resolved" && (

            <Card>

              <SectionLabel>Acciones rápidas</SectionLabel>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                {[

                  {

                    label: "Solicitar evidencia al usuario",

                    icon: "📎",

                    action: () => {

                      setReplyText(

                        "Por favor adjunta capturas de pantalla o fotos como evidencia para continuar con la revisión."

                      );

                    },

                  },

                  {

                    label: "Notificar al host",

                    icon: "🏢",

                    action: () => {

                      setReplyText(

                        "Hemos notificado al host y esperamos su respuesta en las próximas horas."

                      );

                    },

                  },

                  {

                    label: "Escalar a revisión legal",

                    icon: "⚖️",

                    action: () => {

                      setDisputes((prev) =>

                        prev.map((dd) =>

                          dd.id !== d.id ? dd : { ...dd, priority: "high" }

                        )

                      );

                    },

                  },

                  {

                    label: "Suspender al host temporalmente",

                    icon: "🚫",

                    action: () => {

                      setDisputes((prev) =>

                        prev.map((dd) =>

                          dd.id !== d.id

                            ? dd

                            : {

                                ...dd,

                                status: "reviewing",

                                timeline: [

                                  ...dd.timeline,

                                  {

                                    time: "Ahora",

                                    actor: "admin",

                                    text: "Host suspendido temporalmente mientras se investiga.",

                                  },

                                ],

                              }

                        )

                      );

                    },

                  },

                ].map((a, i) => (

                  <button

                    key={i}

                    onClick={a.action}

                    style={{

                      display: "flex",

                      alignItems: "center",

                      gap: 12,

                      padding: "10px 14px",

                      borderRadius: 12,

                      border: `1px solid ${T.border}`,

                      background: T.bg,

                      cursor: "pointer",

                      fontFamily: font,

                      textAlign: "left",

                    }}

                  >

                    <span style={{ fontSize: 18 }}>{a.icon}</span>

                    <span

                      style={{ fontSize: 13, color: T.text, fontWeight: 600 }}

                    >

                      {a.label}

                    </span>

                    <svg

                      width="12"

                      height="12"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={T.textFaint}

                      strokeWidth="2.5"

                      strokeLinecap="round"

                      style={{ marginLeft: "auto" }}

                    >

                      <polyline points="9 18 15 12 9 6" />

                    </svg>

                  </button>

                ))}

              </div>

            </Card>

          )}

        </div>

        {/* Resolve modal */}

        {showResolve && (

          <div

            style={{

              position: "fixed",

              inset: 0,

              zIndex: 700,

              background: "rgba(13,27,62,0.6)",

              display: "flex",

              alignItems: "flex-end",

            }}

          >

            <div

              style={{

                background: T.bg,

                borderRadius: "22px 22px 0 0",

                width: "100%",

                padding: "20px 18px 36px",

              }}

            >

              <div

                style={{

                  width: 40,

                  height: 4,

                  background: T.border,

                  borderRadius: 2,

                  margin: "0 auto 18px",

                }}

              />

              <div

                style={{

                  fontWeight: 900,

                  fontSize: 17,

                  color: T.text,

                  marginBottom: 16,

                }}

              >

                Resolver disputa #{d.id}

              </div>

              <div

                style={{

                  display: "flex",

                  flexDirection: "column",

                  gap: 8,

                  marginBottom: 16,

                }}

              >

                {[

                  {

                    key: "refund",

                    label: "Reembolso completo",

                    icon: "💳",

                    sub: `Devolver ${d.amount} al usuario`,

                  },

                  {

                    key: "partial",

                    label: "Reembolso parcial",

                    icon: "⚡",

                    sub: "Monto acordado entre partes",

                  },

                  {

                    key: "warning",

                    label: "Advertencia al host",

                    icon: "⚠️",

                    sub: "Sin reembolso, se penaliza al host",

                  },

                  {

                    key: "dismiss",

                    label: "Desestimar caso",

                    icon: "✗",

                    sub: "La disputa no procede",

                  },

                ].map((r) => (

                  <button

                    key={r.key}

                    onClick={() => setResolveType(r.key)}

                    style={{

                      display: "flex",

                      alignItems: "center",

                      gap: 12,

                      padding: "12px 14px",

                      borderRadius: 14,

                      border: `2px solid ${

                        resolveType === r.key ? T.blue : T.border

                      }`,

                      background: resolveType === r.key ? T.blueLt : T.bg,

                      cursor: "pointer",

                      fontFamily: font,

                      textAlign: "left",

                    }}

                  >

                    <span style={{ fontSize: 22 }}>{r.icon}</span>

                    <div>

                      <div

                        style={{

                          fontWeight: 800,

                          fontSize: 13,

                          color: resolveType === r.key ? T.blue : T.text,

                        }}

                      >

                        {r.label}

                      </div>

                      <div style={{ fontSize: 11, color: T.textSub }}>

                        {r.sub}

                      </div>

                    </div>

                  </button>

                ))}

              </div>

              <textarea

                value={resolveNote}

                onChange={(e) => setResolveNote(e.target.value)}

                placeholder="Nota interna de resolución (opcional)…"

                rows={2}

                style={{

                  width: "100%",

                  background: T.surface,

                  border: `1.5px solid ${T.border}`,

                  borderRadius: 10,

                  padding: "10px 12px",

                  fontSize: 13,

                  fontFamily: font,

                  outline: "none",

                  color: T.text,

                  boxSizing: "border-box",

                  resize: "none",

                  marginBottom: 14,

                }}

              />

              <div style={{ display: "flex", gap: 10 }}>

                <button

                  onClick={() => setShowResolve(false)}

                  style={{

                    flex: 1,

                    background: T.surface2,

                    border: "none",

                    borderRadius: 12,

                    padding: "13px 0",

                    fontFamily: font,

                    fontWeight: 700,

                    fontSize: 14,

                    color: T.textSub,

                    cursor: "pointer",

                  }}

                >

                  Cancelar

                </button>

                <button

                  onClick={() => resolveDispute(d.id)}

                  style={{

                    flex: 2,

                    background: `linear-gradient(135deg,${T.green},${T.greenDk})`,

                    border: "none",

                    borderRadius: 12,

                    padding: "13px 0",

                    fontFamily: font,

                    fontWeight: 800,

                    fontSize: 14,

                    color: "#fff",

                    cursor: "pointer",

                  }}

                >

                  Confirmar resolución

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    );

  }

  // ── List view ──

  return (

    <div>

      {/* Stats row */}

      <div

        style={{

          display: "grid",

          gridTemplateColumns: "1fr 1fr 1fr",

          gap: 8,

          marginBottom: 14,

        }}

      >

        {[

          {

            label: "Abiertas",

            value: counts.open,

            color: T.danger,

            bg: T.dangerBg,

          },

          {

            label: "En revisión",

            value: counts.reviewing,

            color: T.warn,

            bg: T.warnBg,

          },

          {

            label: "Resueltas",

            value: counts.resolved,

            color: T.green,

            bg: T.greenLt,

          },

        ].map((s) => (

          <div

            key={s.label}

            style={{

              background: s.bg,

              borderRadius: 12,

              padding: "10px 10px",

              textAlign: "center",

            }}

          >

            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>

              {s.value}

            </div>

            <div style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>

              {s.label}

            </div>

          </div>

        ))}

      </div>

      {/* Filters */}

      <div

        style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}

      >

        {[

          ["all", "Todas"],

          ["open", "Abiertas"],

          ["reviewing", "En revisión"],

          ["resolved", "Resueltas"],

        ].map(([k, l]) => (

          <button

            key={k}

            onClick={() => setFilter(k)}

            style={{

              padding: "5px 12px",

              borderRadius: 20,

              border: `1.5px solid ${filterStatus === k ? T.blue : T.border}`,

              background: filterStatus === k ? T.blueLt : T.bg,

              color: filterStatus === k ? T.blue : T.textSub,

              fontSize: 11,

              fontWeight: 700,

              cursor: "pointer",

              fontFamily: font,

            }}

          >

            {l}

          </button>

        ))}

        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>

          {[

            ["all", "🔵"],

            ["high", "🔴"],

            ["medium", "🟡"],

            ["low", "⚪"],

          ].map(([k, icon]) => (

            <button

              key={k}

              onClick={() => setPriority(k)}

              style={{

                padding: "5px 10px",

                borderRadius: 20,

                border: `1.5px solid ${

                  filterPriority === k ? T.blue : T.border

                }`,

                background: filterPriority === k ? T.blueLt : T.bg,

                fontSize: 12,

                cursor: "pointer",

              }}

            >

              {icon}

            </button>

          ))}

        </div>

      </div>

      {/* Dispute list */}

      {filtered.length === 0 ? (

        <div style={{ textAlign: "center", padding: "40px 20px" }}>

          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>

          <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>

            Sin disputas

          </div>

        </div>

      ) : (

        filtered.map((d) => {

          const sc = STATUS_CONFIG[d.status];

          const pc = PRIORITY_CONFIG[d.priority];

          const cat = getCat(d.category);

          return (

            <div

              key={d.id}

              onClick={() => setSelected(d.id)}

              style={{

                background: T.bg,

                borderRadius: 16,

                marginBottom: 10,

                border: `1px solid ${T.border}`,

                overflow: "hidden",

                boxShadow: T.shadowSm,

                cursor: "pointer",

              }}

            >

              {/* Priority stripe */}

              <div style={{ height: 3, background: pc.dot }} />

              <div style={{ padding: "12px 14px" }}>

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "flex-start",

                    marginBottom: 8,

                  }}

                >

                  <div

                    style={{ display: "flex", alignItems: "center", gap: 8 }}

                  >

                    <span style={{ fontSize: 18 }}>{cat.icon}</span>

                    <div>

                      <div

                        style={{ fontWeight: 800, color: T.text, fontSize: 13 }}

                      >

                        #{d.id} · {cat.label}

                      </div>

                      <div style={{ fontSize: 11, color: T.textSub }}>

                        {d.user.name} → {d.host.parking}

                      </div>

                    </div>

                  </div>

                  <div

                    style={{

                      display: "flex",

                      flexDirection: "column",

                      alignItems: "flex-end",

                      gap: 4,

                    }}

                  >

                    <span

                      style={{

                        background: sc.bg,

                        color: sc.color,

                        border: `1px solid ${sc.bd}`,

                        borderRadius: 20,

                        padding: "2px 9px",

                        fontSize: 10,

                        fontWeight: 800,

                      }}

                    >

                      {sc.label}

                    </span>

                    <span

                      style={{ fontSize: 11, fontWeight: 700, color: T.danger }}

                    >

                      {d.amount}

                    </span>

                  </div>

                </div>

                <div

                  style={{

                    fontSize: 12,

                    color: T.textMid,

                    lineHeight: 1.5,

                    background: T.surface,

                    borderRadius: 8,

                    padding: "8px 10px",

                    marginBottom: 8,

                    overflow: "hidden",

                    textOverflow: "ellipsis",

                    display: "-webkit-box",

                    WebkitLineClamp: 2,

                    WebkitBoxOrient: "vertical",

                  }}

                >

                  {d.description}

                </div>

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                  }}

                >

                  <div style={{ fontSize: 10, color: T.textFaint }}>

                    {d.created} · {d.timeline.length} eventos

                  </div>

                  <div

                    style={{ display: "flex", alignItems: "center", gap: 4 }}

                  >

                    <div

                      style={{

                        width: 6,

                        height: 6,

                        borderRadius: "50%",

                        background: pc.dot,

                      }}

                    />

                    <span

                      style={{

                        fontSize: 10,

                        color: T.textSub,

                        fontWeight: 600,

                      }}

                    >

                      Prioridad {pc.label}

                    </span>

                    <svg

                      width="12"

                      height="12"

                      viewBox="0 0 24 24"

                      fill="none"

                      stroke={T.textFaint}

                      strokeWidth="2.5"

                      strokeLinecap="round"

                      style={{ marginLeft: 4 }}

                    >

                      <polyline points="9 18 15 12 9 6" />

                    </svg>

                  </div>

                </div>

              </div>

            </div>

          );

        })

      )}

    </div>

  );

}

function DisputeActions() {

  const [st, setSt] = useState("open");

  if (st === "resolved")

    return (

      <div

        style={{

          background: T.greenLt,

          border: `1.5px solid ${T.greenMid}`,

          borderRadius: 10,

          padding: "8px 12px",

          color: T.green,

          fontSize: 13,

          fontWeight: 700,

        }}

      >

        ✓ Resuelta

      </div>

    );

  if (st === "suspended")

    return (

      <div

        style={{

          background: T.dangerBg,

          border: `1.5px solid ${T.dangerBd}`,

          borderRadius: 10,

          padding: "8px 12px",

          color: T.danger,

          fontSize: 13,

          fontWeight: 700,

        }}

      >

        ⊘ Usuario suspendido

      </div>

    );

  return (

    <div style={{ display: "flex", gap: 8 }}>

      <Btn small variant="green" onClick={() => setSt("resolved")}>

        Resolver

      </Btn>

      <Btn small variant="danger" onClick={() => setSt("suspended")}>

        Suspender

      </Btn>

    </div>

  );

}

function SuspendBtn({ spotId }) {

  const [susp, setSusp] = useState(false);

  return (

    <Btn

      small

      variant={susp ? "secondary" : "danger"}

      onClick={() => setSusp(!susp)}

    >

      {susp ? "Reactivar" : "Suspender"}

    </Btn>

  );

}

// ─── ADMIN SUPPORT PANEL ─────────────────────────────────────────────────────

function AdminSupportPanel() {

  const [activeConv, setActiveConv] = useState(null);

  const [input, setInput] = useState("");

  const bottomRef = useRef(null);

  const [convs, setConvs] = useState([

    {

      id: 1,

      user: "Carlos Marte",

      role: "user",

      plate: "A123456",

      category: "reservation",

      lastMsg: "El espacio A3 estaba ocupado al llegar",

      time: "10:32 AM",

      unread: 2,

      status: "open",

      messages: [

        {

          from: "user",

          text: "Hola, llegué al parqueo y el espacio A3 estaba ocupado.",

          time: "10:31 AM",

        },

        {

          from: "user",

          text: "¿Pueden ayudarme? Tenía reserva confirmada.",

          time: "10:32 AM",

        },

      ],

    },

    {

      id: 2,

      user: "María García",

      role: "user",

      plate: "B789012",

      category: "payment",

      lastMsg: "Se me cobró doble en mi tarjeta",

      time: "9:45 AM",

      unread: 1,

      status: "open",

      messages: [

        {

          from: "user",

          text: "Buenos días, vi un cargo duplicado en mi tarjeta por la reserva de ayer.",

          time: "9:45 AM",

        },

      ],

    },

    {

      id: 3,

      user: "J. Martínez",

      role: "host",

      plate: "",

      category: "payout",

      lastMsg: "¿Cuándo recibiré mi pago de esta semana?",

      time: "9:10 AM",

      unread: 0,

      status: "resolved",

      messages: [

        {

          from: "host",

          text: "Buen día, quería preguntar sobre el pago de esta semana.",

          time: "9:10 AM",

        },

        {

          from: "admin",

          text: "Hola Juan, el pago se procesa los viernes.",

          time: "9:15 AM",

        },

      ],

    },

    {

      id: 4,

      user: "Ana Castillo",

      role: "user",

      plate: "D901234",

      category: "damage",

      lastMsg: "Encontré un rayón en mi vehículo",

      time: "Ayer",

      unread: 3,

      status: "open",

      messages: [

        {

          from: "user",

          text: "Al retirar mi vehículo encontré un rayón en la puerta. Tengo fotos.",

          time: "Ayer",

        },

        { from: "user", text: "¿Cómo activo el seguro?", time: "Ayer" },

        { from: "user", text: "Nadie me responde.", time: "Ayer" },

      ],

    },

  ]);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  }, [activeConv, convs]);

  const sendAdmin = () => {

    const txt = input.trim();

    if (!txt || !activeConv) return;

    const now = new Date().toLocaleTimeString("es-DO", {

      hour: "2-digit",

      minute: "2-digit",

    });

    const updated = { from: "admin", text: txt, time: now };

    setConvs((prev) =>

      prev.map((c) =>

        c.id !== activeConv.id

          ? c

          : {

              ...c,

              lastMsg: txt,

              time: now,

              unread: 0,

              messages: [...c.messages, updated],

            }

      )

    );

    setActiveConv((prev) =>

      prev ? { ...prev, messages: [...prev.messages, updated] } : null

    );

    setInput("");

  };

  const ROLE_COLORS = { user: T.blue, host: T.green, admin: "#7C3AED" };

  const ROLE_LABELS = { user: "Usuario", host: "Host", admin: "Soporte" };

  const CAT_LABELS = {

    reservation: "Reserva",

    payment: "Pago",

    damage: "Daño",

    payout: "Pago host",

    other: "Consulta",

  };

  const totalUnread = convs.reduce((a, c) => a + c.unread, 0);

  if (activeConv) {

    const conv = convs.find((c) => c.id === activeConv.id) || activeConv;

    return (

      <div

        style={{

          position: "absolute",

          inset: 0,

          zIndex: 20,

          background: T.bg,

          display: "flex",

          flexDirection: "column",

        }}

      >

        <div

          style={{

            background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

            padding: "14px 16px",

            flexShrink: 0,

          }}

        >

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

            <button

              onClick={() => setActiveConv(null)}

              style={{

                background: "rgba(255,255,255,0.15)",

                border: "none",

                borderRadius: "50%",

                width: 32,

                height: 32,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                cursor: "pointer",

              }}

            >

              <svg

                width="14"

                height="14"

                viewBox="0 0 24 24"

                fill="none"

                stroke="#fff"

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="15 18 9 12 15 6" />

              </svg>

            </button>

            <div

              style={{

                width: 36,

                height: 36,

                borderRadius: "50%",

                background: ROLE_COLORS[conv.role],

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

              }}

            >

              <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>

                {conv.user[0]}

              </span>

            </div>

            <div style={{ flex: 1 }}>

              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>

                {conv.user}

              </div>

              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>

                {ROLE_LABELS[conv.role]} ·{" "}

                {CAT_LABELS[conv.category] || conv.category}

                {conv.plate ? ` · ${conv.plate}` : ""}

              </div>

            </div>

            {conv.status === "open" && (

              <button

                onClick={() => {

                  setConvs((p) =>

                    p.map((c) =>

                      c.id !== conv.id ? c : { ...c, status: "resolved" }

                    )

                  );

                  setActiveConv(null);

                }}

                style={{

                  background: "rgba(16,180,106,0.25)",

                  border: "1px solid rgba(16,180,106,0.5)",

                  borderRadius: 20,

                  padding: "5px 12px",

                  color: "#4ade80",

                  fontSize: 11,

                  fontWeight: 700,

                  cursor: "pointer",

                  fontFamily: font,

                }}

              >

                ✓ Resolver

              </button>

            )}

          </div>

        </div>

        <div

          style={{

            flex: 1,

            overflowY: "auto",

            padding: "14px",

            background: T.surface,

            display: "flex",

            flexDirection: "column",

            gap: 10,

          }}

        >

          {conv.messages.map((msg, i) => {

            const isAdmin = msg.from === "admin";

            const col = ROLE_COLORS[msg.from] || T.blue;

            return (

              <div

                key={i}

                style={{

                  display: "flex",

                  justifyContent: isAdmin ? "flex-end" : "flex-start",

                  alignItems: "flex-end",

                  gap: 8,

                }}

              >

                {!isAdmin && (

                  <div

                    style={{

                      width: 28,

                      height: 28,

                      borderRadius: "50%",

                      background: col,

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      flexShrink: 0,

                    }}

                  >

                    <span

                      style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}

                    >

                      {conv.user[0]}

                    </span>

                  </div>

                )}

                <div style={{ maxWidth: "72%" }}>

                  {!isAdmin && (

                    <div

                      style={{

                        fontSize: 9,

                        color: col,

                        fontWeight: 700,

                        marginBottom: 2,

                      }}

                    >

                      {ROLE_LABELS[msg.from]}

                    </div>

                  )}

                  <div

                    style={{

                      background: isAdmin

                        ? `linear-gradient(135deg,#7C3AED,#9D58F5)`

                        : T.bg,

                      borderRadius: isAdmin

                        ? "18px 18px 4px 18px"

                        : "18px 18px 18px 4px",

                      padding: "10px 14px",

                      boxShadow: T.shadowSm,

                    }}

                  >

                    <div

                      style={{

                        fontSize: 13,

                        color: isAdmin ? "#fff" : T.text,

                        lineHeight: 1.5,

                      }}

                    >

                      {msg.text}

                    </div>

                  </div>

                  <div

                    style={{

                      fontSize: 10,

                      color: T.textFaint,

                      marginTop: 3,

                      textAlign: isAdmin ? "right" : "left",

                    }}

                  >

                    {msg.time}

                  </div>

                </div>

              </div>

            );

          })}

          <div ref={bottomRef} />

        </div>

        <div

          style={{

            background: T.surface,

            borderTop: `1px solid ${T.border}`,

            padding: "8px 12px",

            display: "flex",

            gap: 6,

            overflowX: "auto",

            scrollbarWidth: "none",

          }}

        >

          {[

            "Estamos revisando tu caso",

            "Un agente te contactará pronto",

            "¿Puedes enviarnos fotos?",

            "El reembolso fue aprobado",

          ].map((tpl) => (

            <button

              key={tpl}

              onClick={() => setInput(tpl)}

              style={{

                flexShrink: 0,

                padding: "5px 12px",

                borderRadius: 20,

                border: `1px solid ${T.border}`,

                background: T.bg,

                color: T.textMid,

                fontSize: 11,

                fontWeight: 600,

                cursor: "pointer",

                fontFamily: font,

                whiteSpace: "nowrap",

              }}

            >

              {tpl}

            </button>

          ))}

        </div>

        <div

          style={{

            padding: "10px 12px 18px",

            background: T.bg,

            borderTop: `1px solid ${T.border}`,

            display: "flex",

            gap: 10,

            alignItems: "center",

          }}

        >

          <input

            value={input}

            onChange={(e) => setInput(e.target.value)}

            onKeyDown={(e) => {

              if (e.key === "Enter") sendAdmin();

            }}

            placeholder="Responder como soporte…"

            autoComplete="off"

            style={{

              flex: 1,

              background: T.surface,

              border: `1.5px solid ${T.border}`,

              borderRadius: 22,

              padding: "10px 16px",

              fontSize: 13,

              fontFamily: font,

              outline: "none",

              color: T.text,

            }}

          />

          <button

            onClick={sendAdmin}

            style={{

              width: 40,

              height: 40,

              borderRadius: "50%",

              background: input.trim() ? "#7C3AED" : T.surface2,

              border: "none",

              cursor: "pointer",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

            }}

          >

            <svg

              width="16"

              height="16"

              viewBox="0 0 24 24"

              fill="none"

              stroke={input.trim() ? "#fff" : T.textFaint}

              strokeWidth="2.5"

              strokeLinecap="round"

              strokeLinejoin="round"

            >

              <line x1="22" y1="2" x2="11" y2="13" />

              <polygon points="22 2 15 22 11 13 2 9 22 2" />

            </svg>

          </button>

        </div>

      </div>

    );

  }

  return (

    <div>

      <div

        style={{

          display: "grid",

          gridTemplateColumns: "1fr 1fr 1fr",

          gap: 8,

          marginBottom: 14,

        }}

      >

        {[

          {

            label: "Sin leer",

            value: totalUnread,

            color: T.danger,

            bg: T.dangerBg,

          },

          {

            label: "Abiertos",

            value: convs.filter((c) => c.status === "open").length,

            color: T.warn,

            bg: T.warnBg,

          },

          {

            label: "Resueltos",

            value: convs.filter((c) => c.status === "resolved").length,

            color: T.green,

            bg: T.greenLt,

          },

        ].map((s) => (

          <div

            key={s.label}

            style={{

              background: s.bg,

              borderRadius: 12,

              padding: "10px 8px",

              textAlign: "center",

            }}

          >

            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>

              {s.value}

            </div>

            <div style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>

              {s.label}

            </div>

          </div>

        ))}

      </div>

      {convs.map((c) => (

        <div

          key={c.id}

          onClick={() => {

            setConvs((p) =>

              p.map((cc) => (cc.id !== c.id ? cc : { ...cc, unread: 0 }))

            );

            setActiveConv(c);

          }}

          style={{

            background: T.bg,

            borderRadius: 16,

            marginBottom: 10,

            border: `1px solid ${c.unread > 0 ? T.blue : T.border}`,

            overflow: "hidden",

            cursor: "pointer",

            boxShadow: c.unread > 0 ? T.shadow : T.shadowSm,

          }}

        >

          {c.unread > 0 && (

            <div

              style={{

                height: 3,

                background: `linear-gradient(90deg,${T.blue},${T.blueSky})`,

              }}

            />

          )}

          <div

            style={{

              padding: "12px 14px",

              display: "flex",

              alignItems: "center",

              gap: 12,

            }}

          >

            <div style={{ position: "relative", flexShrink: 0 }}>

              <div

                style={{

                  width: 42,

                  height: 42,

                  borderRadius: "50%",

                  background: ROLE_COLORS[c.role],

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                }}

              >

                <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>

                  {c.user[0]}

                </span>

              </div>

              {c.unread > 0 && (

                <div

                  style={{

                    position: "absolute",

                    top: -2,

                    right: -2,

                    width: 18,

                    height: 18,

                    borderRadius: "50%",

                    background: T.danger,

                    border: "2px solid #fff",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>

                    {c.unread}

                  </span>

                </div>

              )}

            </div>

            <div style={{ flex: 1, minWidth: 0 }}>

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginBottom: 2,

                }}

              >

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

                  <span

                    style={{ fontWeight: 800, fontSize: 13, color: T.text }}

                  >

                    {c.user}

                  </span>

                  <span

                    style={{

                      fontSize: 9,

                      fontWeight: 700,

                      color: ROLE_COLORS[c.role],

                      background: `${ROLE_COLORS[c.role]}18`,

                      borderRadius: 10,

                      padding: "1px 6px",

                    }}

                  >

                    {ROLE_LABELS[c.role].toUpperCase()}

                  </span>

                </div>

                <span style={{ fontSize: 10, color: T.textFaint }}>

                  {c.time}

                </span>

              </div>

              <div style={{ fontSize: 11, color: T.textSub, marginBottom: 3 }}>

                {CAT_LABELS[c.category]}

                {c.plate ? ` · ${c.plate}` : ""}

              </div>

              <div

                style={{

                  fontSize: 12,

                  color: c.unread > 0 ? T.text : T.textFaint,

                  fontWeight: c.unread > 0 ? 700 : 400,

                  overflow: "hidden",

                  textOverflow: "ellipsis",

                  whiteSpace: "nowrap",

                }}

              >

                {c.lastMsg}

              </div>

            </div>

          </div>

        </div>

      ))}

    </div>

  );

}

// ─── SHARED COMPONENTS (top-level for stable reference) ─────────────────────

const MetricCard = ({ label, value, sub, color = T.blue, icon, onClick }) => (

  <Card

    style={{

      padding: 14,

      borderTop: `3px solid ${color}`,

      cursor: onClick ? "pointer" : "default",

    }}

    onClick={onClick}

  >

    <div

      style={{

        display: "flex",

        justifyContent: "space-between",

        alignItems: "flex-start",

      }}

    >

      <div style={{ fontSize: 18, fontWeight: 900, color, marginBottom: 4 }}>

        {value}

      </div>

      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}

    </div>

    <div style={{ color: T.textSub, fontSize: 10, fontWeight: 600 }}>

      {label}

    </div>

    {sub && (

      <div

        style={{ color: color, fontSize: 10, marginTop: 2, fontWeight: 700 }}

      >

        {sub}

      </div>

    )}

  </Card>

);

const ModeBadge = ({ mode }) =>

  mode === "auto" ? (

    <span

      style={{

        background: "#E8F8F0",

        border: "1px solid #A8DDBF",

        borderRadius: 20,

        padding: "2px 9px",

        fontSize: 10,

        fontWeight: 700,

        color: T.green,

      }}

    >

      ⚡ Automático

    </span>

  ) : (

    <span

      style={{

        background: T.warnBg,

        border: `1px solid ${T.warnBd}`,

        borderRadius: 20,

        padding: "2px 9px",

        fontSize: 10,

        fontWeight: 700,

        color: T.warn,

      }}

    >

      ⏳ Aprobación

    </span>

  );

const PriceInput = ({ label, value, onChange, accent = T.blue }) => (

  <div style={{ flex: 1, minWidth: 0 }}>

    <div

      style={{

        fontSize: 9,

        fontWeight: 700,

        color: T.textFaint,

        marginBottom: 3,

        letterSpacing: 0.4,

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis",

      }}

    >

      {label}

    </div>

    <div

      style={{

        display: "flex",

        alignItems: "center",

        background: T.bg,

        border: `1.5px solid ${T.borderMd}`,

        borderRadius: 8,

        overflow: "hidden",

      }}

    >

      <span

        style={{

          padding: "0 5px",

          color: T.textSub,

          fontSize: 10,

          fontWeight: 700,

          borderRight: `1px solid ${T.border}`,

          whiteSpace: "nowrap",

          flexShrink: 0,

        }}

      >

        RD$

      </span>

      <input

        value={value}

        onChange={(e) => {

          onChange(e.target.value);

          setSaved(false);

        }}

        inputMode="numeric"

        pattern="[0-9]*"

        autoComplete="off"

        style={{

          flex: 1,

          padding: "8px 4px",

          border: "none",

          outline: "none",

          fontSize: 13,

          fontWeight: 800,

          color: accent,

          fontFamily: font,

          background: "transparent",

          minWidth: 0,

          width: "100%",

        }}

      />

    </div>

  </div>

);

const SubNav = ({ activeSection, setSection }) => (

  <div

    style={{

      display: "flex",

      gap: 6,

      marginBottom: 16,

      overflowX: "auto",

      scrollbarWidth: "none",

      paddingBottom: 2,

    }}

  >

    {[

      ["overview", "📊 Resumen"],

      ["fleet", "🚗 Flota"],

      ["plates", "🔢 Placas"],

      ["activity", "⚡ Actividad"],

    ].map(([k, l]) => (

      <button

        key={k}

        onClick={() => setSection(k)}

        style={{

          flexShrink: 0,

          padding: "6px 14px",

          borderRadius: 20,

          border: `1.5px solid ${activeSection === k ? T.blue : T.border}`,

          background: activeSection === k ? T.blueLt : T.bg,

          color: activeSection === k ? T.blue : T.textSub,

          fontSize: 11,

          fontWeight: 700,

          cursor: "pointer",

          fontFamily: font,

        }}

      >

        {l}

      </button>

    ))}

  </div>

);

// ─── COMMISSION MANAGER ───────────────────────────────────────────────────────

function CommissionManager({

  comm,

  setComm,

  fee,

  setFee,

  ovst,

  setOvst,

  commSaved,

  setCommSaved,

  HOST_PAYOUTS,

}) {

  const [hostComms, setHostComms] = useState(

    HOST_PAYOUTS.map((h) => ({

      ...h,

      customComm: null,

      editing: false,

      saved: false,

    }))

  );

  const [commMode, setCommMode] = useState("global"); // "global" | "individual"

  const [expandedHost, setExpand] = useState(null);

  const updateHostComm = (i, val) => {

    setHostComms((prev) =>

      prev.map((h, idx) =>

        idx !== i ? h : { ...h, customComm: val, saved: false }

      )

    );

  };

  const saveHostComm = (i) => {

    setHostComms((prev) =>

      prev.map((h, idx) =>

        idx !== i ? h : { ...h, saved: true, editing: false }

      )

    );

  };

  const resetHostComm = (i) => {

    setHostComms((prev) =>

      prev.map((h, idx) =>

        idx !== i ? h : { ...h, customComm: null, saved: false, editing: false }

      )

    );

  };

  return (

    <div>

      {/* Mode toggle */}

      <Card style={{ marginBottom: 14 }}>

        <SectionLabel>Modo de comisiones</SectionLabel>

        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>

          {[

            ["global", "🌐 Global"],

            ["individual", "👤 Por host"],

          ].map(([k, l]) => (

            <button

              key={k}

              onClick={() => setCommMode(k)}

              style={{

                flex: 1,

                padding: "10px 8px",

                borderRadius: 12,

                border: `2px solid ${commMode === k ? T.blue : T.border}`,

                background: commMode === k ? T.blueLt : T.bg,

                color: commMode === k ? T.blue : T.textSub,

                fontSize: 12,

                fontWeight: 700,

                cursor: "pointer",

                fontFamily: font,

              }}

            >

              {commMode === k && "✓ "}

              {l}

            </button>

          ))}

        </div>

        <div style={{ fontSize: 11, color: T.textSub, padding: "6px 0" }}>

          {commMode === "global"

            ? "La misma comisión aplica a todos los hosts."

            : "Puedes personalizar la comisión de cada host individualmente."}

        </div>

      </Card>

      {/* Global sliders */}

      <Card style={{ marginBottom: 14 }}>

        <SectionLabel>Comisiones globales</SectionLabel>

        {[

          {

            l: "Comisión a propietarios",

            v: comm,

            set: setComm,

            min: 5,

            max: 30,

            u: "%",

            c: T.blue,

            note: "Parkealo retiene este % de cada reserva",

          },

          {

            l: "Fee por reserva (usuario)",

            v: fee,

            set: setFee,

            min: 0,

            max: 200,

            u: "RD$",

            c: T.green,

            note: "Cargo fijo al usuario por transacción",

          },

          {

            l: "% adicional sobretiempos",

            v: ovst,

            set: setOvst,

            min: 0,

            max: 100,

            u: "%",

            c: T.warn,

            note: "Se suma al precio base en sobretiempo",

          },

        ].map((cfg) => (

          <div key={cfg.l} style={{ marginBottom: 20 }}>

            <div

              style={{

                display: "flex",

                justifyContent: "space-between",

                marginBottom: 4,

              }}

            >

              <div>

                <div

                  style={{ color: T.textMid, fontSize: 13, fontWeight: 700 }}

                >

                  {cfg.l}

                </div>

                <div style={{ color: T.textFaint, fontSize: 10 }}>

                  {cfg.note}

                </div>

              </div>

              <span style={{ color: cfg.c, fontWeight: 900, fontSize: 18 }}>

                {cfg.u === "%" ? `${cfg.v}%` : `${cfg.u}${cfg.v}`}

              </span>

            </div>

            <input

              type="range"

              min={cfg.min}

              max={cfg.max}

              value={cfg.v}

              onChange={(e) => {

                cfg.set(+e.target.value);

                setCommSaved(false);

              }}

              style={{ width: "100%", accentColor: cfg.c, cursor: "pointer" }}

            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>

              <span style={{ fontSize: 9, color: T.textFaint }}>

                {cfg.u === "%" ? `${cfg.min}%` : `${cfg.u}${cfg.min}`}

              </span>

              <span style={{ fontSize: 9, color: T.textFaint }}>

                {cfg.u === "%" ? `${cfg.max}%` : `${cfg.u}${cfg.max}`}

              </span>

            </div>

          </div>

        ))}

        {commSaved ? (

          <div

            style={{

              background: T.greenLt,

              border: `1px solid ${T.greenMid}`,

              borderRadius: 12,

              padding: "12px",

              textAlign: "center",

              color: T.green,

              fontWeight: 800,

            }}

          >

            ✓ Configuración guardada

          </div>

        ) : (

          <Btn onClick={() => setCommSaved(true)} variant="green" full>

            Guardar configuración global

          </Btn>

        )}

      </Card>

      {/* Per-host individual commissions */}

      <Card>

        <div

          style={{

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            marginBottom: 12,

          }}

        >

          <SectionLabel style={{ margin: 0 }}>

            Comisiones individuales por host

          </SectionLabel>

          {commMode === "individual" && (

            <span

              style={{

                fontSize: 10,

                color: T.blue,

                fontWeight: 700,

                background: T.blueLt,

                borderRadius: 20,

                padding: "2px 8px",

              }}

            >

              MODO ACTIVO

            </span>

          )}

        </div>

        {commMode === "global" && (

          <div

            style={{

              background: T.surface,

              borderRadius: 10,

              padding: "8px 12px",

              marginBottom: 12,

              fontSize: 11,

              color: T.textSub,

            }}

          >

            💡 Cambia a <strong>modo individual</strong> para editar comisiones

            por host

          </div>

        )}

        {hostComms.map((h, i) => {

          const effectiveComm = h.customComm !== null ? h.customComm : comm;

          const isCustom = h.customComm !== null;

          const expanded = expandedHost === i;

          return (

            <div

              key={i}

              style={{

                borderBottom:

                  i < hostComms.length - 1 ? `1px solid ${T.border}` : "none",

                paddingBottom: 12,

                marginBottom: 12,

              }}

            >

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <div

                  style={{

                    width: 40,

                    height: 40,

                    borderRadius: 12,

                    background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    flexShrink: 0,

                  }}

                >

                  <span

                    style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}

                  >

                    {h.host[0]}

                  </span>

                </div>

                <div style={{ flex: 1, minWidth: 0 }}>

                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>

                    {h.host}

                  </div>

                  <div

                    style={{

                      fontSize: 11,

                      color: T.textSub,

                      overflow: "hidden",

                      textOverflow: "ellipsis",

                      whiteSpace: "nowrap",

                    }}

                  >

                    {h.parking}

                  </div>

                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>

                  <div

                    style={{

                      fontSize: 15,

                      fontWeight: 900,

                      color: isCustom ? T.green : T.blue,

                    }}

                  >

                    {effectiveComm}%

                  </div>

                  <div

                    style={{

                      fontSize: 9,

                      color: isCustom ? T.green : T.textFaint,

                      fontWeight: 700,

                    }}

                  >

                    {isCustom ? "PERSONALIZADA" : "GLOBAL"}

                  </div>

                </div>

                {commMode === "individual" && (

                  <button

                    onClick={() => setExpand(expanded ? null : i)}

                    style={{

                      background: expanded ? T.blueLt : T.surface2,

                      border: `1px solid ${expanded ? T.blue : T.border}`,

                      borderRadius: 8,

                      padding: "5px 10px",

                      fontSize: 11,

                      fontWeight: 700,

                      color: expanded ? T.blue : T.textSub,

                      cursor: "pointer",

                      fontFamily: font,

                      flexShrink: 0,

                    }}

                  >

                    {expanded ? "✕" : "✏️ Editar"}

                  </button>

                )}

              </div>

              {/* Expanded editor */}

              {expanded && commMode === "individual" && (

                <div

                  style={{

                    marginTop: 12,

                    background: T.surface,

                    borderRadius: 12,

                    padding: "12px 14px",

                  }}

                >

                  <div

                    style={{

                      fontSize: 11,

                      fontWeight: 700,

                      color: T.blue,

                      marginBottom: 10,

                    }}

                  >

                    COMISIÓN PERSONALIZADA PARA {h.host.toUpperCase()}

                  </div>

                  {/* Commission slider */}

                  <div style={{ marginBottom: 12 }}>

                    <div

                      style={{

                        display: "flex",

                        justifyContent: "space-between",

                        marginBottom: 4,

                      }}

                    >

                      <span style={{ fontSize: 12, color: T.textMid }}>

                        Comisión %

                      </span>

                      <span

                        style={{

                          fontSize: 16,

                          fontWeight: 900,

                          color: T.green,

                        }}

                      >

                        {h.customComm !== null ? h.customComm : comm}%

                      </span>

                    </div>

                    <input

                      type="range"

                      min={0}

                      max={30}

                      value={h.customComm !== null ? h.customComm : comm}

                      onChange={(e) => updateHostComm(i, +e.target.value)}

                      style={{

                        width: "100%",

                        accentColor: T.green,

                        cursor: "pointer",

                      }}

                    />

                    <div

                      style={{

                        display: "flex",

                        justifyContent: "space-between",

                      }}

                    >

                      <span style={{ fontSize: 9, color: T.textFaint }}>

                        0% (beneficio)

                      </span>

                      <span style={{ fontSize: 9, color: T.textFaint }}>

                        30%

                      </span>

                    </div>

                  </div>

                  {/* Benefit reason */}

                  <div style={{ marginBottom: 12 }}>

                    <div

                      style={{

                        fontSize: 11,

                        fontWeight: 700,

                        color: T.textSub,

                        marginBottom: 5,

                      }}

                    >

                      MOTIVO (opcional)

                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>

                      {[

                        "Host premium",

                        "Top 10 hosts",

                        "Acuerdo especial",

                        "Parqueo estratégico",

                        "Período de prueba",

                      ].map((reason) => (

                        <button

                          key={reason}

                          style={{

                            padding: "4px 10px",

                            borderRadius: 20,

                            border: `1px solid ${T.border}`,

                            background: T.bg,

                            fontSize: 10,

                            fontWeight: 600,

                            color: T.textMid,

                            cursor: "pointer",

                            fontFamily: font,

                          }}

                        >

                          {reason}

                        </button>

                      ))}

                    </div>

                  </div>

                  {/* Expiry */}

                  <div style={{ marginBottom: 12 }}>

                    <div

                      style={{

                        fontSize: 11,

                        fontWeight: 700,

                        color: T.textSub,

                        marginBottom: 5,

                      }}

                    >

                      VIGENCIA

                    </div>

                    <div style={{ display: "flex", gap: 8 }}>

                      {[

                        ["1 mes", ""],

                        ["3 meses", ""],

                        ["6 meses", ""],

                        ["Permanente", ""],

                      ].map(([l]) => (

                        <button

                          key={l}

                          style={{

                            flex: 1,

                            padding: "7px 4px",

                            borderRadius: 8,

                            border: `1px solid ${T.border}`,

                            background: T.bg,

                            fontSize: 10,

                            fontWeight: 700,

                            color: T.textMid,

                            cursor: "pointer",

                            fontFamily: font,

                          }}

                        >

                          {l}

                        </button>

                      ))}

                    </div>

                  </div>

                  <div style={{ display: "flex", gap: 8 }}>

                    <button

                      onClick={() => resetHostComm(i)}

                      style={{

                        flex: 1,

                        background: T.dangerBg,

                        border: `1px solid ${T.dangerBd}`,

                        borderRadius: 10,

                        padding: "9px 0",

                        fontFamily: font,

                        fontWeight: 700,

                        fontSize: 12,

                        color: T.danger,

                        cursor: "pointer",

                      }}

                    >

                      Restablecer global

                    </button>

                    <button

                      onClick={() => saveHostComm(i)}

                      style={{

                        flex: 2,

                        background: T.green,

                        border: "none",

                        borderRadius: 10,

                        padding: "9px 0",

                        fontFamily: font,

                        fontWeight: 800,

                        fontSize: 12,

                        color: "#fff",

                        cursor: "pointer",

                      }}

                    >

                      ✓ Guardar comisión

                    </button>

                  </div>

                  {h.saved && (

                    <div

                      style={{

                        marginTop: 8,

                        textAlign: "center",

                        fontSize: 11,

                        color: T.green,

                        fontWeight: 700,

                      }}

                    >

                      ✓ Comisión personalizada guardada

                    </div>

                  )}

                </div>

              )}

            </div>

          );

        })}

        {/* Totals */}

        <div

          style={{

            background: T.blueLt,

            borderRadius: 10,

            padding: "10px 12px",

            display: "flex",

            justifyContent: "space-between",

          }}

        >

          <span style={{ fontSize: 13, fontWeight: 700, color: T.blueNav }}>

            Total comisiones este mes

          </span>

          <span style={{ fontSize: 16, fontWeight: 900, color: T.blue }}>

            RD$780K

          </span>

        </div>

      </Card>

    </div>

  );

}

// ─── ADMIN REFERRALS PANEL ────────────────────────────────────────────────────

function AdminReferrals() {

  const ALL_REFERRALS = [

    {

      referrer: "Carlos Marte",

      code: "PARK-CM7X2",

      role: "user",

      referred: ["María García", "Roberto Pérez"],

      earned: "RD$100",

      pending: 0,

    },

    {

      referrer: "J. Martínez",

      code: "PARK-JM3K9",

      role: "host",

      referred: ["Ana Castillo", "Diego López", "Luis Sánchez"],

      earned: "RD$150",

      pending: 1,

    },

    {

      referrer: "Ana Castillo",

      code: "PARK-AC8F1",

      role: "user",

      referred: ["Carmen Rosa"],

      earned: "RD$50",

      pending: 0,

    },

    {

      referrer: "M. García",

      code: "PARK-MG5P4",

      role: "host",

      referred: [],

      earned: "RD$0",

      pending: 0,

    },

  ];

  const totalReferrals = ALL_REFERRALS.reduce(

    (a, r) => a + r.referred.length,

    0

  );

  const totalPaid = "RD$300";

  return (

    <div>

      {/* Stats */}

      <div

        style={{

          display: "grid",

          gridTemplateColumns: "1fr 1fr 1fr",

          gap: 10,

          marginBottom: 14,

        }}

      >

        {[

          {

            label: "Referidos totales",

            value: totalReferrals,

            color: T.blue,

            bg: T.blueLt,

          },

          {

            label: "Códigos activos",

            value: ALL_REFERRALS.length,

            color: T.green,

            bg: T.greenLt,

          },

          {

            label: "Pagado en bonos",

            value: totalPaid,

            color: T.warn,

            bg: T.warnBg,

          },

        ].map((s) => (

          <Card

            key={s.label}

            style={{

              padding: 12,

              borderTop: `3px solid ${s.color}`,

              background: s.bg,

            }}

          >

            <div

              style={{

                fontSize: 18,

                fontWeight: 900,

                color: s.color,

                marginBottom: 2,

              }}

            >

              {s.value}

            </div>

            <div

              style={{

                fontSize: 10,

                color: s.color,

                fontWeight: 600,

                lineHeight: 1.3,

              }}

            >

              {s.label}

            </div>

          </Card>

        ))}

      </div>

      {/* Referral list */}

      <Card>

        <SectionLabel>Todos los referidos</SectionLabel>

        {ALL_REFERRALS.map((r, i) => (

          <div

            key={i}

            style={{

              padding: "12px 0",

              borderBottom:

                i < ALL_REFERRALS.length - 1 ? `1px solid ${T.border}` : "none",

            }}

          >

            <div

              style={{

                display: "flex",

                justifyContent: "space-between",

                alignItems: "flex-start",

                marginBottom: 6,

              }}

            >

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <div

                  style={{

                    width: 36,

                    height: 36,

                    borderRadius: 10,

                    background: r.role === "host" ? T.greenLt : T.blueLt,

                    border: `1.5px solid ${

                      r.role === "host" ? T.greenMid : T.blueMid

                    }`,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                  }}

                >

                  <span style={{ fontSize: 16 }}>

                    {r.role === "host" ? "🏢" : "👤"}

                  </span>

                </div>

                <div>

                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>

                    {r.referrer}

                  </div>

                  <div

                    style={{

                      fontFamily: "monospace",

                      fontSize: 11,

                      color: T.blue,

                      fontWeight: 700,

                    }}

                  >

                    {r.code}

                  </div>

                </div>

              </div>

              <div style={{ textAlign: "right" }}>

                <div style={{ fontSize: 14, fontWeight: 900, color: T.green }}>

                  {r.earned}

                </div>

                <div style={{ fontSize: 10, color: T.textFaint }}>

                  {r.referred.length} referidos

                </div>

              </div>

            </div>

            {r.referred.length > 0 && (

              <div

                style={{

                  display: "flex",

                  flexWrap: "wrap",

                  gap: 5,

                  marginLeft: 46,

                }}

              >

                {r.referred.map((name) => (

                  <span

                    key={name}

                    style={{

                      background: T.surface2,

                      borderRadius: 20,

                      padding: "2px 9px",

                      fontSize: 10,

                      color: T.textMid,

                      fontWeight: 600,

                    }}

                  >

                    ✓ {name}

                  </span>

                ))}

                {r.pending > 0 && (

                  <span

                    style={{

                      background: T.warnBg,

                      border: `1px solid ${T.warnBd}`,

                      borderRadius: 20,

                      padding: "2px 9px",

                      fontSize: 10,

                      color: T.warn,

                      fontWeight: 700,

                    }}

                  >

                    ⏳ {r.pending} pendiente

                  </span>

                )}

              </div>

            )}

          </div>

        ))}

      </Card>

    </div>

  );

}

// ─── VEHICLES ANALYTICS (Admin) ──────────────────────────────────────────────

function VehiclesAnalytics() {

  const [activeSection, setSection] = useState("overview");

  // ── Mock data ──

  const MOCK_VEHICLES = [

    {

      user: "Carlos Marte",

      plate: "A123456",

      make: "Toyota",

      model: "Corolla",

      year: 2020,

      color: "Blanco",

      type: "sedan",

      registeredDays: 45,

      reservations: 12,

    },

    {

      user: "María García",

      plate: "B789012",

      make: "Honda",

      model: "Civic",

      year: 2019,

      color: "Negro",

      type: "sedan",

      registeredDays: 30,

      reservations: 8,

    },

    {

      user: "Juan Rodríguez",

      plate: "C234567",

      make: "Hyundai",

      model: "Tucson",

      year: 2022,

      color: "Gris",

      type: "suv",

      registeredDays: 12,

      reservations: 5,

    },

    {

      user: "Ana Castillo",

      plate: "D901234",

      make: "Toyota",

      model: "Hilux",

      year: 2021,

      color: "Plata",

      type: "pickup",

      registeredDays: 60,

      reservations: 20,

    },

    {

      user: "Roberto Pérez",

      plate: "E456789",

      make: "Kia",

      model: "Sportage",

      year: 2023,

      color: "Rojo",

      type: "suv",

      registeredDays: 7,

      reservations: 3,

    },

    {

      user: "Carmen Díaz",

      plate: "F012345",

      make: "Nissan",

      model: "Versa",

      year: 2018,

      color: "Blanco",

      type: "sedan",

      registeredDays: 90,

      reservations: 31,

    },

    {

      user: "Luis Sánchez",

      plate: "G567890",

      make: "Ford",

      model: "Ranger",

      year: 2020,

      color: "Azul",

      type: "pickup",

      registeredDays: 22,

      reservations: 9,

    },

    {

      user: "Diana López",

      plate: "H234567",

      make: "BMW",

      model: "320i",

      year: 2021,

      color: "Negro",

      type: "sedan",

      registeredDays: 18,

      reservations: 7,

    },

    {

      user: "Pedro Marte",

      plate: "I890123",

      make: "Chevrolet",

      model: "Spark",

      year: 2017,

      color: "Amarillo",

      type: "sedan",

      registeredDays: 55,

      reservations: 15,

    },

    {

      user: "Sofía Reyes",

      plate: "J456789",

      make: "Honda",

      model: "PCX 150",

      year: 2022,

      color: "Blanco",

      type: "moto",

      registeredDays: 14,

      reservations: 22,

    },

    {

      user: "Miguel Torres",

      plate: "K012345",

      make: "Jeep",

      model: "Wrangler",

      year: 2023,

      color: "Verde",

      type: "suv",

      registeredDays: 5,

      reservations: 2,

    },

    {

      user: "Laura Vásquez",

      plate: "L678901",

      make: "Toyota",

      model: "Yaris",

      year: 2020,

      color: "Rojo",

      type: "sedan",

      registeredDays: 40,

      reservations: 18,

    },

  ];

  const total = MOCK_VEHICLES.length;

  const uniquePlates = new Set(MOCK_VEHICLES.map((v) => v.plate)).size;

  const uniqueUsers = new Set(MOCK_VEHICLES.map((v) => v.user)).size;

  const avgPerUser = (total / uniqueUsers).toFixed(1);

  // Type breakdown

  const byType = MOCK_VEHICLES.reduce((acc, v) => {

    acc[v.type] = (acc[v.type] || 0) + 1;

    return acc;

  }, {});

  const TYPE_LABELS = {

    sedan: "Sedán",

    suv: "SUV",

    pickup: "Pickup",

    coupe: "Coupé",

    van: "Van",

    moto: "Moto",

  };

  const TYPE_ICONS = {

    sedan: "🚗",

    suv: "🚙",

    pickup: "🛻",

    coupe: "🚘",

    van: "🚐",

    moto: "🏍️",

  };

  // Make breakdown (top 5)

  const byMake = MOCK_VEHICLES.reduce((acc, v) => {

    acc[v.make] = (acc[v.make] || 0) + 1;

    return acc;

  }, {});

  const topMakes = Object.entries(byMake)

    .sort((a, b) => b[1] - a[1])

    .slice(0, 6);

  // Color breakdown

  const byColor = MOCK_VEHICLES.reduce((acc, v) => {

    acc[v.color] = (acc[v.color] || 0) + 1;

    return acc;

  }, {});

  const topColors = Object.entries(byColor)

    .sort((a, b) => b[1] - a[1])

    .slice(0, 5);

  const COLOR_HEX = {

    Blanco: "#F8FAFC",

    Negro: "#1a1a2e",

    Gris: "#8B9DC3",

    Plata: "#C0C8D8",

    Rojo: "#DC2626",

    Azul: "#2563EB",

    Verde: "#16A34A",

    Amarillo: "#EAB308",

  };

  // Year breakdown

  const byYear = MOCK_VEHICLES.reduce((acc, v) => {

    acc[v.year] = (acc[v.year] || 0) + 1;

    return acc;

  }, {});

  const years = Object.entries(byYear).sort((a, b) => +a[0] - +b[0]);

  // Most active vehicles (by reservations)

  const topActive = [...MOCK_VEHICLES]

    .sort((a, b) => b.reservations - a.reservations)

    .slice(0, 5);

  // Newest registrations

  const newest = [...MOCK_VEHICLES]

    .sort((a, b) => a.registeredDays - b.registeredDays)

    .slice(0, 5);

  const BAR_COLORS = [T.blue, T.green, T.warn, T.danger, "#7C3AED", "#0891B2"];

  return (

    <div>

      <SubNav activeSection={activeSection} setSection={setSection} />

      {/* ── OVERVIEW ── */}

      {activeSection === "overview" && (

        <>

          {/* KPI row */}

          <div

            style={{

              display: "grid",

              gridTemplateColumns: "1fr 1fr",

              gap: 10,

              marginBottom: 14,

            }}

          >

            {[

              {

                label: "Vehículos registrados",

                value: total,

                icon: "🚗",

                color: T.blue,

                bg: T.blueLt,

              },

              {

                label: "Placas únicas",

                value: uniquePlates,

                icon: "🔢",

                color: T.green,

                bg: T.greenLt,

              },

              {

                label: "Usuarios con vehículo",

                value: uniqueUsers,

                icon: "👤",

                color: "#7C3AED",

                bg: "#F3EFFE",

              },

              {

                label: "Promedio por usuario",

                value: avgPerUser,

                icon: "📊",

                color: T.warn,

                bg: T.warnBg,

              },

            ].map((k) => (

              <div

                key={k.label}

                style={{

                  background: k.bg,

                  borderRadius: 14,

                  padding: "14px 14px",

                  border: `1px solid ${k.color}22`,

                }}

              >

                <div style={{ fontSize: 24, marginBottom: 6 }}>{k.icon}</div>

                <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>

                  {k.value}

                </div>

                <div

                  style={{

                    fontSize: 11,

                    color: k.color,

                    fontWeight: 600,

                    lineHeight: 1.3,

                  }}

                >

                  {k.label}

                </div>

              </div>

            ))}

          </div>

          {/* Type distribution */}

          <Card style={{ marginBottom: 14 }}>

            <SectionLabel>Distribución por tipo</SectionLabel>

            {Object.entries(byType)

              .sort((a, b) => b[1] - a[1])

              .map(([type, count], i) => {

                const pct = Math.round((count / total) * 100);

                return (

                  <div key={type} style={{ marginBottom: 10 }}>

                    <div

                      style={{

                        display: "flex",

                        justifyContent: "space-between",

                        marginBottom: 4,

                      }}

                    >

                      <div

                        style={{

                          display: "flex",

                          alignItems: "center",

                          gap: 8,

                        }}

                      >

                        <span style={{ fontSize: 16 }}>

                          {TYPE_ICONS[type] || "🚗"}

                        </span>

                        <span

                          style={{

                            fontSize: 13,

                            fontWeight: 700,

                            color: T.text,

                          }}

                        >

                          {TYPE_LABELS[type] || type}

                        </span>

                      </div>

                      <div

                        style={{

                          display: "flex",

                          alignItems: "center",

                          gap: 8,

                        }}

                      >

                        <span

                          style={{

                            fontSize: 12,

                            fontWeight: 700,

                            color: BAR_COLORS[i % BAR_COLORS.length],

                          }}

                        >

                          {count} vehículos

                        </span>

                        <span style={{ fontSize: 11, color: T.textFaint }}>

                          {pct}%

                        </span>

                      </div>

                    </div>

                    <div

                      style={{

                        height: 8,

                        background: T.surface2,

                        borderRadius: 4,

                        overflow: "hidden",

                      }}

                    >

                      <div

                        style={{

                          height: "100%",

                          width: `${pct}%`,

                          background: BAR_COLORS[i % BAR_COLORS.length],

                          borderRadius: 4,

                          transition: "width 0.5s",

                        }}

                      />

                    </div>

                  </div>

                );

              })}

          </Card>

          {/* Top makes */}

          <Card style={{ marginBottom: 14 }}>

            <SectionLabel>Marcas más populares</SectionLabel>

            {topMakes.map(([make, count], i) => {

              const pct = Math.round((count / total) * 100);

              return (

                <div

                  key={make}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 12,

                    padding: "8px 0",

                    borderBottom:

                      i < topMakes.length - 1

                        ? `1px solid ${T.border}`

                        : "none",

                  }}

                >

                  <div

                    style={{

                      width: 28,

                      height: 28,

                      borderRadius: 8,

                      background: T.surface2,

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                    }}

                  >

                    <span

                      style={{

                        fontSize: 11,

                        fontWeight: 900,

                        color: T.textMid,

                      }}

                    >

                      #{i + 1}

                    </span>

                  </div>

                  <div style={{ flex: 1 }}>

                    <div

                      style={{

                        display: "flex",

                        justifyContent: "space-between",

                        marginBottom: 3,

                      }}

                    >

                      <span

                        style={{ fontSize: 13, fontWeight: 700, color: T.text }}

                      >

                        {make}

                      </span>

                      <span

                        style={{

                          fontSize: 12,

                          fontWeight: 700,

                          color: BAR_COLORS[i],

                        }}

                      >

                        {count} · {pct}%

                      </span>

                    </div>

                    <div

                      style={{

                        height: 6,

                        background: T.surface2,

                        borderRadius: 3,

                      }}

                    >

                      <div

                        style={{

                          height: "100%",

                          width: `${pct}%`,

                          background: BAR_COLORS[i],

                          borderRadius: 3,

                        }}

                      />

                    </div>

                  </div>

                </div>

              );

            })}

          </Card>

          {/* Color + Year side stats */}

          <div

            style={{

              display: "grid",

              gridTemplateColumns: "1fr 1fr",

              gap: 10,

              marginBottom: 14,

            }}

          >

            <Card>

              <SectionLabel>Colores</SectionLabel>

              {topColors.map(([color, count]) => (

                <div

                  key={color}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 8,

                    padding: "5px 0",

                  }}

                >

                  <div

                    style={{

                      width: 14,

                      height: 14,

                      borderRadius: 4,

                      background: COLOR_HEX[color] || "#ccc",

                      border: `1px solid ${T.border}`,

                      flexShrink: 0,

                    }}

                  />

                  <span

                    style={{

                      flex: 1,

                      fontSize: 12,

                      color: T.text,

                      fontWeight: 600,

                    }}

                  >

                    {color}

                  </span>

                  <span

                    style={{ fontSize: 12, fontWeight: 900, color: T.blue }}

                  >

                    {count}

                  </span>

                </div>

              ))}

            </Card>

            <Card>

              <SectionLabel>Por año</SectionLabel>

              {years.map(([year, count]) => (

                <div

                  key={year}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 8,

                    padding: "5px 0",

                  }}

                >

                  <span

                    style={{

                      fontSize: 11,

                      color: T.textSub,

                      fontWeight: 600,

                      width: 34,

                    }}

                  >

                    {year}

                  </span>

                  <div

                    style={{

                      flex: 1,

                      height: 6,

                      background: T.surface2,

                      borderRadius: 3,

                    }}

                  >

                    <div

                      style={{

                        height: "100%",

                        width: `${(count / total) * 100}%`,

                        background: T.green,

                        borderRadius: 3,

                      }}

                    />

                  </div>

                  <span

                    style={{ fontSize: 12, fontWeight: 800, color: T.green }}

                  >

                    {count}

                  </span>

                </div>

              ))}

            </Card>

          </div>

        </>

      )}

      {/* ── FLEET (full vehicle list) ── */}

      {activeSection === "fleet" && (

        <Card>

          <SectionLabel>Todos los vehículos registrados ({total})</SectionLabel>

          {MOCK_VEHICLES.map((v, i) => (

            <div

              key={i}

              style={{

                display: "flex",

                alignItems: "center",

                gap: 12,

                padding: "10px 0",

                borderBottom:

                  i < MOCK_VEHICLES.length - 1

                    ? `1px solid ${T.border}`

                    : "none",

              }}

            >

              <div

                style={{

                  width: 38,

                  height: 38,

                  borderRadius: 12,

                  background: T.blueLt,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  fontSize: 20,

                  flexShrink: 0,

                }}

              >

                {TYPE_ICONS[v.type] || "🚗"}

              </div>

              <div style={{ flex: 1, minWidth: 0 }}>

                <div

                  style={{ display: "flex", justifyContent: "space-between" }}

                >

                  <span

                    style={{ fontSize: 13, fontWeight: 800, color: T.text }}

                  >

                    {v.make} {v.model}

                  </span>

                  <span

                    style={{

                      fontFamily: "monospace",

                      fontSize: 11,

                      fontWeight: 900,

                      color: T.blue,

                    }}

                  >

                    {v.plate}

                  </span>

                </div>

                <div style={{ fontSize: 11, color: T.textSub }}>

                  {v.user} · {v.year} · {v.color}

                </div>

              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>

                <div style={{ fontSize: 13, fontWeight: 900, color: T.green }}>

                  {v.reservations}

                </div>

                <div style={{ fontSize: 9, color: T.textFaint }}>reservas</div>

              </div>

            </div>

          ))}

        </Card>

      )}

      {/* ── PLATES ── */}

      {activeSection === "plates" && (

        <>

          <div

            style={{

              display: "grid",

              gridTemplateColumns: "1fr 1fr 1fr",

              gap: 10,

              marginBottom: 14,

            }}

          >

            {[

              {

                label: "Total placas",

                value: uniquePlates,

                color: T.blue,

                bg: T.blueLt,

              },

              {

                label: "Registradas hoy",

                value: "3",

                color: T.green,

                bg: T.greenLt,

              },

              {

                label: "Sin reserva aún",

                value: "4",

                color: T.warn,

                bg: T.warnBg,

              },

            ].map((s) => (

              <div

                key={s.label}

                style={{

                  background: s.bg,

                  borderRadius: 12,

                  padding: "12px 10px",

                  textAlign: "center",

                }}

              >

                <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>

                  {s.value}

                </div>

                <div

                  style={{

                    fontSize: 10,

                    color: s.color,

                    fontWeight: 700,

                    lineHeight: 1.3,

                  }}

                >

                  {s.label}

                </div>

              </div>

            ))}

          </div>

          <Card>

            <SectionLabel>Registro de placas</SectionLabel>

            {MOCK_VEHICLES.map((v, i) => (

              <div

                key={i}

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  padding: "9px 0",

                  borderBottom:

                    i < MOCK_VEHICLES.length - 1

                      ? `1px solid ${T.border}`

                      : "none",

                }}

              >

                <div

                  style={{

                    background: T.blueLt,

                    border: `1.5px solid ${T.blueMid}`,

                    borderRadius: 8,

                    padding: "4px 10px",

                  }}

                >

                  <span

                    style={{

                      fontFamily: "monospace",

                      fontSize: 13,

                      fontWeight: 900,

                      color: T.blue,

                      letterSpacing: 1,

                    }}

                  >

                    {v.plate}

                  </span>

                </div>

                <div style={{ flex: 1 }}>

                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>

                    {v.user}

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>

                    {v.make} {v.model} {v.year} · {v.color}

                  </div>

                </div>

                <div style={{ textAlign: "right" }}>

                  <Tag

                    color={

                      v.reservations > 10

                        ? T.green

                        : v.reservations > 0

                        ? T.blue

                        : T.textFaint

                    }

                    bg={

                      v.reservations > 10

                        ? T.greenLt

                        : v.reservations > 0

                        ? T.blueLt

                        : T.surface2

                    }

                    border={

                      v.reservations > 10

                        ? T.greenMid

                        : v.reservations > 0

                        ? T.blueMid

                        : T.border

                    }

                  >

                    {v.reservations > 0

                      ? `${v.reservations} reservas`

                      : "Sin uso"}

                  </Tag>

                </div>

              </div>

            ))}

          </Card>

        </>

      )}

      {/* ── ACTIVITY ── */}

      {activeSection === "activity" && (

        <>

          <Card style={{ marginBottom: 14 }}>

            <SectionLabel>Vehículos más activos</SectionLabel>

            {topActive.map((v, i) => (

              <div

                key={i}

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  padding: "10px 0",

                  borderBottom:

                    i < topActive.length - 1 ? `1px solid ${T.border}` : "none",

                }}

              >

                <div

                  style={{

                    width: 30,

                    height: 30,

                    borderRadius: 10,

                    background:

                      i === 0

                        ? `linear-gradient(135deg,${T.warn},#F59E0B)`

                        : T.surface2,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    flexShrink: 0,

                  }}

                >

                  <span

                    style={{

                      fontSize: i === 0 ? 14 : 12,

                      fontWeight: 900,

                      color: i === 0 ? "#fff" : T.textMid,

                    }}

                  >

                    #{i + 1}

                  </span>

                </div>

                <div style={{ flex: 1 }}>

                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>

                    {v.make} {v.model}

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>

                    {v.user} ·{" "}

                    <span style={{ fontFamily: "monospace", color: T.blue }}>

                      {v.plate}

                    </span>

                  </div>

                </div>

                <div style={{ textAlign: "right" }}>

                  <div

                    style={{ fontSize: 16, fontWeight: 900, color: T.green }}

                  >

                    {v.reservations}

                  </div>

                  <div style={{ fontSize: 9, color: T.textFaint }}>

                    reservas

                  </div>

                </div>

              </div>

            ))}

          </Card>

          <Card style={{ marginBottom: 14 }}>

            <SectionLabel>Vehículos nuevos (últimas semanas)</SectionLabel>

            {newest.map((v, i) => (

              <div

                key={i}

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  padding: "9px 0",

                  borderBottom:

                    i < newest.length - 1 ? `1px solid ${T.border}` : "none",

                }}

              >

                <span style={{ fontSize: 18 }}>{TYPE_ICONS[v.type]}</span>

                <div style={{ flex: 1 }}>

                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>

                    {v.make} {v.model} —{" "}

                    <span

                      style={{

                        fontFamily: "monospace",

                        color: T.blue,

                        fontSize: 12,

                      }}

                    >

                      {v.plate}

                    </span>

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>{v.user}</div>

                </div>

                <Tag color={T.green} bg={T.greenLt} border={T.greenMid}>

                  Hace {v.registeredDays}d

                </Tag>

              </div>

            ))}

          </Card>

          <Card>

            <SectionLabel>Insights</SectionLabel>

            {[

              {

                icon: "🏆",

                label: "Marca más registrada",

                value: "Toyota",

                sub: "3 vehículos (25%)",

              },

              {

                icon: "🚗",

                label: "Tipo más común",

                value: "Sedán",

                sub: "6 de 12 (50%)",

              },

              {

                icon: "📅",

                label: "Año promedio de la flota",

                value: "2020",

                sub: "Flota relativamente nueva",

              },

              {

                icon: "⚡",

                label: "Usuario más activo",

                value: "Carmen Díaz",

                sub: "31 reservas con F012345",

              },

              {

                icon: "📊",

                label: "Promedio reservas/vehículo",

                value: "12.6",

                sub: "Uso alto de la flota",

              },

              {

                icon: "🆕",

                label: "Registros esta semana",

                value: "3 vehículos",

                sub: "KIA, BMW, Jeep",

              },

            ].map((item, i) => (

              <div

                key={i}

                style={{

                  display: "flex",

                  alignItems: "center",

                  gap: 12,

                  padding: "10px 0",

                  borderBottom: i < 5 ? `1px solid ${T.border}` : "none",

                }}

              >

                <div

                  style={{

                    width: 38,

                    height: 38,

                    borderRadius: 12,

                    background: T.surface2,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    fontSize: 20,

                    flexShrink: 0,

                  }}

                >

                  {item.icon}

                </div>

                <div style={{ flex: 1 }}>

                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>

                    {item.label}

                  </div>

                  <div style={{ fontSize: 11, color: T.textSub }}>

                    {item.sub}

                  </div>

                </div>

                <div style={{ fontSize: 14, fontWeight: 900, color: T.blue }}>

                  {item.value}

                </div>

              </div>

            ))}

          </Card>

        </>

      )}

    </div>

  );

}

function MiniBar({ data, color, height = 48 }) {

  const max = Math.max(...data);

  return (

    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height }}>

      {data.map((v, i) => (

        <div

          key={i}

          style={{

            flex: 1,

            background: color,

            borderRadius: "2px 2px 0 0",

            height: `${(v / max) * 100}%`,

            opacity: 0.6 + 0.4 * (v / max),

          }}

        />

      ))}

    </div>

  );

}

function StatRow({ label, value, sub, color = T.text, bar, barMax }) {

  return (

    <div

      style={{

        display: "flex",

        alignItems: "center",

        gap: 10,

        padding: "9px 0",

        borderBottom: `1px solid ${T.border}`,

      }}

    >

      {bar && (

        <div

          style={{

            width: 60,

            height: 6,

            background: T.surface2,

            borderRadius: 3,

            flexShrink: 0,

          }}

        >

          <div

            style={{

              height: "100%",

              width: `${Math.round((bar / barMax) * 100)}%`,

              background: color,

              borderRadius: 3,

            }}

          />

        </div>

      )}

      <div style={{ flex: 1, minWidth: 0 }}>

        <div

          style={{

            fontSize: 13,

            fontWeight: 600,

            color: T.text,

            overflow: "hidden",

            textOverflow: "ellipsis",

            whiteSpace: "nowrap",

          }}

        >

          {label}

        </div>

        {sub && <div style={{ fontSize: 10, color: T.textFaint }}>{sub}</div>}

      </div>

      <div style={{ fontSize: 14, fontWeight: 900, color, flexShrink: 0 }}>

        {value}

      </div>

    </div>

  );

}

function AdminPanel() {

  const [tab, setTab] = useState("overview");

  const [period, setPeriod] = useState("today");

  const [comm, setComm] = useState(15);

  const [fee, setFee] = useState(25);

  const [ovst, setOvst] = useState(20);

  const [commSaved, setCommSaved] = useState(false);

  // Simulated live counter

  const [liveUsers, setLive] = useState(1284);

  useEffect(() => {

    const t = setInterval(

      () => setLive((n) => n + (Math.random() > 0.5 ? 1 : -1)),

      4000

    );

    return () => clearInterval(t);

  }, []);

  const PERIODS = [

    ["today", "Hoy"],

    ["week", "7 días"],

    ["month", "Mes"],

    ["year", "Año"],

  ];

  const DATA = {

    today: {

      users: 1284,

      newUsers: 47,

      reservations: 312,

      revenue: "RD$187,450",

      commissions: "RD$28,117",

      avgTicket: "RD$600",

      occupancy: 73,

      publicPct: 68,

      privatePct: 32,

    },

    week: {

      users: 7840,

      newUsers: 318,

      reservations: 2190,

      revenue: "RD$1.31M",

      commissions: "RD$197K",

      avgTicket: "RD$598",

      occupancy: 69,

      publicPct: 71,

      privatePct: 29,

    },

    month: {

      users: 31200,

      newUsers: 1420,

      reservations: 8760,

      revenue: "RD$5.2M",

      commissions: "RD$780K",

      avgTicket: "RD$594",

      occupancy: 67,

      publicPct: 70,

      privatePct: 30,

    },

    year: {

      users: 284000,

      newUsers: 14800,

      reservations: 98000,

      revenue: "RD$58M",

      commissions: "RD$8.7M",

      avgTicket: "RD$592",

      occupancy: 64,

      publicPct: 69,

      privatePct: 31,

    },

  };

  const d = DATA[period];

  const TOP_SPOTS = [

    {

      name: "Parqueo Colonial Premium",

      zone: "Zona Colonial",

      res: 89,

      rev: "RD$53,400",

      occ: 91,

    },

    {

      name: "Estacionamiento Bella Vista",

      zone: "Bella Vista",

      res: 61,

      rev: "RD$36,600",

      occ: 78,

    },

    {

      name: "VIP Piantini",

      zone: "Piantini",

      res: 54,

      rev: "RD$32,400",

      occ: 85,

    },

    {

      name: "Parqueo Naco Center",

      zone: "Naco",

      res: 48,

      rev: "RD$28,800",

      occ: 72,

    },

    {

      name: "Centro Médico CEDIMAT",

      zone: "Gazcue",

      res: 38,

      rev: "RD$22,800",

      occ: 61,

    },

  ];

  const HOT_ZONES = [

    { zone: "Zona Colonial", res: 312, pct: 28 },

    { zone: "Piantini", res: 274, pct: 24 },

    { zone: "Bella Vista", res: 198, pct: 17 },

    { zone: "Naco", res: 164, pct: 14 },

    { zone: "Gazcue", res: 98, pct: 9 },

    { zone: "Arroyo Hondo", res: 66, pct: 6 },

    { zone: "Otros", res: 24, pct: 2 },

  ];

  const PEAK_HOURS = [

    0, 1, 0, 0, 0, 2, 6, 11, 9, 7, 8, 12, 10, 8, 7, 9, 11, 12, 10, 8, 5, 3, 1,

    0,

  ];

  const USER_GROWTH = [820, 910, 1050, 980, 1120, 1200, 1284];

  const HOST_PAYOUTS = [

    {

      host: "J. Martínez",

      parking: "Colonial Premium",

      amount: "RD$45,200",

      pending: "RD$8,400",

      comission: "RD$6,780",

    },

    {

      host: "M. García",

      parking: "Bella Vista",

      amount: "RD$30,600",

      pending: "RD$5,100",

      comission: "RD$4,590",

    },

    {

      host: "R. Pérez",

      parking: "VIP Piantini",

      amount: "RD$27,400",

      pending: "RD$3,200",

      comission: "RD$4,110",

    },

    {

      host: "A. Rodríguez",

      parking: "Naco Center",

      amount: "RD$19,800",

      pending: "RD$2,600",

      comission: "RD$2,970",

    },

  ];

  const FILTERS_USED = [

    { label: "Techado", count: 4820, pct: 31 },

    { label: "24/7", count: 3940, pct: 25 },

    { label: "Cámaras", count: 3120, pct: 20 },

    { label: "Carga EV", count: 2280, pct: 15 },

    { label: "Valet", count: 1400, pct: 9 },

  ];

  const PAYMENT_METHODS = [

    { label: "Tarjeta", pct: 62, color: T.blue },

    { label: "Efectivo", pct: 28, color: T.warn },

    { label: "Wallet", pct: 10, color: T.green },

  ];

  return (

    <div

      style={{

        height: "100%",

        overflowY: "auto",

        background: T.surface,

        paddingBottom: 80,

      }}

    >

      {/* Dark header */}

      <div

        style={{

          background: `linear-gradient(135deg,${T.blueNav},${T.blueDk})`,

          padding: "16px 16px 0",

        }}

      >

        <div

          style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            marginBottom: 14,

          }}

        >

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            <BrandMark small variant="white" />

            <div

              style={{

                background: "rgba(255,255,255,0.15)",

                borderRadius: 20,

                padding: "3px 10px",

              }}

            >

              <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>

                ADMIN

              </span>

            </div>

          </div>

          {/* Live users badge */}

          <div

            style={{

              background: "rgba(16,180,106,0.2)",

              border: "1px solid rgba(16,180,106,0.4)",

              borderRadius: 20,

              padding: "4px 10px",

              display: "flex",

              alignItems: "center",

              gap: 6,

            }}

          >

            <div

              style={{

                width: 7,

                height: 7,

                borderRadius: "50%",

                background: "#4ade80",

              }}

            />

            <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>

              {liveUsers.toLocaleString()} en línea

            </span>

          </div>

        </div>

        {/* Tabs */}

        <div

          style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}

        >

          {[

            ["overview", "📊 Global"],

            ["users", "👥 Usuarios"],

            ["finance", "💰 Finanzas"],

            ["parking", "🅿️ Parqueos"],

            ["behavior", "📈 Comportamiento"],

            ["vehicles_analytics", "🚗 Vehículos"],

            ["commission", "⚙️ Comisiones"],

            ["referrals", "🎁 Referidos"],

            ["disputes", "⚠️ Disputas"],

            ["support", "💬 Soporte"],

            ["overstays", "⏱ Sobretiempos"],

          ].map(([t, l]) => (

            <button

              key={t}

              onClick={() => setTab(t)}

              style={{

                padding: "9px 12px",

                border: "none",

                background: "none",

                fontFamily: font,

                fontSize: 11,

                fontWeight: 700,

                color: tab === t ? "#fff" : "rgba(255,255,255,0.4)",

                cursor: "pointer",

                whiteSpace: "nowrap",

                borderBottom: `2.5px solid ${

                  tab === t ? T.greenAcct : "transparent"

                }`,

                flexShrink: 0,

              }}

            >

              {l}

            </button>

          ))}

        </div>

        <div

          style={{

            height: 2,

            background: `linear-gradient(90deg,${T.green},${T.greenAcct})`,

          }}

        />

      </div>

      {/* Period selector */}

      {["overview", "users", "finance", "parking", "behavior"].includes(

        tab

      ) && (

        <div

          style={{

            background: T.bg,

            borderBottom: `1px solid ${T.border}`,

            padding: "10px 14px",

            display: "flex",

            gap: 6,

          }}

        >

          {PERIODS.map(([k, l]) => (

            <button

              key={k}

              onClick={() => setPeriod(k)}

              style={{

                flex: 1,

                padding: "7px 4px",

                borderRadius: 20,

                border: `1.5px solid ${period === k ? T.blue : T.border}`,

                background: period === k ? T.blueLt : T.bg,

                color: period === k ? T.blue : T.textSub,

                fontSize: 11,

                fontWeight: 700,

                cursor: "pointer",

                fontFamily: font,

              }}

            >

              {l}

            </button>

          ))}

        </div>

      )}

      <div style={{ padding: "14px 14px" }}>

        {/* ── GLOBAL OVERVIEW ── */}

        {tab === "overview" && (

          <>

            <div

              style={{

                display: "grid",

                gridTemplateColumns: "1fr 1fr",

                gap: 10,

                marginBottom: 14,

              }}

            >

              <MetricCard

                label="Usuarios activos"

                value={d.users.toLocaleString()}

                sub={`+${d.newUsers} nuevos`}

                color={T.green}

                icon="👥"

              />

              <MetricCard

                label="Reservas"

                value={d.reservations.toLocaleString()}

                sub="completadas"

                color={T.blue}

                icon="🅿️"

              />

              <MetricCard

                label="Ingresos plataforma"

                value={d.revenue}

                color={T.warn}

                icon="💰"

              />

              <MetricCard

                label="Comisiones totales"

                value={d.commissions}

                color={T.blueNav}

                icon="📊"

              />

              <MetricCard

                label="Ticket promedio"

                value={d.avgTicket}

                color={T.green}

                icon="🎫"

              />

              <MetricCard

                label="Ocupación media"

                value={`${d.occupancy}%`}

                sub="de todos los parqueos"

                color={T.blue}

                icon="📍"

              />

            </div>

            {/* Active parkings */}

            <Card style={{ marginBottom: 14 }}>

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                  marginBottom: 10,

                }}

              >

                <SectionLabel style={{ margin: 0 }}>

                  Estado de parqueos

                </SectionLabel>

                <span style={{ fontSize: 12, color: T.textSub }}>

                  47 registrados

                </span>

              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>

                {[

                  ["42", "✅ Activos", T.green, T.greenLt, T.greenMid],

                  ["3", "⏸ En revisión", T.warn, T.warnBg, T.warnBd],

                  ["2", "🚫 Suspendidos", T.danger, T.dangerBg, T.dangerBd],

                ].map(([v, l, c, bg, bd]) => (

                  <div

                    key={l}

                    style={{

                      flex: 1,

                      background: bg,

                      border: `1.5px solid ${bd}`,

                      borderRadius: 12,

                      padding: "10px 8px",

                      textAlign: "center",

                    }}

                  >

                    <div style={{ fontSize: 22, fontWeight: 900, color: c }}>

                      {v}

                    </div>

                    <div

                      style={{

                        fontSize: 9,

                        color: c,

                        fontWeight: 700,

                        marginTop: 2,

                      }}

                    >

                      {l}

                    </div>

                  </div>

                ))}

              </div>

            </Card>

            {/* Public vs Private */}

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Tipo de parqueo reservado</SectionLabel>

              <div

                style={{

                  display: "flex",

                  gap: 3,

                  height: 16,

                  borderRadius: 8,

                  overflow: "hidden",

                  marginBottom: 10,

                }}

              >

                <div style={{ flex: d.publicPct, background: T.blue }} />

                <div style={{ flex: d.privatePct, background: T.green }} />

              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

                  <div

                    style={{

                      width: 10,

                      height: 10,

                      borderRadius: 2,

                      background: T.blue,

                    }}

                  />

                  <span style={{ fontSize: 12, color: T.textSub }}>

                    Público {d.publicPct}%

                  </span>

                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

                  <div

                    style={{

                      width: 10,

                      height: 10,

                      borderRadius: 2,

                      background: T.green,

                    }}

                  />

                  <span style={{ fontSize: 12, color: T.textSub }}>

                    Privado {d.privatePct}%

                  </span>

                </div>

              </div>

            </Card>

            {/* Registered parkings list */}

            <Card>

              <SectionLabel>Parqueos registrados</SectionLabel>

              {SPOTS.map((s) => (

                <div

                  key={s.id}

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                    padding: "10px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <div>

                    <div

                      style={{ color: T.text, fontSize: 13, fontWeight: 700 }}

                    >

                      {s.name}

                    </div>

                    <div style={{ color: T.textSub, fontSize: 11 }}>

                      {s.location}

                    </div>

                  </div>

                  <SuspendBtn spotId={s.id} />

                </div>

              ))}

            </Card>

          </>

        )}

        {/* ── USUARIOS ── */}

        {tab === "users" && (

          <>

            <div

              style={{

                display: "grid",

                gridTemplateColumns: "1fr 1fr",

                gap: 10,

                marginBottom: 14,

              }}

            >

              <MetricCard

                label="Usuarios totales"

                value={d.users.toLocaleString()}

                color={T.green}

                icon="👥"

              />

              <MetricCard

                label="Nuevos registros"

                value={d.newUsers.toLocaleString()}

                sub="este período"

                color={T.blue}

                icon="✨"

              />

            </div>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Crecimiento de usuarios (7 días)</SectionLabel>

              <MiniBar data={USER_GROWTH} color={T.blue} height={60} />

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginTop: 5,

                }}

              >

                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (

                  <span key={d} style={{ fontSize: 9, color: T.textFaint }}>

                    {d}

                  </span>

                ))}

              </div>

            </Card>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Actividad por hora del día</SectionLabel>

              <MiniBar data={PEAK_HOURS} color={T.green} height={56} />

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginTop: 5,

                }}

              >

                {["12am", "4am", "8am", "12pm", "4pm", "8pm"].map((h) => (

                  <span key={h} style={{ fontSize: 9, color: T.textFaint }}>

                    {h}

                  </span>

                ))}

              </div>

              <div

                style={{

                  background: T.greenLt,

                  borderRadius: 10,

                  padding: "8px 12px",

                  marginTop: 10,

                }}

              >

                <div style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>

                  🔥 Hora pico: 5:00 PM – 7:00 PM · Pico máximo 6pm con{" "}

                  {Math.max(...PEAK_HOURS) * 42} usuarios

                </div>

              </div>

            </Card>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Retención de usuarios</SectionLabel>

              {[

                ["Usan la app más de 1 vez", "84%", T.green],

                ["Reservan al menos 1 vez/semana", "61%", T.blue],

                ["Han usado chat con host", "38%", T.warn],

                ["Han extendido tiempo", "22%", T.blueNav],

              ].map(([l, v, c]) => (

                <div

                  key={l}

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                    padding: "9px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <span style={{ fontSize: 12, color: T.textSub, flex: 1 }}>

                    {l}

                  </span>

                  <span style={{ fontSize: 14, fontWeight: 900, color: c }}>

                    {v}

                  </span>

                </div>

              ))}

            </Card>

            <Card>

              <SectionLabel>Dispositivos</SectionLabel>

              <div style={{ display: "flex", gap: 10 }}>

                {[

                  ["📱 iOS", "58%", T.blue],

                  ["🤖 Android", "36%", T.green],

                  ["💻 Web", "6%", T.textSub],

                ].map(([l, v, c]) => (

                  <div

                    key={l}

                    style={{

                      flex: 1,

                      textAlign: "center",

                      background: T.surface,

                      borderRadius: 12,

                      padding: "12px 6px",

                    }}

                  >

                    <div style={{ fontSize: 20, marginBottom: 4 }}>

                      {l.split(" ")[0]}

                    </div>

                    <div style={{ fontSize: 16, fontWeight: 900, color: c }}>

                      {v}

                    </div>

                    <div style={{ fontSize: 10, color: T.textFaint }}>

                      {l.split(" ")[1]}

                    </div>

                  </div>

                ))}

              </div>

            </Card>

          </>

        )}

        {/* ── FINANZAS ── */}

        {tab === "finance" && (

          <>

            <div

              style={{

                display: "grid",

                gridTemplateColumns: "1fr 1fr",

                gap: 10,

                marginBottom: 14,

              }}

            >

              <MetricCard

                label="Ingresos brutos"

                value={d.revenue}

                color={T.green}

                icon="💰"

              />

              <MetricCard

                label="Comisiones ganadas"

                value={d.commissions}

                sub={`${comm}% comisión`}

                color={T.blue}

                icon="📊"

              />

              <MetricCard

                label="Fees de servicio"

                value={

                  period === "today"

                    ? "RD$7,800"

                    : period === "week"

                    ? "RD$54,750"

                    : period === "month"

                    ? "RD$219,000"

                    : "RD$2.45M"

                }

                color={T.warn}

                icon="🎫"

              />

              <MetricCard

                label="Sobretiempos cobrados"

                value={

                  period === "today"

                    ? "RD$4,250"

                    : period === "week"

                    ? "RD$29,750"

                    : period === "month"

                    ? "RD$119,000"

                    : "RD$1.43M"

                }

                color={T.danger}

                icon="⏱"

              />

            </div>

            {/* Revenue bar chart */}

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Ingresos por día (RD$)</SectionLabel>

              <MiniBar

                data={[142, 168, 155, 190, 178, 210, 187]}

                color={T.green}

                height={64}

              />

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  marginTop: 5,

                }}

              >

                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (

                  <span key={d} style={{ fontSize: 9, color: T.textFaint }}>

                    {d}

                  </span>

                ))}

              </div>

            </Card>

            {/* Payout per host */}

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Depósitos por host</SectionLabel>

              {HOST_PAYOUTS.map((h, i) => (

                <div

                  key={i}

                  style={{

                    padding: "10px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      marginBottom: 4,

                    }}

                  >

                    <div>

                      <div

                        style={{ fontSize: 13, fontWeight: 700, color: T.text }}

                      >

                        {h.host}

                      </div>

                      <div style={{ fontSize: 11, color: T.textSub }}>

                        {h.parking}

                      </div>

                    </div>

                    <div style={{ textAlign: "right" }}>

                      <div

                        style={{

                          fontSize: 14,

                          fontWeight: 900,

                          color: T.green,

                        }}

                      >

                        {h.amount}

                      </div>

                      <div style={{ fontSize: 10, color: T.textFaint }}>

                        Pendiente: {h.pending}

                      </div>

                    </div>

                  </div>

                  <div style={{ display: "flex", gap: 6 }}>

                    <div

                      style={{

                        background: T.blueLt,

                        borderRadius: 6,

                        padding: "2px 8px",

                        fontSize: 10,

                        color: T.blue,

                        fontWeight: 700,

                      }}

                    >

                      Comisión: {h.comission}

                    </div>

                  </div>

                </div>

              ))}

            </Card>

            <Card>

              <SectionLabel>Métodos de pago</SectionLabel>

              <div

                style={{

                  display: "flex",

                  gap: 3,

                  height: 14,

                  borderRadius: 6,

                  overflow: "hidden",

                  marginBottom: 10,

                }}

              >

                {PAYMENT_METHODS.map((m) => (

                  <div

                    key={m.label}

                    style={{ flex: m.pct, background: m.color }}

                  />

                ))}

              </div>

              {PAYMENT_METHODS.map((m) => (

                <div

                  key={m.label}

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    padding: "7px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <div

                    style={{ display: "flex", alignItems: "center", gap: 8 }}

                  >

                    <div

                      style={{

                        width: 10,

                        height: 10,

                        borderRadius: 2,

                        background: m.color,

                      }}

                    />

                    <span style={{ fontSize: 13, color: T.textSub }}>

                      {m.label}

                    </span>

                  </div>

                  <span

                    style={{ fontSize: 14, fontWeight: 700, color: m.color }}

                  >

                    {m.pct}%

                  </span>

                </div>

              ))}

            </Card>

          </>

        )}

        {/* ── PARQUEOS ── */}

        {tab === "parking" && (

          <>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>🔥 Zonas más activas</SectionLabel>

              {HOT_ZONES.map((z, i) => (

                <StatRow

                  key={i}

                  label={z.zone}

                  value={`${z.res} reservas`}

                  sub={`${z.pct}% del total`}

                  color={i === 0 ? T.danger : i === 1 ? T.warn : T.blue}

                  bar={z.res}

                  barMax={HOT_ZONES[0].res}

                />

              ))}

            </Card>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Parqueos más ocupados</SectionLabel>

              {TOP_SPOTS.map((s, i) => (

                <div

                  key={i}

                  style={{

                    padding: "10px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      marginBottom: 6,

                    }}

                  >

                    <div>

                      <div

                        style={{ fontSize: 13, fontWeight: 700, color: T.text }}

                      >

                        {s.name}

                      </div>

                      <div style={{ fontSize: 11, color: T.textSub }}>

                        {s.zone} · {s.res} reservas

                      </div>

                    </div>

                    <div style={{ textAlign: "right" }}>

                      <div

                        style={{

                          fontSize: 13,

                          fontWeight: 800,

                          color: T.green,

                        }}

                      >

                        {s.rev}

                      </div>

                      <div

                        style={{

                          fontSize: 11,

                          color:

                            s.occ >= 85

                              ? T.danger

                              : s.occ >= 70

                              ? T.warn

                              : T.green,

                        }}

                      >

                        Ocup. {s.occ}%

                      </div>

                    </div>

                  </div>

                  <div

                    style={{

                      height: 5,

                      background: T.surface2,

                      borderRadius: 3,

                    }}

                  >

                    <div

                      style={{

                        height: "100%",

                        width: `${s.occ}%`,

                        background:

                          s.occ >= 85

                            ? T.danger

                            : s.occ >= 70

                            ? T.warn

                            : T.green,

                        borderRadius: 3,

                      }}

                    />

                  </div>

                </div>

              ))}

            </Card>

            <Card>

              <SectionLabel>Horas más reservadas del día</SectionLabel>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

                {[

                  ["8:00 AM", 342, "🔥"],

                  ["6:00 PM", 318, "🔥"],

                  ["9:00 AM", 290, ""],

                  ["5:00 PM", 278, ""],

                  ["12:00 PM", 234, ""],

                  ["7:00 PM", 198, ""],

                  ["10:00 AM", 187, ""],

                ].map(([h, v, fire]) => (

                  <div

                    key={h}

                    style={{ display: "flex", alignItems: "center", gap: 10 }}

                  >

                    <span

                      style={{

                        fontSize: 11,

                        color: T.textSub,

                        width: 60,

                        flexShrink: 0,

                      }}

                    >

                      {h}

                    </span>

                    <div

                      style={{

                        flex: 1,

                        height: 8,

                        background: T.surface2,

                        borderRadius: 4,

                      }}

                    >

                      <div

                        style={{

                          height: "100%",

                          width: `${(v / 342) * 100}%`,

                          background: v >= 300 ? T.danger : T.blue,

                          borderRadius: 4,

                        }}

                      />

                    </div>

                    <span

                      style={{

                        fontSize: 12,

                        fontWeight: 700,

                        color: T.text,

                        width: 36,

                        textAlign: "right",

                      }}

                    >

                      {v}

                    </span>

                    <span>{fire}</span>

                  </div>

                ))}

              </div>

            </Card>

          </>

        )}

        {/* ── COMPORTAMIENTO ── */}

        {tab === "behavior" && (

          <>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Filtros más usados al buscar</SectionLabel>

              {FILTERS_USED.map((f, i) => (

                <StatRow

                  key={i}

                  label={f.label}

                  value={f.count.toLocaleString()}

                  sub={`${f.pct}% de búsquedas`}

                  color={T.blue}

                  bar={f.count}

                  barMax={FILTERS_USED[0].count}

                />

              ))}

            </Card>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Duración de estadía más reservada</SectionLabel>

              {[

                ["1 hora", "38%", T.blue, 38],

                ["2 horas", "29%", T.green, 29],

                ["4 horas", "16%", T.warn, 16],

                ["Todo el día", "11%", T.blueNav, 11],

                ["8 horas", "6%", T.textSub, 6],

              ].map(([l, v, c, n]) => (

                <div

                  key={l}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 10,

                    padding: "8px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <span

                    style={{

                      fontSize: 12,

                      color: T.textSub,

                      width: 72,

                      flexShrink: 0,

                    }}

                  >

                    {l}

                  </span>

                  <div

                    style={{

                      flex: 1,

                      height: 8,

                      background: T.surface2,

                      borderRadius: 4,

                    }}

                  >

                    <div

                      style={{

                        height: "100%",

                        width: `${n / 0.38}%`,

                        background: c,

                        borderRadius: 4,

                      }}

                    />

                  </div>

                  <span

                    style={{

                      fontSize: 13,

                      fontWeight: 800,

                      color: c,

                      width: 34,

                      textAlign: "right",

                    }}

                  >

                    {v}

                  </span>

                </div>

              ))}

            </Card>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Destinos más buscados</SectionLabel>

              {[

                ["Ágora Mall", "Piantini", 1840],

                ["UASD", "Gazcue", 1620],

                ["Estadio Quisqueya", "La Julia", 1310],

                ["Plaza Central", "Naco", 1180],

                ["Centro Olímpico", "Arroyo Hondo", 980],

                ["Clínica Abel González", "Gazcue", 840],

              ].map(([name, zone, n], i) => (

                <StatRow

                  key={i}

                  label={name}

                  value={n.toLocaleString()}

                  sub={zone}

                  color={T.blue}

                  bar={n}

                  barMax={1840}

                />

              ))}

            </Card>

            <Card style={{ marginBottom: 14 }}>

              <SectionLabel>Comportamiento de reservas</SectionLabel>

              {[

                ["Reservas automáticas aceptadas", "74%", T.green],

                ["Reservas manuales aprobadas", "21%", T.blue],

                ["Reservas canceladas", "5%", T.danger],

                ["Usuarios que extienden tiempo", "22%", T.warn],

                ["Usuarios que usan chat con host", "38%", T.blueNav],

                ["Reservas con microseguro activo", "61%", T.green],

                ["Usan la app en español", "97%", T.textSub],

              ].map(([l, v, c]) => (

                <div

                  key={l}

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    padding: "9px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <span style={{ fontSize: 12, color: T.textSub, flex: 1 }}>

                    {l}

                  </span>

                  <span style={{ fontSize: 13, fontWeight: 800, color: c }}>

                    {v}

                  </span>

                </div>

              ))}

            </Card>

            <Card>

              <SectionLabel>Fuente de adquisición de usuarios</SectionLabel>

              {[

                ["Búsqueda orgánica", "43%", T.blue, 43],

                ["Referidos", "28%", T.green, 28],

                ["Instagram", "18%", T.warn, 18],

                ["Directo", "11%", T.blueNav, 11],

              ].map(([l, v, c, n]) => (

                <div

                  key={l}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    gap: 10,

                    padding: "8px 0",

                    borderBottom: `1px solid ${T.border}`,

                  }}

                >

                  <span style={{ fontSize: 12, color: T.textSub, flex: 1 }}>

                    {l}

                  </span>

                  <div

                    style={{

                      width: 60,

                      height: 6,

                      background: T.surface2,

                      borderRadius: 3,

                    }}

                  >

                    <div

                      style={{

                        height: "100%",

                        width: `${n}%`,

                        background: c,

                        borderRadius: 3,

                      }}

                    />

                  </div>

                  <span

                    style={{

                      fontSize: 13,

                      fontWeight: 800,

                      color: c,

                      width: 34,

                      textAlign: "right",

                    }}

                  >

                    {v}

                  </span>

                </div>

              ))}

            </Card>

          </>

        )}

        {/* ── VEHÍCULOS ANALYTICS ── */}

        {tab === "vehicles_analytics" && <VehiclesAnalytics />}

        {/* ── COMISIONES ── */}

        {tab === "commission" && (

          <CommissionManager

            comm={comm}

            setComm={setComm}

            fee={fee}

            setFee={setFee}

            ovst={ovst}

            setOvst={setOvst}

            commSaved={commSaved}

            setCommSaved={setCommSaved}

            HOST_PAYOUTS={HOST_PAYOUTS}

          />

        )}

        {/* ── DISPUTAS ── */}

        {tab === "referrals" && <AdminReferrals />}

        {tab === "disputes" && (

          <div style={{ position: "relative" }}>

            <DisputeSystem />

          </div>

        )}

        {/* ── SOBRETIEMPOS ── */}

        {tab === "support" && <AdminSupportPanel />}

        {tab === "overstays" && (

          <>

            <div

              style={{

                display: "grid",

                gridTemplateColumns: "1fr 1fr",

                gap: 10,

                marginBottom: 14,

              }}

            >

              <MetricCard

                label="Sobretiempos hoy"

                value="28"

                color={T.danger}

                icon="⏱"

              />

              <MetricCard

                label="Cobrado hoy"

                value="RD$4,250"

                sub="1.5× tarifa base"

                color={T.warn}

                icon="💰"

              />

            </div>

            {[

              {

                plate: "A123456",

                parking: "Parqueo Colonial",

                extra: "34 min",

                charge: "RD$127",

                active: true,

                host: "J. Martínez",

              },

              {

                plate: "B789012",

                parking: "Bella Vista",

                extra: "12 min",

                charge: "RD$45",

                active: true,

                host: "M. García",

              },

              {

                plate: "C345678",

                parking: "VIP Piantini",

                extra: "58 min",

                charge: "RD$217",

                active: false,

                host: "R. Pérez",

              },

              {

                plate: "D901234",

                parking: "Naco Center",

                extra: "8 min",

                charge: "RD$30",

                active: false,

                host: "A. Rodríguez",

              },

            ].map((o, i) => (

              <Card

                key={i}

                style={{

                  marginBottom: 10,

                  borderLeft: `4px solid ${o.active ? T.danger : T.green}`,

                }}

              >

                <div

                  style={{

                    display: "flex",

                    justifyContent: "space-between",

                    alignItems: "center",

                    marginBottom: 6,

                  }}

                >

                  <div>

                    <div

                      style={{ fontWeight: 800, color: T.text, fontSize: 14 }}

                    >

                      Placa: {o.plate}

                    </div>

                    <div style={{ color: T.textSub, fontSize: 12 }}>

                      {o.parking} · Host: {o.host}

                    </div>

                    <div style={{ color: T.textFaint, fontSize: 11 }}>

                      Sobretiempo: +{o.extra}

                    </div>

                  </div>

                  <div style={{ textAlign: "right" }}>

                    <div

                      style={{

                        color: o.active ? T.danger : T.green,

                        fontWeight: 900,

                        fontSize: 18,

                      }}

                    >

                      {o.charge}

                    </div>

                    <Tag

                      color={o.active ? T.danger : T.green}

                      bg={o.active ? T.dangerBg : T.greenLt}

                      border={o.active ? T.dangerBd : T.greenMid}

                    >

                      {o.active ? "Activo" : "Resuelto"}

                    </Tag>

                  </div>

                </div>

              </Card>

            ))}

          </>

        )}

      </div>

    </div>

  );

}

// ─── MOCK USER DB ─────────────────────────────────────────────────────────────

const MOCK_USERS = [

  {

    email: "admin@parkealo.com",

    password: "admin123",

    name: "Admin Parkealo",

    role: "admin",

  },

  {

    email: "host@parkealo.com",

    password: "host123",

    name: "Juan Martínez",

    role: "host",

  },

  {

    email: "user@parkealo.com",

    password: "user123",

    name: "Carlos Méndez",

    role: "user",

  },

];

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

const Header = ({ mode, setMode, setError }) => (

  <div

    style={{

      background: `linear-gradient(170deg,${T.blueNav},${T.blue})`,

      padding: "44px 28px 28px",

      display: "flex",

      flexDirection: "column",

      alignItems: "center",

      position: "relative",

      overflow: "hidden",

      flexShrink: 0,

    }}

  >

    {[38, 58, 32, 66, 46, 28, 72, 44, 60, 36].map((h, i) => (

      <div

        key={i}

        style={{

          position: "absolute",

          bottom: 0,

          left: `${i * 11}%`,

          width: 22 + (i % 3) * 5,

          height: h,

          background: "rgba(255,255,255,0.04)",

          borderRadius: "3px 3px 0 0",

        }}

      />

    ))}

    <ParkealoPinLogo size={56} variant="white" />

    <ParkealoWordmark size={26} variant="white" />

    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 6 }}>

      Renta tu parqueo fácil

    </div>

    {/* Login / Register toggle */}

    <div

      style={{

        display: "flex",

        background: "rgba(255,255,255,0.12)",

        borderRadius: 22,

        padding: 3,

        gap: 0,

        marginTop: 16,

        position: "relative",

        zIndex: 1,

      }}

    >

      {[

        ["login", "Iniciar sesión"],

        ["signup", "Registrarse"],

      ].map(([m, l]) => (

        <button

          key={m}

          onClick={() => {

            setMode(m);

            setError("");

          }}

          style={{

            padding: "7px 18px",

            borderRadius: 20,

            border: "none",

            background: mode === m ? "#fff" : "transparent",

            color: mode === m ? T.blue : "rgba(255,255,255,0.75)",

            fontFamily: font,

            fontWeight: 700,

            fontSize: 12,

            cursor: "pointer",

            transition: "all 0.2s",

          }}

        >

          {l}

        </button>

      ))}

    </div>

  </div>

);

const FField = ({

  label,

  value,

  onChange,

  placeholder,

  type = "text",

  icon,

  autoComplete,

  action,

}) => (

  <div style={{ marginBottom: 14 }}>

    <div

      style={{

        fontSize: 11,

        fontWeight: 700,

        color: T.textSub,

        marginBottom: 6,

      }}

    >

      {label}

    </div>

    <div

      style={{

        display: "flex",

        alignItems: "center",

        background: T.surface,

        border: `1.5px solid ${value ? T.blue : T.borderMd}`,

        borderRadius: 12,

        overflow: "hidden",

        transition: "border 0.2s",

      }}

    >

      {icon && <div style={{ padding: "0 12px", flexShrink: 0 }}>{icon}</div>}

      <input

        value={value}

        onChange={(e) => {

          onChange(e.target.value);

          setError("");

        }}

        placeholder={placeholder}

        type={type}

        autoComplete={autoComplete}

        style={{

          flex: 1,

          padding: "13px 14px 13px",

          border: "none",

          outline: "none",

          fontSize: 14,

          fontFamily: font,

          color: T.text,

          background: "transparent",

        }}

      />

      {action}

    </div>

  </div>

);

function LoginScreen({ onLogin }) {

  const [mode, setMode] = useState("login"); // "login" | "signup" | "success"

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);

  const [confirmPass, setConfirmPass] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [phone, setPhone] = useState("");

  const [plate, setPlate] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [remember, setRemember] = useState(true);

  const handle = () => {

    setError("");

    if (!email || !password) {

      setError("Completa todos los campos.");

      return;

    }

    // 🔐 Rate limiting — block after 5 failed attempts within 1 minute

    const rateKey = "login_" + email.toLowerCase().trim();

    if (!RateLimiter.check(rateKey)) {

      const secs = RateLimiter.getRemainingTime(rateKey);

      setError(

        "Demasiados intentos fallidos. Espera " +

          Math.ceil(secs / 60) +

          " minuto(s) antes de intentar de nuevo."

      );

      return;

    }

    // 🔐 Input validation

    if (!validateEmail(email.trim())) {

      setError("Ingresa un correo electrónico válido.");

      return;

    }

    if (isSuspicious(email) || isSuspicious(password)) {

      setError("Entrada no permitida.");

      return;

    }

    setLoading(true);

    setTimeout(() => {

      const user = MOCK_USERS.find(

        (u) => u.email === email.trim().toLowerCase() && u.password === password

      );

      if (user) {

        // 🔐 Secure session with 8h expiry

        if (remember) {

          SecureSession.save(user);

        }

        onLogin(user);

      } else {

        setError("Correo o contraseña incorrectos.");

        setLoading(false);

      }

    }, 900);

  };

  // ── Signup handler ────────────────────────────────────────────────────────

  const handleSignup = () => {

    setError("");

    if (!firstName.trim()) {

      setError("Ingresa tu nombre.");

      return;

    }

    if (!email.trim()) {

      setError("Ingresa tu correo electrónico.");

      return;

    }

    if (!validateEmail(email)) {

      setError("Correo electrónico inválido.");

      return;

    }

    if (password.length < 6) {

      setError("La contraseña debe tener al menos 6 caracteres.");

      return;

    }

    if (password !== confirmPass) {

      setError("Las contraseñas no coinciden.");

      return;

    }

    if (!agreeTerms) {

      setError("Debes aceptar los términos y condiciones.");

      return;

    }

    if (isSuspicious(email) || isSuspicious(firstName)) {

      setError("Entrada no permitida.");

      return;

    }

    setLoading(true);

    setTimeout(() => {

      const newUser = {

        email: email.trim().toLowerCase(),

        name: `${firstName.trim()} ${lastName.trim()}`.trim(),

        role: "user",

      };

      if (remember) {

        SecureSession.save(newUser);

      }

      setLoading(false);

      setMode("success");

      setTimeout(() => onLogin(newUser), 1800);

    }, 1000);

  };

  // ── Input field helper ─────────────────────────────────────────────────────

  const EyeIcon = (visible) =>

    visible ? (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill="none"

        stroke={T.textFaint}

        strokeWidth="2"

        strokeLinecap="round"

      >

        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />

        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />

        <line x1="1" y1="1" x2="23" y2="23" />

      </svg>

    ) : (

      <svg

        width="16"

        height="16"

        viewBox="0 0 24 24"

        fill="none"

        stroke={T.textFaint}

        strokeWidth="2"

        strokeLinecap="round"

      >

        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />

        <circle cx="12" cy="12" r="3" />

      </svg>

    );

  // ── Shared top header ──────────────────────────────────────────────────────

  // ── Success screen ─────────────────────────────────────────────────────────

  if (mode === "success")

    return (

      <div

        style={{

          height: "100%",

          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          justifyContent: "center",

          background: T.bg,

          padding: 32,

        }}

      >

        <div

          style={{

            width: 80,

            height: 80,

            borderRadius: "50%",

            background: T.greenLt,

            border: `3px solid ${T.green}`,

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            marginBottom: 20,

          }}

        >

          <svg

            width="38"

            height="38"

            viewBox="0 0 24 24"

            fill="none"

            stroke={T.green}

            strokeWidth="2.5"

            strokeLinecap="round"

          >

            <polyline points="20 6 9 17 4 12" />

          </svg>

        </div>

        <div

          style={{

            fontWeight: 900,

            fontSize: 22,

            color: T.text,

            marginBottom: 8,

          }}

        >

          ¡Bienvenido a Parkealo!

        </div>

        <div

          style={{

            color: T.textSub,

            fontSize: 14,

            textAlign: "center",

            lineHeight: 1.7,

          }}

        >

          Tu cuenta ha sido creada exitosamente.{"\n"}Iniciando sesión…

        </div>

      </div>

    );

  return (

    <div

      style={{

        height: "100%",

        display: "flex",

        flexDirection: "column",

        background: T.bg,

        overflow: "hidden",

      }}

    >

      <Header mode={mode} setMode={setMode} setError={setError} />

      {/* ── LOGIN FORM ── */}

      {mode === "login" && (

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 24px" }}>

          {error && (

            <div

              style={{

                background: T.dangerBg,

                border: `1px solid ${T.dangerBd}`,

                borderRadius: 12,

                padding: "10px 14px",

                marginBottom: 16,

                fontSize: 13,

                color: T.danger,

                fontWeight: 600,

              }}

            >

              {error}

            </div>

          )}

          <FField

            label="CORREO ELECTRÓNICO"

            value={email}

            onChange={setEmail}

            placeholder="correo@ejemplo.com"

            type="email"

            autoComplete="email"

            icon={

              <svg

                width="16"

                height="16"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />

                <polyline points="22,6 12,13 2,6" />

              </svg>

            }

          />

          <FField

            label="CONTRASEÑA"

            value={password}

            onChange={setPassword}

            placeholder="••••••••"

            type={showPass ? "text" : "password"}

            autoComplete="current-password"

            icon={

              <svg

                width="16"

                height="16"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <rect x="3" y="11" width="18" height="11" rx="2" />

                <path d="M7 11V7a5 5 0 0 1 10 0v4" />

              </svg>

            }

            action={

              <button

                onClick={() => setShowPass((v) => !v)}

                style={{

                  padding: "0 14px",

                  background: "none",

                  border: "none",

                  cursor: "pointer",

                }}

              >

                {EyeIcon(showPass)}

              </button>

            }

          />

          <div

            style={{

              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              marginBottom: 22,

            }}

          >

            <div

              style={{

                display: "flex",

                alignItems: "center",

                gap: 8,

                cursor: "pointer",

              }}

              onClick={() => setRemember((v) => !v)}

            >

              <div

                style={{

                  width: 20,

                  height: 20,

                  borderRadius: 6,

                  border: `2px solid ${remember ? T.blue : T.borderMd}`,

                  background: remember ? T.blue : "transparent",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                }}

              >

                {remember && (

                  <svg

                    width="11"

                    height="11"

                    viewBox="0 0 24 24"

                    fill="none"

                    stroke="#fff"

                    strokeWidth="3"

                    strokeLinecap="round"

                  >

                    <polyline points="20 6 9 17 4 12" />

                  </svg>

                )}

              </div>

              <span style={{ fontSize: 13, color: T.textSub, fontWeight: 600 }}>

                Recordar sesión

              </span>

            </div>

            <button

              style={{

                background: "none",

                border: "none",

                color: T.blue,

                fontSize: 13,

                fontWeight: 700,

                cursor: "pointer",

                fontFamily: font,

              }}

            >

              ¿Olvidaste tu contraseña?

            </button>

          </div>

          <button

            onClick={handle}

            disabled={loading}

            style={{

              width: "100%",

              background: loading

                ? T.surface2

                : `linear-gradient(135deg,${T.blue},${T.blueSky})`,

              border: "none",

              borderRadius: 14,

              padding: "15px 0",

              color: loading ? T.textFaint : "#fff",

              fontSize: 15,

              fontWeight: 800,

              fontFamily: font,

              cursor: loading ? "not-allowed" : "pointer",

              boxShadow: loading ? "none" : T.shadowMd,

              marginBottom: 18,

            }}

          >

            {loading ? "Iniciando sesión…" : "Iniciar sesión"}

          </button>

          <div

            style={{

              display: "flex",

              alignItems: "center",

              gap: 10,

              marginBottom: 18,

            }}

          >

            <div style={{ flex: 1, height: 1, background: T.border }} />

            <span style={{ fontSize: 11, color: T.textFaint, fontWeight: 600 }}>

              O CONTINÚA CON

            </span>

            <div style={{ flex: 1, height: 1, background: T.border }} />

          </div>

          <div style={{ display: "flex", gap: 10 }}>

            {[

              ["🍎", "Apple"],

              ["G", "Google"],

            ].map(([icon, label]) => (

              <button

                key={label}

                onClick={() =>

                  onLogin({

                    email: "guest@parkealo.com",

                    name: "Usuario",

                    role: "user",

                  })

                }

                style={{

                  flex: 1,

                  background: T.surface,

                  border: `1.5px solid ${T.border}`,

                  borderRadius: 12,

                  padding: "12px 0",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  gap: 8,

                  cursor: "pointer",

                  fontFamily: font,

                  fontWeight: 700,

                  fontSize: 13,

                  color: T.text,

                }}

              >

                <span

                  style={{

                    fontSize: 16,

                    fontWeight: icon === "G" ? 900 : 400,

                    color: icon === "G" ? "#4285F4" : T.text,

                  }}

                >

                  {icon}

                </span>

                {label}

              </button>

            ))}

          </div>

        </div>

      )}

      {/* ── SIGNUP FORM ── */}

      {mode === "signup" && (

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 32px" }}>

          {error && (

            <div

              style={{

                background: T.dangerBg,

                border: `1px solid ${T.dangerBd}`,

                borderRadius: 12,

                padding: "10px 14px",

                marginBottom: 16,

                fontSize: 13,

                color: T.danger,

                fontWeight: 600,

              }}

            >

              {error}

            </div>

          )}

          {/* Name fields stacked */}

          <FField

            label="NOMBRE *"

            value={firstName}

            onChange={setFirstName}

            placeholder="Juan"

            autoComplete="given-name"

            icon={

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

                <circle cx="12" cy="7" r="4" />

              </svg>

            }

          />

          <FField

            label="APELLIDO"

            value={lastName}

            onChange={setLastName}

            placeholder="Pérez"

            autoComplete="family-name"

            icon={

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

                <circle cx="12" cy="7" r="4" />

              </svg>

            }

          />

          <FField

            label="CORREO ELECTRÓNICO *"

            value={email}

            onChange={setEmail}

            placeholder="correo@ejemplo.com"

            type="email"

            autoComplete="email"

            icon={

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />

                <polyline points="22,6 12,13 2,6" />

              </svg>

            }

          />

          <FField

            label="TELÉFONO *"

            value={phone}

            onChange={setPhone}

            placeholder="+1 (809) 000-0000"

            type="tel"

            autoComplete="tel"

            icon={

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.61 4.48 2 2 0 0 1 3.6 2.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />

              </svg>

            }

          />

          <FField

            label="PLACA DE VEHÍCULO"

            value={plate}

            onChange={(v) =>

              setPlate(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))

            }

            placeholder="Ej: A123456"

            autoComplete="off"

            icon={

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <rect x="1" y="3" width="22" height="18" rx="2" />

                <line x1="1" y1="9" x2="23" y2="9" />

                <path d="M7 15h2m4 0h4" />

              </svg>

            }

          />

          <FField

            label="CONTRASEÑA *"

            value={password}

            onChange={setPassword}

            placeholder="Mínimo 6 caracteres"

            type={showPass ? "text" : "password"}

            autoComplete="new-password"

            icon={

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={T.textFaint}

                strokeWidth="2"

                strokeLinecap="round"

              >

                <rect x="3" y="11" width="18" height="11" rx="2" />

                <path d="M7 11V7a5 5 0 0 1 10 0v4" />

              </svg>

            }

            action={

              <button

                onClick={() => setShowPass((v) => !v)}

                style={{

                  padding: "0 14px",

                  background: "none",

                  border: "none",

                  cursor: "pointer",

                }}

              >

                {EyeIcon(showPass)}

              </button>

            }

          />

          <FField

            label="CONFIRMAR CONTRASEÑA *"

            value={confirmPass}

            onChange={setConfirmPass}

            placeholder="Repite tu contraseña"

            type={showConfirm ? "text" : "password"}

            autoComplete="new-password"

            icon={

              <svg

                width="15"

                height="15"

                viewBox="0 0 24 24"

                fill="none"

                stroke={

                  confirmPass && confirmPass === password

                    ? T.green

                    : T.textFaint

                }

                strokeWidth="2"

                strokeLinecap="round"

              >

                <rect x="3" y="11" width="18" height="11" rx="2" />

                <path d="M7 11V7a5 5 0 0 1 10 0v4" />

              </svg>

            }

            action={

              <>

                {confirmPass && (

                  <div style={{ paddingRight: 8 }}>

                    {confirmPass === password ? (

                      <svg

                        width="14"

                        height="14"

                        viewBox="0 0 24 24"

                        fill="none"

                        stroke={T.green}

                        strokeWidth="2.5"

                        strokeLinecap="round"

                      >

                        <polyline points="20 6 9 17 4 12" />

                      </svg>

                    ) : (

                      <svg

                        width="14"

                        height="14"

                        viewBox="0 0 24 24"

                        fill="none"

                        stroke={T.danger}

                        strokeWidth="2.5"

                        strokeLinecap="round"

                      >

                        <line x1="18" y1="6" x2="6" y2="18" />

                        <line x1="6" y1="6" x2="18" y2="18" />

                      </svg>

                    )}

                  </div>

                )}

                <button

                  onClick={() => setShowConfirm((v) => !v)}

                  style={{

                    padding: "0 14px 0 0",

                    background: "none",

                    border: "none",

                    cursor: "pointer",

                  }}

                >

                  {EyeIcon(showConfirm)}

                </button>

              </>

            }

          />

          {/* Password strength */}

          {password && (

            <div style={{ marginTop: -8, marginBottom: 14 }}>

              <div

                style={{

                  height: 4,

                  background: T.surface2,

                  borderRadius: 2,

                  overflow: "hidden",

                }}

              >

                <div

                  style={{

                    height: "100%",

                    borderRadius: 2,

                    transition: "all 0.3s",

                    width:

                      password.length < 6

                        ? "30%"

                        : password.length < 8

                        ? "60%"

                        : password.match(/[A-Z]/) && password.match(/[0-9]/)

                        ? "100%"

                        : "80%",

                    background:

                      password.length < 6

                        ? T.danger

                        : password.length < 8

                        ? T.warn

                        : password.match(/[A-Z]/) && password.match(/[0-9]/)

                        ? T.green

                        : T.blue,

                  }}

                />

              </div>

              <div

                style={{

                  fontSize: 10,

                  color:

                    password.length < 6

                      ? T.danger

                      : password.length < 8

                      ? T.warn

                      : T.green,

                  fontWeight: 600,

                  marginTop: 3,

                }}

              >

                {password.length < 6

                  ? "Contraseña muy corta"

                  : password.length < 8

                  ? "Contraseña débil"

                  : password.match(/[A-Z]/) && password.match(/[0-9]/)

                  ? "Contraseña fuerte 🔐"

                  : "Contraseña aceptable"}

              </div>

            </div>

          )}

          {/* Terms checkbox */}

          <div

            style={{

              display: "flex",

              alignItems: "flex-start",

              gap: 10,

              marginBottom: 20,

              cursor: "pointer",

            }}

            onClick={() => setAgreeTerms((v) => !v)}

          >

            <div

              style={{

                width: 20,

                height: 20,

                borderRadius: 6,

                border: `2px solid ${agreeTerms ? T.blue : T.borderMd}`,

                background: agreeTerms ? T.blue : "transparent",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                flexShrink: 0,

                marginTop: 1,

              }}

            >

              {agreeTerms && (

                <svg

                  width="11"

                  height="11"

                  viewBox="0 0 24 24"

                  fill="none"

                  stroke="#fff"

                  strokeWidth="3"

                  strokeLinecap="round"

                >

                  <polyline points="20 6 9 17 4 12" />

                </svg>

              )}

            </div>

            <span style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>

              Acepto los{" "}

              <span style={{ color: T.blue, fontWeight: 700 }}>

                Términos y condiciones

              </span>{" "}

              y la{" "}

              <span style={{ color: T.blue, fontWeight: 700 }}>

                Política de privacidad

              </span>{" "}

              de Parkealo

            </span>

          </div>

          <button

            onClick={handleSignup}

            disabled={loading}

            style={{

              width: "100%",

              background: loading

                ? T.surface2

                : `linear-gradient(135deg,${T.green},${T.greenDk})`,

              border: "none",

              borderRadius: 14,

              padding: "15px 0",

              color: loading ? T.textFaint : "#fff",

              fontSize: 15,

              fontWeight: 800,

              fontFamily: font,

              cursor: loading ? "not-allowed" : "pointer",

              boxShadow: loading ? "none" : T.shadowMd,

            }}

          >

            {loading ? "Creando cuenta…" : "Crear cuenta"}

          </button>

        </div>

      )}

    </div>

  );

}

// ─── PARKING QR MODAL (host view — printable QR) ──────────────────────────────

function ParkingQRModal({ parking, onClose }) {

  const qrId = parking?.id || "PKL-001";

  const qrName = parking?.name || "Parqueo Colonial Premium";

  // Deterministic QR pattern from id string

  const qrPattern = (col, row) => {

    const seed =

      (col * 7 + row * 13 + qrId.charCodeAt(col % qrId.length || 0)) % 3;

    // Always-dark finder pattern corners

    if ((col < 3 && row < 3) || (col > 12 && row < 3) || (col < 3 && row > 12))

      return true;

    return seed === 0;

  };

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 700,

        background: "rgba(13,27,62,0.7)",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        padding: 20,

      }}

    >

      <div

        style={{

          background: T.bg,

          borderRadius: 24,

          width: "100%",

          maxWidth: 320,

          overflow: "hidden",

          boxShadow: T.shadowLg,

        }}

      >

        {/* Header */}

        <div

          style={{

            background: `linear-gradient(135deg,${T.blueNav},${T.blue})`,

            padding: "18px 20px 16px",

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

          }}

        >

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            <ParkealoPinLogo size={28} variant="white" />

            <div style={{ color: "#fff", fontWeight: 900, fontSize: 15 }}>

              Código QR del parqueo

            </div>

          </div>

          <button

            onClick={onClose}

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "none",

              borderRadius: "50%",

              width: 30,

              height: 30,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

            }}

          >

            <svg

              width="14"

              height="14"

              viewBox="0 0 24 24"

              fill="none"

              stroke="#fff"

              strokeWidth="2.5"

              strokeLinecap="round"

            >

              <line x1="18" y1="6" x2="6" y2="18" />

              <line x1="6" y1="6" x2="18" y2="18" />

            </svg>

          </button>

        </div>

        {/* Printable QR card */}

        <div

          style={{

            padding: "24px 24px 20px",

            display: "flex",

            flexDirection: "column",

            alignItems: "center",

          }}

        >

          {/* Card to print */}

          <div

            style={{

              background: "#fff",

              border: `2px solid ${T.border}`,

              borderRadius: 20,

              padding: "20px 20px 16px",

              width: "100%",

              textAlign: "center",

              boxShadow: T.shadow,

            }}

          >

            {/* Brand header */}

            <div

              style={{

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                gap: 8,

                marginBottom: 6,

              }}

            >

              <ParkealoPinLogo size={22} variant="blue" />

              <span

                style={{

                  fontFamily: font,

                  fontWeight: 900,

                  fontSize: 18,

                  color: T.blue,

                }}

              >

                Parkealo

              </span>

            </div>

            <div

              style={{

                fontSize: 11,

                color: T.textSub,

                fontWeight: 600,

                marginBottom: 16,

              }}

            >

              {qrName}

            </div>

            {/* QR code grid */}

            <div

              style={{

                display: "inline-block",

                background: "#fff",

                padding: 10,

                border: `2px solid ${T.text}`,

                borderRadius: 10,

                marginBottom: 12,

              }}

            >

              <div

                style={{

                  display: "grid",

                  gridTemplateColumns: "repeat(16,8px)",

                  gap: 0.5,

                }}

              >

                {Array.from({ length: 16 * 16 }, (_, i) => {

                  const col = i % 16,

                    row = Math.floor(i / 16);

                  const dark = qrPattern(col, row);

                  return (

                    <div

                      key={i}

                      style={{

                        width: 8,

                        height: 8,

                        background: dark ? "#0D1B3E" : "#fff",

                        borderRadius:

                          dark &&

                          ((col < 3 && row < 3) ||

                            (col > 12 && row < 3) ||

                            (col < 3 && row > 12))

                            ? 2

                            : 0,

                      }}

                    />

                  );

                })}

              </div>

            </div>

            {/* QR ID */}

            <div

              style={{

                fontFamily: "monospace",

                fontSize: 11,

                color: T.textFaint,

                marginBottom: 12,

                letterSpacing: 1,

              }}

            >

              PKL-{qrId.toString().padStart(4, "0")}

            </div>

            {/* Label */}

            <div

              style={{

                background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                borderRadius: 10,

                padding: "8px 16px",

                display: "inline-block",

              }}

            >

              <div

                style={{

                  color: "#fff",

                  fontWeight: 900,

                  fontSize: 13,

                  letterSpacing: 0.5,

                }}

              >

                Check-In / Check-Out

              </div>

            </div>

            {/* Instruction */}

            <div

              style={{

                fontSize: 10,

                color: T.textSub,

                marginTop: 12,

                lineHeight: 1.5,

              }}

            >

              Escanea con la app Parkealo o tu cámara para hacer check-in o

              check-out en tu reserva.

            </div>

          </div>

          {/* Info */}

          <div

            style={{

              marginTop: 16,

              background: T.blueLt,

              border: `1px solid ${T.blueMid}`,

              borderRadius: 12,

              padding: "10px 14px",

              width: "100%",

            }}

          >

            <div

              style={{

                fontSize: 11,

                color: T.blue,

                fontWeight: 700,

                marginBottom: 4,

              }}

            >

              📋 Cómo funciona

            </div>

            <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>

              • Usuario con reserva → activa el reloj • Sin cuenta → descarga la

              app • Registrado sin reserva → explorador

            </div>

          </div>

          <div

            style={{ display: "flex", gap: 10, marginTop: 14, width: "100%" }}

          >

            {/* Print / Download button */}

            <button

              onClick={() => {

                // Build a printable HTML page with the QR card and trigger download as image via canvas

                const printWin = window.open(

                  "",

                  "_blank",

                  "width=400,height=500"

                );

                if (!printWin) return;

                printWin.document

                  .write(`<!DOCTYPE html><html><head><title>QR Parkealo</title>

                  <style>

                    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');

                    * { margin:0; padding:0; box-sizing:border-box; }

                    body { font-family: Nunito, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f4fa; }

                    .card { background:#fff; border-radius:20px; padding:28px; text-align:center; box-shadow:0 4px 24px rgba(26,86,196,0.15); width:280px; border:2px solid #E0E8F0; }

                    .brand { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:6px; }

                    .brand-name { font-size:22px; font-weight:900; color:#1A56C4; }

                    .parking-name { font-size:12px; color:#5E78A8; font-weight:600; margin-bottom:18px; }

                    .qr-wrap { display:inline-block; border:2.5px solid #0D1B3E; border-radius:10px; padding:10px; margin-bottom:14px; background:#fff; }

                    .qr-grid { display:grid; grid-template-columns:repeat(16,8px); gap:0.5px; }

                    .qr-cell { width:8px; height:8px; }

                    .qr-id { font-family:monospace; font-size:11px; color:#9BAFD0; margin-bottom:14px; letter-spacing:1px; }

                    .label { background:linear-gradient(135deg,#1A56C4,#3B7EE8); border-radius:10px; padding:8px 20px; display:inline-block; color:#fff; font-size:13px; font-weight:900; letter-spacing:0.5px; margin-bottom:14px; }

                    .instructions { font-size:10px; color:#5E78A8; line-height:1.6; }

                    @media print { body { background:#fff; } }

                  </style></head><body>

                  <div class="card">

                    <div class="brand">

                      <svg width="24" height="32" viewBox="0 0 100 130" fill="none"><defs><linearGradient id="g" x1="25%" y1="0%" x2="75%" y2="100%"><stop offset="0%" stop-color="#29A8E8"/><stop offset="45%" stop-color="#1565C8"/><stop offset="100%" stop-color="#0A2D8A"/></linearGradient></defs><path d="M50 3C27 3 8 22 8 45c0 15 8 28 20 37L50 127l22-45C84 73 92 60 92 45 92 22 73 3 50 3z" fill="url(#g)"/><text x="45" y="58" font-family="Arial Black" font-weight="900" font-size="58" fill="white" text-anchor="middle">P</text></svg>

                      <span class="brand-name">Parkealo</span>

                    </div>

                    <div class="parking-name">${qrName}</div>

                    <div class="qr-wrap"><div class="qr-grid">${Array.from(

                      { length: 256 },

                      (_, i) => {

                        const col = i % 16,

                          row = Math.floor(i / 16);

                        const seed =

                          (col * 7 +

                            row * 13 +

                            qrId.charCodeAt(col % qrId.length || 0)) %

                          3;

                        const dark =

                          (col < 3 && row < 3) ||

                          (col > 12 && row < 3) ||

                          (col < 3 && row > 12) ||

                          seed === 0;

                        const bg = dark ? "#0D1B3E" : "#fff";

                        return (

                          '<div class="qr-cell" style="background:' +

                          bg +

                          '"></div>'

                        );

                      }

                    ).join("")}</div></div>

                    <div class="qr-id">PKL-${qrId

                      .toString()

                      .padStart(4, "0")}</div>

                    <div class="label">Check-In / Check-Out</div>

                    <div class="instructions">Escanea con la app Parkealo<br/>para registrar tu entrada o salida</div>

                  </div>

                  <script>window.onload=()=>{ window.print(); }</script>

                </body></html>`);

                printWin.document.close();

              }}

              style={{

                flex: 1,

                background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

                border: "none",

                borderRadius: 12,

                padding: "12px 0",

                fontFamily: font,

                fontWeight: 800,

                fontSize: 13,

                color: "#fff",

                cursor: "pointer",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                gap: 8,

                boxShadow: T.shadowMd,

              }}

            >

              <svg

                width="16"

                height="16"

                viewBox="0 0 24 24"

                fill="none"

                stroke="#fff"

                strokeWidth="2.5"

                strokeLinecap="round"

              >

                <polyline points="6 9 6 2 18 2 18 9" />

                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />

                <rect x="6" y="14" width="12" height="8" />

              </svg>

              Descargar

            </button>

            <button

              onClick={onClose}

              style={{

                flex: 1,

                background: T.surface2,

                border: "none",

                borderRadius: 12,

                padding: "12px 0",

                fontFamily: font,

                fontWeight: 700,

                fontSize: 13,

                color: T.textSub,

                cursor: "pointer",

              }}

            >

              Cerrar

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}

// ─── QR SCAN RESULT SCREEN (when unregistered or wrong user scans) ─────────────

function QRScanResult({ type, parkingName, onClose }) {

  // type: "download" | "explore"

  if (type === "download")

    return (

      <div

        style={{

          position: "absolute",

          inset: 0,

          zIndex: 700,

          background: `linear-gradient(170deg,${T.blueNav},${T.blue})`,

          display: "flex",

          flexDirection: "column",

          alignItems: "center",

          justifyContent: "center",

          padding: 32,

        }}

      >

        <ParkealoPinLogo size={80} variant="white" />

        <ParkealoWordmark size={30} variant="white" />

        <div

          style={{

            color: "rgba(255,255,255,0.7)",

            fontSize: 13,

            marginTop: 8,

            marginBottom: 28,

            textAlign: "center",

          }}

        >

          Renta tu parqueo fácil

        </div>

        <div

          style={{

            background: "rgba(255,255,255,0.12)",

            borderRadius: 16,

            padding: "16px 20px",

            marginBottom: 24,

            width: "100%",

            textAlign: "center",

          }}

        >

          <div

            style={{

              color: "#fff",

              fontWeight: 700,

              fontSize: 14,

              marginBottom: 4,

            }}

          >

            📍 {parkingName}

          </div>

          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>

            Descarga Parkealo para reservar este parqueo y hacer check-in

          </div>

        </div>

        <div

          style={{

            display: "flex",

            flexDirection: "column",

            gap: 10,

            width: "100%",

          }}

        >

          <button

            style={{

              background: "#fff",

              border: "none",

              borderRadius: 14,

              padding: "14px 0",

              fontFamily: font,

              fontWeight: 800,

              fontSize: 14,

              color: T.blueNav,

              cursor: "pointer",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              gap: 10,

            }}

          >

            <span style={{ fontSize: 20 }}>🍎</span> Descargar en App Store

          </button>

          <button

            style={{

              background: "rgba(255,255,255,0.15)",

              border: "2px solid rgba(255,255,255,0.3)",

              borderRadius: 14,

              padding: "14px 0",

              fontFamily: font,

              fontWeight: 800,

              fontSize: 14,

              color: "#fff",

              cursor: "pointer",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              gap: 10,

            }}

          >

            <span style={{ fontSize: 20 }}>🤖</span> Descargar en Google Play

          </button>

        </div>

        <button

          onClick={onClose}

          style={{

            marginTop: 20,

            background: "none",

            border: "none",

            color: "rgba(255,255,255,0.5)",

            fontFamily: font,

            fontSize: 13,

            cursor: "pointer",

          }}

        >

          Cerrar

        </button>

      </div>

    );

  return (

    <div

      style={{

        position: "absolute",

        inset: 0,

        zIndex: 700,

        background: T.bg,

        display: "flex",

        flexDirection: "column",

        alignItems: "center",

        justifyContent: "center",

        padding: 32,

      }}

    >

      <div style={{ fontSize: 64, marginBottom: 16 }}>🅿️</div>

      <div

        style={{

          fontWeight: 900,

          fontSize: 20,

          color: T.text,

          textAlign: "center",

          marginBottom: 8,

        }}

      >

        No tienes reserva aquí

      </div>

      <div

        style={{

          color: T.textSub,

          fontSize: 14,

          textAlign: "center",

          lineHeight: 1.6,

          marginBottom: 24,

        }}

      >

        Este código QR pertenece a <strong>{parkingName}</strong>. No tienes

        ninguna reserva activa en este parqueo.

      </div>

      <button

        onClick={onClose}

        style={{

          width: "100%",

          background: `linear-gradient(135deg,${T.blue},${T.blueSky})`,

          border: "none",

          borderRadius: 14,

          padding: "14px 0",

          color: "#fff",

          fontFamily: font,

          fontWeight: 800,

          fontSize: 15,

          cursor: "pointer",

        }}

      >

        Explorar parqueos

      </button>

    </div>

  );

}

export default function App() {

  const [screen, setScreen] = useState("splash"); // splash | login | main

  const [user, setUser] = useState(null);

  const [tab, setTab] = useState("map");

  const [spot, setSpot] = useState(null);

  const [sub, setSub] = useState("map");

  const [favorites, setFavorites] = useState([]);

  // 🔐 Check saved session on mount — SecureSession validates 8h expiry

  useEffect(() => {

    const savedUser = SecureSession.load();

    if (savedUser) setUser(savedUser);

  }, []);

  const handleLogin = (u) => {

    setUser(u);

    setScreen("main");

  };

  const handleLogout = () => {

    SecureSession.clear(); // 🔐 clears session + legacy keys

    setUser(null);

    setScreen("login");

  };

  const toggleFavorite = (s) =>

    setFavorites((prev) =>

      prev.find((f) => f.id === s.id)

        ? prev.filter((f) => f.id !== s.id)

        : [...prev, s]

    );

  const removeFavorite = (id) =>

    setFavorites((prev) => prev.filter((f) => f.id !== id));

  const renderContent = () => {

    if (tab === "map") {

      if (sub === "detail" && spot)

        return (

          <DetailScreen

            spot={spot}

            onBack={() => setSub("map")}

            onReserve={() => setSub("checkout")}

            favorites={favorites}

            onToggleFav={toggleFavorite}

          />

        );

      if (sub === "checkout" && spot)

        return <CheckoutScreen spot={spot} onBack={() => setSub("detail")} />;

      return (

        <MapScreen

          onSelect={(s) => {

            setSpot(s);

            setSub("detail");

          }}

          favorites={favorites}

          onToggleFav={toggleFavorite}

        />

      );

    }

    if (tab === "reservations") return <ReservationsScreen />;

    if (tab === "favorites")

      return (

        <FavoritesScreen

          favorites={favorites}

          onSelect={(s) => {

            setSpot(s);

            setTab("map");

            setSub("detail");

          }}

          onRemove={removeFavorite}

        />

      );

    if (tab === "owner") return <OwnerDashboard />;

    if (tab === "account")

      return <AccountScreen user={user} onLogout={handleLogout} />;

    if (tab === "admin") return <AdminPanel />;

  };

  return (

    <div

      style={{

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        minHeight: "100vh",

        background: "#D6DCE8",

        fontFamily: font,

      }}

    >

      <link

        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap"

        rel="stylesheet"

      />

      <div

        style={{

          width: 375,

          height: 812,

          background: T.bg,

          borderRadius: 52,

          overflow: "hidden",

          position: "relative",

          boxShadow:

            "0 30px 80px rgba(0,0,0,0.22), 0 0 0 10px #C4CCDa, 0 0 0 11.5px #B8C1D2",

        }}

      >

        {screen === "splash" && (

          <Splash onNext={() => setScreen(user ? "main" : "login")} />

        )}

        {screen === "login" && <LoginScreen onLogin={handleLogin} />}

        {screen === "main" && (

          <>

            <div

              style={{

                height: 48,

                background: T.bg,

                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                padding: "0 24px",

                borderBottom: `1px solid ${T.border}`,

              }}

            >

              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>

                9:41

              </span>

              <div

                style={{

                  width: 100,

                  height: 26,

                  background: T.text,

                  borderRadius: 13,

                }}

              />

              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>

                <div

                  style={{ display: "flex", gap: 2, alignItems: "flex-end" }}

                >

                  {[12, 9, 6].map((h) => (

                    <div

                      key={h}

                      style={{

                        width: 3,

                        height: h,

                        background: T.text,

                        borderRadius: 1,

                      }}

                    />

                  ))}

                </div>

                <svg width="16" height="11" viewBox="0 0 24 16" fill="none">

                  <rect

                    x="0.5"

                    y="2.5"

                    width="19"

                    height="13"

                    rx="2"

                    stroke={T.text}

                    strokeWidth="1.5"

                  />

                  <rect

                    x="19.5"

                    y="5.5"

                    width="3"

                    height="7"

                    rx="1"

                    fill={T.text}

                  />

                  <rect

                    x="2"

                    y="4"

                    width="11"

                    height="10"

                    rx="1"

                    fill={T.text}

                  />

                </svg>

              </div>

            </div>

            <div

              style={{

                height: "calc(100% - 48px)",

                position: "relative",

                overflow: "hidden",

              }}

            >

              <div style={{ height: "calc(100% - 66px)", overflowY: "auto" }}>

                {renderContent()}

              </div>

              <BottomNav

                active={tab}

                onChange={(t) => {

                  setTab(t);

                  setSub("map");

                }}

              />

            </div>

          </>

        )}

      </div>

    </div>

  );

}

