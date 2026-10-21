"""Prepare review-gated private SQL batches for the developer's database connection.

Does not connect to a database. Review files, SQL, and media stay outside Git.
  python scripts/prepare_sat_load.py --owner UUID --decisions decisions-rw4.json decisions-rw5.json
"""
import argparse
import base64
import json
from pathlib import Path

from import_sat_pdfs import DEFAULT_OUTPUT, private_output, sha256, write_json
from review_sat_import import approve_candidate, candidates_at, export_rows, local_asset


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def prepare(root: Path, owner: str, decisions: list[Path]) -> dict:
    candidates = {c["candidateId"]: c for _, values in candidates_at(root) for c in values}
    reviewed, seen = [], set()
    for path in decisions:
        for decision in json.loads(local_asset(root, str(path)).read_text(encoding="utf-8")):
            identifier = decision["candidateId"]
            if identifier in seen:
                raise ValueError(f"Duplicate decision: {identifier}")
            seen.add(identifier)
            reviewed.append(approve_candidate(candidates[identifier], decision, root))
    rows, assets = export_rows(reviewed, owner, root)
    if not rows:
        raise ValueError("No explicitly reviewed questions")
    folder = root / "load"
    folder.mkdir(exist_ok=True)
    paths = []
    # Each batch is atomic and immutable: conflicting content requires a new version.
    media = []
    for asset in assets:
        path = Path(asset["localPath"])
        if sha256(path) != asset["sha256"]:
            raise ValueError("Asset changed after review")
        payload = base64.b64encode(path.read_bytes()).decode("ascii")
        media.append("insert into sat_private.exam_assets(path,owner_id,content_type,data) values(" +
                     ",".join([literal(asset["path"]), literal(owner) + "::uuid", literal(asset["contentType"]),
                               "decode(" + literal(payload) + ",'base64')"]) + ") on conflict(path) do nothing;")
        media.append("do $$ begin if not exists(select 1 from sat_private.exam_assets where path=" + literal(asset["path"]) +
                     " and owner_id=" + literal(owner) + "::uuid and data=decode(" + literal(payload) +
                     ",'base64')) then raise exception 'Immutable media conflict'; end if; end $$;")
    if media:
        destination = folder / "000-media.sql"
        destination.write_text("begin;\n" + "\n".join(media) + "\ncommit;\n", encoding="utf-8")
        paths.append(str(destination))
    for offset in range(0, len(rows), 12):
        payload = literal(json.dumps(rows[offset:offset + 12], ensure_ascii=False)) + "::jsonb"
        query = """begin;
do $load$ declare incoming record; stored sat_private.exam_questions%rowtype; begin
 for incoming in select * from jsonb_to_recordset(PAYLOAD) as r(id uuid,version integer,owner_id uuid,document jsonb,key jsonb,reviewed boolean,source_hash text) loop
  select * into stored from sat_private.exam_questions where id=incoming.id and version=incoming.version;
  if found then
   if stored.owner_id is distinct from incoming.owner_id or stored.document<>incoming.document or stored.key<>incoming.key or stored.source_hash<>incoming.source_hash or not stored.reviewed then
    raise exception 'Immutable question conflict: %',incoming.id;
   end if;
  else
   insert into sat_private.exam_questions(id,version,owner_id,document,key,reviewed,source_hash)
   values(incoming.id,incoming.version,incoming.owner_id,incoming.document,incoming.key,incoming.reviewed,incoming.source_hash);
  end if;
 end loop;
end $load$;
commit;
""".replace("PAYLOAD", payload)
        destination = folder / f"{offset // 12 + 1:03d}-questions.sql"
        destination.write_text(query, encoding="utf-8")
        paths.append(str(destination))
    write_json(root / "publish.rows.json", rows)
    write_json(root / "publish.assets.json", assets)
    write_json(root / "publish.reviews.json", reviewed)
    manifest = {"owner": owner, "questions": len(rows), "assets": len(assets), "batches": paths}
    write_json(folder / "manifest.json", manifest)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--decisions", type=Path, nargs="+", required=True)
    args = parser.parse_args()
    manifest = prepare(private_output(args.root), args.owner, args.decisions)
    print(f"Prepared {manifest['questions']} reviewed questions and {manifest['assets']} private assets in {len(manifest['batches'])} SQL batches. Nothing uploaded yet.")
