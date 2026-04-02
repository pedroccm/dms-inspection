import { NextRequest, NextResponse } from "next/server";
import { searchEquipmentByCode } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json([], { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchEquipmentByCode(q.trim());
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
