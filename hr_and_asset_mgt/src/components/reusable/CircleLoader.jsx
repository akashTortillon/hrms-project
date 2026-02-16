import React from "react";
import "../../style/CircleLoader.css"


const CircleLoader = ({ size = "medium" }) => {
  return (
    <div className={`loader-wrapper ${size}`}>
      <div className="circle-loader"></div>
    </div>
  );
};

export default CircleLoader;