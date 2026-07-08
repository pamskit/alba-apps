import { createClient } from "@supabase/supabase-js";
import { getSessionFromCookieHeader } from "@/utils/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(req) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const session = getSessionFromCookieHeader(cookieHeader);

    if (!session || session.role !== "guru" || !session.nip) {
      return Response.json(
        { error: "Otentikasi guru diperlukan" },
        { status: 401 }
      );
    }

    const nip = session.nip;
    const { data: guruData, error: guruError } = await supabase
      .from("guru")
      .select("saldo")
      .eq("nip", nip)
      .maybeSingle();

    if (guruError || !guruData) {
      return Response.json(
        { error: "Guru tidak ditemukan" },
        { status: 404 }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { data: existingBonus, error: historyError } = await supabase
      .from("topup_saldo_guru")
      .select("id")
      .eq("nip_guru", nip)
      .eq("metode", "Bonus Bulanan")
      .eq("tipe", "Top-up")
      .gte("created_at", startOfMonth)
      .lt("created_at", startOfNextMonth)
      .limit(1);

    if (historyError) {
      console.error("History query error:", historyError);
      return Response.json(
        { error: "Gagal memeriksa bonus bulanan" },
        { status: 500 }
      );
    }

    if (existingBonus && existingBonus.length > 0) {
      return Response.json(
        { success: false, message: "Bonus bulan ini sudah diterapkan." },
        { status: 200 }
      );
    }

    const amount = 50000;
    const newSaldo = Number(guruData.saldo ?? 0) + amount;

    const { error: updateError } = await supabase
      .from("guru")
      .update({ saldo: newSaldo })
      .eq("nip", nip);

    if (updateError) {
      console.error("Saldo update error:", updateError);
      return Response.json(
        { error: "Gagal menambahkan saldo guru" },
        { status: 500 }
      );
    }

    const { error: logError } = await supabase.from("topup_saldo_guru").insert({
      nip_guru: nip,
      jumlah: amount,
      metode: "Bonus Bulanan",
      tipe: "Top-up",
      keterangan: "Penambahan saldo otomatis bulanan",
    });

    if (logError) {
      console.error("Log insertion error:", logError);
    }

    return Response.json(
      {
        success: true,
        newSaldo,
        message: "Saldo guru berhasil ditambahkan otomatis sebesar Rp 50.000.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auto-topup API error:", error);
    return Response.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
