import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function parseJsonError() {
  return apiError("Invalid request body.", 400);
}
