import { Client } from "pg";

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set`);
	}
	return value;
}

async function ensureScheduleLocationColumn() {
	console.log("Starting fix for staff_schedules.location ...");
	const dbUrl = requireEnv("DATABASE_URL");
	console.log("Using DATABASE_URL:", dbUrl.replace(/:[^:@/]+@/, ":***@"));
	const client = new Client({ connectionString: dbUrl });
	await client.connect();

	try {
		// Check if staff_schedules table exists
		const tblRes = await client.query(
			`SELECT to_regclass('public.staff_schedules') AS exists;`
		);
		if (!tblRes.rows[0]?.exists) {
			console.log("Table staff_schedules does not exist. Nothing to do.");
			return;
		}

		// Check if location column exists
		const colRes = await client.query(
			`SELECT column_name, data_type
			 FROM information_schema.columns
			 WHERE table_schema = 'public' AND table_name = 'staff_schedules' AND column_name IN ('location','location_id');`
		);
		const hasLocation = colRes.rows.some((r) => r.column_name === "location");
		const hasLocationId = colRes.rows.some((r) => r.column_name === "location_id");

		if (!hasLocation) {
			console.log("Adding column staff_schedules.location (TEXT)...");
			await client.query(`ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS location TEXT;`);
		}

		// Backfill values if null
		if (hasLocationId) {
			console.log("Backfilling staff_schedules.location from locations.name using location_id where possible...");
			await client.query(`
				UPDATE staff_schedules ss
				SET location = COALESCE(loc.name, 'All Locations')
				FROM locations loc
				WHERE ss.location IS NULL AND ss.location_id = loc.id;
			`);
		}

		console.log("Setting default 'All Locations' for any remaining NULLs in staff_schedules.location...");
		const { rowCount: filledCount } = await client.query(`UPDATE staff_schedules SET location = 'All Locations' WHERE location IS NULL;`);
		console.log(`Backfilled ${filledCount ?? 0} rows to 'All Locations'.`);

		console.log("Enforcing NOT NULL constraint on staff_schedules.location...");
		await client.query(`ALTER TABLE staff_schedules ALTER COLUMN location SET NOT NULL;`);

		console.log("Done. staff_schedules.location is present and NOT NULL.");
	} catch (err) {
		console.error("Failed to ensure staff_schedules.location:", err);
		process.exitCode = 1;
	} finally {
		await client.end();
	}
}

await ensureScheduleLocationColumn();


