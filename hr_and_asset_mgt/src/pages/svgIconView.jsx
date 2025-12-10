
import { useState } from "react";
import SvgIcon from "../components/svgIcon/svgView.jsx";

export default function IconTester() {
  const [name, setName] = useState("");

  return (
    <div>
      <input
        type="text"
        placeholder="Enter SVG name (ex: add)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div style={{ marginTop: 20 }}>
        {name && <SvgIcon name={name} size={40} />}
      </div>
    </div>
  );
}
