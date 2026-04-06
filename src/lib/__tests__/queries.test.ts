import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock chain builder for Supabase query methods
function createMockQueryBuilder(resolvedData: unknown[] | null = []) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const returnSelf = () => builder;

  builder.select = vi.fn().mockImplementation(returnSelf);
  builder.eq = vi.fn().mockImplementation(returnSelf);
  builder.ilike = vi.fn().mockImplementation(returnSelf);
  builder.in = vi.fn().mockImplementation(returnSelf);
  builder.gte = vi.fn().mockImplementation(returnSelf);
  builder.order = vi.fn().mockImplementation(returnSelf);
  builder.range = vi.fn().mockImplementation(returnSelf);
  builder.single = vi
    .fn()
    .mockResolvedValue({ data: resolvedData, error: null });

  // Default resolution for terminal calls (when no .single() is called)
  // We use a then-able pattern so awaiting the builder resolves
  const defaultResult = { data: resolvedData, error: null, count: 0 };
  builder.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(defaultResult);
  });

  return builder;
}

// Mock the server createClient
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock the browser createClient
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Server-side queries (queries.ts)", () => {
  it("getInspections calls the inspections table with correct select", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getInspections } = await import("@/lib/queries");
    await getInspections();

    expect(mockFrom).toHaveBeenCalledWith("inspections");
    expect(qb.select).toHaveBeenCalled();
    expect(qb.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("getInspections applies status filter when provided", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getInspections } = await import("@/lib/queries");
    await getInspections({ status: "draft" });

    expect(qb.eq).toHaveBeenCalledWith("status", "draft");
  });

  it("getInspectionById calls single with correct id", async () => {
    const qb = createMockQueryBuilder({ id: "abc-123" } as unknown as null);
    mockFrom.mockReturnValue(qb);

    const { getInspectionById } = await import("@/lib/queries");
    await getInspectionById("abc-123");

    expect(mockFrom).toHaveBeenCalledWith("inspections");
    expect(qb.eq).toHaveBeenCalledWith("id", "abc-123");
    expect(qb.single).toHaveBeenCalled();
  });

  it("getServiceOrders calls the service_orders table", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getServiceOrders } = await import("@/lib/queries");
    await getServiceOrders();

    expect(mockFrom).toHaveBeenCalledWith("service_orders");
  });

  it("getServiceOrders applies assigned_to filter", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getServiceOrders } = await import("@/lib/queries");
    await getServiceOrders({ assigned_to: "user-1" });

    expect(qb.eq).toHaveBeenCalledWith("assigned_to", "user-1");
  });

  it("getServiceOrderById fetches a single service order", async () => {
    const qb = createMockQueryBuilder({ id: "so-1" } as unknown as null);
    mockFrom.mockReturnValue(qb);

    const { getServiceOrderById } = await import("@/lib/queries");
    await getServiceOrderById("so-1");

    expect(mockFrom).toHaveBeenCalledWith("service_orders");
    expect(qb.eq).toHaveBeenCalledWith("id", "so-1");
    expect(qb.single).toHaveBeenCalled();
  });

  it("getEquipment calls the equipment table", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getEquipment } = await import("@/lib/queries");
    await getEquipment();

    expect(mockFrom).toHaveBeenCalledWith("equipment");
    expect(qb.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("getEquipment applies search filter", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getEquipment } = await import("@/lib/queries");
    await getEquipment({ search: "ABC" });

    expect(qb.ilike).toHaveBeenCalledWith("copel_ra_code", "%ABC%");
  });

  it("getEquipmentById includes inspections relation", async () => {
    const qb = createMockQueryBuilder({ id: "eq-1" } as unknown as null);
    mockFrom.mockReturnValue(qb);

    const { getEquipmentById } = await import("@/lib/queries");
    await getEquipmentById("eq-1");

    expect(mockFrom).toHaveBeenCalledWith("equipment");
    expect(qb.select).toHaveBeenCalledWith(
      expect.stringContaining("inspections")
    );
    expect(qb.single).toHaveBeenCalled();
  });

  it("getDashboardCounts queries correct tables for counts", async () => {
    const qb = createMockQueryBuilder([]);
    // Override then to return count
    qb.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
      resolve({ data: null, error: null, count: 5 });
    });
    mockFrom.mockReturnValue(qb);

    const { getDashboardCounts } = await import("@/lib/queries");
    const result = await getDashboardCounts();

    // Should query service_orders, inspections (twice), and equipment
    const calledTables = mockFrom.mock.calls.map(
      (c: unknown[]) => c[0]
    );
    expect(calledTables).toContain("service_orders");
    expect(calledTables).toContain("inspections");
    expect(calledTables).toContain("equipment");

    expect(typeof result.openOrders).toBe("number");
    expect(typeof result.inspectionsToday).toBe("number");
    expect(typeof result.equipmentCount).toBe("number");
    expect(typeof result.pendingReviews).toBe("number");
  });
});

describe("Client-side queries (queries.client.ts)", () => {
  it("getInspections uses the browser client and calls inspections", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getInspections } = await import("@/lib/queries.client");
    await getInspections();

    expect(mockFrom).toHaveBeenCalledWith("inspections");
  });

  it("getServiceOrders uses the browser client", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getServiceOrders } = await import("@/lib/queries.client");
    await getServiceOrders();

    expect(mockFrom).toHaveBeenCalledWith("service_orders");
  });

  it("getEquipment uses the browser client", async () => {
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);

    const { getEquipment } = await import("@/lib/queries.client");
    await getEquipment();

    expect(mockFrom).toHaveBeenCalledWith("equipment");
  });
});

describe("Queries use authenticated client (not admin)", () => {
  it("server queries import from supabase/server, not supabase/admin", async () => {
    // Verify the module was loaded with the correct mock
    const serverMock = await import("@/lib/supabase/server");
    expect(serverMock.createClient).toBeDefined();

    // The admin client should NOT be imported by queries.ts
    // We verify by checking that our mock for server.ts was used
    const { getInspections } = await import("@/lib/queries");
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);
    await getInspections();

    // If it used the admin client, our mock wouldn't have been called
    expect(mockFrom).toHaveBeenCalled();
  });

  it("client queries import from supabase/client, not supabase/admin", async () => {
    const clientMock = await import("@/lib/supabase/client");
    expect(clientMock.createClient).toBeDefined();

    const { getEquipment } = await import("@/lib/queries.client");
    const qb = createMockQueryBuilder([]);
    mockFrom.mockReturnValue(qb);
    await getEquipment();

    expect(mockFrom).toHaveBeenCalled();
  });
});
