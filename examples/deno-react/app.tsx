import { useState } from "react";

export default function App() {
  const [state, setState] = useState("");
  const [msg, setMsg] = useState("");

  const handleClick = (e) => {
    setMsg(`state: ${state}`);
  };

  return (
    <div className="mt-20 bg-pink-400">
      <input
        type="text"
        onChange={(e) => setState(e.target.value)}
        placeholder="set state..."
      />
      <button type="button" onClick={handleClick}>check the state</button>
      <p>current value: {state}</p>
      <p>{msg}</p>
    </div>
  );
}
