"""Quarantine Manager for AgentProof Local Security Suite.

Provides isolated, auditable, and reversible file containment:
- Dedicated quarantine repository with 0o700 restricted POSIX permissions.
- Cryptographic hash (SHA-256) validation before and after containment.
- Path traversal defense & UUID collision prevention.
- Persistent audit manifest (`quarantine_manifest.json`).
- Safe restore to original path or custom destination upon explicit user confirmation.
- Safe permanent deletion upon explicit user confirmation.
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
from typing import Any, Optional
import uuid


DEFAULT_QUARANTINE_DIR = Path.home() / ".agentproof" / "quarantine"


class QuarantineManager:
    """Manages secure quarantine storage, manifest auditing, restoration, and deletion."""

    def __init__(self, quarantine_dir: Optional[Path | str] = None):
        self.base_dir = Path(quarantine_dir).resolve() if quarantine_dir else DEFAULT_QUARANTINE_DIR
        self.vault_dir = self.base_dir / "vault"
        self.manifest_file = self.base_dir / "quarantine_manifest.json"
        self._initialize_storage()

    def _initialize_storage(self) -> None:
        """Create quarantine directories with restricted 0o700 permissions."""
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.vault_dir.mkdir(parents=True, exist_ok=True)

        # Restrict permissions so other users cannot read quarantined files
        try:
            os.chmod(self.base_dir, 0o700)
            os.chmod(self.vault_dir, 0o700)
        except Exception:
            pass

        if not self.manifest_file.exists():
            self._write_manifest([])

    def _read_manifest(self) -> list[dict[str, Any]]:
        if not self.manifest_file.exists():
            return []
        try:
            with open(self.manifest_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _write_manifest(self, entries: list[dict[str, Any]]) -> None:
        temp_file = self.manifest_file.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2)
        temp_file.replace(self.manifest_file)
        try:
            os.chmod(self.manifest_file, 0o600)
        except Exception:
            pass

    @staticmethod
    def _compute_sha256(path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def quarantine_file(
        self,
        file_path: str | Path,
        reason: str = "Suspicious file detected by security policy",
        confirmed: bool = False,
    ) -> dict[str, Any]:
        """Move an untrusted file into the secure quarantine vault."""
        if not confirmed:
            return {
                "success": False,
                "error": "Quarantine action requires explicit user confirmation (confirmed=True).",
            }

        source = Path(file_path).resolve()

        if not source.exists():
            return {"success": False, "error": f"Source file does not exist: {source}"}
        if not source.is_file():
            return {"success": False, "error": f"Source is not a regular file: {source}"}

        # Prevent quarantining quarantine directory itself (path traversal defense)
        try:
            source.relative_to(self.base_dir)
            return {"success": False, "error": "Cannot quarantine a file already within the quarantine vault."}
        except ValueError:
            pass

        qid = str(uuid.uuid4())
        original_hash = self._compute_sha256(source)
        original_size = source.stat().st_size
        original_filename = source.name
        original_path = str(source)

        vault_filename = f"{qid}.quarantined"
        vault_target = self.vault_dir / vault_filename

        try:
            # Move file into vault
            shutil.move(str(source), str(vault_target))

            # Restrict permissions in vault (remove executable bits)
            try:
                os.chmod(vault_target, 0o400)  # Read-only for owner, non-executable
            except Exception:
                pass

            # Post-move cryptographic hash verification
            vault_hash = self._compute_sha256(vault_target)
            if vault_hash != original_hash:
                # Critical corruption rollback
                shutil.move(str(vault_target), original_path)
                return {
                    "success": False,
                    "error": "Cryptographic integrity failure during quarantine move. File restored.",
                }

            entry = {
                "quarantine_id": qid,
                "original_filename": original_filename,
                "original_path": original_path,
                "vault_filename": vault_filename,
                "sha256": original_hash,
                "size_bytes": original_size,
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "quarantined",
            }

            manifest = self._read_manifest()
            manifest.append(entry)
            self._write_manifest(manifest)

            return {
                "success": True,
                "quarantine_id": qid,
                "original_path": original_path,
                "sha256": original_hash,
                "timestamp": entry["timestamp"],
                "message": f"File '{original_filename}' successfully moved to isolated quarantine.",
            }

        except Exception as exc:
            return {"success": False, "error": f"Quarantine operation failed: {exc}"}

    def list_quarantined_files(self, status: Optional[str] = None) -> list[dict[str, Any]]:
        """Return entries in the quarantine manifest, optionally filtered by status."""
        manifest = self._read_manifest()
        entries = []
        for item in manifest:
            if status is None or item.get("status") == status:
                vault_path = self.vault_dir / item.get("vault_filename", "")
                item["vault_file_exists"] = vault_path.exists()
                entries.append(item)
        return entries

    def get_manifest_entries(self) -> list[dict[str, Any]]:
        """Return raw persistent manifest list."""
        return self._read_manifest()

    def restore_file(
        self,
        quarantine_id: str,
        destination_override: Optional[str | Path] = None,
        target_dir: Optional[str | Path] = None,
        confirmed: bool = False,
    ) -> dict[str, Any]:
        """Safely restore a quarantined file back to original or chosen destination."""
        if not confirmed:
            return {
                "success": False,
                "error": "Restoration requires explicit user confirmation (confirmed=True).",
            }

        manifest = self._read_manifest()
        entry = next((e for e in manifest if e.get("quarantine_id") == quarantine_id and e.get("status") == "quarantined"), None)

        if not entry:
            return {"success": False, "error": f"No active quarantined file found with ID: {quarantine_id}"}

        vault_target = self.vault_dir / entry["vault_filename"]
        if not vault_target.exists():
            return {"success": False, "error": f"Vault file missing for ID: {quarantine_id}"}

        chosen_dest = destination_override or target_dir
        dest = Path(chosen_dest).resolve() if chosen_dest else Path(entry["original_path"])

        # Prevent overwriting existing file
        if dest.exists():
            return {
                "success": False,
                "error": f"Destination path already exists. Specify a different destination to prevent accidental overwrite: {dest}",
            }

        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(vault_target), str(dest))

            # Restore normal permissions (rw-r--r--)
            try:
                os.chmod(dest, 0o644)
            except Exception:
                pass

            # Update manifest
            entry["status"] = "restored"
            entry["restored_at"] = datetime.now(timezone.utc).isoformat()
            entry["restored_path"] = str(dest)
            self._write_manifest(manifest)

            return {
                "success": True,
                "quarantine_id": quarantine_id,
                "restored_path": str(dest),
                "message": f"File '{entry['original_filename']}' successfully restored to '{dest}'.",
            }
        except Exception as exc:
            return {"success": False, "error": f"File restoration failed: {exc}"}

    def delete_permanently(self, quarantine_id: str, confirmed: bool = False) -> dict[str, Any]:
        """Permanently delete a quarantined file after explicit confirmation."""
        if not confirmed:
            return {
                "success": False,
                "error": "Permanent deletion requires explicit user confirmation (confirmed=True).",
            }

        manifest = self._read_manifest()
        entry = next((e for e in manifest if e.get("quarantine_id") == quarantine_id), None)

        if not entry:
            return {"success": False, "error": f"No quarantined file found with ID: {quarantine_id}"}

        vault_target = self.vault_dir / entry["vault_filename"]

        try:
            if vault_target.exists():
                try:
                    import stat
                    os.chmod(vault_target, stat.S_IWRITE | stat.S_IREAD)
                except Exception:
                    pass
                vault_target.unlink()

            entry["status"] = "permanently_deleted"
            entry["deleted_at"] = datetime.now(timezone.utc).isoformat()
            self._write_manifest(manifest)

            return {
                "success": True,
                "quarantine_id": quarantine_id,
                "message": f"File '{entry['original_filename']}' has been permanently deleted from quarantine.",
            }
        except Exception as exc:
            return {"success": False, "error": f"Permanent deletion failed: {exc}"}

    delete_quarantined_file = delete_permanently
