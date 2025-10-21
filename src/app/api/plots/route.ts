import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET - Fetch all saved plots
export async function GET() {
  try {
    const query = `
      SELECT id, plot_name, plot_json, date
      FROM saved_plots
      ORDER BY date DESC;
    `;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}

// POST - Save a new plot
export async function POST(request: NextRequest) {
  try {
    const { plot_name, plot_json } = await request.json();

    const query = `
      INSERT INTO saved_plots (plot_name, plot_json, date)
      VALUES ($1, $2, NOW())
      RETURNING *;
    `;

    const values = [plot_name, JSON.stringify(plot_json)];

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save plot' },
      { status: 500 }
    );
  }
}
