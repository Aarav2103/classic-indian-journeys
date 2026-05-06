// Soft-delete plugin. Admin deletes flip a `deleted` flag instead of removing the
// document, so anything can come back from the Trash view. Mostly a safety net for
// a non-technical operator deleting the wrong row.
//
// Normal queries filter soft-deleted docs out on their own, so existing reads
// didn't need touching. Query `deleted: true` explicitly to reach trashed ones,
// the auto-filter only applies when the query says nothing about `deleted`.
//
// Only hooks Query middleware. Raw aggregations bypass it entirely ($vectorSearch
// in ai/retrieve.js, the Review rating rollups) and have to add
// `{ deleted: { $ne: true } }` themselves.
export default function softDeletePlugin(schema) {
  schema.add({
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  // Exclude trashed docs from normal reads/updates unless the caller is explicit
  // about `deleted` (e.g. `{ deleted: true }` to fetch the Trash, or a restore).
  const autoFilter = function () {
    const filter = this.getFilter();
    if (filter.deleted === undefined) this.where({ deleted: { $ne: true } });
  };
  ["count", "countDocuments", "find", "findOne", "findOneAndUpdate", "findOneAndDelete", "findOneAndReplace"].forEach(
    (op) => schema.pre(op, autoFilter)
  );

  // Flip the flag instead of removing. Returns the saved doc.
  schema.methods.softDelete = function () {
    this.deleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  // Restore a trashed doc by id (the explicit `deleted: true` filter bypasses the
  // auto-filter so we can find it). Returns the restored doc or null.
  schema.statics.restoreById = function (id) {
    return this.findOneAndUpdate(
      { _id: id, deleted: true },
      { $set: { deleted: false, deletedAt: null } },
      { new: true }
    );
  };

  // Hard-delete a trashed doc by id (permanent, used from the Trash view).
  // deleteOne is not auto-filtered, so this removes regardless of the flag.
  schema.statics.purgeById = function (id) {
    return this.deleteOne({ _id: id });
  };
}
