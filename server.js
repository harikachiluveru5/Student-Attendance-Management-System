const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database("attendance.db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_number TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        attendance_date TEXT NOT NULL,
        period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 7),
        status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
        UNIQUE(student_id, attendance_date, period),
        FOREIGN KEY(student_id) REFERENCES students(id)
    );
`);

app.get("/api/students", (req, res) => {
    const students = db.prepare(
        "SELECT * FROM students ORDER BY roll_number"
    ).all();

    res.json(students);
});

app.post("/api/students", (req, res) => {
    const { roll_number, name, department } = req.body;

    if (!roll_number?.trim() || !name?.trim() || !department?.trim()) {
        return res.status(400).json({
            error: "Roll number, name and department are required."
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO students (roll_number, name, department)
            VALUES (?, ?, ?)
        `).run(roll_number.trim(), name.trim(), department.trim());

        res.status(201).json({
            message: "Student added successfully",
            id: result.lastInsertRowid
        });
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "Roll number already exists."
            });
        }

        res.status(500).json({ error: "Unable to add student." });
    }
});

app.get("/api/attendance", (req, res) => {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
            error: "Provide a valid date in YYYY-MM-DD format."
        });
    }

    const records = db.prepare(`
        SELECT s.id AS student_id,
               s.roll_number,
               s.name,
               s.department,
               a.period,
               a.status
        FROM students s
        LEFT JOIN attendance a
          ON s.id = a.student_id
         AND a.attendance_date = ?
        ORDER BY s.roll_number, a.period
    `).all(date);

    res.json(records);
});

app.post("/api/attendance", (req, res) => {
    const { student_id, attendance_date, period, status } = req.body;

    if (
        !Number.isInteger(Number(student_id)) ||
        !attendance_date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(attendance_date) ||
        !Number.isInteger(period) ||
        period < 1 ||
        period > 7 ||
        !["Present", "Absent"].includes(status)
    ) {
        return res.status(400).json({
            error: "Invalid attendance details."
        });
    }

    const student = db.prepare(
        "SELECT id FROM students WHERE id = ?"
    ).get(Number(student_id));

    if (!student) {
        return res.status(404).json({
            error: "Student not found."
        });
    }

    try {
        db.prepare(`
            INSERT INTO attendance
                (student_id, attendance_date, period, status)
            VALUES (?, ?, ?, ?)
        `).run(Number(student_id), attendance_date, period, status);

        res.status(201).json({
            message: "Attendance saved successfully."
        });
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "Attendance already exists for this period."
            });
        }

        res.status(500).json({
            error: "Unable to save attendance."
        });
    }
});

app.get("/api/reports/monthly", (req, res) => {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({
            error: "Provide month in YYYY-MM format."
        });
    }

    const reports = db.prepare(`
        SELECT
            s.id AS student_id,
            s.roll_number,
            s.name,
            COUNT(a.id) AS working_periods,
            COALESCE(SUM(
                CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END
            ), 0) AS periods_attended,
            COALESCE(SUM(
                CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END
            ), 0) AS periods_absent,
            ROUND(
                100.0 * COALESCE(SUM(
                    CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END
                ), 0) / NULLIF(COUNT(a.id), 0),
                2
            ) AS attendance_percentage
        FROM students s
        LEFT JOIN attendance a
          ON s.id = a.student_id
         AND substr(a.attendance_date, 1, 7) = ?
        GROUP BY s.id
        ORDER BY s.roll_number
    `).all(month);

    res.json(reports);
});

app.get("/api/reports/monthly.csv", (req, res) => {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({
            error: "Provide month in YYYY-MM format."
        });
    }

    const reports = db.prepare(`
        SELECT
            s.roll_number,
            s.name,
            COUNT(a.id) AS working_periods,
            COALESCE(SUM(
                CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END
            ), 0) AS periods_attended,
            COALESCE(SUM(
                CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END
            ), 0) AS periods_absent,
            ROUND(
                100.0 * COALESCE(SUM(
                    CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END
                ), 0) / NULLIF(COUNT(a.id), 0),
                2
            ) AS attendance_percentage
        FROM students s
        LEFT JOIN attendance a
          ON s.id = a.student_id
         AND substr(a.attendance_date, 1, 7) = ?
        GROUP BY s.id
        ORDER BY s.roll_number
    `).all(month);

    const escapeCsv = value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const lines = [
        "Roll Number,Name,Working Periods,Attended,Absent,Attendance Percentage",
        ...reports.map(r => [
            r.roll_number,
            r.name,
            r.working_periods,
            r.periods_attended,
            r.periods_absent,
            r.attendance_percentage ?? "N/A"
        ].map(escapeCsv).join(","))
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        'attachment; filename="monthly-attendance.csv"'
    );

    res.send(lines.join("\r\n"));
});

app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Attendance application running at http://localhost:${PORT}`);
});