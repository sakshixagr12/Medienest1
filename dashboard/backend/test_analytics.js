const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const getLocalTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const run = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const clinicId = "3a35819a-4724-4ba3-8851-505c7100fce6";
  const doctorId = "d4022b66-6674-4bc6-860f-76017e4f55d3";

  const todayStr = getLocalTodayStr();
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStr = startOfWeek.toISOString().split("T")[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthStr = startOfMonth.toISOString().split("T")[0];

  console.log("Parameters:", { clinicId, doctorId, todayStr, weekStr, monthStr });

  try {
    // Queries from doctor-dashboard/page.tsx
    let rxTodayQuery = supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("date", todayStr).eq("clinic_id", clinicId);
    let rxWeekQuery = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("date", weekStr).eq("clinic_id", clinicId);
    let rxMonthQuery = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("date", monthStr).eq("clinic_id", clinicId);

    if (doctorId) {
      rxTodayQuery = rxTodayQuery.eq("doctor_id", doctorId);
      rxWeekQuery = rxWeekQuery.eq("doctor_id", doctorId);
      rxMonthQuery = rxMonthQuery.eq("doctor_id", doctorId);
    }

    const [rToday, rWeek, rMonth] = await Promise.all([rxTodayQuery, rxWeekQuery, rxMonthQuery]);
    console.log("Census Counts using 'date' column:", {
      today: rToday.count,
      week: rWeek.count,
      month: rMonth.count,
      errors: { today: rToday.error, week: rWeek.error, month: rMonth.error }
    });

    // Let's also test using created_at column
    let rxTodayQuery2 = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("created_at", todayStr).eq("clinic_id", clinicId);
    let rxWeekQuery2 = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("created_at", weekStr).eq("clinic_id", clinicId);
    let rxMonthQuery2 = supabase.from("prescriptions").select("id", { count: "exact", head: true }).gte("created_at", monthStr).eq("clinic_id", clinicId);

    if (doctorId) {
      rxTodayQuery2 = rxTodayQuery2.eq("doctor_id", doctorId);
      rxWeekQuery2 = rxWeekQuery2.eq("doctor_id", doctorId);
      rxMonthQuery2 = rxMonthQuery2.eq("doctor_id", doctorId);
    }

    const [rToday2, rWeek2, rMonth2] = await Promise.all([rxTodayQuery2, rxWeekQuery2, rxMonthQuery2]);
    console.log("Census Counts using 'created_at' column:", {
      today: rToday2.count,
      week: rWeek2.count,
      month: rMonth2.count
    });

  } catch (error) {
    console.error("Error running test:", error);
  }
};

run();
