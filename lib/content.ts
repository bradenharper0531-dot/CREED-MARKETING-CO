/**
 * Public-site copy. Edit this file to change wording without touching layout.
 * Anything marked FILL_IN shows on the site as a gold "[fill in]" note until replaced.
 */
export const FILL_IN = "__FILL_IN__";

export const site = {
  heroTitle: ["Become who", "you said", "you'd be."],
  heroSub:
    "Creed is a self-development group. We build ourselves physically, spiritually, mentally and financially — and sales is the route we take to get there.",
  // Shown in the hero stat strip. Set to a real number when you're ready.
  repsInGroup: FILL_IN as string | number,

  manifesto:
    "Most people wait to become the person they want to be. We go knock on the door. Sales forces the things that change a life — discipline when nobody is watching, confidence after the hundredth no, and the ability to talk to anyone.",
  expectations: [
    ["01", "Show up early, every day. The door doesn't care how you feel."],
    ["02", "Own your numbers. No excuses, no blaming the market."],
    ["03", "Lift the guy next to you. We win as a group or not at all."],
    ["04", "Keep growing off the doors — body, faith, mind and money."],
  ] as [string, string][],

  pillars: [
    {
      key: "physical",
      name: "Physical",
      principle: "Strong body, strong day. You can't outwork anyone at the door if you can't outlast them.",
      practices: ["Early mornings and training before doors", "Eat and sleep like an athlete", FILL_IN + " Team workouts / gym routine"],
    },
    {
      key: "spiritual",
      name: "Spiritual",
      principle: "Know why you knock. Faith, gratitude and purpose keep you steady on the hard days.",
      practices: ["Gratitude before the grind", "Purpose bigger than the paycheck", FILL_IN + " What faith looks like in the group"],
    },
    {
      key: "mental",
      name: "Mental",
      principle: "Rejection is reps. We train the mind to stay calm, sharp and hungry.",
      practices: ["Daily meetings and role-play", "Reading and mentorship", FILL_IN + " Books and trainings you use"],
    },
    {
      key: "financial",
      name: "Financial",
      principle: "Earn it, keep it, grow it. Money is the result of the other three — then we make it work.",
      practices: ["Save and invest a set % of every check", "Build toward ownership, not just income", FILL_IN + " Financial habits you teach"],
    },
  ],

  day: [
    ["Morning", "Train", "Gym, cold plunge, or a run — before anything else."],
    ["Late morning", "Meeting", "Numbers, role-play, mindset. Set the day's targets."],
    ["Afternoon", "Doors", "The work. Knock, connect, close."],
    ["Evening", "Debrief", "What worked, what didn't. Celebrate the wins."],
    ["Night", "Recover", "Team dinner, reading, rest. Do it again tomorrow."],
  ] as [string, string, string][],

  season: [
    ["Travel markets", "Spend a summer in Utah, Hawaii, Arizona and more."],
    ["Team housing", "Live with the people pushing you to be better."],
    ["Leadership", "Recruit, lead a team, and earn overrides on their installs."],
  ] as [string, string][],

  // The Money — leave rows empty until you have the stacks; the section says so.
  payStacks: [] as { volume: string; rate: string }[],
  customerBill: { total: "$78–84 / mo", utopia: "~$30 / mo", isp: "The rest", freeMonths: "Up to 2 free months" },

  steps: [
    ["01 / 03", "Apply", "Tell us who you are and which pillar you want to grow. We reply within 48 hours."],
    ["02 / 03", "Train and grow", "Learn the pitch, the habits and the mindset with the team before you ever knock."],
    ["03 / 03", "Hit your market", "Pick a market, set your pace, and start building your life one door at a time."],
  ] as [string, string, string][],
};

export function isFillIn(s: unknown) {
  return typeof s === "string" && s.startsWith(FILL_IN);
}
export function stripFillIn(s: string) {
  return s.replace(FILL_IN, "").trim();
}
