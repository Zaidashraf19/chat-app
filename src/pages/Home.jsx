import { useEffect, useRef, useState } from "react";
import { FaImage, FaFilePdf } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { IoSend } from "react-icons/io5";
import io from "socket.io-client";
import axios from "axios";
import VoiceMessage from "../components/viceMessage.jsx";
import { MdOutlineAttachFile } from "react-icons/md";
import { Document, pdfjs } from "react-pdf";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const sock = io.connect("http://localhost:4000/");

const Home = () => {
  const [roomVal, SetRoomVal] = useState("");
  const [payloadData, setPayloadData] = useState({ type: null, data: null });
  const [roomId, setRoomId] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState("");
  const [joinedRoomName, setJoinedRoomName] = useState("");
  const [messages, setMessages] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [position, setPosition] = useState(null);

  const UserName = localStorage.getItem("username");
  const messagesEndRef = useRef(null);

  // CREATE ROOM
  const handleRoom = (event) => {
    event.preventDefault();
    if (!roomVal) return;
    sock.emit("createRoom", roomVal);
    SetRoomVal("");
  };

  // SET ROOMS TO ROOM ID STATE
  useEffect(() => {
    axios.get("http://localhost:4000/api").then((res) => {
      setRoomId(res?.data);
    });
  }, []);

  // ROOM LIST
  useEffect(() => {
    sock.on("roomsList", (rooms) => {
      setRoomId(rooms);
    });
    return () => sock.off("roomsList");
  }, []);

  // TO JOIN ROOM
  const Joinroom = (roomid, roomname) => {
    sock.emit("joinRoom", roomid);
    setCurrentRoomId(roomid);
    setJoinedRoomName(roomname);
    axios
      .get(`http://localhost:4000/api/room/${roomid}/messages`)
      .then((res) => {
        const sortedMessages = res?.data?.reverse();
        setMessages(sortedMessages);
      });
  };

  // INPUTS
  const handleInput = async (event) => {
    event.preventDefault();
    if (!payloadData?.data) return;

    const payload = {
      room_id: currentRoomId,
      message: payloadData.data,
      media: payloadData?.type || "text",
      text:
        payloadData?.type === "location"
          ? `${payloadData.data.lat},${payloadData.data.lng}`
          : payloadData.data,
      user: {
        name: UserName,
      },
      createdAt: new Date(),
    };

    sock.emit("newMessage", payload);
    setMessages((prev) => [...prev, payload]);
    setPayloadData({ type: null, data: null });
  };

  // ROOM MESSAGES
  useEffect(() => {
    sock.on("roomMessage", (newMessage) => {
      if (newMessage.room_id === currentRoomId) {
        setMessages((prev) => [...prev, newMessage]);
      }
    });
    return () => sock.off("roomMessage");
  }, [currentRoomId]);

  // AUTO SCROLL TO BOTTOM
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // VOICE MESSAGE
  const VoiceMessageWrapper = () => {
    const uploadVoice = async (blob) => {
      const formData = new FormData();
      const file = new File([blob], "voice.wav", { type: "audio/wav" });
      formData.append("image", file);

      try {
        const res = await axios.post(
          "http://localhost:4000/api/general/upload",
          formData
        );
        if (res?.data?.imageUrl) {
          setPayloadData({ type: "audio", data: res.data.imageUrl });
        }
      } catch (error) {
        console.error("Voice upload failed", error);
      }
    };

    return (
      <VoiceMessage
        onRecordingComplete={(blob) => {
          if (blob) {
            uploadVoice(blob);
          }
        }}
      />
    );
  };

  // IMAGE UPLOAD
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await axios.post(
        "http://localhost:4000/api/general/upload",
        formData
      );
      setPayloadData({ type: "image", data: res.data.imageUrl });
    } catch (error) {
      console.error("Image upload failed", error);
    }
  };

  // FILE UPLOAD
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await axios.post(
        "http://localhost:4000/api/general/upload",
        formData
      );
      setPayloadData({ type: "file", data: res.data.imageUrl });
    } catch (error) {
      console.error("File upload failed", error);
    }
  };

  // TO OPEN DIALOG
  const handleOpenDialog = () => {
    setPosition(null); // Reset previous location
    setIsDialogOpen(true);
  };

  // LOCATION
  const LocationMap = () => {
    const handleMarkerDragEnd = (event) => {
      const { lat, lng } = event.target.getLatLng();
      setPosition([lat, lng]);
    };

    return (
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker
          position={position}
          draggable={true}
          dragend={handleMarkerDragEnd}
        >
          <Popup>Drag me to adjust location</Popup>
        </Marker>
      </MapContainer>
    );
  };

  useEffect(() => {
    if (isDialogOpen && !position) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
        },
        (err) => {
          console.error("Error getting location:", err);
          setPosition(null);
        }
      );
    }
  }, [isDialogOpen]);

  // TO SEND LOCATION
  const Sendlocation = () => {
    const payload = {
      room_id: currentRoomId,
      message: `${position[0]},${position[1]}`,
      media: "location",
      text: `${position[0]},${position[1]}`,
      user: {
        name: UserName,
      },
      createdAt: new Date(),
    };

    sock.emit("newMessage", payload);
    setMessages((prev) => [...prev, payload]);
    setIsDialogOpen(false);
    setPayloadData({ type: null, data: null });
  };

  return (
    <>
      {/* CREATE ROOM  */}
      <div className="text-center my-3">
        <h2>Create a room</h2>
        <form
          className="d-flex justify-content-center gap-2"
          onSubmit={handleRoom}
        >
          <input
            type="text"
            placeholder="Enter room name"
            className="bg-transparent border border-2 border-info-subtle p-2 rounded-pill text-capitalize"
            value={roomVal}
            onChange={(e) => SetRoomVal(e.target.value)}
          />
          <button
            className="bg-transparent border border-2 border-info-subtle p-2 rounded-2"
            type="submit"
          >
            Create room
          </button>
        </form>
      </div>

      <div className="d-flex gap-5 mx-3">
        {/* ROOM LIST */}
        <div className="p-3 mb-5 bg-body-tertiary border border-3 border-black w-25">
          <p className="fs-3 fw-bold text-center">Room Name</p>
          <div className="overflow-auto" style={{ height: "100vh" }}>
            {roomId?.map((item) => (
              <div
                key={item?._id}
                onClick={() => Joinroom(item?._id, item?.name)}
                style={{ cursor: "pointer" }}
              >
                <div className="bg-info-subtle fw-semibold py-3 px-1 fs-5 d-flex gap-3">
                  <span className="rounded-circle bg-white p-1">
                    {item?.name?.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-capitalize">{item?.name}</span>
                </div>
                <hr className="border border-2 border-black m-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="w-100 mb-5 bg-body-tertiary border border-3 border-black">
          {/* HEADER */}
          <div className="bg-info p-4 fs-5 fw-bold d-flex gap-2">
            {joinedRoomName && (
              <>
                <span className="rounded-circle bg-white p-1">
                  {joinedRoomName?.charAt(0).toUpperCase()}
                </span>
                <span className="p-1 text-capitalize">{joinedRoomName}</span>
              </>
            )}
          </div>

          <div
            className="d-flex justify-content-end flex-column gap-5 w-100"
            style={{ height: "100vh" }}
          >
            {/* MESSAGES */}
            <div className="p-3 overflow-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className="mb-3 d-flex"
                  style={{
                    justifyContent:
                      UserName === msg?.user?.name ? "end" : "start",
                  }}
                >
                  <div
                    className="bg-info-subtle rounded-2 py-2 px-3 d-inline-block"
                    style={{
                      maxWidth: "100%",
                      wordBreak: "break-word",
                      minWidth: "150px",
                    }}
                  >
                    <span className="fw-bold fs-3 text-danger">
                      {msg?.user?.name}
                    </span>
                    <br />
                    {msg?.media === "text" && (
                      <p className="fw-semibold fs-4">{msg?.text}</p>
                    )}
                    {msg?.media === "audio" && (
                      <audio controls src={msg?.text} />
                    )}
                    {msg?.media === "image" && (
                      <img
                        src={msg?.text}
                        alt="uploaded"
                        className="img-fluid mt-2 rounded"
                        style={{ maxWidth: "200px" }}
                      />
                    )}
                    {msg?.media === "location" &&
                      (() => {
                        const [lat, lng] = msg.text.split(",").map(Number);
                        return (
                          <div tyle={{ height: "300px", width: "200%" }}>
                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary fw-semibold d-block mb-2"
                            >
                              <MapContainer
                                center={[lat, lng]}
                                zoom={20}
                                scrollWheelZoom={false}
                                style={{
                                  height: "300px",
                                  width: "100%",
                                  borderRadius: "10px",
                                }}
                              >
                                <TileLayer
                                  attribution="&copy; OpenStreetMap contributors"
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[lat, lng]}></Marker>
                              </MapContainer>
                            </a>
                          </div>
                        );
                      })()}

                    {msg?.media === "file" && (
                      <>
                        <FaFilePdf onClick={() => window.open(msg?.text)} />
                      </>
                    )}
                    <div className="d-flex justify-content-end">
                      <span>
                        {new Date(msg?.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div ref={messagesEndRef}></div>
                </div>
              ))}
            </div>

            {/* INPUTS */}
            <div>
              <form className="d-flex gap-5" onSubmit={handleInput}>
                <div className="d-flex gap-3 rounded-2 border p-2 w-100 align-items-center">
                  <input
                    type="text"
                    placeholder="Message"
                    disabled={
                      payloadData?.type === "file" ||
                      payloadData?.type === "image" ||
                      payloadData?.type === "location" ||
                      payloadData?.type === "audio"
                    }
                    className="border-0 focus-ring focus-ring-info rounded bg-transparent fs-5 w-100"
                    onChange={(e) =>
                      setPayloadData({
                        type: "text",
                        data: e.target.value,
                      })
                    }
                  />

                  <VoiceMessageWrapper />

                  <label style={{ cursor: "pointer" }}>
                    <FaImage className="fs-4" />
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageUpload}
                    />
                  </label>

                  <label style={{ cursor: "pointer" }}>
                    <MdOutlineAttachFile className="fs-4" />
                    <input
                      type="file"
                      accept="application/pdf"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                  </label>

                  <FaLocationDot
                    className="fs-4"
                    style={{ cursor: "pointer" }}
                    onClick={handleOpenDialog}
                  />
                </div>

                <button className="bg-transparent border-0 fs-3" type="submit">
                  <IoSend />
                </button>
              </form>
            </div>

            {/* PREVIEW */}
            <div>
              {payloadData?.type === "image" && (
                <div className="d-flex flex-column gap-3">
                  <button
                    className="btn btn-close fs-4"
                    onClick={() => setPayloadData({ type: null, data: null })}
                  />
                  <img width={500} src={payloadData?.data} alt="preview" />
                </div>
              )}
              {payloadData?.type === "audio" && (
                <div className="d-flex flex-column gap-3">
                  <button
                    className="btn btn-close fs-4"
                    onClick={() => setPayloadData({ type: null, data: null })}
                  />
                  <audio controls src={payloadData?.data} />
                </div>
              )}
              {payloadData?.type === "file" && (
                <div className="d-flex flex-column gap-3">
                  <button
                    className="btn btn-close fs-4"
                    onClick={() => setPayloadData({ type: null, data: null })}
                  />
                  <FaFilePdf />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location Dialog */}
        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
          <DialogTitle>Your Current Location</DialogTitle>
          <div className="text-center mt-3">
            <button className="btn btn-primary" onClick={Sendlocation}>
              Send Location
            </button>
          </div>
          <div className="p-3" style={{ width: "400px", height: "400px" }}>
            {!position ? (
              <p>Fetching your location...</p>
            ) : (
              <>
                <LocationMap />
              </>
            )}
          </div>
        </Dialog>
      </div>
    </>
  );
};

export default Home;
