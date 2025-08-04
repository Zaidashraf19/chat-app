import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SignupForm = () => {
  const [userNameVal, SetUserNameVal] = useState("");
  const [passVal, SetPassVal] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!userNameVal || !passVal) {
      return;
    } else {
      const userName = userNameVal.toUpperCase();
      localStorage.setItem("username", userName);
      SetPassVal("");
      SetUserNameVal("");
      navigate("/home");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="bg-white p-4 rounded shadow" style={{ width: "300px" }}>
        <h2 className="text-center mb-4">LOGIN</h2>
        <form onSubmit={handleSubmit}>
          {/* NAME */}
          <div className="mb-3">
            <label className="form-label fw-bold">NAME:</label>
            <input
              type="text"
              className="form-control focus-ring focus-ring-info"
              placeholder="Enter Username"
              value={userNameVal}
              onChange={(e) => SetUserNameVal(e.target.value)}
            />
          </div>
          {/* PASS */}
          <div className="mb-3">
            <label className="form-label fw-bold">PASSWORD:</label>
            <input
              type="password"
              className="form-control focus-ring focus-ring-info"
              placeholder="Enter Password"
              value={passVal}
              onChange={(e) => SetPassVal(e.target.value)}
            />
          </div>
          {/* BTN */}
          <button type="submit" className="btn btn-info w-100 rounded-pill">
            LOG IN
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupForm;
