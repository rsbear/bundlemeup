import { useState } from "preact/hooks";

export default function App() {
  const [state, setState] = useState("");
  const [msg, setMsg] = useState("");

  const handleClick = (e) => {
    e.preventDefault()
    setMsg(`click state: ${state}`);
  };

  return (
    <div>
      <input
        type="text"
        onChange={(e) => setState(e.currentTarget.value)}
        placeholder="set state..."
      />
      <button type="button" onClick={handleClick}>check the state</button>
      <p>current: {state}</p>
      <p>{msg}</p>
    </div>
  );
}
