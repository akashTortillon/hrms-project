import React, { useState } from "react";
import { toast } from "react-toastify";
import { copyToClipboard } from "../../utils/copyToClipboard";

// Content of the toast shown when a password reset worked but the email could not be sent, so
// the admin has to hand the temporary password over themselves. It stays on screen until the
// password has been copied (the caller turns off autoClose / closeOnClick / drag / the X), so
// it can't vanish before the password is saved. If copying is blocked, the password stays
// selectable and a "Done" button closes it.
export default function TempPasswordToast({ password, closeToast }) {
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    if (await copyToClipboard(password)) {
      toast.success("Password copied to clipboard");
      closeToast();
    } else {
      setCopyFailed(true);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 6 }}>Password reset, but the email could not be sent.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code
          style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: "bold", userSelect: "all" }}
        >
          {password}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          style={{ padding: "2px 10px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer" }}
        >
          Copy
        </button>
      </div>
      {copyFailed && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Couldn't copy automatically. Select the password above and press Ctrl+C, then click Done.
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={closeToast}
              style={{ padding: "2px 10px", border: "1px solid #ccc", borderRadius: 4, background: "#fff", cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
