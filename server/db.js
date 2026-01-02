const dns = require("dns");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },

  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 30000,
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Gagal konek Database:", err);
  } else {
    console.log("✅ Database Terhubung (IPv4)! Jam Server:", res.rows[0].now);
  }
});

module.exports = pool;
