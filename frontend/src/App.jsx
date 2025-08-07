import { useEffect, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { v4 as uuid } from "uuid";

// const socket = io("http://localhost:5000");
const socket = io("https://real-time-code-editor-2-0dnd.onrender.com");


const App = () => {
    const [joined, setJoined] = useState(false);
    const [roomId, setRoomId] = useState("");
    const [userName, setUserName] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState("// start code here");
    const [copySuccess, setCopySuccess] = useState("");
    const [users, setUsers] = useState([]);
    const [typing, setTyping] = useState("");
    const [outPut, setOutPut] = useState("");
    const [userInput, setUserInput] = useState("");
    const [showRejoinPrompt, setShowRejoinPrompt] = useState(false);

    useEffect(() => {
        const storedRoomId = localStorage.getItem("roomId");
        const storedUserName = localStorage.getItem("userName");

        if (storedRoomId && storedUserName) {
            setRoomId(storedRoomId);
            setUserName(storedUserName);
            setShowRejoinPrompt(true);
        }

        const handleJoined = ({ success }) => {
            if (success) {
                setJoined(true);
                setShowRejoinPrompt(false); 
            }
        };

        const handleBeforeUnload = () => {
            socket.emit("leaveRoom");
        };

        socket.on("userJoined", (users) => setUsers(users));
        socket.on("codeUpdate", (newCode) => setCode(newCode));
        socket.on("userTyping", (user) => {
            setTyping(`${user.slice(0, 8)}... is Typing`);
            setTimeout(() => setTyping(""), 2000);
        });
        socket.on("languageUpdate", (newLanguage) => setLanguage(newLanguage));
        socket.on("codeResponse", (response) => {
            setOutPut(response.run.output);
        });
        socket.on("joined", handleJoined);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            socket.off("userJoined");
            socket.off("codeUpdate");
            socket.off("userTyping");
            socket.off("languageUpdate");
            socket.off("codeResponse");
            socket.off("joined", handleJoined);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    const joinRoom = () => {
        if (roomId.trim() && userName.trim()) {
            socket.emit("join", { roomId, userName });
        }
    };

    const handleRejoin = () => {
        socket.emit("join", { roomId, userName });
    };

    const handleStartNewSession = () => {
        localStorage.removeItem("roomId");
        localStorage.removeItem("userName");
        setRoomId("");
        setUserName("");
        setShowRejoinPrompt(false);
    };

    const leaveRoom = () => {
        socket.emit("leaveRoom");
        setJoined(false);
        setRoomId("");
        setUserName("");
        setCode("// start code here");
        setLanguage("javascript");
        setOutPut("");
        setUserInput("");
        localStorage.removeItem("roomId");
        localStorage.removeItem("userName");
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopySuccess("Copied!");
        setTimeout(() => setCopySuccess(""), 2000);
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        socket.emit("codeChange", { roomId, code: newCode });
        socket.emit("typing", { roomId, userName });
    };

    const handleLanguageChange = (e) => {
        const newLanguage = e.target.value;
        setLanguage(newLanguage);
        socket.emit("languageChange", { roomId, language: newLanguage });
    };

    const languageVersions = {
        javascript: "18.15.0",
        python: "3.10.0",
        java: "15.0.2",
        cpp: "10.2.0",
    };

    const runCode = () => {
        const selectedVersion = languageVersions[language];
        socket.emit("compileCode", {
            code,
            roomId,
            language,
            version: selectedVersion,
            input: userInput,
        });
    };

    const createRoomId = () => {
        const shortId = uuid().replace(/-/g, "").slice(0, 10);
        setRoomId(shortId);
    };

    // Conditional rendering logic
    if (showRejoinPrompt) {
        return (
            <div className="join-container">
                <div className="join-form">
                    <h1>Welcome back!</h1>
                    <p>Do you want to rejoin your previous room?</p>
                    <button onClick={handleRejoin}>Rejoin Room ({roomId})</button>
                    <button onClick={handleStartNewSession}>Start a New Session</button>
                </div>
            </div>
        );
    }

    if (!joined) {
        return (
            <div className="join-container">
                <div className="join-form">
                    <h1>Join Code Room</h1>
                    <input
                        type="text"
                        placeholder="Room Id"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                    />
                    <button className="create" onClick={createRoomId}>
                        CREATE ID
                    </button>
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                    />
                    <button onClick={joinRoom} disabled={!roomId.trim() || !userName.trim()}>Join Room</button>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-container">
            <div className="sidebar">
                <div className="room-info">
                    <h2>Code Room: {roomId}</h2>
                    <button onClick={copyRoomId} className="copy-button">
                        Copy Id
                    </button>
                    {copySuccess && <span className="copy-success">{copySuccess}</span>}
                </div>
                <h3>Users in Room:</h3>
                <ul>
                    {users.map((user, index) => (
                        <li key={index}>{user}</li>
                    ))}
                </ul>
                <p className="typing-indicator">{typing}</p>
                <select
                    className="language-selector"
                    value={language}
                    onChange={handleLanguageChange}
                >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                </select>
                <button className="leave-button" onClick={leaveRoom}>
                    Leave Room
                </button>
            </div>

            <div className="editor-wrapper">
                <Editor
                    height="50%"
                    defaultLanguage={language}
                    language={language}
                    value={code}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                    }}
                />
                <textarea
                    className="input-console"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Enter input here..."
                />
                <button className="run-btn" onClick={runCode}>
                    Execute
                </button>
                <textarea
                    className="output-console"
                    value={outPut}
                    readOnly
                    placeholder="Output will appear here ..."
                />
            </div>
        </div>
    );
};

export default App;