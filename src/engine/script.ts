import type { Decision } from "./decisions";
export type Role = "main" | "dining" | "mobility";
export type Branch = "off" | "working" | "done" | "attention";
export type TaskStatus =
  | "Not started"
  | "Working"
  | "Waiting for you"
  | "Done"
  | "Cancelled"
  | "Stopped";
export type Step =
  | "welcome"
  | "reading"
  | "request"
  | "finding"
  | "restaurants"
  | "lining"
  | "permission"
  | "denied"
  | "booking"
  | "bookingWork"
  | "exception"
  | "updating"
  | "updated"
  | "booked"
  | "rideType"
  | "findingCars"
  | "cars"
  | "calling"
  | "rideBooked"
  | "complete"
  | "checkingCancel"
  | "cancelling"
  | "readingChoice"
  | "stopping";
export type Plan = {
  time: string;
  party: number;
  cuisine: string;
  budget: number;
  ride: boolean;
  pickup: string;
  contact: string;
  note: string;
  preferences?: string;
};
export type Restaurant = {
  id: string;
  name: string;
  cn: string;
  price: number;
  photo: string;
  minutes: number;
  distance: string;
  address: string;
  englishMenu: boolean;
  foreignCards: boolean;
};
export const restaurants: Restaurant[] = [
  {
    id: "longtang",
    name: "Longtang Bistro",
    cn: "弄堂小馆",
    price: 160,
    photo: "15734.png",
    minutes: 22,
    distance: "1.8",
    englishMenu: true,
    foreignCards: true,
    address: "18 Jinxian Road · 进贤路18号",
  },
  {
    id: "shikumen",
    name: "Shikumen Kitchen",
    cn: "石库门小厨",
    price: 185,
    photo: "4be00.png",
    minutes: 26,
    distance: "2.4",
    englishMenu: true,
    foreignCards: true,
    address: "28 Changle Road · 长乐路28号",
  },
  {
    id: "lane18",
    name: "Lane 18 Canteen",
    cn: "十八弄食堂",
    price: 140,
    photo: "fc5a4.png",
    minutes: 18,
    distance: "1.5",
    englishMenu: true,
    foreignCards: true,
    address: "18 Nanchang Road · 南昌路18号",
  },
  {
    id: "planetree",
    name: "Plane Tree House",
    cn: "梧桐小院",
    price: 175,
    photo: "87ffc.png",
    minutes: 15,
    distance: "1.2",
    englishMenu: true,
    foreignCards: true,
    address: "36 Fuxing Road · 复兴路36号",
  },
  {
    id: "shanghaitable",
    name: "Shanghai Table",
    cn: "沪上一桌",
    price: 150,
    photo: "51536.png",
    minutes: 20,
    distance: "1.6",
    englishMenu: true,
    foreignCards: true,
    address: "22 Shaanxi Road · 陕西路22号",
  },
  {
    id: "riverside",
    name: "Riverside Kitchen",
    cn: "滨江小馆",
    price: 190,
    photo: "19ebd.png",
    minutes: 25,
    distance: "2.1",
    englishMenu: true,
    foreignCards: true,
    address: "8 Zhongshan Road · 中山路8号",
  },
  {
    id: "pearl",
    name: "Pearl Dim Sum",
    cn: "明珠点心",
    price: 150,
    photo: "e935c.png",
    minutes: 12,
    distance: "1.0",
    englishMenu: true,
    foreignCards: true,
    address: "16 Maoming Road · 茂名路16号",
  },
  {
    id: "canton",
    name: "Canton House",
    cn: "粤香楼",
    price: 180,
    photo: "4c08b.png",
    minutes: 20,
    distance: "1.6",
    englishMenu: true,
    foreignCards: true,
    address: "58 Huaihai Road · 淮海路58号",
  },
  {
    id: "harbour",
    name: "Harbour Kitchen",
    cn: "港湾小厨",
    price: 190,
    photo: "1d052.png",
    minutes: 25,
    distance: "2.1",
    englishMenu: true,
    foreignCards: true,
    address: "38 Ruijin Road · 瑞金路38号",
  },
];
export const defaultPlan: Plan = {
  time: "7:00 PM",
  party: 2,
  cuisine: "Shanghainese",
  budget: 200,
  ride: true,
  pickup: "The Shanghai EDITION · 199 Nanjing Road East 南京东路199号",
  contact: "Alex · ••• 0148",
  note: "I don't speak Chinese. An English menu would be great.",
};
export const initialRequest =
  "Find me a Shanghainese restaurant for two tonight at 7, under ¥200 per person. Once it's booked, get me a ride from my hotel.";
export const rideNames = ["Economy", "Comfort", "Premium"];
export function route(r: Restaurant, p: Plan) {
  const group = restaurants.findIndex((x) => x.id === r.id);
  // Restaurant-specific route catalogue; keep all fare displays on this source.
  const fares: Record<string, [string[], number[]]> = {
    longtang: [
      ["32–38", "45–55", "70–90"],
      [36, 50, 80],
    ],
    shikumen: [
      ["38–45", "54–64", "80–100"],
      [42, 59, 90],
    ],
    lane18: [
      ["28–34", "40–48", "62–78"],
      [31, 44, 70],
    ],
    planetree: [
      ["24–30", "34–42", "55–70"],
      [27, 38, 63],
    ],
    shanghaitable: [
      ["30–36", "42–50", "65–82"],
      [33, 46, 74],
    ],
    riverside: [
      ["35–42", "50–60", "76–94"],
      [39, 55, 85],
    ],
    pearl: [
      ["20–26", "30–36", "48–60"],
      [23, 33, 54],
    ],
    canton: [
      ["30–36", "42–50", "65–82"],
      [33, 46, 74],
    ],
    harbour: [
      ["35–42", "50–60", "76–94"],
      [39, 55, 85],
    ],
  };
  const [ranges, estimates] = fares[r.id] || fares.longtang;
  const [hh, mm] = p.time.split(" ")[0].split(":").map(Number);
  const total = ((hh % 12) + (p.time.endsWith("PM") ? 12 : 0)) * 60 + mm;
  const format = (n: number) =>
    `${Math.floor(((n + 1440) % 1440) / 60) % 12 || 12}:${String((n + 1440) % 60).padStart(2, "0")} ${(n + 1440) % 1440 >= 720 ? "PM" : "AM"}`;
  const departure = total - r.minutes - (group < 3 ? 3 : 0);
  return {
    ranges,
    estimates,
    leave: format(departure),
    arrive: format(departure + r.minutes),
    minutes: r.minutes,
    distance: group >= 6 ? "0.5" : group >= 3 ? "0.6" : "0.8",
  };
}
export type CardKind =
  | "request"
  | "carousel"
  | "permission"
  | "denied"
  | "booking"
  | "bookingSuccess"
  | "rideType"
  | "cars"
  | "rideSuccess"
  | "change"
  | "updated"
  | "tonight"
  | "decision"
  | "clarify";
export type Message = {
  committed?: boolean;
  id: number;
  kind: "main" | "alex" | "event" | "card";
  text?: string;
  role?: Role;
  card?: CardKind;
  plan?: Plan;
  restaurant?: Restaurant;
  batch?: number;
  version?: number;
  decision?: Decision;
  planTag?: string;
  updateNote?: string;
  carType?: number;
  carIndex?: number;
  result?: string;
  tableStatus?: string;
  rideStatus?: string;
};
export type Header = {
  branch: Branch;
  activity: string;
  role: Role;
  both?: boolean;
  from?: Role;
};
export const demoIds = [
  "normal",
  "exception",
  "cancel-ride",
  "cancel-all",
  "decide",
  "vague",
  "stopping",
] as const;
export type Demo = (typeof demoIds)[number];
export type State = {
  demo?: Demo;
  decision?: Decision;
  choiceResume?: Step;
  choicePending?: { id: number; ms: number };
  clarifying?: boolean;
  editDraft?: Plan;
  inputFocusVersion?: number;
  inputPrefill?: string;
  stoppedDuringBooking?: { table: boolean; ride: boolean };
  cancelFromCard?: boolean;
  flow: "normal" | "exception";
  step: Step;
  messages: Message[];
  plan: Plan;
  restaurant: Restaurant;
  header: Header;
  tasks: Record<Role, TaskStatus>;
  pending?: { id: number; ms: number };
  seq: number;
  version: number;
  batch: number;
  permission: boolean;
  exceptionResolved: boolean;
  booked: boolean;
  rideBooked: boolean;
  carType: number;
  carIndex: number;
  thinking: string;
  cancelPrompt?: "ride" | "all" | "table" | "pick";
  cancelStage?: "pick" | "confirm";
  cancelSelection?: { table: boolean; ride: boolean };
  tableOutcome?: "cancelled" | "stopped";
  rideOutcome?: "cancelled" | "stopped";
  pickupNeeded?: boolean;
  permissionScope?: "once" | "tonight";
  pickupPermissionRequested?: boolean;
  updateNote?: string;
  exceptionRestaurant?: string;
  askAboutRide?: boolean;
  cancelWaitForBooking?: boolean;
  resumeStep?: Step;
  resumeDining?: TaskStatus;
  findingMore?: boolean;
  resumePending?: { id: number; ms: number };
  paused: boolean;
};
export type Action = { type: string; value?: any; acknowledged?: boolean };
export function initial(flow: "normal" | "exception"): State {
  return {
    flow,
    step: "welcome",
    messages: [
      {
        id: 0,
        kind: "main",
        text: "Hi Alex, I'm Main Pal. Tell me what you need and I'll bring in the right Pals.",
      },
    ],
    plan: { ...defaultPlan },
    restaurant: restaurants[0],
    header: { branch: "off", activity: "", role: "main" },
    tasks: { main: "Done", dining: "Not started", mobility: "Not started" },
    seq: 1,
    version: 0,
    batch: 0,
    permission: false,
    exceptionResolved: false,
    booked: false,
    rideBooked: false,
    carType: 0,
    carIndex: 0,
    thinking: "",
    paused: false,
  };
}
