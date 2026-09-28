import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { appUrl } from "@/lib/config";
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(appUrl()).origin)
    throw new Error("forbidden");
}
export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  if (message.startsWith("Too many requests")) return NextResponse.json({error:message},{status:429});
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "Please check the submitted fields." },
      { status: 400 },
    );
  if (message === "unauthorized" || message === "forbidden")
    return NextResponse.json(
      { error: message },
      { status: message === "unauthorized" ? 401 : 403 },
    );
  console.error("Request failed:", message);
  return NextResponse.json(
    { error: "Unable to complete this request. Please try again." },
    { status: 500 },
  );
}
