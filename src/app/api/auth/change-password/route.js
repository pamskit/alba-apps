import { createServerClient } from "@/utils/supabase-server";
import { getSessionFromCookieHeader } from "@/utils/session";
import { jsonError, jsonSuccess } from "@/utils/api";

const supabase = createServerClient();

const roleConfig = {
  siswa: {
    table: "siswa",
    idField: "nis",
  },
  guru: {
    table: "guru",
    idField: "nip",
  },
};

export async function POST(req) {
  try {
    const session = getSessionFromCookieHeader(req.headers.get("cookie"));
    if (!session || !session.role) {
      return jsonError("Tidak ada sesi valid. Silakan login kembali.", 401);
    }

    const config = roleConfig[session.role];
    if (!config) {
      return jsonError("Role tidak didukung untuk perubahan password.", 403);
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return jsonError("Semua kolom password wajib diisi.", 400);
    }

    if (newPassword.length < 6) {
      return jsonError("Password baru minimal 6 karakter.", 400);
    }

    if (newPassword !== confirmPassword) {
      return jsonError("Konfirmasi password tidak cocok.", 400);
    }

    const idValue = session[config.idField];
    if (!idValue) {
      return jsonError("Identitas pengguna tidak ditemukan dalam sesi.", 401);
    }

    const { data, error: fetchError } = await supabase
      .from(config.table)
      .select("password")
      .eq(config.idField, idValue)
      .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
      return jsonError("Gagal memeriksa password saat ini.", 500);
    }

    if (!data || String(data.password) !== String(currentPassword)) {
      return jsonError("Password lama tidak sesuai.", 401);
    }

    const { error: updateError } = await supabase
      .from(config.table)
      .update({ password: newPassword })
      .eq(config.idField, idValue);

    if (updateError) {
      console.error(updateError);
      return jsonError("Gagal memperbarui password.", 500);
    }

    return jsonSuccess({ message: "Password berhasil diperbarui." });
  } catch (error) {
    console.error(error);
    return jsonError("Terjadi kesalahan server saat mengganti password.", 500);
  }
}
