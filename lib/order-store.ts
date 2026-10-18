import { promises as fs } from "fs";
import path from "path";
import { dataRoot, ensureDataDir } from "@/lib/runtime-paths";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";

const root = () => dataRoot("orders");

async function ensure() {
  await ensureDataDir("orders");
}

export async function saveJsonRecord(
  folder: "orders" | "consultations",
  id: string,
  record: unknown
) {
  const dir = await ensureDataDir(folder);
  await fs.writeFile(
    path.join(dir, `${id}.json`),
    JSON.stringify(record, null, 2)
  );
}

export async function findByRequestId(
  folder: "orders" | "consultations",
  requestId: string
): Promise<Record<string, unknown> | null> {
  if (supabaseConfigured()) {
    try {
      const table = folder === "orders" ? "orders" : "makeover_consultations";
      const { data, error } = await supabaseAdmin()
        .from(table)
        .select("*")
        .eq("request_id", requestId)
        .maybeSingle();
      if (!error && data) {
        return data as Record<string, unknown>;
      }
    } catch {
      // fallback to filesystem
    }
  }

  const dir = await ensureDataDir(folder);
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(dir, name), "utf8")
      ) as Record<string, unknown>;
      if (raw.requestId === requestId) return raw;
    } catch {
      // skip
    }
  }
  return null;
}

export async function getOrderById(id: string): Promise<Record<string, unknown> | null> {
  if (supabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin()
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase getOrderById error:", error.message);
      } else if (data) {
        const row = data as Record<string, unknown>;
        const customer = (row.customer as Record<string, unknown>) || {};
        const fees = (customer.fees as Record<string, unknown>) || (row.fees as Record<string, unknown>) || {};
        const isInstallation =
          row.fulfilment_type === "installation" ||
          row.fulfilmentType === "installation";

        return {
          id: String(row.id),
          requestId: row.request_id || row.requestId,
          createdAt: row.created_at || row.createdAt,
          status: row.status,
          paymentMethod: row.payment_method || row.paymentMethod || "cod",
          customer,
          items: row.items,
          subtotalPaise: Number(row.subtotal_paise ?? row.subtotalPaise ?? 0),
          totalPaise:
            fees.totalPaise != null
              ? Number(fees.totalPaise)
              : row.total_paise != null
              ? Number(row.total_paise)
              : Number(row.subtotal_paise ?? row.subtotalPaise ?? 0),
          fulfilmentType: row.fulfilment_type || row.fulfilmentType || "diy",
          fulfilmentLabel:
            row.fulfilment_label ||
            row.fulfilmentLabel ||
            (isInstallation
              ? "Option B: Products + Professional Installation"
              : "Option A: Products Only — DIY"),
          shippingStatus: row.shipping_status || row.shippingStatus,
          ownerId: row.owner_id || row.ownerId || null,
          designId: row.design_id || row.designId || null,
          fees,
        };
      }
    } catch (err) {
      console.warn("Supabase getOrderById exception, falling back to disk:", err);
    }
  }

  try {
    const dir = await ensureDataDir("orders");
    const filePath = path.join(dir, `${id}.json`);
    const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, unknown>;
    return raw;
  } catch {
    return null;
  }
}

export { ensure as ensureOrdersDir };
