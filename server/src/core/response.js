/**
 * The only two success shapes in the API (RULES.md section 6).
 * Never write res.json by hand.
 */

/** 200 with { success: true, data, meta? }. */
export function ok(res, data, meta = undefined) {
  return res.status(200).json(meta ? { success: true, data, meta } : { success: true, data });
}

/** 201 for a newly created row. */
export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

/** 204 with no body — logout, deletes. */
export function noContent(res) {
  return res.status(204).end();
}
