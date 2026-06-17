import { cookies } from "next/headers";

/** Which viewer is this — drives per-person resume/progress. */
export async function currentWho(): Promise<"julia" | "corey"> {
  const c = await cookies();
  return c.get("homehome_who")?.value === "julia" ? "julia" : "corey";
}
