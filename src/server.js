// Debug DATABASE_URL
app.get("/debug-db", (req, res) => {
  res.json({
    databaseUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:(.*?)@/, ":****@")
      : "MISSING",
  });
});

// Debug login
app.get("/debug-login", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, password_hash
      FROM employees
      WHERE id = 'ADMIN01'
    `);

    if (!result.rows.length) {
      return res.json({
        error: "ADMIN01 not found"
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(
      "admin",
      user.password_hash
    );

    res.json({
      id: user.id,
      hash: user.password_hash,
      passwordMatches: match
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
      code: err.code,
      stack: err.stack
    });
  }
});