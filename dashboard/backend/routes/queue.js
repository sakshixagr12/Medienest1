// backend/routes/queue.js
// Doctor Queue Management — REST API
const express = require("express");
const router = express.Router();
const { supabase } = require("../supabaseClient");

// ── Validation Helpers ───────────────────────────────────────────────
const isUUID = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ── Helper ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────────────────────────────────
// GET /api/queue
// Query: ?clinic_id=&doctor_id=&date=   (date defaults to today)
// Returns ordered queue for the given clinic/doctor/day
// ─────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { clinic_id, doctor_id, date } = req.query;
  if (!clinic_id)
    return res
      .status(400)
      .json({ success: false, error: "clinic_id required" });

  const queueDate = date || today();

  try {
    let query = supabase
      .from("doctor_queue")
      .select("*")
      .eq("clinic_id", clinic_id)
      .eq("queue_date", queueDate)
      .not("status", "eq", "done") // exclude completed patients
      .order("priority", { ascending: false }) // urgent first
      .order("token_number", { ascending: true });

    if (doctor_id) query = query.eq("doctor_id", doctor_id);

    const { data, error } = await query;
    if (error) throw error;

    // Also fetch today's done count
    const { count: doneCount } = await supabase
      .from("doctor_queue")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinic_id)
      .eq("queue_date", queueDate)
      .eq("status", "done");

    res.json({ success: true, queue: data || [], doneCount: doneCount || 0 });
  } catch (err) {
    console.error("[Queue GET]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/queue/add
// Body: { clinic_id, doctor_id, patient_id, patient_name, priority, notes }
// Adds patient to today's queue with next token number
// ─────────────────────────────────────────────────────────────────────────
router.post("/add", async (req, res) => {
  const {
    clinic_id,
    doctor_id,
    patient_id,
    patient_name,
    priority = "normal",
    notes,
  } = req.body;
  if (!clinic_id || !patient_id) {
    return res
      .status(400)
      .json({ success: false, error: "clinic_id and patient_id are required" });
  }

  const queueDate = today();

  try {
    const { data, error } = await supabase.rpc("add_patient_to_queue", {
      p_clinic_id: clinic_id,
      p_doctor_id: doctor_id || null,
      p_patient_id: patient_id,
      p_patient_name: patient_name,
      p_priority: priority,
      p_notes: notes || null,
    });

    if (error) {
      if (error.message.includes("already in the queue today")) {
        return res.status(409).json({
          success: false,
          error: "Patient is already in the queue today",
        });
      }
      throw error;
    }

    console.log(
      `[Queue] Added: ${patient_name} (#${data.token_number}) → ${clinic_id}`,
    );
    res.json({ success: true, entry: data, token: data.token_number });
  } catch (err) {
    console.error("[Queue ADD]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// PUT /api/queue/:id/status
// Body: { status }   ← 'waiting' | 'serving' | 'done' | 'skipped'
// Also sets serving_started_at or completed_at timestamps
// ─────────────────────────────────────────────────────────────────────────
router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  if (!isUUID(id))
    return res
      .status(400)
      .json({ success: false, error: "Invalid queue entry ID" });
  const { status } = req.body;

  const validStatuses = ["waiting", "serving", "done", "skipped"];
  if (!validStatuses.includes(status)) {
    return res
      .status(400)
      .json({
        success: false,
        error: `Invalid status. Use: ${validStatuses.join(", ")}`,
      });
  }

  const updates = { status };
  if (status === "serving")
    updates.serving_started_at = new Date().toISOString();
  if (status === "done" || status === "skipped")
    updates.completed_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("doctor_queue")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log(`[Queue] Status → ${status} for entry ${id}`);
    res.json({ success: true, entry: data });
  } catch (err) {
    console.error("[Queue STATUS]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// PUT /api/queue/:id/priority
// Body: { priority }  ← 'normal' | 'urgent' | 'elderly'
// ─────────────────────────────────────────────────────────────────────────
router.put("/:id/priority", async (req, res) => {
  const { id } = req.params;
  if (!isUUID(id))
    return res
      .status(400)
      .json({ success: false, error: "Invalid queue entry ID" });
  const { priority } = req.body;

  const validPriorities = ["normal", "urgent", "elderly"];
  if (!validPriorities.includes(priority)) {
    return res
      .status(400)
      .json({
        success: false,
        error: `Invalid priority. Use: ${validPriorities.join(", ")}`,
      });
  }

  try {
    const { data, error } = await supabase
      .from("doctor_queue")
      .update({ priority })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, entry: data });
  } catch (err) {
    console.error("[Queue PRIORITY]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// DELETE /api/queue/:id
// Remove a patient from the queue entirely
// ─────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isUUID(id))
    return res
      .status(400)
      .json({ success: false, error: "Invalid queue entry ID" });
  try {
    const { error } = await supabase.from("doctor_queue").delete().eq("id", id);

    if (error) throw error;
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error("[Queue DELETE]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/queue/call-next
// Body: { clinic_id, doctor_id }
// Marks current 'serving' as 'done', promotes next 'waiting' to 'serving'
// ─────────────────────────────────────────────────────────────────────────
router.post("/call-next", async (req, res) => {
  const { clinic_id, doctor_id } = req.body;
  if (!clinic_id)
    return res
      .status(400)
      .json({ success: false, error: "clinic_id required" });

  const queueDate = today();

  try {
    // 1. Mark current serving as done
    let servingQuery = supabase
      .from("doctor_queue")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("clinic_id", clinic_id)
      .eq("queue_date", queueDate)
      .eq("status", "serving");
    if (doctor_id) servingQuery = servingQuery.eq("doctor_id", doctor_id);
    await servingQuery;

    // 2. Get next waiting patient (sorted by priority then token)
    let nextQuery = supabase
      .from("doctor_queue")
      .select("id, patient_name, token_number")
      .eq("clinic_id", clinic_id)
      .eq("queue_date", queueDate)
      .eq("status", "waiting")
      .order("priority", { ascending: false })
      .order("token_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (doctor_id)
      nextQuery = supabase
        .from("doctor_queue")
        .select("id, patient_name, token_number")
        .eq("clinic_id", clinic_id)
        .eq("doctor_id", doctor_id)
        .eq("queue_date", queueDate)
        .eq("status", "waiting")
        .order("priority", { ascending: false })
        .order("token_number", { ascending: true })
        .limit(1)
        .maybeSingle();

    const { data: next } = await nextQuery;

    if (next) {
      // 3. Promote next patient to 'serving'
      await supabase
        .from("doctor_queue")
        .update({
          status: "serving",
          serving_started_at: new Date().toISOString(),
        })
        .eq("id", next.id);

      console.log(
        `[Queue] Calling next: ${next.patient_name} (#${next.token_number})`,
      );
      res.json({ success: true, next });
    } else {
      res.json({ success: true, next: null, message: "Queue is empty" });
    }
  } catch (err) {
    console.error("[Queue CALL-NEXT]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
