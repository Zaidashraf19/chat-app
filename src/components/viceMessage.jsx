import { useState, useEffect, useRef, useMemo } from "react";

const VoiceMessage = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);
  const RECORDING_MAX_DURATION = 240;

  const Voice = useMemo(() => {
    return audioBlob ? URL.createObjectURL(audioBlob) : null;
  }, [audioBlob]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        setAudioStream(stream);
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);

        let audioChunks = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: "audio/wav" });
          setAudioBlob(blob);
          if (typeof onRecordingComplete === "function") {
            onRecordingComplete(blob);
          }
        };
      })
      .catch((error) => {
        console.error("Microphone access denied:", error);
      });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onRecordingComplete]);

  const startRecording = () => {
    mediaRecorder.start();
    setIsRecording(true);
    setAudioBlob(null);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prevTime) => {
        if (prevTime >= RECORDING_MAX_DURATION - 1) {
          stopRecording();
          return RECORDING_MAX_DURATION;
        }
        return prevTime + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorder.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div>
      <button
        onClick={(e) => {
          e.preventDefault();
          isRecording ? stopRecording() : startRecording();
        }}
        className="btn btn-danger fw-bold"
      >
        {isRecording ? (
          <>
            <span className="me-2 text-warning fw-bold">●</span>
            Stop Recording
          </>
        ) : audioBlob ? (
          "Redo recording"
        ) : (
          "Start Recording"
        )}
      </button>

      {isRecording && (
        <div className="mt-3">
          <p className="text-primary fw-semibold">Recording...</p>
          <p className="text-muted">Time: {formatTime(recordingTime)}</p>
        </div>
      )}

      {audioBlob && Voice && (
        <div className="mt-3">
          <div className="mb-2">Preview recording before submitting:</div>
          <audio controls>
            <source src={Voice} type="audio/wav" />
          </audio>
        </div>
      )}
    </div>
  );
};

export default VoiceMessage;
