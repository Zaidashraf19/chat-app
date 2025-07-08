import { Link, useNavigate } from "react-router-dom";
import Logo from "../assets/AppLogo.png";
import { FaUserCircle } from "react-icons/fa";
import { useEffect, useState } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, SetUser] = useState("");

  useEffect(() => {
    const fw = localStorage.getItem("username");
    if (fw) {
      SetUser(fw[0]);
    }
  }, []);

  const LogOut = () => {
    localStorage.clear();
    navigate("/");
    location.reload();
  };

  return (
    <>
      <div className="d-flex justify-content-between text-black p-2 bg-info">
        {/* LOGO */}
        <div className="m-0 p-0">
          <img src={Logo} alt="App Logo" className="m-0 p-0" width={100} />
        </div>

        {/* HOME */}
        <div className="p-4">
          <Link to={"/home"} className="text-black text-decoration-none">
            Home
          </Link>
        </div>

        {/* DROPDOWN */}
        <div className="nav-item dropdown p4">
          <a
            className="nav-link"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <span className="fs-3 fw-bold">
              {user ? (
                <span
                  className="bg-black text-info d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "50px",
                    height: "50px",
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                  }}
                >
                  {user}
                </span>
              ) : (
                <FaUserCircle />
              )}
            </span>
          </a>
          <ul className="dropdown-menu">
            <li>
              <Link
                to={""}
                className="dropdown-item text-dark text-decoration-none"
              >
                Login
              </Link>
            </li>
            <li>
              <a className="dropdown-item" onClick={LogOut}>
                Logout
              </a>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navbar;
