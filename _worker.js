export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Pastikan binding 'DB' tersedia
        if (!env.DB) {
            return new Response("Database binding 'DB' tidak ditemukan. Periksa wrangler.toml atau Dashboard Cloudflare.", { status: 500 });
        }

        try {
            // 1. Endpoint: GET /api/accounts (Ambil semua data)
            if (url.pathname === "/api/accounts" && request.method === "GET") {
                const { results } = await env.DB.prepare("SELECT * FROM accounts ORDER BY id DESC").all();
                return new Response(JSON.stringify(results), {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                });
            }

            // 2. Endpoint: POST /api/accounts (Tambah data baru)
            if (url.pathname === "/api/accounts" && request.method === "POST") {
                const data = await request.json();

                const query = `
          INSERT INTO accounts (kategori, username, password, pin, pola, riwayat) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

                await env.DB.prepare(query)
                    .bind(
                        data.kategori,
                        data.username,
                        data.password,
                        data.pin || "",
                        data.pola || "",
                        data.riwayat || ""
                    )
                    .run();

                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // 3. Endpoint: DELETE /api/accounts (Hapus data berdasarkan ID)
            if (url.pathname === "/api/accounts" && request.method === "DELETE") {
                const id = url.searchParams.get("id");
                if (!id) return new Response("ID diperlukan", { status: 400 });

                await env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();

                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }

            // ... (di dalam blok try pada _worker.js sebelumnya)

            // Endpoint: POST /api/verify-pin
            if (url.pathname === "/api/verify-pin" && request.method === "POST") {
                const { pin } = await request.json();
                const stored = await env.DB.prepare("SELECT value FROM settings WHERE key = 'login_pin'").first();
                if (stored.value === pin) {
                    return new Response(JSON.stringify({ success: true }), { status: 200 });
                }
                return new Response(JSON.stringify({ success: false }), { status: 401 });
            }

            // ... (lanjutkan ke endpoint /api/accounts seperti sebelumnya)

            // 4. Sajikan File Statis (index.html, dll)
            // Ini akan mengambil file dari direktori build Pages Anda
            return env.ASSETS.fetch(request);

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    },
};