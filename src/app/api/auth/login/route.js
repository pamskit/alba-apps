import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSessionCookie } from "@/utils/session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getFirstConfiguredValue(keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeAdminCredentials() {
  const configuredUsername = getFirstConfiguredValue([
    "ADMIN_USERNAME",
    "NEXT_PUBLIC_ADMIN_USERNAME",
    "ADMIN_USER",
    "ADMIN_USER_NAME",
  ]);
  const configuredPassword = getFirstConfiguredValue([
    "ADMIN_PASSWORD",
    "NEXT_PUBLIC_ADMIN_PASSWORD",
    "ADMIN_PASS",
    "ADMIN_PWD",
  ]);
  const configuredPasswordHash = getFirstConfiguredValue([
    "ADMIN_PASSWORD_HASH",
    "NEXT_PUBLIC_ADMIN_PASSWORD_HASH",
    "ADMIN_HASH",
  ]);

  return {
    username: configuredUsername || "admin",
    password: configuredPassword || "",
    passwordHash: configuredPasswordHash || "",
  };
}

function verifyPassword(inputPassword, expectedPassword, expectedHash) {
  if (!inputPassword) return false;

  if (expectedHash) {
    const hashedInput = createHash("sha256").update(inputPassword).digest("hex");
    return hashedInput === expectedHash;
  }

  return inputPassword === expectedPassword;
}

export async function POST(req) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return Response.json({ error: "Identifier dan password diperlukan" }, { status: 400 });
    }

    const normalizedIdentifier = String(identifier).trim();

    const { username: adminUsername, password: adminPassword, passwordHash: adminPasswordHash } = normalizeAdminCredentials();

    if (normalizedIdentifier.toLowerCase() === adminUsername.toLowerCase()) {
      if (!adminPassword && !adminPasswordHash) {
        return Response.json({ error: "Admin belum dikonfigurasi. Setel ADMIN_USERNAME dan ADMIN_PASSWORD atau ADMIN_PASSWORD_HASH di environment server." }, { status: 503 });
      }

      if (!verifyPassword(password, adminPassword, adminPasswordHash)) {
        return Response.json({ error: "Username atau password admin salah." }, { status: 401 });
      }

      const session = { role: "admin", username: adminUsername };
      return new Response(JSON.stringify({ success: true, session }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createSessionCookie(session),
        },
      });
    }

    if (!/^\d+$/.test(normalizedIdentifier)) {
      return Response.json({ error: "Masukkan NIP guru atau NIS siswa yang valid." }, { status: 400 });
    }

    const numericId = Number(normalizedIdentifier);

    const { data: guruData, error: guruError } = await supabase
      .from("guru")
      .select("nip,nama_guru,bidang_studi,password")
      .eq("nip", numericId)
      .maybeSingle();

    if (guruError) {
      console.error(guruError);
      return Response.json({ error: "Gagal memeriksa akun guru." }, { status: 500 });
    }

    if (guruData) {
      if (String(guruData.password) !== String(password)) {
        return Response.json({ error: "Password salah." }, { status: 401 });
      }

      const session = {
        role: "guru",
        nip: guruData.nip,
        nama: guruData.nama_guru,
        bidang_studi: guruData.bidang_studi,
      };

      return new Response(JSON.stringify({ success: true, session }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createSessionCookie(session),
        },
      });
    }

    const { data: siswaData, error: siswaError } = await supabase
      .from("siswa")
      .select("nis,nama_siswa,kelas,password")
      .eq("nis", numericId)
      .maybeSingle();

    if (siswaError) {
      console.error(siswaError);
      return Response.json({ error: "Gagal memeriksa akun siswa." }, { status: 500 });
    }

    if (!siswaData) {
      return Response.json({ error: "NIP guru atau NIS siswa tidak ditemukan." }, { status: 404 });
    }

    if (String(siswaData.password) !== String(password)) {
      return Response.json({ error: "Password salah." }, { status: 401 });
    }

    const session = {
      role: "siswa",
      nis: siswaData.nis,
      nama: siswaData.nama_siswa,
      kelas: siswaData.kelas,
    };

    return new Response(JSON.stringify({ success: true, session }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": createSessionCookie(session),
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
